import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  IntegrationSyncContext,
  IntegrationSyncStats,
  NormalizedExternalProduct,
} from "@/lib/integrations/core/types";
import {
  normalizeIntegrationImportSettings,
  type IntegrationImportSettings,
} from "@/lib/integrations/core/import-settings";
import { decryptSecret } from "@/lib/integrations/core/secrets";
import { withBrand } from "@/lib/prisma";
import { createVarejonlineClient } from "@/lib/integrations/providers/varejonline/client";
import { mapVarejonlineProduct } from "@/lib/integrations/providers/varejonline/mapper";
import {
  getExternalProductId,
  listVarejonlineEntities,
  listVarejonlinePriceTables,
  resolveVarejonlineEntityRef,
  resolveVarejonlinePriceTableRef,
  type VarejonlineEntityReference,
  type VarejonlineLiquidStockBalance,
  type VarejonlinePriceTableReference,
} from "@/lib/integrations/providers/varejonline/reference-data";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_BATCH_SIZE = 10;
const STOCK_BALANCE_BATCH_SIZE = 100;
type Tx = PrismaClient;
type EnrichedExternalProduct = NormalizedExternalProduct & {
  inventoryBalance?: VarejonlineLiquidStockBalance | null;
  inventoryEntity?: VarejonlineEntityReference | null;
};

function readPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readMaxItemsEnv(name: string) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase();
  if (["all", "0", "false", "unlimited", "sem-limite"].includes(normalized)) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toDecimalString(value: number | null) {
  return value === null ? null : String(value);
}

function pickCreateOrEnabledValue<T>(
  value: T,
  enabled: boolean,
  existing: boolean,
) {
  if (!existing) {
    return value;
  }

  return enabled ? value : undefined;
}

function normalizeSku(product: NormalizedExternalProduct) {
  return (product.externalCode ?? product.externalId).trim();
}

function resolveProductPrice(
  product: NormalizedExternalProduct,
  settings: IntegrationImportSettings,
) {
  if (settings.pricing.primarySource === "SELECTED_PRICE_TABLE") {
    const targetTableId = settings.pricing.primaryPriceTableId;
    if (targetTableId) {
      const match = product.tablePrices.find(
        (tablePrice) => tablePrice.tableId === targetTableId,
      );
      if (match) {
        return match.price;
      }
    }
  }

  return product.price;
}

function resolveStoredTablePrices(
  product: NormalizedExternalProduct,
  settings: IntegrationImportSettings,
) {
  if (settings.pricing.priceTablesMode === "NONE") {
    return [];
  }

  const selectedIds = new Set(settings.pricing.selectedPriceTableIds);
  return product.tablePrices.filter((tablePrice) =>
    selectedIds.has(tablePrice.tableId),
  );
}

function resolveRequestedPriceTableRefs(settings: IntegrationImportSettings) {
  const ids = new Set<string>();

  if (settings.pricing.primarySource === "SELECTED_PRICE_TABLE") {
    if (settings.pricing.primaryPriceTableRef) {
      ids.add(settings.pricing.primaryPriceTableRef);
    }
  }

  if (settings.pricing.priceTablesMode === "SELECTED") {
    settings.pricing.selectedPriceTableRefs.forEach((id) => ids.add(id));
  }

  return [...ids];
}

function resolvePriceTableIds(
  settings: IntegrationImportSettings,
  priceTables: VarejonlinePriceTableReference[],
) {
  const resolvedRefs = new Map<string, string>();
  const requestedRefs = resolveRequestedPriceTableRefs(settings);

  requestedRefs.forEach((ref) => {
    const resolved = resolveVarejonlinePriceTableRef(priceTables, ref);
    resolvedRefs.set(ref, String(resolved.id));
  });

  const primaryPriceTableId =
    settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
    settings.pricing.primaryPriceTableRef
      ? resolvedRefs.get(settings.pricing.primaryPriceTableRef) ?? null
      : null;

  const selectedPriceTableIds =
    settings.pricing.priceTablesMode === "SELECTED"
      ? settings.pricing.selectedPriceTableRefs
          .map((ref) => resolvedRefs.get(ref))
          .filter((id): id is string => Boolean(id))
      : [];

  return {
    primaryPriceTableId,
    selectedPriceTableIds,
    requestedPriceTableIds: Array.from(
      new Set(
        [
          primaryPriceTableId,
          ...selectedPriceTableIds,
        ].filter((id): id is string => Boolean(id)),
      ),
    ),
  };
}

function createResolvedPricingSettings(
  settings: IntegrationImportSettings,
  resolved: ReturnType<typeof resolvePriceTableIds>,
): IntegrationImportSettings {
  return {
    ...settings,
    pricing: {
      ...settings.pricing,
      primaryPriceTableId: resolved.primaryPriceTableId,
      selectedPriceTableIds: resolved.selectedPriceTableIds,
    },
  };
}

function buildStoredCommercialInfo(
  product: NormalizedExternalProduct,
  resolvedPrice: number | null,
  storedTablePrices: Array<{ tableId: string; price: number }>,
  settings: IntegrationImportSettings,
) {
  const commercialInfo = {
    ...product.commercialInfo,
    price: resolvedPrice,
    priceTables: storedTablePrices,
  } as Record<string, unknown>;

  if (!settings.pricing.importDiscountRules) {
    delete commercialInfo.maxDiscountPercent;
    delete commercialInfo.commissionPercent;
    delete commercialInfo.profitMarginPercent;
  }

  if (!settings.pricing.importProgressiveDiscounts) {
    delete commercialInfo.progressiveDiscounts;
  }

  return commercialInfo;
}

function createSyncConfigurationError(message: string) {
  const error = new Error(message) as Error & {
    statusCode: number;
    code: string;
  };
  error.statusCode = 400;
  error.code = "validation_error";
  return error;
}

function validatePricingSettings(settings: IntegrationImportSettings) {
  if (!settings.pricing.enabled) {
    return;
  }

  if (
    settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
    !settings.pricing.primaryPriceTableRef
  ) {
    throw createSyncConfigurationError(
      "Informe o nome ou ID da tabela principal antes de sincronizar.",
    );
  }

  if (
    settings.pricing.priceTablesMode === "SELECTED" &&
    settings.pricing.selectedPriceTableRefs.length === 0 &&
    !(
      settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
      settings.pricing.primaryPriceTableRef
    )
  ) {
    throw createSyncConfigurationError(
      "Informe os nomes ou IDs das tabelas de preco antes de sincronizar.",
    );
  }

  if (
    settings.inventory.enabled &&
    settings.inventory.importCurrentStock &&
    settings.inventory.currentStockSource === "SELECTED_ENTITY" &&
    !settings.inventory.stockEntityRef
  ) {
    throw createSyncConfigurationError(
      "Informe o nome ou ID da entidade de estoque antes de sincronizar.",
    );
  }
}

function isFiscalCategoryLevel(level: string | null) {
  const normalized = level ?? "";
  return ["TRIBUT", "FISCAL", "IMPOST", "ORIGEM", "NCM", "CEST"].some(
    (candidate) => normalized.includes(candidate),
  );
}

function collectFiscalCategoryNames(products: NormalizedExternalProduct[]) {
  const names = new Set<string>();

  products.forEach((product) => {
    product.categories.forEach((category) => {
      if (isFiscalCategoryLevel(category.level)) {
        names.add(category.name);
      }
    });
  });

  return names;
}

async function cleanupEmptyFiscalCategories(
  tx: Tx,
  brandId: string,
  names: Set<string>,
) {
  let cleaned = 0;

  for (const name of names) {
    const category = await tx.categoryV2.findUnique({
      where: {
        brandId_name: {
          brandId,
          name,
        },
      },
      select: { id: true },
    });

    if (!category) {
      continue;
    }

    const [directProductsCount, subcategories] = await Promise.all([
      tx.productBaseV2.count({
        where: {
          brandId,
          categoryId: category.id,
        },
      }),
      tx.subcategoryV2.findMany({
        where: {
          brandId,
          categoryId: category.id,
        },
        select: { id: true },
      }),
    ]);
    const subcategoryIds = subcategories.map((subcategory) => subcategory.id);
    const subcategoryProductsCount =
      subcategoryIds.length > 0
        ? await tx.productBaseV2.count({
            where: {
              brandId,
              subcategoryId: { in: subcategoryIds },
            },
          })
        : 0;

    if (directProductsCount > 0 || subcategoryProductsCount > 0) {
      continue;
    }

    const result = await tx.categoryV2.deleteMany({
      where: {
        brandId,
        id: category.id,
      },
    });
    cleaned += result.count;
  }

  return cleaned;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function readLiquidStockProductId(balance: VarejonlineLiquidStockBalance) {
  const id = balance.produto?.id;
  return typeof id === "number" && Number.isFinite(id) ? String(id) : null;
}

function normalizeLiquidStockBalance(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const saldoAtual = Number(record.saldoAtual);
  if (!Number.isFinite(saldoAtual)) {
    return null;
  }

  return record as VarejonlineLiquidStockBalance;
}

async function fetchLiquidStockBalances(
  client: ReturnType<typeof createVarejonlineClient>,
  products: NormalizedExternalProduct[],
  entity: VarejonlineEntityReference,
) {
  const productIds = Array.from(
    new Set(
      products
        .map((product) => getExternalProductId(product.rawPayload))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const balances = new Map<string, VarejonlineLiquidStockBalance>();

  for (const chunk of chunkArray(productIds, STOCK_BALANCE_BATCH_SIZE)) {
    const payload = await client.get<unknown>("/saldos-mercadorias/liquido", {
      produtos: chunk.join(","),
      entidades: entity.id,
      alteradoApos: "01/01/2000 00:00:00",
      carregarQuantidadeReservada: true,
      carregarEstoqueEmTransito: false,
      carregarQuantidadeEpcs: false,
    });
    const items = Array.isArray(payload) ? payload : [];

    items.forEach((item) => {
      const balance = normalizeLiquidStockBalance(item);
      if (!balance) {
        return;
      }

      const productId = readLiquidStockProductId(balance);
      if (productId) {
        balances.set(productId, balance);
      }
    });
  }

  return balances;
}

export function applyOfficialStockBalances(
  products: NormalizedExternalProduct[],
  balances: Map<string, VarejonlineLiquidStockBalance>,
  entity: VarejonlineEntityReference,
) {
  return products.map((product): EnrichedExternalProduct => {
    const productId = getExternalProductId(product.rawPayload);
    const balance = productId ? balances.get(productId) ?? null : null;

    if (!balance) {
      return {
        ...product,
        inventoryBalance: null,
        inventoryEntity: entity,
      };
    }

    return {
      ...product,
      stockQuantity: Math.trunc(balance.saldoAtual),
      minStockQuantity: balance.estoqueMinimo ?? product.minStockQuantity,
      maxStockQuantity: balance.estoqueMaximo ?? product.maxStockQuantity,
      logisticsInfo: {
        ...product.logisticsInfo,
        stockQuantity: Math.trunc(balance.saldoAtual),
        minStockQuantity: balance.estoqueMinimo ?? product.minStockQuantity,
        maxStockQuantity: balance.estoqueMaximo ?? product.maxStockQuantity,
      },
      inventoryBalance: balance,
      inventoryEntity: entity,
    };
  });
}

async function resolveCategoryIds(
  tx: Tx,
  brandId: string,
  product: NormalizedExternalProduct,
  settings: IntegrationImportSettings,
) {
  if (!settings.categories.enabled || !product.categoryName) {
    return { categoryId: null, subcategoryId: null };
  }

  const category = await tx.categoryV2.upsert({
    where: {
      brandId_name: {
        brandId,
        name: product.categoryName,
      },
    },
    create: {
      brandId,
      name: product.categoryName,
    },
    update: {},
    select: {
      id: true,
    },
  });

  if (!product.subcategoryName) {
    return { categoryId: category.id, subcategoryId: null };
  }

  const subcategory = await tx.subcategoryV2.upsert({
    where: {
      brandId_categoryId_name: {
        brandId,
        categoryId: category.id,
        name: product.subcategoryName,
      },
    },
    create: {
      brandId,
      categoryId: category.id,
      name: product.subcategoryName,
    },
    update: {},
    select: {
      id: true,
    },
  });

  return { categoryId: category.id, subcategoryId: subcategory.id };
}

async function upsertProduct(
  tx: Tx,
  context: IntegrationSyncContext,
  product: EnrichedExternalProduct,
  settings: IntegrationImportSettings,
) {
  const sku = normalizeSku(product);
  const existing = await tx.productBaseV2.findUnique({
    where: {
      integrationConnectionId_sourceExternalId: {
        integrationConnectionId: context.connection.id,
        sourceExternalId: product.externalId,
      },
    },
    select: {
      id: true,
      imageUrl: true,
      integrationSyncLocked: true,
    },
  });
  const hasExistingProduct = Boolean(existing);

  if (existing?.integrationSyncLocked) {
    return {
      created: 0,
      updated: 0,
      skipped: 1,
      skippedLocked: 1,
      skippedExistingByPolicy: 0,
      imagesCreated: 0,
      imageUrlUpdated: 0,
      galleryRebuilt: 0,
      imagesSkippedBySettings: 0,
    };
  }

  if (
    hasExistingProduct &&
    settings.syncPolicy.existingProductsMode === "CREATE_ONLY"
  ) {
    return {
      created: 0,
      updated: 0,
      skipped: 1,
      skippedLocked: 0,
      skippedExistingByPolicy: 1,
      imagesCreated: 0,
      imageUrlUpdated: 0,
      galleryRebuilt: 0,
      imagesSkippedBySettings: 0,
    };
  }

  const { categoryId, subcategoryId } = await resolveCategoryIds(
    tx,
    context.brandId,
    product,
    settings,
  );
  const imageUrl = product.imageUrls[0] ?? null;
  const resolvedPrice = resolveProductPrice(product, settings);
  const storedTablePrices = resolveStoredTablePrices(product, settings);
  const price = resolvedPrice !== null ? resolvedPrice.toFixed(2) : null;

  const productFieldData = settings.products.enabled
    ? {
        name: pickCreateOrEnabledValue(
          product.name,
          settings.products.fields.name,
          hasExistingProduct,
        ),
        description: pickCreateOrEnabledValue(
          product.description,
          settings.products.fields.description,
          hasExistingProduct,
        ),
        line: pickCreateOrEnabledValue(
          product.line,
          settings.products.fields.line,
          hasExistingProduct,
        ),
        brand: pickCreateOrEnabledValue(
          product.brand,
          settings.products.fields.brand,
          hasExistingProduct,
        ),
        barcode: pickCreateOrEnabledValue(
          product.barcode,
          settings.products.fields.barcode,
          hasExistingProduct,
        ),
        additionalBarcodesJson: pickCreateOrEnabledValue(
          toJsonValue(product.additionalBarcodes),
          settings.products.fields.additionalBarcodes,
          hasExistingProduct,
        ),
        size: pickCreateOrEnabledValue(
          product.size,
          settings.products.fields.size,
          hasExistingProduct,
        ),
        unit: pickCreateOrEnabledValue(
          product.unit,
          settings.products.fields.unit,
          hasExistingProduct,
        ),
        gradeAttributesJson: pickCreateOrEnabledValue(
          toJsonValue(product.gradeAttributes),
          settings.products.fields.attributes,
          hasExistingProduct,
        ),
      }
    : {};

  const createProductFieldData = {
    name: product.name,
    description:
      settings.products.enabled && settings.products.fields.description
        ? product.description
        : undefined,
    line:
      settings.products.enabled && settings.products.fields.line
        ? product.line
        : undefined,
    brand:
      settings.products.enabled && settings.products.fields.brand
        ? product.brand
        : undefined,
    barcode:
      settings.products.enabled && settings.products.fields.barcode
        ? product.barcode
        : undefined,
    additionalBarcodesJson:
      settings.products.enabled && settings.products.fields.additionalBarcodes
        ? toJsonValue(product.additionalBarcodes)
        : undefined,
    size:
      settings.products.enabled && settings.products.fields.size
        ? product.size
        : undefined,
    unit:
      settings.products.enabled && settings.products.fields.unit
        ? product.unit
        : undefined,
    gradeAttributesJson:
      settings.products.enabled && settings.products.fields.attributes
        ? toJsonValue(product.gradeAttributes)
        : undefined,
  };

  const data = {
    sku,
    ...productFieldData,
    isActive: product.isActive,
    sourceType: "INTEGRATION" as const,
    sourceProvider: "VAREJONLINE" as const,
    sourceExternalId: product.externalId,
    sourceExternalCode: product.externalCode,
    sourceUpdatedAt: product.sourceUpdatedAt,
    lastSyncedAt: new Date(),
    categoryLevelsJson: toJsonValue(product.categories),
    suppliersJson: toJsonValue(product.suppliers),
    externalMetadataJson: toJsonValue(product.rawPayload),
    integrationConnectionId: context.connection.id,
  };

  const categoryData = settings.categories.enabled
    ? {
        categoryId,
        subcategoryId,
        groupName: product.groupName,
        subgroupName: product.subgroupName,
        ...(settings.categories.storeDepartmentAndSectionAsMetadata
          ? {
              department: product.department,
              section: product.section,
            }
          : {}),
      }
    : {};

  const inventoryData = settings.inventory.enabled
    ? {
        stockQuantity: settings.inventory.importCurrentStock
          ? product.stockQuantity
          : undefined,
        minStockQuantity: settings.inventory.importMinMax
          ? toDecimalString(product.minStockQuantity)
          : undefined,
        maxStockQuantity: settings.inventory.importMinMax
          ? toDecimalString(product.maxStockQuantity)
          : undefined,
        stockControlMethod: settings.inventory.importControlMethod
          ? product.stockControlMethod
          : undefined,
      }
    : {};

  const pricingData = settings.pricing.enabled
    ? {
        price,
        costPrice: settings.pricing.importCostPrice
          ? toDecimalString(product.costPrice)
          : undefined,
        commercialInfoJson: toJsonValue(
          buildStoredCommercialInfo(
            product,
            resolvedPrice,
            storedTablePrices,
            settings,
          ),
        ),
      }
    : {};

  const taxInfoJson =
    settings.fiscal.enabled &&
    (settings.fiscal.importTaxClassification || settings.fiscal.importTaxMetadata)
      ? toJsonValue({
          ...(settings.fiscal.importTaxClassification
            ? {
                ncmCode: product.ncmCode,
                cestCode: product.cestCode,
                taxOrigin: product.taxOrigin,
                taxFci: product.taxFci,
                productClassification: product.productClassification,
              }
            : {}),
          ...(settings.fiscal.importTaxMetadata
            ? {
                taxBenefitCode: product.taxBenefitCode,
                entityData:
                  product.taxInfo.entityData ?? product.taxInfo.dadosPorEntidade,
                taxOriginRaw: product.taxInfo.taxOriginRaw,
              }
            : {}),
        })
      : undefined;

  const fiscalData = settings.fiscal.enabled
    ? {
        ncmCode: settings.fiscal.importTaxClassification
          ? product.ncmCode
          : undefined,
        cestCode: settings.fiscal.importTaxClassification
          ? product.cestCode
          : undefined,
        taxOrigin: settings.fiscal.importTaxClassification
          ? product.taxOrigin
          : undefined,
        taxFci: settings.fiscal.importTaxClassification
          ? product.taxFci
          : undefined,
        productClassification: settings.fiscal.importTaxClassification
          ? product.productClassification
          : undefined,
        taxBenefitCode: settings.fiscal.importTaxMetadata
          ? product.taxBenefitCode
          : undefined,
        taxInfoJson,
      }
    : {};

  const logisticsInfoJson = settings.logistics.enabled
    ? toJsonValue({
        unit: product.unit,
        unitProportions: product.logisticsInfo.unitProportions,
        lotControl: product.logisticsInfo.lotControl,
        lotValidityControl: product.logisticsInfo.lotValidityControl,
        usedProduct: product.logisticsInfo.usedProduct,
        officialStockBalance: product.inventoryBalance
          ? {
              source: "VAREJONLINE_SALDOS_MERCADORIAS_LIQUIDO",
              balanceType: "LIQUID",
              entity: product.inventoryEntity,
              saldoAtual: product.inventoryBalance.saldoAtual,
              quantidadeReservada:
                product.inventoryBalance.quantidadeReservada ?? null,
              quantidadeEstoqueTransito:
                product.inventoryBalance.quantidadeEstoqueTransito ?? null,
              estoqueMinimo: product.inventoryBalance.estoqueMinimo ?? null,
              estoqueMaximo: product.inventoryBalance.estoqueMaximo ?? null,
            }
          : null,
        ...(settings.logistics.importWeight ? { weight: product.weight } : {}),
        ...(settings.logistics.importDimensions
          ? {
              height: product.height,
              width: product.width,
              length: product.length,
            }
          : {}),
      })
    : undefined;

  const logisticsData = settings.logistics.enabled
    ? {
        weight: settings.logistics.importWeight
          ? toDecimalString(product.weight)
          : undefined,
        height: settings.logistics.importDimensions
          ? toDecimalString(product.height)
          : undefined,
        width: settings.logistics.importDimensions
          ? toDecimalString(product.width)
          : undefined,
        length: settings.logistics.importDimensions
          ? toDecimalString(product.length)
          : undefined,
        logisticsInfoJson,
      }
    : {};

  const imageData =
    settings.images.enabled && settings.images.importPrimaryImage
      ? {
          imageUrl,
        }
      : {};

  const imagesSkippedBySettings =
    product.imageUrls.length > 0 &&
    (!settings.images.enabled ||
      !settings.images.importPrimaryImage ||
      !settings.images.importGallery)
      ? 1
      : 0;

  const saved = existing
    ? await tx.productBaseV2.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...categoryData,
          ...inventoryData,
          ...pricingData,
          ...fiscalData,
          ...logisticsData,
          ...imageData,
        },
        select: { id: true },
      })
    : await tx.productBaseV2.create({
        data: {
          brandId: context.brandId,
          ...data,
          ...createProductFieldData,
          ...categoryData,
          ...inventoryData,
          ...pricingData,
          ...fiscalData,
          ...logisticsData,
          ...imageData,
        },
        select: { id: true },
      });

  let galleryRebuilt = 0;
  let imagesCreated = 0;
  if (settings.images.enabled && settings.images.importGallery) {
    await tx.productBaseImageV2.deleteMany({
      where: {
        brandId: context.brandId,
        productBaseId: saved.id,
      },
    });

    if (product.imageUrls.length > 0) {
      await tx.productBaseImageV2.createMany({
        data: product.imageUrls.map((url, index) => ({
          brandId: context.brandId,
          productBaseId: saved.id,
          imageUrl: url,
          sortOrder: index,
        })),
      });
      imagesCreated = product.imageUrls.length;
    }

    galleryRebuilt = 1;
  }

  return {
    created: existing ? 0 : 1,
    updated: existing ? 1 : 0,
    skipped: 0,
    skippedLocked: 0,
    skippedExistingByPolicy: 0,
    imagesCreated,
    imageUrlUpdated:
      settings.images.enabled &&
      settings.images.importPrimaryImage &&
      existing?.imageUrl !== imageUrl
        ? 1
        : !existing && imageUrl
          ? 1
          : 0,
    galleryRebuilt,
    imagesSkippedBySettings,
  };
}

export async function syncVarejonlineProducts(
  context: IntegrationSyncContext,
): Promise<IntegrationSyncStats> {
  if (context.resource !== "FULL" && context.resource !== "PRODUCTS") {
    throw new Error("Varejonline supports product sync for FULL or PRODUCTS only.");
  }

  if (context.connection.status !== "CONNECTED") {
    throw new Error("Varejonline connection is not connected.");
  }

  const accessToken = decryptSecret(context.connection.accessTokenEncrypted);
  if (!accessToken) {
    throw new Error("Varejonline connection has no access token.");
  }

  const client = createVarejonlineClient(accessToken);
  const pageSize = readPositiveIntegerEnv(
    "VAREJONLINE_PRODUCTS_PAGE_SIZE",
    DEFAULT_PAGE_SIZE,
  );
  const maxItems = readMaxItemsEnv("VAREJONLINE_PRODUCTS_MAX_ITEMS");
  const batchSize = readPositiveIntegerEnv(
    "VAREJONLINE_PRODUCTS_BATCH_SIZE",
    DEFAULT_BATCH_SIZE,
  );
  const onlyActive =
    process.env.VAREJONLINE_PRODUCTS_ONLY_ACTIVE?.trim().toLowerCase() !==
    "false";
  const importSettings = normalizeIntegrationImportSettings(
    context.connection.importSettingsJson,
  );
  validatePricingSettings(importSettings);
  const requestedPriceTableRefs = resolveRequestedPriceTableRefs(importSettings);
  const priceTables =
    requestedPriceTableRefs.length > 0
      ? await listVarejonlinePriceTables(accessToken)
      : [];
  const resolvedPriceTables =
    requestedPriceTableRefs.length > 0
      ? resolvePriceTableIds(importSettings, priceTables)
      : {
          primaryPriceTableId: null,
          selectedPriceTableIds: [],
          requestedPriceTableIds: [],
        };
  const resolvedImportSettings = createResolvedPricingSettings(
    importSettings,
    resolvedPriceTables,
  );
  const stockEntity =
    importSettings.inventory.enabled &&
    importSettings.inventory.importCurrentStock &&
    importSettings.inventory.currentStockSource === "SELECTED_ENTITY" &&
    importSettings.inventory.stockEntityRef
      ? resolveVarejonlineEntityRef(
          await listVarejonlineEntities(accessToken),
          importSettings.inventory.stockEntityRef,
        )
      : null;

  const stats: IntegrationSyncStats = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    imagesCreated: 0,
    imageUrlUpdated: 0,
    galleryRebuilt: 0,
    imagesSkippedBySettings: 0,
    skippedLocked: 0,
    skippedExistingByPolicy: 0,
    categoriesCleaned: 0,
    priceTablesResolved: resolvedPriceTables.requestedPriceTableIds.length,
    stockBalancesFetched: 0,
    stockEntityResolved: Boolean(stockEntity),
    stockBalancesMissing: 0,
    pageSize,
    maxItems,
    batchSize,
    onlyActive,
    errors: [],
  };
  const normalizedProducts: NormalizedExternalProduct[] = [];

  for (let start = 0; ; start += pageSize) {
    const remaining = maxItems === null ? null : maxItems - start;
    if (remaining !== null && remaining <= 0) {
      break;
    }
    const quantity = remaining === null ? pageSize : Math.min(pageSize, remaining);
    const payload = await client.get<unknown>("/produtos", {
      inicio: start,
      quantidade: quantity,
      somenteAtivos: onlyActive,
      idsTabelasPrecos:
        resolvedPriceTables.requestedPriceTableIds.length > 0
          ? resolvedPriceTables.requestedPriceTableIds.join(",")
          : undefined,
    });
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : [];

    stats.fetched += items.length;

    for (const item of items) {
      try {
        normalizedProducts.push(mapVarejonlineProduct(item));
      } catch (error) {
        stats.failed += 1;
        stats.errors?.push({
          message:
            error instanceof Error
              ? error.message
              : "Could not map Varejonline product",
        });
      }
    }

    await context.onProgress?.(stats).catch(() => undefined);

    if (items.length < quantity) {
      break;
    }
  }

  const productsToPersist: EnrichedExternalProduct[] = stockEntity
    ? applyOfficialStockBalances(
        normalizedProducts,
        await fetchLiquidStockBalances(client, normalizedProducts, stockEntity),
        stockEntity,
      )
    : normalizedProducts.map((product): EnrichedExternalProduct => product);

  if (stockEntity) {
    stats.stockBalancesFetched = productsToPersist.filter(
      (product) => product.inventoryBalance,
    ).length;
    stats.stockBalancesMissing =
      productsToPersist.length - (stats.stockBalancesFetched ?? 0);
  }

  let persistedCount = 0;
  for (const product of productsToPersist) {
    try {
      const result = await withBrand(context.brandId, async (tx) =>
        upsertProduct(tx, context, product, resolvedImportSettings),
      );
      stats.created += result.created;
      stats.updated += result.updated;
      stats.skipped += result.skipped;
      stats.imagesCreated = (stats.imagesCreated ?? 0) + result.imagesCreated;
      stats.imageUrlUpdated =
        (stats.imageUrlUpdated ?? 0) + result.imageUrlUpdated;
      stats.galleryRebuilt =
        (stats.galleryRebuilt ?? 0) + result.galleryRebuilt;
      stats.imagesSkippedBySettings =
        (stats.imagesSkippedBySettings ?? 0) + result.imagesSkippedBySettings;
      stats.skippedLocked =
        (stats.skippedLocked ?? 0) + result.skippedLocked;
      stats.skippedExistingByPolicy =
        (stats.skippedExistingByPolicy ?? 0) + result.skippedExistingByPolicy;
    } catch (error) {
      stats.failed += 1;
      const message =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
          ? "SKU already exists in Base Geral for another source."
          : error instanceof Error
            ? error.message
            : "Could not persist Varejonline product";

      stats.errors?.push({
        externalId: product.externalId,
        externalCode: product.externalCode,
        message,
      });
    }

    persistedCount += 1;
    if (persistedCount % pageSize === 0) {
      await context.onProgress?.(stats).catch(() => undefined);
    }
  }

  const fiscalCategoryNames = collectFiscalCategoryNames(productsToPersist);
  if (fiscalCategoryNames.size > 0) {
    await withBrand(context.brandId, async (tx) => {
      stats.categoriesCleaned = await cleanupEmptyFiscalCategories(
        tx,
        context.brandId,
        fiscalCategoryNames,
      );
    });
  }

  if (stats.errors && stats.errors.length > 500) {
    stats.errors = stats.errors.slice(0, 500);
  }

  return stats;
}

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

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_ITEMS = 1000;
const DEFAULT_BATCH_SIZE = 10;
type Tx = PrismaClient;

function readPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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

function resolveRequestedPriceTableIds(settings: IntegrationImportSettings) {
  const ids = new Set<string>();

  if (settings.pricing.primarySource === "SELECTED_PRICE_TABLE") {
    if (settings.pricing.primaryPriceTableId) {
      ids.add(settings.pricing.primaryPriceTableId);
    }
  }

  if (settings.pricing.priceTablesMode === "SELECTED") {
    settings.pricing.selectedPriceTableIds.forEach((id) => ids.add(id));
  }

  return [...ids];
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
    !settings.pricing.primaryPriceTableId
  ) {
    throw createSyncConfigurationError(
      "Informe o ID da tabela principal antes de sincronizar.",
    );
  }

  if (
    settings.pricing.priceTablesMode === "SELECTED" &&
    settings.pricing.selectedPriceTableIds.length === 0 &&
    !(
      settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
      settings.pricing.primaryPriceTableId
    )
  ) {
    throw createSyncConfigurationError(
      "Informe os IDs das tabelas de preco antes de sincronizar.",
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
  product: NormalizedExternalProduct,
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
        commercialInfoJson: toJsonValue({
          ...product.commercialInfo,
          price: resolvedPrice,
          priceTables: storedTablePrices,
        }),
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
  const maxItems = readPositiveIntegerEnv(
    "VAREJONLINE_PRODUCTS_MAX_ITEMS",
    DEFAULT_MAX_ITEMS,
  );
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
  const requestedPriceTableIds = resolveRequestedPriceTableIds(importSettings);

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
    pageSize,
    maxItems,
    batchSize,
    onlyActive,
    errors: [],
  };
  const normalizedProducts: NormalizedExternalProduct[] = [];

  for (let start = 0; start < maxItems; start += pageSize) {
    const remaining = maxItems - start;
    const quantity = Math.min(pageSize, remaining);
    const payload = await client.get<unknown>("/produtos", {
      inicio: start,
      quantidade: quantity,
      somenteAtivos: onlyActive,
      idsTabelasPrecos:
        requestedPriceTableIds.length > 0
          ? requestedPriceTableIds.join(",")
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

    if (items.length < quantity) {
      break;
    }
  }

  for (const product of normalizedProducts) {
    try {
      const result = await withBrand(context.brandId, async (tx) =>
        upsertProduct(tx, context, product, importSettings),
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
  }

  const fiscalCategoryNames = collectFiscalCategoryNames(normalizedProducts);
  if (fiscalCategoryNames.size > 0) {
    await withBrand(context.brandId, async (tx) => {
      stats.categoriesCleaned = await cleanupEmptyFiscalCategories(
        tx,
        context.brandId,
        fiscalCategoryNames,
      );
    });
  }

  if (stats.errors && stats.errors.length > 20) {
    stats.errors = stats.errors.slice(0, 20);
  }

  return stats;
}

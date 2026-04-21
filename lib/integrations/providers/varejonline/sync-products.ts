import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  IntegrationSyncContext,
  IntegrationSyncStats,
  NormalizedExternalProduct,
} from "@/lib/integrations/core/types";
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

function normalizeSku(product: NormalizedExternalProduct) {
  return (product.externalCode ?? product.externalId).trim();
}

async function resolveCategoryIds(
  tx: Tx,
  brandId: string,
  product: NormalizedExternalProduct,
) {
  if (!product.categoryName) {
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
) {
  const sku = normalizeSku(product);
  const { categoryId, subcategoryId } = await resolveCategoryIds(
    tx,
    context.brandId,
    product,
  );
  const imageUrl = product.imageUrls[0] ?? null;
  const price = product.price !== null ? product.price.toFixed(2) : null;

  const existing = await tx.productBaseV2.findUnique({
    where: {
      integrationConnectionId_sourceExternalId: {
        integrationConnectionId: context.connection.id,
        sourceExternalId: product.externalId,
      },
    },
    select: { id: true },
  });

  const data = {
    sku,
    name: product.name,
    description: product.description,
    line: product.line,
    brand: product.brand,
    barcode: product.barcode,
    additionalBarcodesJson: toJsonValue(product.additionalBarcodes),
    size: product.size,
    department: product.department,
    section: product.section,
    groupName: product.groupName,
    subgroupName: product.subgroupName,
    unit: product.unit,
    ncmCode: product.ncmCode,
    cestCode: product.cestCode,
    taxOrigin: product.taxOrigin,
    taxFci: product.taxFci,
    taxBenefitCode: product.taxBenefitCode,
    productClassification: product.productClassification,
    stockControlMethod: product.stockControlMethod,
    allowSale: product.allowSale,
    ecommerceAvailable: product.ecommerceAvailable,
    marketplaceAvailable: product.marketplaceAvailable,
    imageUrl,
    isActive: product.isActive,
    categoryId,
    subcategoryId,
    sourceType: "INTEGRATION" as const,
    sourceProvider: "VAREJONLINE" as const,
    sourceExternalId: product.externalId,
    sourceExternalCode: product.externalCode,
    sourceUpdatedAt: product.sourceUpdatedAt,
    lastSyncedAt: new Date(),
    price,
    costPrice: toDecimalString(product.costPrice),
    stockQuantity: product.stockQuantity,
    minStockQuantity: toDecimalString(product.minStockQuantity),
    maxStockQuantity: toDecimalString(product.maxStockQuantity),
    weight: toDecimalString(product.weight),
    height: toDecimalString(product.height),
    width: toDecimalString(product.width),
    length: toDecimalString(product.length),
    categoryLevelsJson: toJsonValue(product.categories),
    taxInfoJson: toJsonValue(product.taxInfo),
    commercialInfoJson: toJsonValue(product.commercialInfo),
    logisticsInfoJson: toJsonValue(product.logisticsInfo),
    suppliersJson: toJsonValue(product.suppliers),
    gradeAttributesJson: toJsonValue(product.gradeAttributes),
    externalMetadataJson: toJsonValue(product.rawPayload),
    integrationConnectionId: context.connection.id,
  };

  const saved = existing
    ? await tx.productBaseV2.update({
        where: { id: existing.id },
        data,
        select: { id: true },
      })
    : await tx.productBaseV2.create({
        data: {
          brandId: context.brandId,
          ...data,
        },
        select: { id: true },
      });

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
  }

  return {
    created: existing ? 0 : 1,
    updated: existing ? 1 : 0,
    imagesCreated: product.imageUrls.length,
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

  const stats: IntegrationSyncStats = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    imagesCreated: 0,
    pageSize,
    maxItems,
    batchSize,
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

  for (let index = 0; index < normalizedProducts.length; index += batchSize) {
    const batch = normalizedProducts.slice(index, index + batchSize);

    await withBrand(context.brandId, async (tx) => {
      for (const product of batch) {
        try {
          const result = await upsertProduct(tx, context, product);
          stats.created += result.created;
          stats.updated += result.updated;
          stats.imagesCreated = (stats.imagesCreated ?? 0) + result.imagesCreated;
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
    });
  }

  if (stats.errors && stats.errors.length > 20) {
    stats.errors = stats.errors.slice(0, 20);
  }

  return stats;
}

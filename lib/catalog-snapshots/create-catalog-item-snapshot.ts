import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  CatalogSnapshotAttributes,
  CatalogSnapshotGalleryItem,
} from "@/lib/catalog-snapshots/snapshot-types";

type Tx = Prisma.TransactionClient | PrismaClient;

type SnapshotSource = {
  brandId: string;
  productBaseId: string;
};

function toNumber(value: Prisma.Decimal | null | undefined) {
  return typeof value?.toNumber === "function" ? value.toNumber() : value ?? null;
}

export async function buildCatalogItemSnapshotPayload(
  tx: Tx,
  input: SnapshotSource,
) {
  const product = await tx.productBaseV2.findFirst({
    where: {
      id: input.productBaseId,
      brandId: input.brandId,
    },
    select: {
      id: true,
      sku: true,
      name: true,
      description: true,
      line: true,
      barcode: true,
      brand: true,
      size: true,
      imageUrl: true,
      price: true,
      sourceType: true,
      sourceProvider: true,
      sourceExternalId: true,
      sourceExternalCode: true,
      categoryId: true,
      category: {
        select: {
          name: true,
        },
      },
      subcategoryId: true,
      subcategory: {
        select: {
          name: true,
        },
      },
      images: {
        select: {
          imageUrl: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!product) {
    return null;
  }

  const galleryJson: CatalogSnapshotGalleryItem[] = product.images.map((image) => ({
    imageUrl: image.imageUrl,
    sortOrder: image.sortOrder,
  }));
  const attributesJson: CatalogSnapshotAttributes = {
    line: product.line ?? null,
    size: product.size ?? null,
  };

  return {
    brandId: input.brandId,
    sourceType: product.sourceType,
    sourceProvider: product.sourceProvider,
    sourceExternalId: product.sourceExternalId,
    sourceExternalCode: product.sourceExternalCode,
    name: product.name,
    code: product.sku,
    barcode: product.barcode,
    brand: product.brand,
    description: product.description,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    subcategoryId: product.subcategoryId,
    subcategoryName: product.subcategory?.name ?? null,
    price: toNumber(product.price),
    primaryImageUrl: product.imageUrl,
    galleryJson,
    attributesJson,
  } satisfies Omit<
    Prisma.CatalogItemSnapshotV2UncheckedCreateInput,
    "id" | "catalogItemId" | "snapshotVersion" | "capturedAt" | "refreshedAt"
  >;
}

export async function createOrRefreshCatalogItemSnapshot(
  tx: Tx,
  input: SnapshotSource & { catalogItemId: string },
) {
  const payload = await buildCatalogItemSnapshotPayload(tx, input);
  if (!payload) {
    return null;
  }

  const existing = await tx.catalogItemSnapshotV2.findUnique({
    where: { catalogItemId: input.catalogItemId },
    select: { snapshotVersion: true },
  });

  if (!existing) {
    return tx.catalogItemSnapshotV2.create({
      data: {
        ...payload,
        catalogItemId: input.catalogItemId,
        snapshotVersion: 1,
      },
    });
  }

  return tx.catalogItemSnapshotV2.update({
    where: { catalogItemId: input.catalogItemId },
    data: {
      ...payload,
      snapshotVersion: existing.snapshotVersion + 1,
      refreshedAt: new Date(),
    },
  });
}

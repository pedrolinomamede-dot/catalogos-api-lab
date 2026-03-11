import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import type { ShareLinkPublicV2 } from "@/types/api";

import {
  ShareLinkShell,
  type PublicBrandInfo,
  type PublicCategoryInfo,
  type PublicSubcategoryInfo,
  type ShareLinkProduct,
} from "@/components/public/share-link-shell";
import { compareProductsByLineCategoryMeasure, normalizeCatalogLabel } from "@/lib/catalog/line-grouping";
import { parseCatalogSnapshotGallery } from "@/lib/catalog-snapshots/snapshot-types";
import { parseCatalogSnapshotAttributes } from "@/lib/catalog-snapshots/snapshot-types";
import { withBrand } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CatalogItemResponse = {
  catalogId: string;
  productBaseId: string;
  snapshot?: {
    name: string;
    code: string;
    description?: string | null;
    primaryImageUrl?: string | null;
    galleryJson?: unknown;
    attributesJson?: unknown;
    categoryId?: string | null;
    subcategoryId?: string | null;
  } | null;
  productBase?: {
    id: string;
    name: string;
    sku?: string | null;
    line?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    categoryId?: string | null;
    subcategoryId?: string | null;
  } | null;
};

function buildGalleryImageUrls(
  primaryImageUrl?: string | null,
  galleryImages?: Array<{ imageUrl: string; sortOrder: number }> | null,
) {
  const dedupedUrls: string[] = [];
  const seen = new Set<string>();

  const add = (url?: string | null) => {
    const normalized = typeof url === "string" ? url.trim() : "";
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    dedupedUrls.push(normalized);
  };

  add(primaryImageUrl ?? null);

  const sortedGallery = [...(galleryImages ?? [])].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.imageUrl.localeCompare(b.imageUrl);
  });

  sortedGallery.forEach((image) => add(image.imageUrl));
  return dedupedUrls;
}

function buildGalleryMap(
  rows: Array<{ productBaseId: string; imageUrl: string; sortOrder: number }>,
) {
  const map: Record<string, Array<{ imageUrl: string; sortOrder: number }>> = {};
  rows.forEach((row) => {
    if (!map[row.productBaseId]) {
      map[row.productBaseId] = [];
    }
    map[row.productBaseId].push({
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
    });
  });
  return map;
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error("Missing host header");
  }
  return `${proto}://${host}`;
}

async function fetchShareLink(baseUrl: string, identifier: string) {
  const response = await fetch(
    `${baseUrl}/api/v2/share-links/by-token/${identifier}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load share link");
  }

  const payload = (await response.json()) as { data: ShareLinkPublicV2 };
  return payload.data;
}

function composeProductDescription(
  description?: string | null,
  subcategoryName?: string | null,
) {
  const subcategory = normalizeCatalogLabel(subcategoryName);
  const normalizedDescription = normalizeCatalogLabel(description);

  if (subcategory && normalizedDescription) {
    return `Subcategoria: ${subcategory}. ${normalizedDescription}`;
  }
  if (subcategory) {
    return `Subcategoria: ${subcategory}`;
  }

  return normalizedDescription ?? null;
}

export default async function ShareLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: identifier } = await params;

  let shareLink: ShareLinkPublicV2 | null = null;
  try {
    const baseUrl = await getBaseUrl();
    shareLink = await fetchShareLink(baseUrl, identifier);
  } catch {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10">
        <h1 className="text-xl font-semibold text-foreground">
          Nao foi possivel carregar o link.
        </h1>
        <p className="text-sm text-muted-foreground">
          Verifique sua conexao ou tente novamente mais tarde.
        </p>
      </div>
    );
  }

  if (!shareLink) {
    notFound();
  }

  const catalogIds = shareLink.catalogs.map((catalog) => catalog.id);
  const {
    brand,
    categories,
    subcategories,
    catalogItems,
    galleryRows,
  }: {
    brand: PublicBrandInfo | null;
    categories: PublicCategoryInfo[];
    subcategories: PublicSubcategoryInfo[];
    catalogItems: CatalogItemResponse[];
    galleryRows: Array<{ productBaseId: string; imageUrl: string; sortOrder: number }>;
  } = await withBrand(shareLink.brandId, async (tx) => {
    const [brandInfo, categoryRows, subcategoryRows, catalogRows] =
      await Promise.all([
        tx.brand.findUnique({
          where: { id: shareLink.brandId },
          select: { name: true, logoUrl: true },
        }),
        tx.categoryV2.findMany({
          where: { brandId: shareLink.brandId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        tx.subcategoryV2.findMany({
          where: { brandId: shareLink.brandId },
          select: { id: true, name: true, categoryId: true },
          orderBy: { name: "asc" },
        }),
        catalogIds.length
          ? tx.catalogItemV2.findMany({
              where: {
                brandId: shareLink.brandId,
                catalogId: { in: catalogIds },
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
              select: {
                catalogId: true,
                productBaseId: true,
                snapshot: {
                  select: {
                    name: true,
                    code: true,
                    description: true,
                    primaryImageUrl: true,
                    galleryJson: true,
                    attributesJson: true,
                    categoryId: true,
                    subcategoryId: true,
                  },
                },
                productBase: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    line: true,
                    description: true,
                    imageUrl: true,
                    categoryId: true,
                    subcategoryId: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
      ]);

    const productBaseIds = Array.from(new Set(catalogRows.map((row) => row.productBaseId)));

    const imageRows = productBaseIds.length
      ? await tx.$queryRaw<
          Array<{ productBaseId: string; imageUrl: string; sortOrder: number }>
        >`
          SELECT
            "productBaseId",
            "imageUrl",
            "sortOrder"
          FROM "ProductBaseImageV2"
          WHERE
            "brandId" = ${shareLink.brandId}::uuid
            AND "productBaseId" IN (${Prisma.join(
              productBaseIds.map((productBaseId) => Prisma.sql`${productBaseId}::uuid`),
            )})
          ORDER BY "productBaseId" ASC, "sortOrder" ASC, "createdAt" ASC
        `
      : [];

    return {
      brand: brandInfo,
      categories: categoryRows,
      subcategories: subcategoryRows,
      catalogItems: catalogRows,
      galleryRows: imageRows,
    };
  });

  const galleryByProductBaseId = buildGalleryMap(galleryRows);

  const productsByCatalog: Record<string, ShareLinkProduct[]> = {};
  shareLink.catalogs.forEach((catalog) => {
    productsByCatalog[catalog.id] = [];
  });
  catalogItems.forEach((item: CatalogItemResponse) => {
    const snapshotGallery = parseCatalogSnapshotGallery(item.snapshot?.galleryJson);
    const snapshotAttributes = parseCatalogSnapshotAttributes(item.snapshot?.attributesJson);
    const primaryImageUrl =
      item.snapshot?.primaryImageUrl ?? item.productBase?.imageUrl ?? null;
    const galleryImageUrls =
      snapshotGallery.length > 0
        ? buildGalleryImageUrls(primaryImageUrl, snapshotGallery)
        : buildGalleryImageUrls(
            primaryImageUrl,
            galleryByProductBaseId[item.productBaseId] ?? [],
          );

    const list = productsByCatalog[item.catalogId] ?? [];
    const subcategoryName =
      item.snapshot?.subcategoryId
        ? subcategories.find((entry) => entry.id === item.snapshot?.subcategoryId)?.name ?? null
        : item.productBase?.subcategoryId
          ? subcategories.find((entry) => entry.id === item.productBase?.subcategoryId)?.name ?? null
          : null;
    list.push({
      id: item.productBaseId,
      name: item.snapshot?.name ?? item.productBase?.name ?? "Produto",
      sku: item.snapshot?.code ?? item.productBase?.sku ?? null,
      lineLabel:
        normalizeCatalogLabel(snapshotAttributes.line) ??
        normalizeCatalogLabel(item.productBase?.line) ??
        null,
      sizeLabel:
        normalizeCatalogLabel(snapshotAttributes.size) ?? null,
      description: composeProductDescription(
        item.snapshot?.description ?? item.productBase?.description ?? null,
        subcategoryName,
      ),
      imageUrl: primaryImageUrl,
      galleryImageUrls,
      categoryId: item.snapshot?.categoryId ?? item.productBase?.categoryId ?? null,
      subcategoryId:
        item.snapshot?.subcategoryId ?? item.productBase?.subcategoryId ?? null,
      catalogId: item.catalogId,
    });
    productsByCatalog[item.catalogId] = list;
  });

  Object.keys(productsByCatalog).forEach((catalogId) => {
    productsByCatalog[catalogId].sort(compareProductsByLineCategoryMeasure);
  });

  return (
    <ShareLinkShell
      shareLink={shareLink}
      brand={brand ?? { name: "Catalogo", logoUrl: null }}
      categories={categories}
      subcategories={subcategories}
      productsByCatalog={productsByCatalog}
    />
  );
}

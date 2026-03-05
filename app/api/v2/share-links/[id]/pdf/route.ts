import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import {
  parseCatalogSnapshotAttributes,
  parseCatalogSnapshotGallery,
} from "@/lib/catalog-snapshots/snapshot-types";
import { withBrand } from "@/lib/prisma";
import { renderPdf } from "@/lib/pdf/render-pdf";
import type { ShareLinkPdfData, ShareLinkPdfProduct } from "@/lib/pdf/share-link-pdf";
import { isPrismaMissingColumnError } from "@/lib/prisma/errors";
import { jsonError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

const UNIT_RANK: Record<string, number> = {
  g: 1,
  kg: 2,
  ml: 3,
  l: 4,
};

function normalizeLabel(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function parseMeasure(value?: string | null) {
  const raw = normalizeLabel(value);
  if (!raw) {
    return {
      isMissing: true,
      unitRank: Number.POSITIVE_INFINITY,
      numericValue: Number.POSITIVE_INFINITY,
      normalizedUnit: "",
      label: "",
    };
  }

  const compact = raw.toLowerCase().replace(/\s+/g, "");
  const match = compact.match(/^(\d+(?:[.,]\d+)?)([a-zA-Z]+)$/);
  if (!match) {
    return {
      isMissing: false,
      unitRank: UNIT_RANK[compact] ?? 99,
      numericValue: Number.POSITIVE_INFINITY,
      normalizedUnit: compact,
      label: raw,
    };
  }

  const numericPart = Number.parseFloat(match[1].replace(",", "."));
  const unit = match[2];

  return {
    isMissing: false,
    unitRank: UNIT_RANK[unit] ?? 99,
    numericValue: Number.isFinite(numericPart) ? numericPart : Number.POSITIVE_INFINITY,
    normalizedUnit: unit,
    label: `${match[1]}${unit}`,
  };
}

function compareProductsForPdf(a: ShareLinkPdfProduct, b: ShareLinkPdfProduct) {
  const categoryA = normalizeLabel(a.categoryName) ?? "Outros Produtos";
  const categoryB = normalizeLabel(b.categoryName) ?? "Outros Produtos";
  const categoryDiff = categoryA.localeCompare(categoryB, "pt-BR", { sensitivity: "base" });
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  const measureA = parseMeasure(a.sizeLabel);
  const measureB = parseMeasure(b.sizeLabel);

  if (measureA.isMissing !== measureB.isMissing) {
    return measureA.isMissing ? 1 : -1;
  }

  if (measureA.unitRank !== measureB.unitRank) {
    return measureA.unitRank - measureB.unitRank;
  }

  if (measureA.numericValue !== measureB.numericValue) {
    return measureA.numericValue - measureB.numericValue;
  }

  const labelDiff = measureA.label.localeCompare(measureB.label, "pt-BR", {
    sensitivity: "base",
  });
  if (labelDiff !== 0) {
    return labelDiff;
  }

  const nameDiff = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
  if (nameDiff !== 0) {
    return nameDiff;
  }

  const skuA = normalizeLabel(a.sku) ?? "";
  const skuB = normalizeLabel(b.sku) ?? "";
  return skuA.localeCompare(skuB, "pt-BR", { sensitivity: "base" });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let pdfData: ShareLinkPdfData | null;
  try {
    pdfData = await withBrand(auth.brandId, async (tx) => {
      const shareLink = await tx.shareLinkV2.findFirst({
        where: {
          id,
          brandId: auth.brandId,
        },
      });

      if (!shareLink || shareLink.isRevoked) {
        return null;
      }

      const brand = await tx.brand.findFirst({
        where: { id: auth.brandId },
        select: {
          name: true,
          logoUrl: true,
        },
      });

      const shareLinkCatalogs = await tx.shareLinkCatalogV2.findMany({
        where: {
          shareLinkId: shareLink.id,
          brandId: auth.brandId,
        },
        orderBy: { createdAt: "asc" },
        include: {
          catalog: {
            select: {
              id: true,
              name: true,
              description: true,
              pdfBackgroundImageUrl: true,
              pdfHeaderLeftLogoUrl: true,
              pdfHeaderRightLogoUrl: true,
              pdfStripeBgColor: true,
              pdfStripeLineColor: true,
              pdfStripeTextColor: true,
              pdfStripeFontFamily: true,
              pdfStripeFontWeight: true,
              pdfStripeFontSize: true,
            },
          },
        },
      });

      const catalogs = await Promise.all(
        shareLinkCatalogs.map(async (entry) => {
          const items = await tx.catalogItemV2.findMany({
            where: {
              catalogId: entry.catalogId,
              brandId: auth.brandId,
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              snapshot: {
                select: {
                  name: true,
                  code: true,
                  brand: true,
                  description: true,
                  categoryName: true,
                  subcategoryName: true,
                  primaryImageUrl: true,
                  galleryJson: true,
                  attributesJson: true,
                },
              },
              productBase: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  brand: true,
                  description: true,
                  imageUrl: true,
                  size: true,
                  category: {
                    select: {
                      name: true,
                    },
                  },
                  subcategory: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          });

          const productBaseIds = items
            .map((item) => item.productBase?.id)
            .filter((productBaseId): productBaseId is string => Boolean(productBaseId));

          const galleryRows = productBaseIds.length
            ? await tx.productBaseImageV2.findMany({
                where: {
                  brandId: auth.brandId,
                  productBaseId: {
                    in: productBaseIds,
                  },
                },
                orderBy: [
                  { productBaseId: "asc" },
                  { sortOrder: "asc" },
                  { createdAt: "asc" },
                ],
                select: {
                  productBaseId: true,
                  imageUrl: true,
                },
              })
            : [];

          const fallbackByProductId = new Map<string, string>();
          galleryRows.forEach((row) => {
            if (!fallbackByProductId.has(row.productBaseId)) {
              fallbackByProductId.set(row.productBaseId, row.imageUrl);
            }
          });

          const products = items.reduce<ShareLinkPdfProduct[]>((acc, item) => {
              const snapshot = item.snapshot;
              const product = item.productBase;
              if (!snapshot && !product) {
                return acc;
              }

              const fallbackImageUrl = product?.id
                ? fallbackByProductId.get(product.id) ?? null
                : null;
              const snapshotGallery = parseCatalogSnapshotGallery(snapshot?.galleryJson);
              const snapshotAttributes = parseCatalogSnapshotAttributes(snapshot?.attributesJson);
              const sizeLabel = normalizeLabel(snapshotAttributes.size) ?? normalizeLabel(product?.size);

              acc.push({
                id: product?.id ?? `${entry.catalog.id}-${snapshot?.code ?? "snapshot"}`,
                name: snapshot?.name ?? product?.name ?? "Produto",
                sku: snapshot?.code ?? product?.sku ?? null,
                sizeLabel,
                brand: snapshot?.brand ?? product?.brand ?? null,
                description: snapshot?.description ?? product?.description ?? null,
                categoryName:
                  snapshot?.categoryName ?? product?.category?.name ?? null,
                subcategoryName:
                  snapshot?.subcategoryName ?? product?.subcategory?.name ?? null,
                primaryImageUrl:
                  snapshot?.primaryImageUrl ?? product?.imageUrl ?? null,
                fallbackImageUrl:
                  snapshotGallery[0]?.imageUrl ?? fallbackImageUrl ?? null,
              });

              return acc;
            }, []);
          products.sort(compareProductsForPdf);

          return {
            id: entry.catalog.id,
            name: entry.catalog.name,
            description: entry.catalog.description,
            pdfBackgroundImageUrl: entry.catalog.pdfBackgroundImageUrl,
            pdfHeaderLeftLogoUrl: entry.catalog.pdfHeaderLeftLogoUrl,
            pdfHeaderRightLogoUrl: entry.catalog.pdfHeaderRightLogoUrl,
            pdfStripeBgColor: entry.catalog.pdfStripeBgColor,
            pdfStripeLineColor: entry.catalog.pdfStripeLineColor,
            pdfStripeTextColor: entry.catalog.pdfStripeTextColor,
            pdfStripeFontFamily: entry.catalog.pdfStripeFontFamily,
            pdfStripeFontWeight: entry.catalog.pdfStripeFontWeight,
            pdfStripeFontSize: entry.catalog.pdfStripeFontSize,
            products,
          };
        }),
      );

      return {
        brandName: brand?.name ?? "Catalogo",
        brandLogoUrl: brand?.logoUrl ?? null,
        shareLinkName: shareLink.name,
        generatedAt: new Date(),
        catalogCount: catalogs.length,
        catalogs,
      };
    });
  } catch (error) {
    if (isPrismaMissingColumnError(error)) {
      return jsonError(
        503,
        "schema_migration_required",
        "Banco desatualizado: aplique as migrations pendentes.",
      );
    }
    return jsonError(500, "internal_error", "Internal Server Error");
  }

  if (!pdfData) {
    return jsonError(404, "not_found", "Share link not found");
  }

  const pdfBuffer = await renderPdf(pdfData);
  const pdfBody = new Uint8Array(pdfBuffer);

  return new NextResponse(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"catalog.pdf\"",
    },
  });
}

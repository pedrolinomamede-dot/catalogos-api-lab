import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { requireRole } from "@/lib/authz";
import type { ProductImageLayout } from "@/types/api";
import { compareProductsByLineCategoryMeasure, normalizeCatalogLabel } from "@/lib/catalog/line-grouping";
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
const IMAGE_METADATA_TIMEOUT_MS = 6_000;

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

function resolveImageUrl(url?: string | null) {
  const normalized = typeof url === "string" ? url.trim() : "";
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    const base = process.env.PUBLIC_BASE_URL?.trim();
    if (!base) {
      return null;
    }
    return `${base.replace(/\/$/, "")}${normalized}`;
  }

  return null;
}

async function fetchImageBytes(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_METADATA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "force-cache",
    });
    if (!response.ok) {
      return null;
    }

    const payload = await response.arrayBuffer();
    if (payload.byteLength === 0) {
      return null;
    }

    return Buffer.from(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveImageAspectRatio(
  url: string | null,
  cache: Map<string, Promise<number | null>>,
) {
  const resolvedUrl = resolveImageUrl(url);
  if (!resolvedUrl) {
    return null;
  }

  let pending = cache.get(resolvedUrl);
  if (!pending) {
    pending = (async () => {
      const bytes = await fetchImageBytes(resolvedUrl);
      if (!bytes) {
        return null;
      }

      try {
        const trimmed = await sharp(bytes).rotate().trim().toBuffer({ resolveWithObject: true });
        const width = trimmed.info.width ?? 0;
        const height = trimmed.info.height ?? 0;
        if (width > 0 && height > 0) {
          return width / height;
        }
      } catch {
        return null;
      }

      return null;
    })();

    cache.set(resolvedUrl, pending);
  }

  return pending;
}

async function enrichPdfImageAspectRatios(data: ShareLinkPdfData) {
  const cache = new Map<string, Promise<number | null>>();

  await Promise.all(
    data.catalogs.map(async (catalog) => {
      await Promise.all(
        catalog.products.map(async (product) => {
          product.imageAspectRatio = await resolveImageAspectRatio(
            product.primaryImageUrl ?? product.fallbackImageUrl ?? null,
            cache,
          );
        }),
      );
    }),
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const modeParam = request.nextUrl.searchParams.get("mode")?.trim().toLowerCase();
  const variant = modeParam === "editavel" ? "editable" : "final";
  const themeParam = request.nextUrl.searchParams.get("theme")?.trim().toLowerCase() ?? null;

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
              pdfTheme: true,
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
                  line: true,
                  imageLayoutJson: true,
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

          const productCandidates = items.map((item) => {
                const snapshot = item.snapshot;
                const product = item.productBase;
                if (!snapshot && !product) {
                  return null;
                }

                const fallbackImageUrl = product?.id
                  ? fallbackByProductId.get(product.id) ?? null
                  : null;
                const snapshotGallery = parseCatalogSnapshotGallery(snapshot?.galleryJson);
                const snapshotAttributes = parseCatalogSnapshotAttributes(snapshot?.attributesJson);
                const sizeLabel =
                  normalizeCatalogLabel(snapshotAttributes.size) ??
                  normalizeCatalogLabel(product?.size);
                const lineLabel =
                  normalizeCatalogLabel(snapshotAttributes.line) ??
                  normalizeCatalogLabel(product?.line);
                const subcategoryName =
                  snapshot?.subcategoryName ?? product?.subcategory?.name ?? null;

                const imageLayout =
                  (snapshotAttributes.imageLayout as ProductImageLayout | null | undefined) ??
                  (product?.imageLayoutJson as ProductImageLayout | null | undefined) ??
                  null;
                const primaryImageUrl =
                  snapshot?.primaryImageUrl ?? product?.imageUrl ?? null;
                const resolvedFallbackImageUrl =
                  snapshotGallery[0]?.imageUrl ?? fallbackImageUrl ?? null;

                return {
                  id: product?.id ?? `${entry.catalog.id}-${snapshot?.code ?? "snapshot"}`,
                  name: snapshot?.name ?? product?.name ?? "Produto",
                  sku: snapshot?.code ?? product?.sku ?? null,
                  imageAspectRatio: null,
                  lineLabel,
                  sizeLabel,
                  imageLayout,
                  brand: snapshot?.brand ?? product?.brand ?? null,
                  description: composeProductDescription(
                    snapshot?.description ?? product?.description ?? null,
                    subcategoryName,
                  ),
                  categoryName:
                    snapshot?.categoryName ?? product?.category?.name ?? null,
                  subcategoryName,
                  primaryImageUrl,
                  fallbackImageUrl: resolvedFallbackImageUrl,
                } satisfies ShareLinkPdfProduct;
              });
          const products: ShareLinkPdfProduct[] = [];
          for (const product of productCandidates) {
            if (product) {
              products.push(product);
            }
          }
          products.sort(compareProductsByLineCategoryMeasure);

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
            pdfTheme: entry.catalog.pdfTheme,
            products,
          };
        }),
      );

      const resolvedTheme =
        themeParam ?? catalogs[0]?.pdfTheme ?? null;

      const result: ShareLinkPdfData = {
        brandName: brand?.name ?? "Catalogo",
        brandLogoUrl: brand?.logoUrl ?? null,
        shareLinkName: shareLink.name,
        generatedAt: new Date(),
        catalogCount: catalogs.length,
        catalogs,
      };

      if (resolvedTheme) {
        (result as Record<string, unknown>).templateVersion = resolvedTheme;
      }

      return result;
    });
  } catch (error) {
    if (isPrismaMissingColumnError(error)) {
      return jsonError(
        503,
        "schema_migration_required",
        "Banco desatualizado: aplique as migrations pendentes.",
      );
    }
    console.error("share-link-pdf:data-build-failed", {
      shareLinkId: id,
      variant,
      brandId: auth.brandId,
      error,
    });
    return jsonError(500, "internal_error", "Internal Server Error");
  }

  if (!pdfData) {
    return jsonError(404, "not_found", "Share link not found");
  }

  try {
    await enrichPdfImageAspectRatios(pdfData);
  } catch (error) {
    console.error("share-link-pdf:image-metadata-failed", {
      shareLinkId: id,
      variant,
      brandId: auth.brandId,
      error,
    });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderPdf(pdfData, { variant });
  } catch (error) {
    console.error("share-link-pdf:render-failed", {
      shareLinkId: id,
      variant,
      brandId: auth.brandId,
      catalogCount: pdfData.catalogs.length,
      error,
    });
    return jsonError(500, "internal_error", "Internal Server Error");
  }
  const pdfBody = new Uint8Array(pdfBuffer);
  const fileName = variant === "editable" ? "catalog-editavel.pdf" : "catalog.pdf";

  return new NextResponse(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}

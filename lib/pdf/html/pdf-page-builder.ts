import type {
  ShareLinkPdfCatalog,
  ShareLinkPdfData,
  ShareLinkPdfProduct,
} from "@/lib/pdf/share-link-pdf";
import { buildLineCategoryMeasureGroups } from "@/lib/catalog/line-grouping";
import {
  chunkProductsForPdfRows,
  type ProductRowModel,
} from "@/lib/pdf/product-row-layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PdfPageBlock =
  | {
      id: string;
      type: "catalog-intro";
      catalog: ShareLinkPdfCatalog;
    }
  | {
      id: string;
      type: "line-header";
      lineLabel: string;
    }
  | {
      id: string;
      type: "group-lead";
      catalog: ShareLinkPdfCatalog;
      categoryName: string;
      measureLabel: string;
      row: ProductRowModel<ShareLinkPdfProduct>;
    }
  | {
      id: string;
      type: "group-row";
      row: ProductRowModel<ShareLinkPdfProduct>;
    }
  | {
      id: string;
      type: "catalog-empty";
      catalog: ShareLinkPdfCatalog;
    };

export type PdfPageModel = {
  id: string;
  catalogId: string;
  blocks: PdfPageBlock[];
  usedHeightMm: number;
  backgroundImageUrl: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PAGE_HEIGHT_MM = 373.3;
export const SAFE_TOP_MM = 8;
export const SAFE_BOTTOM_MM = 14;
export const DATE_ROW_RESERVE_MM = 4;
export const PAGE_CONTENT_HEIGHT_MM =
  PAGE_HEIGHT_MM - SAFE_TOP_MM - SAFE_BOTTOM_MM - DATE_ROW_RESERVE_MM;

export const BLOCK_HEIGHT_MM = {
  catalogIntro: 42,
  lineHeader: 16,
  groupLeadCompact: 72,
  groupLeadWide: 82,
  groupRowCompact: 64,
  groupRowWide: 74,
  catalogEmpty: 28,
};

// ---------------------------------------------------------------------------
// Utility functions (shared across themes)
// ---------------------------------------------------------------------------

export function normalizeLabel(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

export function resolveImageSrc(url?: string | null) {
  const normalized = typeof url === "string" ? url.trim() : "";
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized) || normalized.startsWith("data:")) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return null;
}

export function resolveHexColor(value: string | null | undefined, fallback: string) {
  const normalized = normalizeLabel(value);
  if (!normalized) {
    return fallback;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }
  return normalized.toUpperCase();
}

export function resolveStripeFontWeight(value: number | null | undefined) {
  if (value === 400 || value === 500 || value === 600 || value === 700) {
    return value;
  }
  return 600;
}

export function resolveStripeFontSize(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 18;
  }
  return Math.max(12, Math.min(36, Math.round(value)));
}

export function formatCompactDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function buildBrandInitials(brandName: string) {
  const parts = brandName
    .split(/\s+/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 2);

  if (parts.length === 0) {
    return "PDF";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function toCssBackgroundImage(url: string) {
  return `url('${url.replace(/'/g, "%27")}')`;
}

// ---------------------------------------------------------------------------
// Pagination engine
// ---------------------------------------------------------------------------

function resolveRowBlockHeight(
  row: ProductRowModel<ShareLinkPdfProduct>,
  needsLead: boolean,
) {
  if (row.columns === 4) {
    return needsLead ? BLOCK_HEIGHT_MM.groupLeadWide : BLOCK_HEIGHT_MM.groupRowWide;
  }

  return needsLead ? BLOCK_HEIGHT_MM.groupLeadCompact : BLOCK_HEIGHT_MM.groupRowCompact;
}

export function buildPdfPages(data: ShareLinkPdfData): PdfPageModel[] {
  let pageIndex = 0;
  const pages: PdfPageModel[] = [];

  data.catalogs.forEach((catalog, catalogIndex) => {
    const backgroundImageUrl = resolveImageSrc(catalog.pdfBackgroundImageUrl) ?? null;

    const createPage = () => {
      pageIndex += 1;
      const page: PdfPageModel = {
        id: `catalog-${catalogIndex + 1}-page-${pageIndex}`,
        catalogId: catalog.id,
        blocks: [],
        usedHeightMm: 0,
        backgroundImageUrl,
      };
      pages.push(page);
      return page;
    };

    let currentPage = createPage();

    const pushBlock = (block: PdfPageBlock, heightMm: number) => {
      const needsBreak =
        currentPage.blocks.length > 0 &&
        currentPage.usedHeightMm + heightMm > PAGE_CONTENT_HEIGHT_MM;

      if (needsBreak) {
        currentPage = createPage();
      }

      currentPage.blocks.push(block);
      currentPage.usedHeightMm += heightMm;
    };

    pushBlock(
      {
        id: `catalog-${catalog.id}-intro`,
        type: "catalog-intro",
        catalog,
      },
      BLOCK_HEIGHT_MM.catalogIntro,
    );

    const lineGroups = buildLineCategoryMeasureGroups(catalog.products);
    const hasProducts = lineGroups.some((lineGroup) =>
      lineGroup.groups.some((group) => group.products.length > 0),
    );
    if (!hasProducts) {
      pushBlock(
        {
          id: `catalog-${catalog.id}-empty`,
          type: "catalog-empty",
          catalog,
        },
        BLOCK_HEIGHT_MM.catalogEmpty,
      );
      return;
    }

    lineGroups.forEach((lineGroup, lineIndex) => {
      if (lineGroup.lineLabel) {
        const firstGroup = lineGroup.groups[0];
        const requiredHeight =
          BLOCK_HEIGHT_MM.lineHeader +
          (firstGroup
            ? resolveRowBlockHeight(chunkProductsForPdfRows(firstGroup.products)[0], true)
            : 0);
        const shouldBreakBeforeLine =
          currentPage.blocks.length > 0 &&
          currentPage.usedHeightMm + requiredHeight > PAGE_CONTENT_HEIGHT_MM;

        if (shouldBreakBeforeLine) {
          currentPage = createPage();
        }

        pushBlock(
          {
            id: `catalog-${catalog.id}-line-${lineIndex + 1}`,
            type: "line-header",
            lineLabel: lineGroup.lineLabel,
          },
          BLOCK_HEIGHT_MM.lineHeader,
        );
      }

      lineGroup.groups.forEach((group, groupIndex) => {
        const rows = chunkProductsForPdfRows(group.products);
        let stripeRendered = false;

        rows.forEach((row, rowIndex) => {
          let needsLead = !stripeRendered;

          for (;;) {
            const heightMm = resolveRowBlockHeight(row, needsLead);

            const needsBreak =
              currentPage.blocks.length > 0 &&
              currentPage.usedHeightMm + heightMm > PAGE_CONTENT_HEIGHT_MM;

            if (needsBreak) {
              currentPage = createPage();
              continue;
            }

            if (needsLead) {
              pushBlock(
                {
                  id: `catalog-${catalog.id}-${group.id}-lead-${lineIndex}-${groupIndex}-${rowIndex}`,
                  type: "group-lead",
                  catalog,
                  categoryName: group.categoryName,
                  measureLabel: group.measureLabel,
                  row,
                },
                heightMm,
              );
              stripeRendered = true;
            } else {
              pushBlock(
                {
                  id: `catalog-${catalog.id}-${group.id}-row-${lineIndex}-${groupIndex}-${rowIndex}`,
                  type: "group-row",
                  row,
                },
                heightMm,
              );
            }

            break;
          }
        });
      });
    });
  });

  return pages;
}

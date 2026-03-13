import { Manrope, Playfair_Display, Poppins } from "next/font/google";
import type { ReactNode } from "react";

import type {
  ShareLinkPdfCatalog,
  ShareLinkPdfData,
  ShareLinkPdfProduct,
} from "@/lib/pdf/share-link-pdf";
import { resolveProductImageLayout } from "@/lib/catalog/image-layout";
import { buildLineCategoryMeasureGroups } from "@/lib/catalog/line-grouping";
import {
  chunkProductsForPdfRows,
  type ProductRowColumns,
  type ProductRowModel,
} from "@/lib/pdf/product-row-layout";

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type PdfPageBlock =
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

type PdfPageModel = {
  id: string;
  catalogId: string;
  blocks: PdfPageBlock[];
  usedHeightMm: number;
  backgroundImageUrl: string | null;
};

const PAGE_HEIGHT_MM = 373.3;
const SAFE_TOP_MM = 8;
const SAFE_BOTTOM_MM = 14;
const DATE_ROW_RESERVE_MM = 4;
const PAGE_CONTENT_HEIGHT_MM =
  PAGE_HEIGHT_MM - SAFE_TOP_MM - SAFE_BOTTOM_MM - DATE_ROW_RESERVE_MM;

const BLOCK_HEIGHT_MM = {
  catalogIntro: 42,
  lineHeader: 16,
  groupLeadCompact: 72,
  groupLeadWide: 82,
  groupRowCompact: 64,
  groupRowWide: 74,
  catalogEmpty: 28,
};

const STRIPE_FONT_CLASS_BY_VALUE: Record<string, string> = {
  MANROPE: sans.className,
  PLAYFAIR: display.className,
  POPPINS: poppins.className,
};

function normalizeLabel(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function resolveImageSrc(url?: string | null) {
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

function resolveRowBlockHeight(
  row: ProductRowModel<ShareLinkPdfProduct>,
  needsLead: boolean,
) {
  if (row.columns === 4) {
    return needsLead ? BLOCK_HEIGHT_MM.groupLeadWide : BLOCK_HEIGHT_MM.groupRowWide;
  }

  return needsLead ? BLOCK_HEIGHT_MM.groupLeadCompact : BLOCK_HEIGHT_MM.groupRowCompact;
}

function resolveHexColor(value: string | null | undefined, fallback: string) {
  const normalized = normalizeLabel(value);
  if (!normalized) {
    return fallback;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }
  return normalized.toUpperCase();
}

function resolveStripeFontWeight(value: number | null | undefined) {
  if (value === 400 || value === 500 || value === 600 || value === 700) {
    return value;
  }
  return 600;
}

function resolveStripeFontSize(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 18;
  }
  return Math.max(12, Math.min(36, Math.round(value)));
}

function resolveStripeFontClass(value: string | null | undefined) {
  const normalized = normalizeLabel(value) ?? "MANROPE";
  return STRIPE_FONT_CLASS_BY_VALUE[normalized] ?? sans.className;
}

function formatCompactDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function buildBrandInitials(brandName: string) {
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

function toCssBackgroundImage(url: string) {
  return `url('${url.replace(/'/g, "%27")}')`;
}

function buildPdfPages(data: ShareLinkPdfData): PdfPageModel[] {
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

function PdfCatalogIntro({
  data,
  catalog,
  generatedAt,
}: {
  data: ShareLinkPdfData;
  catalog: ShareLinkPdfCatalog;
  generatedAt: Date;
}) {
  const leftLogoSrc =
    resolveImageSrc(catalog.pdfHeaderLeftLogoUrl) ?? resolveImageSrc(data.brandLogoUrl);
  const rightLogoSrc = resolveImageSrc(catalog.pdfHeaderRightLogoUrl);
  const leftInitials = buildBrandInitials(data.brandName);
  const rightInitials = buildBrandInitials(catalog.name);
  const yearLabel = generatedAt.getUTCFullYear();

  return (
    <header
      className="mx-auto mb-4 flex w-[160mm] items-center justify-between gap-3 rounded-2xl border border-rose-100/70 bg-white/90 px-2.5 py-1.5"
      style={{ boxShadow: "0 8px 22px rgba(20, 28, 47, 0.15)" }}
    >
      {leftLogoSrc ? (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-100 bg-white"
          style={{ boxShadow: "0 5px 14px rgba(20, 28, 47, 0.12)" }}
        >
          <img src={leftLogoSrc} alt="Logo esquerda" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-rose-200 bg-white text-xs text-rose-500">
          {leftInitials}
        </div>
      )}

      <div className="min-w-0 flex-1 text-center">
        <p className={`${sans.className} text-[44px] font-bold uppercase leading-none tracking-[0.04em] text-slate-900`}>
          {catalog.name}
        </p>
        <p className={`${display.className} mt-1 text-[14px] font-semibold leading-none text-rose-600/85`}>
          {yearLabel}
        </p>
      </div>

      {rightLogoSrc ? (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-100 bg-white"
          style={{ boxShadow: "0 5px 14px rgba(20, 28, 47, 0.12)" }}
        >
          <img src={rightLogoSrc} alt="Logo direita" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-rose-200 bg-white text-xs text-rose-500">
          {rightInitials}
        </div>
      )}
    </header>
  );
}

function PdfMeasureStripe({
  catalog,
  categoryName,
  measureLabel,
}: {
  catalog: ShareLinkPdfCatalog;
  categoryName: string;
  measureLabel: string;
}) {
  const stripeBgColor = resolveHexColor(catalog.pdfStripeBgColor, "#0B1B5E");
  const stripeLineColor = resolveHexColor(catalog.pdfStripeLineColor, "#D81B3A");
  const stripeTextColor = resolveHexColor(catalog.pdfStripeTextColor, "#FFFFFF");
  const stripeFontClass = resolveStripeFontClass(catalog.pdfStripeFontFamily);
  const stripeFontWeight = resolveStripeFontWeight(catalog.pdfStripeFontWeight);
  const stripeFontSize = resolveStripeFontSize(catalog.pdfStripeFontSize);

  return (
    <div
      className="mb-3 -mx-[10mm] flex translate-y-[1mm] items-center gap-2 rounded-none px-[10mm] py-1.5"
      style={{
        backgroundColor: stripeBgColor,
        boxShadow: "0 14px 24px rgba(0, 0, 0, 0.42)",
      }}
    >
      <span
        className={`${stripeFontClass} uppercase tracking-[0.2em]`}
        style={{
          color: stripeTextColor,
          fontWeight: stripeFontWeight,
          fontSize: `${stripeFontSize}px`,
          lineHeight: 1.1,
        }}
      >
        {categoryName}
      </span>
      <span className="h-[6px] w-28 rounded-sm" style={{ backgroundColor: stripeLineColor }} />
      <div className="min-w-0">
        <span
          className={`${stripeFontClass}`}
          style={{
            color: stripeTextColor,
            fontWeight: stripeFontWeight,
            fontSize: `${stripeFontSize}px`,
            lineHeight: 1.1,
          }}
        >
          {measureLabel}
        </span>
      </div>
    </div>
  );
}

function PdfLineHeader({ lineLabel }: { lineLabel: string }) {
  return (
    <div className="mb-2 text-center">
      <p className={`${display.className} text-[26px] font-bold italic leading-none text-slate-900`}>
        {lineLabel}
      </p>
      <div className="mx-auto mt-2 h-px w-[72%] bg-rose-200/80" />
    </div>
  );
}

function PdfProductCard({ product }: { product: ShareLinkPdfProduct }) {
  const primaryImage = resolveImageSrc(product.primaryImageUrl);
  const fallbackImage = resolveImageSrc(product.fallbackImageUrl);
  const imageSrc = primaryImage ?? fallbackImage;
  const skuLabel = normalizeLabel(product.sku) ?? "Sem SKU";
  const imageLayout = resolveProductImageLayout(product.sizeLabel, product.imageLayout);
  const visualScale = Math.min(imageLayout.scale * 1.45, 2.35);

  return (
    <article
      className="break-inside-avoid rounded-[20px] px-2 pt-2 pb-2 [page-break-inside:avoid]"
      style={{
        boxShadow: "0 14px 24px rgba(20, 28, 47, 0.14)",
      }}
    >
      <div className="relative flex h-[8.8rem] w-full items-center justify-center overflow-visible">
        {imageSrc ? (
          <div
            className="relative flex h-full w-full items-center justify-center"
            style={{
              transform: `translate(${imageLayout.offsetX}%, ${imageLayout.offsetY}%) scale(${visualScale})`,
              transformOrigin: "center",
            }}
          >
            <img
              src={imageSrc}
              alt={product.name}
              loading="eager"
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md text-xs text-slate-500">
            Sem imagem
          </div>
        )}
      </div>

      <div className="px-1.5 pt-1 pb-1.5">
        <div className="space-y-1.5">
          <p className="line-clamp-4 min-h-[3.1rem] text-[9.5px] font-semibold leading-[1.06] text-slate-900">
            {product.name}
          </p>
          <span
            className="inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[13px] font-bold leading-none"
            style={{
              backgroundColor: "hsl(223 62% 28%)",
              color: "white",
              boxShadow: "inset 0 0 0 1px hsla(223, 62%, 38%, 0.45)",
            }}
          >
            {skuLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

function PdfProductRow({ row }: { row: ProductRowModel<ShareLinkPdfProduct> }) {
  const gridClass = row.columns === 4 ? "grid-cols-4 gap-2" : "grid-cols-5 gap-1.5";

  return (
    <div className={`grid ${gridClass}`}>
      {row.products.map((product) => (
        <PdfProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function PdfPageFrame({
  children,
  generatedAt,
  isLast,
  backgroundImageUrl,
}: {
  children: ReactNode;
  generatedAt: Date;
  isLast: boolean;
  backgroundImageUrl: string | null;
}) {
  return (
    <section
      className={`relative h-[373.3mm] w-full overflow-hidden ${isLast ? "" : "break-after-page"}`}
    >
      {backgroundImageUrl ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage: toCssBackgroundImage(backgroundImageUrl),
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.18) 100%)",
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-0 bg-white" />
      )}

      <div className="relative z-10 flex h-full flex-col px-[10mm] pt-[8mm] pb-[10mm]">
        <div className="mb-1 flex justify-end">
          <span className="text-[11px] text-slate-500/70">{formatCompactDate(generatedAt)}</span>
        </div>
        <div className="relative z-10 flex-1">{children}</div>
      </div>
    </section>
  );
}

function PdfContentLayer({
  data,
  pages,
}: {
  data: ShareLinkPdfData;
  pages: PdfPageModel[];
}) {
  return (
    <main data-pdf-ready="true" className="relative z-10 w-full">
      {pages.map((page, pageIndex) => {
        const isLast = pageIndex === pages.length - 1;

        return (
          <PdfPageFrame
            key={page.id}
            generatedAt={data.generatedAt}
            isLast={isLast}
            backgroundImageUrl={page.backgroundImageUrl}
          >
            {page.blocks.map((block, blockIndex) => {
              if (block.type === "catalog-intro") {
                return (
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-2"}>
                    <PdfCatalogIntro
                      data={data}
                      catalog={block.catalog}
                      generatedAt={data.generatedAt}
                    />
                  </div>
                );
              }

              if (block.type === "group-lead") {
                return (
                  <section
                    key={block.id}
                    className={`break-inside-avoid [page-break-inside:avoid] ${
                      blockIndex === 0 ? "" : "mt-3"
                    }`}
                  >
                    <PdfMeasureStripe
                      catalog={block.catalog}
                      categoryName={block.categoryName}
                      measureLabel={block.measureLabel}
                    />
                    <PdfProductRow row={block.row} />
                  </section>
                );
              }

              if (block.type === "line-header") {
                return (
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-3"}>
                    <PdfLineHeader lineLabel={block.lineLabel} />
                  </div>
                );
              }

              if (block.type === "group-row") {
                return (
                  <div
                    key={block.id}
                    className={`break-inside-avoid [page-break-inside:avoid] ${
                      blockIndex === 0 ? "" : "mt-2"
                    }`}
                  >
                    <PdfProductRow row={block.row} />
                  </div>
                );
              }

              return (
                <div key={block.id} className={blockIndex === 0 ? "" : "mt-4"}>
                  <div className="rounded-2xl border border-rose-100/80 bg-white/75 py-10 text-center text-sm text-slate-500">
                    Nenhum produto neste catalogo.
                  </div>
                </div>
              );
            })}
          </PdfPageFrame>
        );
      })}
    </main>
  );
}

export function CatalogPdfDocument({ data }: { data: ShareLinkPdfData }) {
  const pages = buildPdfPages(data);

  return (
    <div className={`${sans.className} relative isolate bg-white text-slate-900`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:wght@400;500;600;700&display=swap');
        @page {
          size: 210mm 373.3mm;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
        }
        main[data-pdf-ready] {
          padding: 0;
          margin: 0;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>
      <PdfContentLayer data={data} pages={pages} />
    </div>
  );
}

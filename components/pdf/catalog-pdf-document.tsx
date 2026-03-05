import { Manrope, Playfair_Display, Poppins } from "next/font/google";
import type { ReactNode } from "react";

import type {
  ShareLinkPdfCatalog,
  ShareLinkPdfData,
  ShareLinkPdfProduct,
} from "@/lib/pdf/share-link-pdf";

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

type ParsedMeasure = {
  isMissing: boolean;
  unitRank: number;
  numericValue: number;
  normalizedUnit: string;
  normalizedKey: string;
  displayLabel: string;
};

type CategoryMeasureGroup = {
  id: string;
  categoryName: string;
  measureLabel: string;
  measureOrder: ParsedMeasure;
  products: ShareLinkPdfProduct[];
};

type PdfPageBlock =
  | {
      id: string;
      type: "catalog-intro";
      catalog: ShareLinkPdfCatalog;
    }
  | {
      id: string;
      type: "group-lead";
      catalog: ShareLinkPdfCatalog;
      categoryName: string;
      measureLabel: string;
      row: ShareLinkPdfProduct[];
    }
  | {
      id: string;
      type: "group-row";
      row: ShareLinkPdfProduct[];
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

const PRODUCTS_PER_ROW = 3;

const PAGE_HEIGHT_MM = 297;
const SAFE_TOP_MM = 12;
const SAFE_BOTTOM_MM = 16;
const DATE_ROW_RESERVE_MM = 6;
const PAGE_CONTENT_HEIGHT_MM =
  PAGE_HEIGHT_MM - SAFE_TOP_MM - SAFE_BOTTOM_MM - DATE_ROW_RESERVE_MM;

const BLOCK_HEIGHT_MM = {
  catalogIntro: 48,
  groupLead: 104,
  groupRow: 88,
  catalogEmpty: 28,
};

const MEASURE_UNIT_RANK: Record<string, number> = {
  mg: 1,
  g: 2,
  kg: 3,
  ml: 4,
  l: 5,
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

function formatNumericMeasure(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const fixed = value.toFixed(3);
  return fixed.replace(/\.?0+$/, "");
}

function parseMeasure(value?: string | null): ParsedMeasure {
  const raw = normalizeLabel(value);
  if (!raw) {
    return {
      isMissing: true,
      unitRank: Number.POSITIVE_INFINITY,
      numericValue: Number.POSITIVE_INFINITY,
      normalizedUnit: "",
      normalizedKey: "__missing__",
      displayLabel: "Sem medida",
    };
  }

  const compact = raw.toLowerCase().replace(/\s+/g, "");
  const match = compact.match(/^(\d+(?:[.,]\d+)?)([a-zA-Z]+)$/);
  if (!match) {
    return {
      isMissing: false,
      unitRank: MEASURE_UNIT_RANK[compact] ?? 99,
      numericValue: Number.POSITIVE_INFINITY,
      normalizedUnit: compact,
      normalizedKey: `raw:${compact}`,
      displayLabel: raw,
    };
  }

  const numericValue = Number.parseFloat(match[1].replace(",", "."));
  const normalizedUnit = match[2];
  const resolvedNumeric = Number.isFinite(numericValue)
    ? numericValue
    : Number.POSITIVE_INFINITY;
  const numericLabel = formatNumericMeasure(resolvedNumeric);

  return {
    isMissing: false,
    unitRank: MEASURE_UNIT_RANK[normalizedUnit] ?? 99,
    numericValue: resolvedNumeric,
    normalizedUnit,
    normalizedKey: `num:${normalizedUnit}:${resolvedNumeric}`,
    displayLabel: `${numericLabel}${normalizedUnit}`,
  };
}

function compareCategoryName(a: string, b: string) {
  const left = normalizeLabel(a) ?? "Outros Produtos";
  const right = normalizeLabel(b) ?? "Outros Produtos";

  if (left === "Outros Produtos" && right !== "Outros Produtos") {
    return 1;
  }
  if (right === "Outros Produtos" && left !== "Outros Produtos") {
    return -1;
  }

  return left.localeCompare(right, "pt-BR", { sensitivity: "base" });
}

function compareMeasureOrder(a: ParsedMeasure, b: ParsedMeasure) {
  if (a.isMissing !== b.isMissing) {
    return a.isMissing ? 1 : -1;
  }

  if (a.unitRank !== b.unitRank) {
    return a.unitRank - b.unitRank;
  }

  if (a.numericValue !== b.numericValue) {
    return a.numericValue - b.numericValue;
  }

  return a.displayLabel.localeCompare(b.displayLabel, "pt-BR", {
    sensitivity: "base",
  });
}

function compareProductsInGroup(a: ShareLinkPdfProduct, b: ShareLinkPdfProduct) {
  const nameDiff = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
  if (nameDiff !== 0) {
    return nameDiff;
  }

  const skuA = normalizeLabel(a.sku) ?? "";
  const skuB = normalizeLabel(b.sku) ?? "";
  return skuA.localeCompare(skuB, "pt-BR", { sensitivity: "base" });
}

function buildCategoryMeasureGroups(products: ShareLinkPdfProduct[]): CategoryMeasureGroup[] {
  const grouped = new Map<string, CategoryMeasureGroup>();

  products.forEach((product) => {
    const categoryName = normalizeLabel(product.categoryName) ?? "Outros Produtos";
    const measureOrder = parseMeasure(product.sizeLabel);
    const groupKey = `${categoryName}::${measureOrder.normalizedKey}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        id: `group-${grouped.size + 1}`,
        categoryName,
        measureLabel: measureOrder.displayLabel,
        measureOrder,
        products: [],
      });
    }

    grouped.get(groupKey)!.products.push(product);
  });

  const groups = [...grouped.values()];
  groups.forEach((group) => {
    group.products.sort(compareProductsInGroup);
  });

  groups.sort((left, right) => {
    const categoryDiff = compareCategoryName(left.categoryName, right.categoryName);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }
    return compareMeasureOrder(left.measureOrder, right.measureOrder);
  });

  return groups;
}

function chunkProducts(products: ShareLinkPdfProduct[], chunkSize: number) {
  const chunks: ShareLinkPdfProduct[][] = [];
  for (let index = 0; index < products.length; index += chunkSize) {
    chunks.push(products.slice(index, index + chunkSize));
  }

  return chunks;
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

    const groups = buildCategoryMeasureGroups(catalog.products);
    if (groups.length === 0) {
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

    groups.forEach((group, groupIndex) => {
      const rows = chunkProducts(group.products, PRODUCTS_PER_ROW);

      rows.forEach((row, rowIndex) => {
        let needsLead = rowIndex === 0;

        for (;;) {
          const heightMm = needsLead
            ? BLOCK_HEIGHT_MM.groupLead
            : BLOCK_HEIGHT_MM.groupRow;

          const needsBreak =
            currentPage.blocks.length > 0 &&
            currentPage.usedHeightMm + heightMm > PAGE_CONTENT_HEIGHT_MM;

          if (needsBreak) {
            currentPage = createPage();
            needsLead = true;
            continue;
          }

          if (needsLead) {
            pushBlock(
              {
                id: `catalog-${catalog.id}-${group.id}-lead-${groupIndex}-${rowIndex}`,
                type: "group-lead",
                catalog,
                categoryName: group.categoryName,
                measureLabel: group.measureLabel,
                row,
              },
              BLOCK_HEIGHT_MM.groupLead,
            );
          } else {
            pushBlock(
              {
                id: `catalog-${catalog.id}-${group.id}-row-${groupIndex}-${rowIndex}`,
                type: "group-row",
                row,
              },
              BLOCK_HEIGHT_MM.groupRow,
            );
          }

          break;
        }
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
      className="relative mx-auto mb-4 w-[166mm] overflow-hidden rounded-3xl border border-white/55 bg-white/35 px-2.5 py-2"
      style={{ boxShadow: "0 16px 36px rgba(20, 28, 47, 0.2)" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-12 -top-10 h-32 w-32 rounded-full bg-white/35 blur-2xl" />
        <div className="absolute right-8 top-3 h-24 w-24 rounded-full bg-sky-100/45 blur-2xl" />
      </div>

      <div
        className="relative mx-auto flex items-center justify-between gap-4 rounded-2xl border border-rose-100/70 bg-white/90 px-3 py-2.5"
        style={{ boxShadow: "0 8px 22px rgba(20, 28, 47, 0.15)" }}
      >
        {leftLogoSrc ? (
          <div
            className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-100 bg-white"
            style={{ boxShadow: "0 5px 14px rgba(20, 28, 47, 0.12)" }}
          >
            <img src={leftLogoSrc} alt="Logo esquerda" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-rose-200 bg-white text-xs text-rose-500">
            {leftInitials}
          </div>
        )}

        <div className="min-w-0 flex-1 text-center">
          <p className={`${sans.className} text-[44px] font-bold uppercase leading-none tracking-[0.04em] text-slate-900`}>
            {catalog.name}
          </p>
          <p className={`${display.className} mt-1 text-[16px] font-semibold leading-none text-rose-600/85`}>
            {yearLabel}
          </p>
        </div>

        {rightLogoSrc ? (
          <div
            className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-100 bg-white"
            style={{ boxShadow: "0 5px 14px rgba(20, 28, 47, 0.12)" }}
          >
            <img src={rightLogoSrc} alt="Logo direita" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-rose-200 bg-white text-xs text-rose-500">
            {rightInitials}
          </div>
        )}
      </div>
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
      className="mb-4 -mx-[12mm] flex translate-y-[1mm] items-center gap-3 rounded-none px-[12mm] py-2"
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

function PdfProductCard({ product }: { product: ShareLinkPdfProduct }) {
  const primaryImage = resolveImageSrc(product.primaryImageUrl);
  const fallbackImage = resolveImageSrc(product.fallbackImageUrl);
  const imageSrc = primaryImage ?? fallbackImage;
  const categoryName = normalizeLabel(product.categoryName);
  const subcategoryName = normalizeLabel(product.subcategoryName);
  const skuLabel = normalizeLabel(product.sku) ?? "Sem SKU";
  const categoryLine = subcategoryName ? `${categoryName} - ${subcategoryName}` : categoryName;

  return (
    <article
      className="break-inside-avoid overflow-hidden rounded-2xl border [page-break-inside:avoid]"
      style={{
        backgroundColor: "hsla(335, 45%, 98%, 0.6)",
        borderColor: "hsla(336, 35%, 88%, 0.9)",
        boxShadow: "0 14px 28px rgba(20, 28, 47, 0.16)",
      }}
    >
      <div className="relative flex h-56 w-full items-center justify-center bg-transparent">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            loading="eager"
            className="h-full w-full object-contain mix-blend-multiply opacity-[0.96]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md text-xs text-slate-500">
            Sem imagem
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <p className="line-clamp-2 text-base font-semibold text-slate-900">{product.name}</p>
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: "hsl(223 62% 28%)",
              color: "white",
              boxShadow: "inset 0 0 0 1px hsla(223, 62%, 38%, 0.45)",
            }}
          >
            {skuLabel}
          </span>
        </div>
        {categoryLine ? <p className="text-sm text-slate-700">{categoryLine}</p> : null}
      </div>
    </article>
  );
}

function PdfProductRow({ row }: { row: ShareLinkPdfProduct[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {row.map((product) => (
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
      className={`relative h-[297mm] w-full overflow-hidden ${isLast ? "" : "break-after-page"}`}
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

      <div className="relative z-10 flex h-full flex-col px-[12mm] pt-[12mm] pb-[16mm]">
        <div className="mb-2 flex justify-end">
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
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-3"}>
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
                      blockIndex === 0 ? "" : "mt-4"
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

              if (block.type === "group-row") {
                return (
                  <div
                    key={block.id}
                    className={`break-inside-avoid [page-break-inside:avoid] ${
                      blockIndex === 0 ? "" : "mt-3"
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
          size: A4 portrait;
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

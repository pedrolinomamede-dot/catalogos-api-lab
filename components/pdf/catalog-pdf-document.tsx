import { Manrope, Playfair_Display } from "next/font/google";
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

type CategoryGroup = {
  categoryName: string;
  products: ShareLinkPdfProduct[];
};

type PdfPageBlock =
  | {
      id: string;
      type: "brand-header";
    }
  | {
      id: string;
      type: "catalog-header";
      catalog: ShareLinkPdfCatalog;
    }
  | {
      id: string;
      type: "category-lead";
      categoryName: string;
      row: ShareLinkPdfProduct[];
    }
  | {
      id: string;
      type: "category-row";
      categoryName: string;
      row: ShareLinkPdfProduct[];
    }
  | {
      id: string;
      type: "catalog-empty";
    };

type PdfPageModel = {
  id: string;
  blocks: PdfPageBlock[];
  usedHeightMm: number;
  backgroundImageUrl: string | null;
};

const PRODUCTS_PER_ROW = 3;

const PAGE_HEIGHT_MM = 297;
const SAFE_TOP_MM = 12;
const SAFE_BOTTOM_MM = 16;
const FOOTER_RESERVE_MM = 8;
const PAGE_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - SAFE_TOP_MM - SAFE_BOTTOM_MM - FOOTER_RESERVE_MM;

const BLOCK_HEIGHT_MM = {
  brandHeader: 37,
  catalogHeader: 17,
  catalogHeaderWithDescription: 22,
  categoryLead: 90,
  categoryRow: 84,
  catalogEmpty: 26,
};

const DEFAULT_PDF_BACKGROUND_URL = "/pdf/imagem-fundo.jpg";

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

function buildCategoryGroups(products: ShareLinkPdfProduct[]): CategoryGroup[] {
  const grouped = new Map<string, ShareLinkPdfProduct[]>();
  const order: string[] = [];

  products.forEach((product) => {
    const categoryName = normalizeLabel(product.categoryName) ?? "Outros Produtos";
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
      order.push(categoryName);
    }
    grouped.get(categoryName)!.push(product);
  });

  const normalizedOrder = order.filter((name) => name !== "Outros Produtos");
  if (grouped.has("Outros Produtos")) {
    normalizedOrder.push("Outros Produtos");
  }

  return normalizedOrder.map((categoryName) => ({
    categoryName,
    products: grouped.get(categoryName) ?? [],
  }));
}

function chunkProducts(products: ShareLinkPdfProduct[], chunkSize: number) {
  const chunks: ShareLinkPdfProduct[][] = [];
  for (let index = 0; index < products.length; index += chunkSize) {
    chunks.push(products.slice(index, index + chunkSize));
  }
  return chunks;
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
  let pageIndex = 1;
  const pages: PdfPageModel[] = [
    {
      id: `page-${pageIndex}`,
      blocks: [],
      usedHeightMm: 0,
      backgroundImageUrl: null,
    },
  ];

  let currentPage = pages[0];

  const createPage = (backgroundImageUrl: string | null) => {
    pageIndex += 1;
    const nextPage: PdfPageModel = {
      id: `page-${pageIndex}`,
      blocks: [],
      usedHeightMm: 0,
      backgroundImageUrl,
    };
    pages.push(nextPage);
    currentPage = nextPage;
  };

  const pushBlock = (
    block: PdfPageBlock,
    heightMm: number,
    backgroundImageUrl: string | null,
  ) => {
    if (
      currentPage.blocks.length > 0 &&
      currentPage.usedHeightMm + heightMm > PAGE_CONTENT_HEIGHT_MM
    ) {
      createPage(backgroundImageUrl);
    }

    if (!currentPage.backgroundImageUrl) {
      currentPage.backgroundImageUrl = backgroundImageUrl;
    }

    currentPage.blocks.push(block);
    currentPage.usedHeightMm += heightMm;
  };

  pushBlock({ id: "brand-header", type: "brand-header" }, BLOCK_HEIGHT_MM.brandHeader, null);

  data.catalogs.forEach((catalog, catalogIndex) => {
    const catalogBackgroundImageUrl = resolveImageSrc(catalog.pdfBackgroundImageUrl) ?? null;
    if (catalogIndex > 0) {
      createPage(catalogBackgroundImageUrl);
    } else if (!currentPage.backgroundImageUrl) {
      currentPage.backgroundImageUrl = catalogBackgroundImageUrl;
    }

    const hasDescription = Boolean(normalizeLabel(catalog.description));
    pushBlock(
      { id: `catalog-${catalog.id}-header`, type: "catalog-header", catalog },
      hasDescription ? BLOCK_HEIGHT_MM.catalogHeaderWithDescription : BLOCK_HEIGHT_MM.catalogHeader,
      catalogBackgroundImageUrl,
    );

    const groups = buildCategoryGroups(catalog.products);
    if (groups.length === 0) {
      pushBlock(
        { id: `catalog-${catalog.id}-empty`, type: "catalog-empty" },
        BLOCK_HEIGHT_MM.catalogEmpty,
        catalogBackgroundImageUrl,
      );
      return;
    }

    groups.forEach((group) => {
      const rows = chunkProducts(group.products, PRODUCTS_PER_ROW);
      if (rows.length === 0) {
        return;
      }

      pushBlock(
        {
          id: `catalog-${catalog.id}-group-${group.categoryName}-lead-0`,
          type: "category-lead",
          categoryName: group.categoryName,
          row: rows[0],
        },
        BLOCK_HEIGHT_MM.categoryLead,
        catalogBackgroundImageUrl,
      );

      for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const needsPageBreak =
          currentPage.blocks.length > 0 &&
          currentPage.usedHeightMm + BLOCK_HEIGHT_MM.categoryRow > PAGE_CONTENT_HEIGHT_MM;

        if (needsPageBreak) {
          createPage(catalogBackgroundImageUrl);
          pushBlock(
            {
              id: `catalog-${catalog.id}-group-${group.categoryName}-lead-${rowIndex}`,
              type: "category-lead",
              categoryName: group.categoryName,
              row,
            },
            BLOCK_HEIGHT_MM.categoryLead,
            catalogBackgroundImageUrl,
          );
          continue;
        }

        pushBlock(
          {
            id: `catalog-${catalog.id}-group-${group.categoryName}-row-${rowIndex}`,
            type: "category-row",
            categoryName: group.categoryName,
            row,
          },
          BLOCK_HEIGHT_MM.categoryRow,
          catalogBackgroundImageUrl,
        );
      }
    });
  });

  return pages;
}

function PdfHeader({ data }: { data: ShareLinkPdfData }) {
  const logoSrc = resolveImageSrc(data.brandLogoUrl);
  const brandInitials = buildBrandInitials(data.brandName);

  return (
    <header
      className="relative mb-5 overflow-hidden rounded-3xl border border-rose-100/80 bg-white p-5"
      style={{ boxShadow: "0 24px 60px rgba(168,91,132,0.16)" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-rose-100/65 blur-3xl" />
        <div className="absolute right-8 top-2 h-44 w-44 rounded-full bg-sky-100/65 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-32 w-80 -translate-x-1/2 rounded-full bg-fuchsia-50/80 blur-2xl" />
      </div>

      <div className="relative flex items-center gap-4">
        {logoSrc ? (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-rose-100 bg-white"
            style={{ boxShadow: "0 8px 24px rgba(96,44,76,0.14)" }}
          >
            <img
              src={logoSrc}
              alt={`${data.brandName} logo`}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 text-xs text-rose-500">
            {brandInitials}
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-rose-600/80">Catalogo Compartilhado</p>
          <h1 className={`${display.className} text-3xl leading-tight text-slate-900`}>{data.brandName}</h1>
          <p className="text-sm text-slate-600">{data.shareLinkName}</p>
        </div>
      </div>
    </header>
  );
}

function PdfCatalogHeader({
  catalog,
  generatedAt,
}: {
  catalog: ShareLinkPdfCatalog;
  generatedAt: Date;
}) {
  const description = normalizeLabel(catalog.description);

  return (
    <header className="mb-3 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className={`${display.className} text-3xl text-slate-900`}>{catalog.name}</h2>
        <span className="text-xs text-slate-400">{formatCompactDate(generatedAt)}</span>
      </div>
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
    </header>
  );
}

function PdfCategoryHeader({ categoryName }: { categoryName: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <p className="text-sm font-semibold uppercase tracking-[0.19em] text-rose-700/85">
        {categoryName}
      </p>
      <span className="h-px flex-1 bg-rose-200/70" />
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
        backgroundColor: "hsl(335 45% 98%)",
        borderColor: "hsl(336 35% 88%)",
        boxShadow: "0 14px 28px rgba(113, 57, 86, 0.12)",
      }}
    >
      <div className="relative h-56 w-full p-1" style={{ backgroundColor: "hsl(335 40% 99%)" }}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            loading="eager"
            className="h-full w-full rounded-md bg-white object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-white text-xs text-slate-400">
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
        {categoryLine ? <p className="text-sm text-slate-600">{categoryLine}</p> : null}
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

function PdfLastPageFiller({
  brandName,
  heightMm,
  backgroundImageUrl,
}: {
  brandName: string;
  heightMm: number;
  backgroundImageUrl: string;
}) {
  const initials = buildBrandInitials(brandName);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-rose-100/60"
      style={{
        height: `${heightMm}mm`,
        background:
          "linear-gradient(180deg, rgba(255,252,247,0.62) 0%, rgba(255,250,244,0.88) 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: toCssBackgroundImage(backgroundImageUrl),
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.12,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 12%, rgba(255,231,239,0.45) 0%, transparent 55%), radial-gradient(circle at 82% 78%, rgba(232,243,255,0.38) 0%, transparent 58%)",
        }}
      />
      <span className="absolute bottom-3 right-4 text-3xl font-semibold tracking-[0.22em] text-slate-300/70">
        {initials}
      </span>
    </div>
  );
}

function PdfPageFrame({
  children,
  isLast,
  residualHeightMm,
  brandName,
  backgroundImageUrl,
}: {
  children: ReactNode;
  isLast: boolean;
  residualHeightMm: number;
  brandName: string;
  backgroundImageUrl: string;
}) {
  const showFiller = isLast && residualHeightMm > 24;
  const fillerHeightMm = showFiller ? Math.max(24, Math.min(64, residualHeightMm - 4)) : 0;

  return (
    <section
      className={`relative h-[297mm] w-full overflow-hidden ${isLast ? "" : "break-after-page"}`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: toCssBackgroundImage(backgroundImageUrl),
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.36,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(255,244,250,0.74) 0%, rgba(255,255,255,0.6) 46%, rgba(238,246,255,0.66) 100%)",
          opacity: 0.22,
        }}
      />
      <div className="relative z-10 flex h-full flex-col px-[12mm] pt-[12mm] pb-[24mm]">
        <div className="relative z-10">{children}</div>
        {showFiller ? (
          <div className="mt-auto pt-3">
            <PdfLastPageFiller
              brandName={brandName}
              heightMm={fillerHeightMm}
              backgroundImageUrl={backgroundImageUrl}
            />
          </div>
        ) : null}
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
        const residualHeightMm = Math.max(0, PAGE_CONTENT_HEIGHT_MM - page.usedHeightMm);
        const isLast = pageIndex === pages.length - 1;

        return (
          <PdfPageFrame
            key={page.id}
            isLast={isLast}
            residualHeightMm={residualHeightMm}
            brandName={data.brandName}
            backgroundImageUrl={page.backgroundImageUrl ?? DEFAULT_PDF_BACKGROUND_URL}
          >
            {page.blocks.map((block, blockIndex) => {
              if (block.type === "brand-header") {
                return <PdfHeader key={block.id} data={data} />;
              }

              if (block.type === "catalog-header") {
                return (
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-2"}>
                    <PdfCatalogHeader catalog={block.catalog} generatedAt={data.generatedAt} />
                  </div>
                );
              }

              if (block.type === "category-lead") {
                return (
                  <section
                    key={block.id}
                    className={`break-inside-avoid [page-break-inside:avoid] ${
                      blockIndex === 0 ? "" : "mt-4"
                    }`}
                  >
                    <PdfCategoryHeader categoryName={block.categoryName} />
                    <PdfProductRow row={block.row} />
                  </section>
                );
              }

              if (block.type === "category-row") {
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
                  <div className="rounded-2xl border border-rose-100/80 bg-white/90 py-10 text-center text-sm text-slate-400">
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
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
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

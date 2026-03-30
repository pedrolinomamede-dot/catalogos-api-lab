import { Manrope, Playfair_Display, Poppins } from "next/font/google";
import type { ReactNode } from "react";

import type {
  ShareLinkPdfCatalog,
  ShareLinkPdfData,
  ShareLinkPdfProduct,
} from "@/lib/pdf/share-link-pdf";
import { resolveProductImageLayout } from "@/lib/catalog/image-layout";
import type { ProductRowModel } from "@/lib/pdf/product-row-layout";
import {
  buildPdfPages,
  type PdfPageModel,
  normalizeLabel,
  resolveImageSrc,
  resolveHexColor,
  resolveStripeFontWeight,
  resolveStripeFontSize,
  formatCompactDate,
  buildBrandInitials,
  toCssBackgroundImage,
} from "@/lib/pdf/html/pdf-page-builder";

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

const STRIPE_FONT_CLASS_BY_VALUE: Record<string, string> = {
  MANROPE: sans.className,
  PLAYFAIR: display.className,
  POPPINS: poppins.className,
};

function resolveStripeFontClass(value: string | null | undefined) {
  const normalized = normalizeLabel(value) ?? "MANROPE";
  return STRIPE_FONT_CLASS_BY_VALUE[normalized] ?? sans.className;
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
      className="mx-auto mb-6 flex w-[160mm] items-center justify-between gap-6 rounded-full px-8 py-4"
      style={{
        backgroundColor: "#F1F5F7",
        boxShadow:
          "5px 5px 9px rgba(100, 116, 128, 0.8), -4px -4px 7px #ffffff, inset 2px 2px 3px rgba(255, 255, 255, 0.9), inset -2px -2px 3px rgba(100, 116, 128, 0.25)",
      }}
    >
      {leftLogoSrc ? (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{
            backgroundColor: "#E2E7E9",
            boxShadow:
              "inset 3px 3px 5px rgba(100, 116, 128, 0.8), inset -3px -3px 5px #ffffff",
          }}
        >
          <img
            src={leftLogoSrc}
            alt="Logo esquerda"
            className="h-full w-full object-contain drop-shadow-md"
          />
        </div>
      ) : (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-widest text-slate-400"
          style={{
            backgroundColor: "#E2E7E9",
            boxShadow:
              "inset 3px 3px 5px rgba(100, 116, 128, 0.8), inset -3px -3px 5px #ffffff",
            textShadow: "1px 1px 1px #ffffff",
          }}
        >
          {leftInitials}
        </div>
      )}

      <div className="min-w-0 flex-1 text-center">
        <p
          className={`${display.className} text-[48px] font-medium leading-[0.9] tracking-tight text-slate-600`}
          style={{
            textShadow:
              "-1px -1px 1px rgba(100, 116, 128, 0.65), 1px 1px 1px #ffffff",
          }}
        >
          {catalog.name}
        </p>
        <p
          className={`${sans.className} mt-3 text-[11px] font-bold uppercase leading-none tracking-[0.3em] text-slate-400`}
          style={{ textShadow: "1px 1px 1px #ffffff" }}
        >
          {yearLabel}
        </p>
      </div>

      {rightLogoSrc ? (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{
            backgroundColor: "#E2E7E9",
            boxShadow:
              "inset 3px 3px 5px rgba(100, 116, 128, 0.8), inset -3px -3px 5px #ffffff",
          }}
        >
          <img
            src={rightLogoSrc}
            alt="Logo direita"
            className="h-full w-full object-contain drop-shadow-md"
          />
        </div>
      ) : (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-widest text-slate-400"
          style={{
            backgroundColor: "#E2E7E9",
            boxShadow:
              "inset 3px 3px 5px rgba(100, 116, 128, 0.8), inset -3px -3px 5px #ffffff",
            textShadow: "1px 1px 1px #ffffff",
          }}
        >
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
  const stripeTextColor = resolveHexColor(catalog.pdfStripeTextColor, "#FFFFFF");
  const stripeFontClass = resolveStripeFontClass(catalog.pdfStripeFontFamily);
  const stripeFontWeight = resolveStripeFontWeight(catalog.pdfStripeFontWeight);
  const stripeFontSize = resolveStripeFontSize(catalog.pdfStripeFontSize);

  return (
    <div
      className="mb-3 -mx-[10mm] flex translate-y-[1mm] items-center gap-2 rounded-none px-[10mm] py-1.5"
      style={{
        backgroundColor: "#F1F5F7",
        boxShadow:
          "0 5px 8px rgba(100, 116, 128, 0.8), 0 -3px 7px #ffffff",
      }}
    >
      <span
        className={`${stripeFontClass} uppercase tracking-[0.2em]`}
        style={{
          color: stripeTextColor,
          fontWeight: stripeFontWeight,
          fontSize: `${stripeFontSize}px`,
          lineHeight: 1.1,
          textShadow:
            "-1px -1px 1px rgba(100, 116, 128, 0.65), 1px 1px 1px #ffffff",
        }}
      >
        {categoryName}
      </span>
      <span
        className="h-[4px] w-28 rounded-full"
        style={{
          backgroundColor: "#E2E7E9",
          boxShadow:
            "inset 2px 2px 3px rgba(100, 116, 128, 0.8), inset -2px -2px 3px #ffffff",
        }}
      />
      <div className="min-w-0">
        <span
          className={`${stripeFontClass}`}
          style={{
            color: stripeTextColor,
            fontWeight: stripeFontWeight,
            fontSize: `${stripeFontSize}px`,
            lineHeight: 1.1,
            textShadow:
              "-1px -1px 1px rgba(100, 116, 128, 0.65), 1px 1px 1px #ffffff",
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
      <p
        className={`${display.className} text-[26px] font-bold italic leading-none text-slate-600`}
        style={{
          textShadow:
            "-1px -1px 1px rgba(100, 116, 128, 0.65), 1px 1px 1px #ffffff",
        }}
      >
        {lineLabel}
      </p>
      <div
        className="mx-auto mt-2 h-[4px] w-[72%] rounded-full"
        style={{
          backgroundColor: "#E2E7E9",
          boxShadow:
            "inset 2px 2px 3px rgba(100, 116, 128, 0.8), inset -2px -2px 3px #ffffff",
        }}
      />
    </div>
  );
}

function PdfProductCard({ product }: { product: ShareLinkPdfProduct }) {
  const primaryImage = resolveImageSrc(product.primaryImageUrl);
  const fallbackImage = resolveImageSrc(product.fallbackImageUrl);
  const imageSrc = primaryImage ?? fallbackImage;
  const skuLabel = normalizeLabel(product.sku) ?? "Sem SKU";
  const imageLayout = resolveProductImageLayout(product.sizeLabel, product.imageLayout);
  const visualScale = Math.min(imageLayout.scale * 1.22, 1.42);

  return (
    <article
      className="break-inside-avoid rounded-[24px] px-2 pt-2 pb-2 [page-break-inside:avoid]"
      style={{
        backgroundColor: "#F1F5F7",
        boxShadow:
          "5px 5px 9px rgba(100, 116, 128, 0.8), -4px -4px 7px #ffffff, inset 2px 2px 3px rgba(255, 255, 255, 0.9), inset -2px -2px 3px rgba(100, 116, 128, 0.25)",
      }}
    >
      <div
        className="relative flex h-[8.8rem] w-full items-center justify-center overflow-hidden rounded-[16px]"
        style={{
          backgroundColor: "#E2E7E9",
          boxShadow:
            "inset 4px 4px 6px rgba(100, 116, 128, 0.8), inset -3px -3px 6px #ffffff",
        }}
      >
        {imageSrc ? (
          <div
            className="relative flex h-full w-full items-center justify-center p-4"
            style={{
              transform: `translate(${imageLayout.offsetX}%, ${imageLayout.offsetY}%) scale(${visualScale})`,
              transformOrigin: "center",
            }}
          >
            <img
              src={imageSrc}
              alt={product.name}
              loading="eager"
              className="h-full w-full object-contain drop-shadow-md mix-blend-multiply"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md text-xs text-slate-500">
            Sem imagem
          </div>
        )}
      </div>

      <div className="px-1.5 pt-2.5 pb-1.5">
        <div className="space-y-1">
          <p className="line-clamp-4 min-h-[3.3rem] text-[9.5px] font-semibold leading-[1.05] text-slate-700">
            {product.name}
          </p>
          <div
            className="inline-flex w-fit items-center justify-center rounded-full p-[3px]"
            style={{
              backgroundColor: "#E2E7E9",
              boxShadow:
                "inset 2px 2px 4px rgba(100, 116, 128, 0.5), inset -2px -2px 4px #ffffff",
            }}
          >
            <span
              className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-bold uppercase leading-none tracking-wider"
              style={{
                backgroundColor: "#F1F5F7",
                color: "#ea580c",
                boxShadow:
                  "inset 1px 1px 3px rgba(100, 116, 128, 0.4), inset -1px -1px 3px #ffffff",
                textShadow:
                  "0 0 6px rgba(234, 88, 12, 0.8), 0 0 12px rgba(234, 88, 12, 0.5)",
              }}
            >
              {skuLabel}
            </span>
          </div>
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
      data-pdf-page
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
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: "#E2E7E9" }}
        />
      )}

      <div className="relative z-10 flex h-full flex-col px-[10mm] pt-[8mm] pb-[10mm]">
        <div className="mb-1 flex justify-end">
          <span className="text-[11px] text-slate-500/70">
            {formatCompactDate(generatedAt)}
          </span>
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
                  <div
                    className="rounded-2xl py-10 text-center text-sm text-slate-500"
                    style={{
                      backgroundColor: "#F1F5F7",
                      boxShadow:
                        "5px 5px 9px rgba(100, 116, 128, 0.8), -4px -4px 7px #ffffff, inset 2px 2px 3px rgba(255, 255, 255, 0.9), inset -2px -2px 3px rgba(100, 116, 128, 0.25)",
                    }}
                  >
                    Nenhum produto neste catálogo.
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

export function CatalogPdfClassic({ data }: { data: ShareLinkPdfData }) {
  const pages = buildPdfPages(data);

  return (
    <div className={`${sans.className} relative isolate text-slate-900`} style={{ background: "#E2E7E9" }}>
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

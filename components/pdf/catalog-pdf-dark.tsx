import { Space_Grotesk, Inter } from "next/font/google";
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ---------------------------------------------------------------------------
// Intro block — catalog title + brand logos in dark neon style
// ---------------------------------------------------------------------------

function DarkPdfCatalogIntro({
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

  return (
    <header className="mx-auto mb-4 flex w-[160mm] items-center justify-between gap-3 rounded-2xl border border-[var(--brand-neon)]/20 bg-[#0E0E10]/90 px-2.5 py-1.5"
      style={{ boxShadow: "0 8px 22px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 242, 255, 0.05)" }}
    >
      {/* Left logo */}
      {leftLogoSrc ? (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--brand-neon)]/30 bg-[#0A0A0B]"
          style={{ boxShadow: "0 0 12px rgba(0, 242, 255, 0.1)" }}
        >
          <img src={leftLogoSrc} alt="Logo esquerda" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--brand-neon)]/30 bg-[#0A0A0B] text-xs text-[var(--brand-neon)]">
          {leftInitials}
        </div>
      )}

      {/* Center — catalog title */}
      <div className="min-w-0 flex-1 text-center">
        <h1
          className={`${spaceGrotesk.className} text-5xl font-black uppercase leading-none tracking-tight text-white`}
          style={{ textShadow: "0 4px 20px rgba(255,255,255,0.1)" }}
        >
          {catalog.name}
        </h1>
        <div className="mx-auto mt-3 h-1 w-1/3 bg-[var(--brand-neon)] shadow-[0_0_15px_rgba(0,242,255,0.8)]" />
      </div>

      {/* Right logo */}
      {rightLogoSrc ? (
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--brand-neon)]/30 bg-[#0A0A0B]"
          style={{ boxShadow: "0 0 12px rgba(0, 242, 255, 0.1)" }}
        >
          <img src={rightLogoSrc} alt="Logo direita" className="h-full w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--brand-neon)]/30 bg-[#0A0A0B] text-xs text-[var(--brand-neon)]">
          {rightInitials}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Measure stripe — category + measure label with neon styling
// ---------------------------------------------------------------------------

function DarkPdfMeasureStripe({
  catalog,
  categoryName,
  measureLabel,
}: {
  catalog: ShareLinkPdfCatalog;
  categoryName: string;
  measureLabel: string;
}) {
  return (
    <div className="relative mb-3 flex items-center gap-6 border-b border-[var(--brand-neon)]/20 pb-4">
      {/* Line name is rendered in the line-header block; stripe shows category + measure */}
      <h2
        className={`${spaceGrotesk.className} neon-text text-3xl font-bold uppercase tracking-widest text-[var(--brand-neon)]`}
        style={{ textShadow: "0 0 15px rgba(0, 242, 255, 0.4)" }}
      >
        {categoryName}
      </h2>
      <span className="neon-border rounded-full border border-[var(--brand-neon)]/30 bg-[var(--brand-neon)]/10 px-4 py-1.5 font-mono text-[11px] tracking-[0.3em] text-[var(--brand-neon)]">
        {measureLabel}
      </span>

      {/* Neon underline at bottom */}
      <div className="absolute -bottom-[1px] left-0 h-[1px] w-32 bg-[var(--brand-neon)] shadow-[0_0_10px_rgba(0,242,255,1)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line header — diamond marker + line name
// ---------------------------------------------------------------------------

function DarkPdfLineHeader({ lineLabel }: { lineLabel: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="h-2 w-2 rotate-45 bg-[var(--brand-neon)] shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
      <h3 className={`${inter.className} text-lg font-bold uppercase tracking-[0.25em] text-[#8e9d9e]`}>
        {lineLabel}
      </h3>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product card — dark card with neon accents
// ---------------------------------------------------------------------------

function DarkPdfProductCard({ product }: { product: ShareLinkPdfProduct }) {
  const primaryImage = resolveImageSrc(product.primaryImageUrl);
  const fallbackImage = resolveImageSrc(product.fallbackImageUrl);
  const imageSrc = primaryImage ?? fallbackImage;
  const skuLabel = normalizeLabel(product.sku) ?? "Sem SKU";
  const imageLayout = resolveProductImageLayout(product.sizeLabel, product.imageLayout);
  const visualScale = Math.min(imageLayout.scale * 1.22, 1.42);

  return (
    <article className="product-card relative flex flex-col overflow-hidden break-inside-avoid border border-[var(--brand-neon)]/10 bg-[#0E0E10] p-4 [page-break-inside:avoid]">
      {/* Neon top border accent (visible on hover in browser, always subtle in PDF) */}
      <div className="absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--brand-neon)]/50 to-transparent opacity-40" />

      {/* SKU badge */}
      <div className="relative z-10 mb-4 flex items-start justify-between">
        <span className={`${inter.className} bg-[#050505] border border-[var(--brand-neon)]/40 text-[var(--brand-neon)] text-[9px] font-bold uppercase tracking-widest px-2 py-1 shadow-[0_0_8px_rgba(0,242,255,0.2)]`}>
          SKU: {skuLabel}
        </span>
      </div>

      {/* Image area */}
      <div className="relative mb-5 flex aspect-square items-center justify-center overflow-hidden rounded-sm border border-white/5 bg-[#151518] p-3">
        {/* Aurora radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,242,255,0.15)_0%,_transparent_60%)] opacity-70" />
        {imageSrc ? (
          <div
            className="relative z-10 flex h-full w-full items-center justify-center"
            style={{
              transform: `translate(${imageLayout.offsetX}%, ${imageLayout.offsetY}%) scale(${visualScale})`,
              transformOrigin: "center",
            }}
          >
            <img
              src={imageSrc}
              alt={product.name}
              loading="eager"
              className="h-full w-full object-contain mix-blend-screen drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]"
            />
          </div>
        ) : (
          <div className="relative z-10 flex h-full w-full items-center justify-center text-xs text-gray-600">
            Sem imagem
          </div>
        )}
      </div>

      {/* Product name */}
      <div className="relative z-10 mb-4 flex-grow space-y-1">
        <h3 className={`${spaceGrotesk.className} line-clamp-3 text-[11px] font-bold uppercase leading-[1.4] tracking-[0.05em] text-gray-300`}>
          {product.name}
        </h3>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Product row — grid of cards (4 or 5 columns)
// ---------------------------------------------------------------------------

function DarkPdfProductRow({ row }: { row: ProductRowModel<ShareLinkPdfProduct> }) {
  const gridClass = row.columns === 4 ? "grid-cols-4 gap-4" : "grid-cols-5 gap-4";

  return (
    <div className={`grid ${gridClass}`}>
      {row.products.map((product) => (
        <DarkPdfProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page frame — dark background with layered effects
// ---------------------------------------------------------------------------

function DarkPdfPageFrame({
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
      className={`relative h-[373.3mm] w-full overflow-hidden bg-[#0A0A0B] ${isLast ? "" : "break-after-page"}`}
    >
      {/* Layer 1: Background image — muted, blurred, screen-blended */}
      {backgroundImageUrl ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-30"
          style={{
            backgroundImage: toCssBackgroundImage(backgroundImageUrl),
            backgroundSize: "210mm auto",
            backgroundRepeat: "repeat-y",
            mixBlendMode: "screen",
            filter: "blur(3px)",
          }}
        />
      ) : null}

      {/* Layer 1.5: Vignette — deep edge darkening */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ boxShadow: "inset 0 0 300px 100px rgba(0,0,0,0.85)" }}
      />

      {/* Layer 2: Technical grid — neon lines */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(var(--brand-neon-rgb), 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--brand-neon-rgb), 0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          mixBlendMode: "screen",
        }}
      />

      {/* Layer 3: Neon illumination blob at top center */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-[400px] w-[800px] -translate-x-1/2 bg-[var(--brand-neon)] opacity-15 blur-[150px]" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col px-[10mm] pb-[10mm] pt-[8mm]">
        <div className="mb-1 flex justify-end">
          <span className="text-[11px] text-white/30">{formatCompactDate(generatedAt)}</span>
        </div>
        <div className="relative z-10 flex-1">{children}</div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Content layer — iterates pages and dispatches blocks to components
// ---------------------------------------------------------------------------

function DarkPdfContentLayer({
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
          <DarkPdfPageFrame
            key={page.id}
            generatedAt={data.generatedAt}
            isLast={isLast}
            backgroundImageUrl={page.backgroundImageUrl}
          >
            {page.blocks.map((block, blockIndex) => {
              if (block.type === "catalog-intro") {
                return (
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-2"}>
                    <DarkPdfCatalogIntro
                      data={data}
                      catalog={block.catalog}
                      generatedAt={data.generatedAt}
                    />
                  </div>
                );
              }

              if (block.type === "line-header") {
                return (
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-3"}>
                    <DarkPdfLineHeader lineLabel={block.lineLabel} />
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
                    <DarkPdfMeasureStripe
                      catalog={block.catalog}
                      categoryName={block.categoryName}
                      measureLabel={block.measureLabel}
                    />
                    <DarkPdfProductRow row={block.row} />
                  </section>
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
                    <DarkPdfProductRow row={block.row} />
                  </div>
                );
              }

              /* catalog-empty */
              return (
                <div key={block.id} className={blockIndex === 0 ? "" : "mt-4"}>
                  <div className="rounded-2xl border border-[var(--brand-neon)]/20 bg-[#0E0E10]/75 py-10 text-center text-sm text-gray-500">
                    Nenhum produto neste catalogo.
                  </div>
                </div>
              );
            })}
          </DarkPdfPageFrame>
        );
      })}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function CatalogPdfDark({ data }: { data: ShareLinkPdfData }) {
  const pages = buildPdfPages(data);

  return (
    <div className={`${inter.className} relative isolate bg-[#0A0A0B] text-white`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --brand-neon: #00f2ff;
          --brand-neon-rgb: 0, 242, 255;
        }

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

        @media print {
          .product-card { break-inside: avoid; }
          body { background-color: #0A0A0B !important; }
          .neon-text { text-shadow: 0 0 10px rgba(var(--brand-neon-rgb), 0.6) !important; }
          .neon-border { box-shadow: 0 0 8px rgba(var(--brand-neon-rgb), 0.3), inset 0 0 8px rgba(var(--brand-neon-rgb), 0.1) !important; }
        }
      `}</style>
      <DarkPdfContentLayer data={data} pages={pages} />
    </div>
  );
}

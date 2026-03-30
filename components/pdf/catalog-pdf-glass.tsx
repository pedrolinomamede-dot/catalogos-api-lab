import { Plus_Jakarta_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google";
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
  formatCompactDate,
  buildBrandInitials,
  toCssBackgroundImage,
} from "@/lib/pdf/html/pdf-page-builder";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["700"],
});

// ---------------------------------------------------------------------------
// Visual Components — Glassmorphism Luminoso
// ---------------------------------------------------------------------------

function GlassPdfCatalogIntro({
  catalog,
}: {
  catalog: ShareLinkPdfCatalog;
}) {
  return (
    <header className="mb-6 text-center">
      <h1
        className={`${playfair.className} text-6xl italic text-[#3A3A3C]`}
      >
        {catalog.name}
      </h1>
      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">
        {catalog.description ?? ""}
      </p>
    </header>
  );
}

function GlassPdfMeasureStripe({
  categoryName,
  measureLabel,
}: {
  categoryName: string;
  measureLabel: string;
}) {
  return (
    <div className="mb-4 flex w-full items-center gap-4 border-b border-[#3A3A3C]/10 pb-2">
      <h2
        className={`${jakarta.className} text-2xl font-bold uppercase tracking-wide text-[#3A3A3C]`}
      >
        {categoryName}
      </h2>
      <span className="rounded border border-[#13c8ec]/20 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#13c8ec]">
        {measureLabel}
      </span>
    </div>
  );
}

function GlassPdfLineHeader({ lineLabel }: { lineLabel: string }) {
  return (
    <div className="mb-2">
      <p
        className={`${jakarta.className} text-xl font-bold uppercase text-[#3A3A3C]`}
      >
        {lineLabel}
      </p>
      <div className="mt-1 h-px w-full bg-[#3A3A3C]/10" />
    </div>
  );
}

function GlassPdfProductCard({ product }: { product: ShareLinkPdfProduct }) {
  const primaryImage = resolveImageSrc(product.primaryImageUrl);
  const fallbackImage = resolveImageSrc(product.fallbackImageUrl);
  const imageSrc = primaryImage ?? fallbackImage;
  const skuLabel = normalizeLabel(product.sku) ?? "Sem SKU";
  const imageLayout = resolveProductImageLayout(product.sizeLabel, product.imageLayout);
  const visualScale = Math.min(imageLayout.scale * 1.22, 1.42);

  return (
    <article className="light-glass-panel flex w-full flex-col rounded-lg p-3 shadow-sm outline outline-1 outline-gray-200/50 break-inside-avoid [page-break-inside:avoid]">
      {/* Image Container */}
      <div className="mb-3 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded border border-gray-100/50 bg-transparent p-2">
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
              className="h-full w-full object-contain mix-blend-multiply opacity-95"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md text-xs text-slate-500">
            Sem imagem
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-grow flex-col px-1">
        <h3 className="mb-2 flex-grow text-[11px] font-bold leading-snug text-[#3A3A3C] line-clamp-3">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-center border-t border-white/50 pb-1 pt-2">
          <span
            className={`${jetbrains.className} rounded-full border border-[#13c8ec]/20 bg-white/40 px-3 py-1 text-sm font-bold uppercase tracking-widest text-[#13c8ec]`}
          >
            {skuLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

function GlassPdfProductRow({ row }: { row: ProductRowModel<ShareLinkPdfProduct> }) {
  const gridClass = row.columns === 4 ? "grid-cols-4 gap-3" : "grid-cols-5 gap-3";

  return (
    <div className={`grid ${gridClass}`}>
      {row.products.map((product) => (
        <GlassPdfProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function GlassPdfPageFrame({
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
      className={`relative h-[373.3mm] w-full overflow-hidden bg-white ${isLast ? "" : "break-after-page"}`}
    >
      {/* Background layer */}
      {backgroundImageUrl ? (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: toCssBackgroundImage(backgroundImageUrl),
            backgroundSize: "210mm auto",
            backgroundRepeat: "repeat-y",
            backgroundPosition: "top center",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 z-0 bg-white" />
      )}

      {/* Aurora orbs */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <div
          className="absolute"
          style={{
            top: "-5%",
            left: "-10%",
            width: "800px",
            height: "800px",
            background:
              "radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "10%",
            right: "-10%",
            width: "900px",
            height: "900px",
            background:
              "radial-gradient(circle, rgba(196, 224, 229, 0.4) 0%, rgba(196, 224, 229, 0) 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: "40%",
            left: "30%",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(19, 200, 236, 0.2) 0%, rgba(19, 200, 236, 0) 70%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col px-[10mm] pb-[10mm] pt-[8mm]">
        <div className="mb-1 flex justify-end">
          <span className="text-[11px] text-[#8E8E93]/70">
            {formatCompactDate(generatedAt)}
          </span>
        </div>
        <div className="relative z-10 flex-1">{children}</div>
      </div>
    </section>
  );
}

function GlassPdfContentLayer({
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
          <GlassPdfPageFrame
            key={page.id}
            generatedAt={data.generatedAt}
            isLast={isLast}
            backgroundImageUrl={page.backgroundImageUrl}
          >
            {page.blocks.map((block, blockIndex) => {
              if (block.type === "catalog-intro") {
                return (
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-2"}>
                    <GlassPdfCatalogIntro catalog={block.catalog} />
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
                    <GlassPdfMeasureStripe
                      categoryName={block.categoryName}
                      measureLabel={block.measureLabel}
                    />
                    <GlassPdfProductRow row={block.row} />
                  </section>
                );
              }

              if (block.type === "line-header") {
                return (
                  <div key={block.id} className={blockIndex === 0 ? "" : "mt-3"}>
                    <GlassPdfLineHeader lineLabel={block.lineLabel} />
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
                    <GlassPdfProductRow row={block.row} />
                  </div>
                );
              }

              return (
                <div key={block.id} className={blockIndex === 0 ? "" : "mt-4"}>
                  <div className="light-glass-panel rounded-2xl py-10 text-center text-sm text-[#8E8E93]">
                    Nenhum produto neste catalogo.
                  </div>
                </div>
              );
            })}
          </GlassPdfPageFrame>
        );
      })}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function CatalogPdfGlass({ data }: { data: ShareLinkPdfData }) {
  const pages = buildPdfPages(data);

  return (
    <div className={`${jakarta.className} relative isolate bg-white text-[#3A3A3C]`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@700&display=swap');
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
        .light-glass-panel {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 16px rgba(31, 38, 135, 0.05);
        }
        @media print {
          .light-glass-panel {
            background: white !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>
      <GlassPdfContentLayer data={data} pages={pages} />
    </div>
  );
}

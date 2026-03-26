import type { ShareLinkPdfData } from "@/lib/pdf/share-link-pdf";

import { CatalogPdfClassic } from "@/components/pdf/catalog-pdf-classic";
import { CatalogPdfDark } from "@/components/pdf/catalog-pdf-dark";
import { CatalogPdfGlass } from "@/components/pdf/catalog-pdf-glass";

export function CatalogPdfDocument({ data }: { data: ShareLinkPdfData }) {
  const theme = data.templateVersion;

  if (theme === "dark_neon") {
    return <CatalogPdfDark data={data} />;
  }

  if (theme === "glassmorphism") {
    return <CatalogPdfGlass data={data} />;
  }

  return <CatalogPdfClassic data={data} />;
}

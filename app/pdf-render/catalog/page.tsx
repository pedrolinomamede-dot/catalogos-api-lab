import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogPdfDocument } from "@/components/pdf/catalog-pdf-document";
import { readPdfRenderPayload } from "@/lib/pdf/html/pdf-render-payload-store";

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function normalizeToken(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export default async function PdfRenderCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const token = normalizeToken(params.token);
  if (!token) {
    notFound();
  }

  const data = await readPdfRenderPayload(token);
  if (!data) {
    notFound();
  }

  return <CatalogPdfDocument data={data} />;
}

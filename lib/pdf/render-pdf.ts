import { generateShareLinkHtmlPdf } from "@/lib/pdf/html/share-link-html-pdf";
import { generateEditableShareLinkPdf } from "@/lib/pdf/editable-share-link-pdf";
import { generateShareLinkPdf, type ShareLinkPdfData } from "@/lib/pdf/share-link-pdf";
import type { PdfTemplateVersion } from "@/lib/pdf/themes/corporate-v1";

export type PdfRenderEngine = "native" | "html";
export type PdfRenderVariant = "final" | "editable";

export type RenderPdfOptions = {
  engine?: PdfRenderEngine;
  templateVersion?: PdfTemplateVersion;
  variant?: PdfRenderVariant;
};

function isTemplateVersion(value: string | undefined): value is PdfTemplateVersion {
  return (
    value === "classic" ||
    value === "corporate_v1" ||
    value === "corporate_v2" ||
    value === "corporate_v3"
  );
}

function resolveTemplateVersion(value: string | undefined): PdfTemplateVersion {
  if (isTemplateVersion(value)) {
    return value;
  }
  return process.env.NODE_ENV === "production" ? "classic" : "corporate_v3";
}

function resolveEngine(value: string | undefined): PdfRenderEngine {
  if (value === "native") {
    return "native";
  }
  return "html";
}

function resolveAllowHtmlNativeFallback() {
  const raw = process.env.PDF_HTML_ALLOW_NATIVE_FALLBACK?.trim().toLowerCase();
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}

export async function renderPdf(
  data: ShareLinkPdfData,
  options: RenderPdfOptions = {},
): Promise<Buffer> {
  const variant = options.variant ?? "final";
  const engine = options.engine ?? resolveEngine(process.env.PDF_RENDER_ENGINE);
  const templateVersion =
    options.templateVersion ??
    resolveTemplateVersion(data.templateVersion ?? process.env.PDF_TEMPLATE_VERSION);

  const payload: ShareLinkPdfData = {
    ...data,
    templateVersion,
    catalogCount: data.catalogCount ?? data.catalogs.length,
  };

  if (variant === "editable") {
    return generateEditableShareLinkPdf(payload);
  }

  if (engine === "html") {
    const hasCatalogSpecificBackground = payload.catalogs.some((catalog) => {
      const value =
        typeof catalog.pdfBackgroundImageUrl === "string"
          ? catalog.pdfBackgroundImageUrl.trim()
          : "";
      return value.length > 0;
    });
    const allowNativeFallback =
      resolveAllowHtmlNativeFallback() && !hasCatalogSpecificBackground;
    try {
      return await generateShareLinkHtmlPdf(payload);
    } catch (error) {
      if (!allowNativeFallback) {
        throw error;
      }
      console.warn("[pdf] HTML engine failed. Falling back to native engine.", error);
      return generateShareLinkPdf(payload);
    }
  }

  return generateShareLinkPdf(payload);
}

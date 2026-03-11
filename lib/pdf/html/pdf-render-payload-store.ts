import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { ShareLinkPdfCatalog, ShareLinkPdfData, ShareLinkPdfProduct } from "@/lib/pdf/share-link-pdf";

const PAYLOAD_DIR = path.join(os.tmpdir(), "ipe-distribuidora", "pdf-render-payloads");
const PAYLOAD_TTL_MS = 30 * 60 * 1_000;
const TOKEN_PATTERN = /^[a-f0-9-]{36}$/i;

type PersistedShareLinkPdfData = Omit<ShareLinkPdfData, "generatedAt"> & {
  generatedAt: string;
};

function inferMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".svg") {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

function resolveFallbackLogoPath() {
  const configured = process.env.PDF_FALLBACK_LOGO_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  return path.resolve(process.cwd(), "files/logo.png");
}

async function resolveLocalLogoDataUri(candidatePath?: string | null) {
  const fallbackPath = resolveFallbackLogoPath();
  const pathsToTry = [candidatePath, fallbackPath]
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .map((entry) => (path.isAbsolute(entry) ? entry : path.resolve(process.cwd(), entry)));

  for (const localPath of pathsToTry) {
    try {
      const raw = await fs.readFile(localPath);
      if (raw.length === 0) {
        continue;
      }
      const mimeType = inferMimeType(localPath);
      return `data:${mimeType};base64,${raw.toString("base64")}`;
    } catch {
      // Continue searching.
    }
  }

  return null;
}

async function resolveBrandLogoSource(brandLogoUrl?: string | null) {
  const normalized = typeof brandLogoUrl === "string" ? brandLogoUrl.trim() : "";
  if (!normalized) {
    return resolveLocalLogoDataUri();
  }

  if (/^https?:\/\//i.test(normalized) || normalized.startsWith("data:")) {
    return normalized;
  }

  if (normalized.startsWith("/files/")) {
    return resolveLocalLogoDataUri(normalized.slice(1));
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return resolveLocalLogoDataUri(normalized);
}

function cloneProduct(product: ShareLinkPdfProduct): ShareLinkPdfProduct {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku ?? null,
    lineLabel: product.lineLabel ?? null,
    sizeLabel: product.sizeLabel ?? null,
    imageLayout: product.imageLayout ?? null,
    brand: product.brand ?? null,
    description: product.description ?? null,
    categoryName: product.categoryName ?? null,
    subcategoryName: product.subcategoryName ?? null,
    primaryImageUrl: product.primaryImageUrl ?? null,
    fallbackImageUrl: product.fallbackImageUrl ?? null,
  };
}

function cloneCatalog(catalog: ShareLinkPdfCatalog): ShareLinkPdfCatalog {
  return {
    id: catalog.id,
    name: catalog.name,
    description: catalog.description ?? null,
    pdfBackgroundImageUrl: catalog.pdfBackgroundImageUrl ?? null,
    pdfHeaderLeftLogoUrl: catalog.pdfHeaderLeftLogoUrl ?? null,
    pdfHeaderRightLogoUrl: catalog.pdfHeaderRightLogoUrl ?? null,
    pdfStripeBgColor: catalog.pdfStripeBgColor ?? null,
    pdfStripeLineColor: catalog.pdfStripeLineColor ?? null,
    pdfStripeTextColor: catalog.pdfStripeTextColor ?? null,
    pdfStripeFontFamily: catalog.pdfStripeFontFamily ?? null,
    pdfStripeFontWeight: catalog.pdfStripeFontWeight ?? null,
    pdfStripeFontSize: catalog.pdfStripeFontSize ?? null,
    products: catalog.products.map(cloneProduct),
  };
}

async function serializePayload(data: ShareLinkPdfData): Promise<PersistedShareLinkPdfData> {
  const brandLogoUrl = await resolveBrandLogoSource(data.brandLogoUrl);
  return {
    brandName: data.brandName,
    brandLogoUrl,
    shareLinkName: data.shareLinkName,
    generatedAt: data.generatedAt.toISOString(),
    catalogs: data.catalogs.map(cloneCatalog),
    catalogCount: data.catalogCount ?? data.catalogs.length,
    templateVersion: data.templateVersion,
  };
}

function deserializePayload(raw: PersistedShareLinkPdfData): ShareLinkPdfData {
  return {
    brandName: raw.brandName,
    brandLogoUrl: raw.brandLogoUrl ?? null,
    shareLinkName: raw.shareLinkName,
    generatedAt: new Date(raw.generatedAt),
    catalogs: (raw.catalogs ?? []).map(cloneCatalog),
    catalogCount: raw.catalogCount,
    templateVersion: raw.templateVersion,
  };
}

function payloadPath(token: string) {
  return path.join(PAYLOAD_DIR, `${token}.json`);
}

async function cleanupExpiredPayloads() {
  try {
    const entries = await fs.readdir(PAYLOAD_DIR, { withFileTypes: true });
    const now = Date.now();

    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isFile() || !entry.name.endsWith(".json")) {
          return;
        }

        const filePath = path.join(PAYLOAD_DIR, entry.name);
        const stat = await fs.stat(filePath).catch(() => null);
        if (!stat) {
          return;
        }

        if (now - stat.mtimeMs > PAYLOAD_TTL_MS) {
          await fs.unlink(filePath).catch(() => undefined);
        }
      }),
    );
  } catch {
    // Best-effort cleanup only.
  }
}

export async function createPdfRenderPayload(data: ShareLinkPdfData) {
  await fs.mkdir(PAYLOAD_DIR, { recursive: true });
  void cleanupExpiredPayloads();

  const token = randomUUID();
  const filePath = payloadPath(token);
  const payload = await serializePayload(data);

  await fs.writeFile(filePath, JSON.stringify(payload), "utf8");
  return token;
}

export async function readPdfRenderPayload(token: string): Promise<ShareLinkPdfData | null> {
  if (!TOKEN_PATTERN.test(token)) {
    return null;
  }

  const filePath = payloadPath(token);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedShareLinkPdfData;

    if (!parsed || typeof parsed !== "object" || typeof parsed.generatedAt !== "string") {
      return null;
    }

    return deserializePayload(parsed);
  } catch {
    return null;
  }
}

export async function deletePdfRenderPayload(token: string) {
  if (!TOKEN_PATTERN.test(token)) {
    return;
  }
  await fs.unlink(payloadPath(token)).catch(() => undefined);
}

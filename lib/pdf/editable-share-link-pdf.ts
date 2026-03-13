import { deflateSync } from "node:zlib";

import sharp from "sharp";
import {
  buildLineCategoryMeasureGroups,
  normalizeCatalogLabel,
  type LineCategoryMeasureGroup,
} from "@/lib/catalog/line-grouping";
import { resolveProductImageLayout } from "@/lib/catalog/image-layout";

import type {
  ShareLinkPdfCatalog,
  ShareLinkPdfData,
  ShareLinkPdfProduct,
} from "@/lib/pdf/share-link-pdf";

type PdfFont = "F1" | "F2";
type PdfImageVariant = "product" | "logo" | "background";
type PdfGraphicsStateName = "GS_CARD" | "GS_SHADOW" | "GS_PANEL" | "GS_IMAGE_PANEL";

type PdfImageMaskAsset = {
  width: number;
  height: number;
  data: Buffer;
};

type PdfImageAsset = {
  name: string;
  width: number;
  height: number;
  data: Buffer;
  filter: "DCTDecode" | "FlateDecode";
  colorSpace: "DeviceRGB";
  smask?: PdfImageMaskAsset;
};

type PdfPage = {
  ops: string[];
  usedImages: Set<string>;
  usedGraphicsStates: Set<PdfGraphicsStateName>;
};

type ParsedMeasure = {
  isMissing: boolean;
  unitRank: number;
  numericValue: number;
  normalizedKey: string;
  displayLabel: string;
};

type CategoryMeasureGroup = {
  categoryName: string;
  measureLabel: string;
  products: ShareLinkPdfProduct[];
};

type ProductLineGroup = {
  lineLabel: string | null;
  groups: CategoryMeasureGroup[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 1058;
const PAGE_MARGIN_X = 28;
const PAGE_MARGIN_TOP = 24;
const PAGE_MARGIN_BOTTOM = 32;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const CONTENT_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN_BOTTOM;
const PRODUCTS_PER_ROW = 5;
const COLUMN_GAP = 6;
const CARD_WIDTH = (CONTENT_WIDTH - COLUMN_GAP * (PRODUCTS_PER_ROW - 1)) / PRODUCTS_PER_ROW;
const CARD_HEIGHT = 156;
const CARD_TEXT_PADDING_X = 5;
const CARD_TEXT_PADDING_TOP = 4;
const CARD_TEXT_PADDING_BOTTOM = 4;
const CARD_IMAGE_HEIGHT = 102;
const CARD_NAME_FONT_SIZE = 8;
const CARD_CODE_FONT_SIZE = 11;
const ROW_GAP = 6;
const GROUP_GAP_AFTER = 6;
const LINE_HEADER_HEIGHT = 20;
const STRIPE_HEIGHT = 28;
const STRIPE_GAP_BEFORE = 4;
const STRIPE_GAP_AFTER = 8;
const INTRO_HEIGHT = 136;
const DATE_ROW_HEIGHT = 12;
const PRODUCT_IMAGE_TARGET_WIDTH = 620;
const PRODUCT_IMAGE_TARGET_HEIGHT = 430;
const LOGO_IMAGE_TARGET_WIDTH = 320;
const LOGO_IMAGE_TARGET_HEIGHT = 120;
const IMAGE_FETCH_TIMEOUT_MS = 8_000;

const FONT_NORMAL: PdfFont = "F1";
const FONT_BOLD: PdfFont = "F2";

const GRAPHICS_STATES: Record<
  PdfGraphicsStateName,
  { fillAlpha: number; strokeAlpha: number }
> = {
  GS_CARD: { fillAlpha: 0.6, strokeAlpha: 0.9 },
  GS_SHADOW: { fillAlpha: 0.08, strokeAlpha: 0.08 },
  GS_PANEL: { fillAlpha: 0.35, strokeAlpha: 0.35 },
  GS_IMAGE_PANEL: { fillAlpha: 0.5, strokeAlpha: 0.5 },
};

const MEASURE_UNIT_RANK: Record<string, number> = {
  mg: 1,
  g: 2,
  kg: 3,
  ml: 4,
  l: 5,
};

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function sanitizePdfText(text: string) {
  return text.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\xFF]/g, " ").trim();
}

function escapePdfText(text: string) {
  return sanitizePdfText(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function normalizeLabel(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function resolveHexColor(value: string | null | undefined, fallback: string) {
  const normalized = normalizeLabel(value);
  if (!normalized || !/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }
  return normalized.toUpperCase();
}

function hexToColor(hex: string): [number, number, number] {
  const safeHex = hex.replace("#", "");
  return [
    Number.parseInt(safeHex.slice(0, 2), 16) / 255,
    Number.parseInt(safeHex.slice(2, 4), 16) / 255,
    Number.parseInt(safeHex.slice(4, 6), 16) / 255,
  ];
}

function colorFill(color: [number, number, number]) {
  return `${formatNumber(color[0])} ${formatNumber(color[1])} ${formatNumber(color[2])} rg`;
}

function colorStroke(color: [number, number, number]) {
  return `${formatNumber(color[0])} ${formatNumber(color[1])} ${formatNumber(color[2])} RG`;
}

function estimateTextWidth(text: string, fontSize: number, bold = false) {
  const normalized = sanitizePdfText(text);
  return normalized.length * fontSize * (bold ? 0.56 : 0.52);
}

function wrapText(
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines = Number.POSITIVE_INFINITY,
  bold = false,
) {
  const normalized = sanitizePdfText(text).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [] as string[];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines) {
        break;
      }
    }

    current = word;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines && words.length > 0) {
    let lastLine = lines[maxLines - 1] ?? "";
    while (
      lastLine.length > 3 &&
      estimateTextWidth(`${lastLine}...`, fontSize, bold) > maxWidth
    ) {
      lastLine = lastLine.slice(0, -1);
    }
    if (lastLine !== (lines[maxLines - 1] ?? "")) {
      lines[maxLines - 1] = `${lastLine}...`;
    }
  }

  return lines;
}

function createPage(): PdfPage {
  return {
    ops: [],
    usedImages: new Set<string>(),
    usedGraphicsStates: new Set<PdfGraphicsStateName>(),
  };
}

function wrapWithGraphicsState(
  page: PdfPage,
  content: string,
  graphicsState?: PdfGraphicsStateName,
) {
  if (!graphicsState) {
    page.ops.push(content);
    return;
  }

  page.usedGraphicsStates.add(graphicsState);
  page.ops.push(`q /${graphicsState} gs\n${content}\nQ`);
}

function drawRect(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill?: [number, number, number];
    stroke?: [number, number, number];
    lineWidth?: number;
    graphicsState?: PdfGraphicsStateName;
  } = {},
) {
  const pdfY = PAGE_HEIGHT - y - height;
  const parts: string[] = [];

  if (options.fill) {
    parts.push(colorFill(options.fill));
  }
  if (options.stroke) {
    parts.push(colorStroke(options.stroke));
  }
  if (typeof options.lineWidth === "number") {
    parts.push(`${formatNumber(options.lineWidth)} w`);
  }

  let operator = "S";
  if (options.fill && options.stroke) {
    operator = "B";
  } else if (options.fill) {
    operator = "f";
  }

  parts.push(
    `${formatNumber(x)} ${formatNumber(pdfY)} ${formatNumber(width)} ${formatNumber(height)} re ${operator}`,
  );

  wrapWithGraphicsState(page, parts.join("\n"), options.graphicsState);
}

function drawText(
  page: PdfPage,
  text: string,
  x: number,
  y: number,
  options: {
    font: PdfFont;
    size: number;
    color: [number, number, number];
  },
) {
  const safe = escapePdfText(text);
  if (!safe) {
    return;
  }

  const baselineY = PAGE_HEIGHT - y - options.size;
  page.ops.push(
    [
      "BT",
      `/${options.font} ${formatNumber(options.size)} Tf`,
      colorFill(options.color),
      `1 0 0 1 ${formatNumber(x)} ${formatNumber(baselineY)} Tm`,
      `(${safe}) Tj`,
      "ET",
    ].join("\n"),
  );
}

function drawImage(
  page: PdfPage,
  asset: PdfImageAsset,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const pdfY = PAGE_HEIGHT - y - height;
  page.usedImages.add(asset.name);
  page.ops.push(
    `q ${formatNumber(width)} 0 0 ${formatNumber(height)} ${formatNumber(x)} ${formatNumber(
      pdfY,
    )} cm /${asset.name} Do Q`,
  );
}

function chunkProducts(products: ShareLinkPdfProduct[], size: number) {
  const chunks: ShareLinkPdfProduct[][] = [];
  for (let index = 0; index < products.length; index += size) {
    chunks.push(products.slice(index, index + size));
  }
  return chunks;
}

function formatNumericMeasure(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function parseMeasure(value?: string | null): ParsedMeasure {
  const raw = normalizeLabel(value);
  if (!raw) {
    return {
      isMissing: true,
      unitRank: Number.POSITIVE_INFINITY,
      numericValue: Number.POSITIVE_INFINITY,
      normalizedKey: "__missing__",
      displayLabel: "",
    };
  }

  const compact = raw.toLowerCase().replace(/\s+/g, "");
  const match = compact.match(/^(\d+(?:[.,]\d+)?)([a-zA-Z]+)$/);
  if (!match) {
    return {
      isMissing: false,
      unitRank: MEASURE_UNIT_RANK[compact] ?? 99,
      numericValue: Number.POSITIVE_INFINITY,
      normalizedKey: `raw:${compact}`,
      displayLabel: raw,
    };
  }

  const numericValue = Number.parseFloat(match[1].replace(",", "."));
  const unit = match[2];
  const resolvedNumeric = Number.isFinite(numericValue) ? numericValue : Number.POSITIVE_INFINITY;

  return {
    isMissing: false,
    unitRank: MEASURE_UNIT_RANK[unit] ?? 99,
    numericValue: resolvedNumeric,
    normalizedKey: `num:${unit}:${resolvedNumeric}`,
    displayLabel: `${formatNumericMeasure(resolvedNumeric)}${unit}`,
  };
}

function compareCategoryName(left: string, right: string) {
  if (left === "Outros Produtos" && right !== "Outros Produtos") {
    return 1;
  }
  if (right === "Outros Produtos" && left !== "Outros Produtos") {
    return -1;
  }
  return left.localeCompare(right, "pt-BR", { sensitivity: "base" });
}

function compareMeasureOrder(left: ParsedMeasure, right: ParsedMeasure) {
  if (left.isMissing !== right.isMissing) {
    return left.isMissing ? 1 : -1;
  }
  if (left.unitRank !== right.unitRank) {
    return left.unitRank - right.unitRank;
  }
  if (left.numericValue !== right.numericValue) {
    return left.numericValue - right.numericValue;
  }
  return left.displayLabel.localeCompare(right.displayLabel, "pt-BR", {
    sensitivity: "base",
  });
}

function compareProducts(left: ShareLinkPdfProduct, right: ShareLinkPdfProduct) {
  const nameDiff = left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" });
  if (nameDiff !== 0) {
    return nameDiff;
  }
  const leftSku = normalizeLabel(left.sku) ?? "";
  const rightSku = normalizeLabel(right.sku) ?? "";
  return leftSku.localeCompare(rightSku, "pt-BR", { sensitivity: "base" });
}

function buildCategoryMeasureGroups(products: ShareLinkPdfProduct[]): ProductLineGroup[] {
  const lineGroups = buildLineCategoryMeasureGroups(products);
  return lineGroups.map((lineGroup: LineCategoryMeasureGroup<ShareLinkPdfProduct>) => ({
    lineLabel: lineGroup.lineLabel,
    groups: lineGroup.groups.map((group) => ({
      categoryName: group.categoryName,
      measureLabel: group.measureLabel,
      products: group.products,
    })),
  }));
}

function resolveImageUrl(url?: string | null) {
  const normalized = typeof url === "string" ? url.trim() : "";
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    const base = process.env.PUBLIC_BASE_URL?.trim();
    if (!base) {
      return null;
    }
    return `${base.replace(/\/$/, "")}${normalized}`;
  }

  return null;
}

async function fetchImageBytes(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "force-cache",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.arrayBuffer();
    if (payload.byteLength === 0) {
      return null;
    }

    return Buffer.from(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function rgbaToRgbAndAlpha(buffer: Buffer) {
  const pixels = buffer.length / 4;
  const rgb = Buffer.allocUnsafe(pixels * 3);
  const alpha = Buffer.allocUnsafe(pixels);

  for (let pixelIndex = 0; pixelIndex < pixels; pixelIndex += 1) {
    const rgbaIndex = pixelIndex * 4;
    const rgbIndex = pixelIndex * 3;
    rgb[rgbIndex] = buffer[rgbaIndex];
    rgb[rgbIndex + 1] = buffer[rgbaIndex + 1];
    rgb[rgbIndex + 2] = buffer[rgbaIndex + 2];
    alpha[pixelIndex] = buffer[rgbaIndex + 3];
  }

  return {
    rgb: deflateSync(rgb),
    alpha: deflateSync(alpha),
  };
}

async function loadImageAsset(
  url: string,
  name: string,
  variant: PdfImageVariant,
): Promise<PdfImageAsset | null> {
  const resolvedUrl = resolveImageUrl(url);
  if (!resolvedUrl) {
    return null;
  }

  const source = await fetchImageBytes(resolvedUrl);
  if (!source) {
    return null;
  }

  try {
    if (variant === "product") {
      const transformed = await sharp(source)
        .rotate()
        .resize(PRODUCT_IMAGE_TARGET_WIDTH, PRODUCT_IMAGE_TARGET_HEIGHT, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { rgb, alpha } = rgbaToRgbAndAlpha(transformed.data);

      return {
        name,
        width: transformed.info.width ?? PRODUCT_IMAGE_TARGET_WIDTH,
        height: transformed.info.height ?? PRODUCT_IMAGE_TARGET_HEIGHT,
        data: rgb,
        filter: "FlateDecode",
        colorSpace: "DeviceRGB",
        smask: {
          width: transformed.info.width ?? PRODUCT_IMAGE_TARGET_WIDTH,
          height: transformed.info.height ?? PRODUCT_IMAGE_TARGET_HEIGHT,
          data: alpha,
        },
      };
    }

    const transformed =
      variant === "background"
        ? await sharp(source)
            .rotate()
            .resize(PAGE_WIDTH, PAGE_HEIGHT, {
              fit: "cover",
              position: "centre",
            })
            .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:2:0" })
            .toBuffer({ resolveWithObject: true })
        : await sharp(source)
            .rotate()
            .flatten({ background: "#ffffff" })
            .resize(LOGO_IMAGE_TARGET_WIDTH, LOGO_IMAGE_TARGET_HEIGHT, {
              fit: "contain",
              background: "#ffffff",
            })
            .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:2:0" })
            .toBuffer({ resolveWithObject: true });

    return {
      name,
      width:
        transformed.info.width ??
        (variant === "logo" ? LOGO_IMAGE_TARGET_WIDTH : PAGE_WIDTH),
      height:
        transformed.info.height ??
        (variant === "logo" ? LOGO_IMAGE_TARGET_HEIGHT : PAGE_HEIGHT),
      data: transformed.data,
      filter: "DCTDecode",
      colorSpace: "DeviceRGB",
    };
  } catch {
    return null;
  }
}

function buildPdfBuffer(pages: PdfPage[], imageAssets: PdfImageAsset[]) {
  const pageCount = pages.length;
  const graphicsStates = Object.entries(GRAPHICS_STATES) as Array<
    [PdfGraphicsStateName, { fillAlpha: number; strokeAlpha: number }]
  >;
  const imageEntries = imageAssets.flatMap((asset) =>
    asset.smask
      ? [
          { key: asset.name, type: "image" as const, asset },
          { key: `${asset.name}-smask`, type: "smask" as const, asset },
        ]
      : [{ key: asset.name, type: "image" as const, asset }],
  );

  const pageObjectStart = 3;
  const contentObjectStart = pageObjectStart + pageCount;
  const fontObjectStart = contentObjectStart + pageCount;
  const graphicsStateObjectStart = fontObjectStart + 2;
  const imageObjectStart = graphicsStateObjectStart + graphicsStates.length;
  const totalObjects = imageObjectStart + imageEntries.length - 1;

  const objects: Buffer[] = new Array(totalObjects);
  const pageRefs = Array.from({ length: pageCount }, (_, index) => `${pageObjectStart + index} 0 R`).join(" ");

  objects[0] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1");
  objects[1] = Buffer.from(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`, "latin1");

  const imageObjectByKey = new Map<string, number>();
  imageEntries.forEach((entry, index) => {
    imageObjectByKey.set(entry.key, imageObjectStart + index);
  });

  pages.forEach((page, index) => {
    const pageObject = pageObjectStart + index;
    const contentObject = contentObjectStart + index;
    const resourceEntries = [`/Font << /F1 ${fontObjectStart} 0 R /F2 ${fontObjectStart + 1} 0 R >>`];

    if (page.usedGraphicsStates.size > 0) {
      const extRefs = [...page.usedGraphicsStates]
        .sort()
        .map((name) => `/${name} ${graphicsStateObjectStart + graphicsStates.findIndex(([key]) => key === name)} 0 R`)
        .join(" ");
      resourceEntries.push(`/ExtGState << ${extRefs} >>`);
    }

    if (page.usedImages.size > 0) {
      const xObjectRefs = [...page.usedImages]
        .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
        .map((name) => `/${name} ${imageObjectByKey.get(name)} 0 R`)
        .join(" ");
      resourceEntries.push(`/XObject << ${xObjectRefs} >>`);
    }

    objects[pageObject - 1] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${resourceEntries.join(
        " ",
      )} >> /Contents ${contentObject} 0 R >>`,
      "latin1",
    );

    const contentStream = Buffer.from(page.ops.join("\n"), "latin1");
    objects[contentObject - 1] = Buffer.concat([
      Buffer.from(`<< /Length ${contentStream.length} >>\nstream\n`, "latin1"),
      contentStream,
      Buffer.from("\nendstream", "latin1"),
    ]);
  });

  objects[fontObjectStart - 1] = Buffer.from(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "latin1",
  );
  objects[fontObjectStart] = Buffer.from(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "latin1",
  );

  graphicsStates.forEach(([name, config], index) => {
    objects[graphicsStateObjectStart + index - 1] = Buffer.from(
      `<< /Type /ExtGState /ca ${formatNumber(config.fillAlpha)} /CA ${formatNumber(
        config.strokeAlpha,
      )} >>`,
      "latin1",
    );
  });

  imageEntries.forEach((entry, index) => {
    const objectId = imageObjectStart + index;
    if (entry.type === "smask") {
      const mask = entry.asset.smask!;
      objects[objectId - 1] = Buffer.concat([
        Buffer.from(
          `<< /Type /XObject /Subtype /Image /Width ${mask.width} /Height ${mask.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${mask.data.length} >>\nstream\n`,
          "latin1",
        ),
        mask.data,
        Buffer.from("\nendstream", "latin1"),
      ]);
      return;
    }

    const smaskRef = entry.asset.smask
      ? ` /SMask ${imageObjectByKey.get(`${entry.asset.name}-smask`)} 0 R`
      : "";
    objects[objectId - 1] = Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${entry.asset.width} /Height ${entry.asset.height} /ColorSpace /${entry.asset.colorSpace} /BitsPerComponent 8 /Filter /${entry.asset.filter}${smaskRef} /Length ${entry.asset.data.length} >>\nstream\n`,
        "latin1",
      ),
      entry.asset.data,
      Buffer.from("\nendstream", "latin1"),
    ]);
  });

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [0];
  let byteOffset = chunks[0].length;

  objects.forEach((object, index) => {
    offsets.push(byteOffset);
    const header = Buffer.from(`${index + 1} 0 obj\n`, "latin1");
    const footer = Buffer.from("\nendobj\n", "latin1");
    chunks.push(header, object, footer);
    byteOffset += header.length + object.length + footer.length;
  });

  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  xref += `startxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(chunks);
}

function formatPageDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function renderPageDate(page: PdfPage, generatedAt: Date) {
  const label = formatPageDate(generatedAt);
  const width = estimateTextWidth(label, 9, false);
  drawText(page, label, PAGE_WIDTH - PAGE_MARGIN_X - width, 8, {
    font: FONT_NORMAL,
    size: 9,
    color: [0.47, 0.53, 0.64],
  });
}

async function resolveSharedAsset(
  imageCache: Map<string, Promise<PdfImageAsset | null>>,
  imageAssets: PdfImageAsset[],
  candidate: string | null | undefined,
  variant: PdfImageVariant,
) {
  const normalized = typeof candidate === "string" ? candidate.trim() : "";
  if (!normalized) {
    return null;
  }

  const cacheKey = `${variant}:${normalized}`;
  if (!imageCache.has(cacheKey)) {
    const imageName = `Im${imageAssets.length + imageCache.size + 1}`;
    imageCache.set(
      cacheKey,
      loadImageAsset(normalized, imageName, variant).then((asset) => {
        if (asset) {
          imageAssets.push(asset);
        }
        return asset;
      }),
    );
  }

  return imageCache.get(cacheKey)!;
}

async function drawBackground(
  page: PdfPage,
  imageCache: Map<string, Promise<PdfImageAsset | null>>,
  imageAssets: PdfImageAsset[],
  backgroundUrl: string | null | undefined,
) {
  const asset = await resolveSharedAsset(imageCache, imageAssets, backgroundUrl, "background");
  if (asset) {
    drawImage(page, asset, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }
}

async function renderCatalogIntro(
  page: PdfPage,
  data: ShareLinkPdfData,
  catalog: ShareLinkPdfCatalog,
  generatedAt: Date,
  imageCache: Map<string, Promise<PdfImageAsset | null>>,
  imageAssets: PdfImageAsset[],
) {
  const outerWidth = 436.5;
  const outerHeight = 56;
  const outerX = (PAGE_WIDTH - outerWidth) / 2;
  const outerY = PAGE_MARGIN_TOP + DATE_ROW_HEIGHT;
  const innerInset = 6;
  const innerX = outerX + innerInset;
  const innerY = outerY + innerInset;
  const innerWidth = outerWidth - innerInset * 2;
  const innerHeight = outerHeight - innerInset * 2;

  drawRect(page, outerX, outerY, outerWidth, outerHeight, {
    fill: [1, 1, 1],
    stroke: [0.968, 0.91, 0.925],
    lineWidth: 0.7,
    graphicsState: "GS_PANEL",
  });

  drawRect(page, innerX, innerY, innerWidth, innerHeight, {
    fill: [1, 1, 1],
    stroke: [0.941, 0.902, 0.918],
    lineWidth: 0.6,
  });

  const leftLogo = await resolveSharedAsset(
    imageCache,
    imageAssets,
    catalog.pdfHeaderLeftLogoUrl ?? data.brandLogoUrl ?? null,
    "logo",
  );
  const rightLogo = await resolveSharedAsset(
    imageCache,
    imageAssets,
    catalog.pdfHeaderRightLogoUrl ?? null,
    "logo",
  );

  if (leftLogo) {
    drawRect(page, innerX + 8, innerY + 6, 48, 32, {
      fill: [1, 1, 1],
      stroke: [0.949, 0.878, 0.902],
      lineWidth: 0.5,
    });
    drawImage(page, leftLogo, innerX + 10, innerY + 7, 44, 30);
  }

  if (rightLogo) {
    drawRect(page, innerX + innerWidth - 56, innerY + 6, 48, 32, {
      fill: [1, 1, 1],
      stroke: [0.949, 0.878, 0.902],
      lineWidth: 0.5,
    });
    drawImage(page, rightLogo, innerX + innerWidth - 54, innerY + 7, 44, 30);
  }

  const title = sanitizePdfText(catalog.name);
  const titleWidth = estimateTextWidth(title, 22, true);
  drawText(page, title, innerX + (innerWidth - titleWidth) / 2, innerY + 9, {
    font: FONT_BOLD,
    size: 22,
    color: [0.067, 0.098, 0.153],
  });

  const yearLabel = String(generatedAt.getUTCFullYear());
  const yearWidth = estimateTextWidth(yearLabel, 12, false);
  drawText(page, yearLabel, innerX + (innerWidth - yearWidth) / 2, innerY + 29, {
    font: FONT_NORMAL,
    size: 12,
    color: [0.82, 0.17, 0.29],
  });

  return outerY + outerHeight + 16;
}

function renderMeasureStripe(
  page: PdfPage,
  catalog: ShareLinkPdfCatalog,
  categoryName: string,
  measureLabel: string,
  y: number,
) {
  const stripeBg = hexToColor(resolveHexColor(catalog.pdfStripeBgColor, "#0B1B5E"));
  const stripeLine = hexToColor(resolveHexColor(catalog.pdfStripeLineColor, "#D81B3A"));
  const stripeText = hexToColor(resolveHexColor(catalog.pdfStripeTextColor, "#FFFFFF"));

  drawRect(page, 0, y, PAGE_WIDTH, STRIPE_HEIGHT, {
    fill: stripeBg,
  });

  drawText(page, categoryName.toUpperCase(), PAGE_MARGIN_X, y + 7, {
    font: FONT_BOLD,
    size: 17,
    color: stripeText,
  });

  drawRect(page, PAGE_MARGIN_X + 105, y + 12, 86, 4, {
    fill: stripeLine,
  });

  drawText(page, measureLabel, PAGE_MARGIN_X + 205, y + 7, {
    font: FONT_NORMAL,
    size: 17,
    color: stripeText,
  });

  return y + STRIPE_HEIGHT + STRIPE_GAP_AFTER;
}

function renderLineHeader(page: PdfPage, lineLabel: string, y: number) {
  const width = estimateTextWidth(lineLabel, 20, true);
  drawText(page, lineLabel, PAGE_WIDTH / 2 - width / 2, y + 1, {
    font: FONT_BOLD,
    size: 20,
    color: [0.082, 0.11, 0.161],
  });
  drawRect(page, PAGE_MARGIN_X + CONTENT_WIDTH * 0.14, y + 20, CONTENT_WIDTH * 0.72, 1, {
    fill: [0.949, 0.878, 0.902],
  });
  return y + LINE_HEADER_HEIGHT;
}

async function renderProductCard(
  page: PdfPage,
  product: ShareLinkPdfProduct,
  x: number,
  y: number,
  imageCache: Map<string, Promise<PdfImageAsset | null>>,
  imageAssets: PdfImageAsset[],
) {
  drawRect(page, x + 1.5, y + 4, CARD_WIDTH - 1, CARD_HEIGHT - 2, {
    fill: [0.08, 0.11, 0.18],
    graphicsState: "GS_SHADOW",
  });

  const imageAsset = await resolveSharedAsset(
    imageCache,
    imageAssets,
    normalizeLabel(product.primaryImageUrl) ?? normalizeLabel(product.fallbackImageUrl),
    "product",
  );
  const imageLayout = resolveProductImageLayout(product.sizeLabel, product.imageLayout);

  if (imageAsset) {
    const scaledWidth = CARD_WIDTH * imageLayout.scale;
    const scaledHeight = CARD_IMAGE_HEIGHT * imageLayout.scale;
    const imageX = x + (CARD_WIDTH - scaledWidth) / 2 + (CARD_WIDTH * imageLayout.offsetX) / 100;
    const imageY =
      y + (CARD_IMAGE_HEIGHT - scaledHeight) / 2 + (CARD_IMAGE_HEIGHT * imageLayout.offsetY) / 100;
    drawImage(page, imageAsset, imageX, imageY, scaledWidth, scaledHeight);
  } else {
    drawText(page, "Sem imagem", x + 20, y + 30, {
      font: FONT_NORMAL,
      size: 8,
      color: [0.45, 0.45, 0.45],
    });
  }

  const textX = x + CARD_TEXT_PADDING_X;
  const textWidth = CARD_WIDTH - CARD_TEXT_PADDING_X * 2;
  let textY = y + CARD_IMAGE_HEIGHT + CARD_TEXT_PADDING_TOP;

  const nameLines = wrapText(product.name, CARD_NAME_FONT_SIZE, textWidth, 3, true);
  nameLines.forEach((line) => {
    drawText(page, line, textX, textY, {
      font: FONT_BOLD,
      size: CARD_NAME_FONT_SIZE,
      color: [0.082, 0.11, 0.161],
    });
    textY += 8.8;
  });
  const chipY = Math.min(
    textY + 1,
    y + CARD_HEIGHT - CARD_TEXT_PADDING_BOTTOM - 14,
  );
  const skuLabel = normalizeLabel(product.sku) ?? "Sem SKU";
  const chipWidth = estimateTextWidth(skuLabel, CARD_CODE_FONT_SIZE, true) + 10;

  drawRect(page, textX, chipY, chipWidth, 20, {
    fill: [0.086, 0.251, 0.486],
  });
  drawText(page, skuLabel, textX + 7, chipY + 3, {
    font: FONT_BOLD,
    size: CARD_CODE_FONT_SIZE,
    color: [1, 1, 1],
  });
}

export async function generateEditableShareLinkPdf(data: ShareLinkPdfData): Promise<Buffer> {
  const pages: PdfPage[] = [];
  const imageAssets: PdfImageAsset[] = [];
  const imageCache = new Map<string, Promise<PdfImageAsset | null>>();

  for (const catalog of data.catalogs) {
    const groups = buildCategoryMeasureGroups(catalog.products);
    let page = createPage();
    pages.push(page);
    await drawBackground(page, imageCache, imageAssets, catalog.pdfBackgroundImageUrl);
    renderPageDate(page, data.generatedAt);

    let cursorY = await renderCatalogIntro(
      page,
      data,
      catalog,
      data.generatedAt,
      imageCache,
      imageAssets,
    );

    const hasProducts = groups.some((lineGroup) =>
      lineGroup.groups.some((group) => group.products.length > 0),
    );

    if (!hasProducts) {
      drawText(page, "Nenhum produto neste catalogo.", PAGE_MARGIN_X, cursorY + 16, {
        font: FONT_NORMAL,
        size: 11,
        color: [0.35, 0.38, 0.43],
      });
      continue;
    }

    for (const lineGroup of groups) {
      if (lineGroup.lineLabel) {
        const firstGroup = lineGroup.groups[0];
        const requiredHeight =
          LINE_HEADER_HEIGHT +
          (firstGroup
            ? STRIPE_GAP_BEFORE + STRIPE_HEIGHT + STRIPE_GAP_AFTER + CARD_HEIGHT + ROW_GAP
            : 0);

        if (cursorY + requiredHeight > CONTENT_BOTTOM) {
          page = createPage();
          pages.push(page);
          await drawBackground(page, imageCache, imageAssets, catalog.pdfBackgroundImageUrl);
          renderPageDate(page, data.generatedAt);
          cursorY = PAGE_MARGIN_TOP + DATE_ROW_HEIGHT;
        }

        cursorY = renderLineHeader(page, lineGroup.lineLabel, cursorY);
      }

      for (const group of lineGroup.groups) {
        const rows = chunkProducts(group.products, PRODUCTS_PER_ROW);
        let stripeRendered = false;

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
          const needsStripe = !stripeRendered;
          const blockHeight =
            (needsStripe ? STRIPE_GAP_BEFORE + STRIPE_HEIGHT + STRIPE_GAP_AFTER : 0) +
            CARD_HEIGHT +
            ROW_GAP;

          if (cursorY + blockHeight > CONTENT_BOTTOM) {
            page = createPage();
            pages.push(page);
            await drawBackground(page, imageCache, imageAssets, catalog.pdfBackgroundImageUrl);
            renderPageDate(page, data.generatedAt);
            cursorY = PAGE_MARGIN_TOP + DATE_ROW_HEIGHT;
          }

          if (needsStripe) {
            cursorY += STRIPE_GAP_BEFORE;
            cursorY = renderMeasureStripe(
              page,
              catalog,
              group.categoryName,
              group.measureLabel,
              cursorY,
            );
            stripeRendered = true;
          }

          const row = rows[rowIndex];
          for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
            const x = PAGE_MARGIN_X + columnIndex * (CARD_WIDTH + COLUMN_GAP);
            await renderProductCard(page, row[columnIndex], x, cursorY, imageCache, imageAssets);
          }

          cursorY += CARD_HEIGHT + ROW_GAP;
        }

        cursorY += GROUP_GAP_AFTER;
      }
    }
  }

  return buildPdfBuffer(pages, imageAssets);
}

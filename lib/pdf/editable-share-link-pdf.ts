import sharp from "sharp";

import type {
  ShareLinkPdfCatalog,
  ShareLinkPdfData,
  ShareLinkPdfProduct,
} from "@/lib/pdf/share-link-pdf";

type PdfFont = "F1" | "F2";

type PdfImageVariant = "product" | "logo" | "background";

type PdfImageAsset = {
  name: string;
  width: number;
  height: number;
  data: Buffer;
};

type PdfPage = {
  ops: string[];
  usedImages: Set<string>;
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
  measureOrder: ParsedMeasure;
  products: ShareLinkPdfProduct[];
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_X = 24;
const PAGE_MARGIN_TOP = 18;
const PAGE_MARGIN_BOTTOM = 24;
const PAGE_MARGIN_RIGHT = 24;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X - PAGE_MARGIN_RIGHT;
const PRODUCT_COLUMNS = 3;
const COLUMN_GAP = 12;
const CARD_WIDTH = (CONTENT_WIDTH - COLUMN_GAP * (PRODUCT_COLUMNS - 1)) / PRODUCT_COLUMNS;
const CARD_HEIGHT = 228;
const CARD_PADDING = 10;
const CARD_IMAGE_HEIGHT = 122;
const ROW_GAP = 14;
const HEADER_HEIGHT = 58;
const STRIPE_HEIGHT = 28;
const STRIPE_GAP_AFTER = 10;
const STRIPE_GAP_BEFORE = 6;
const GROUP_GAP_AFTER = 14;
const DATE_Y = 12;
const CONTENT_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN_BOTTOM;

const PRODUCT_IMAGE_TARGET_WIDTH = 560;
const PRODUCT_IMAGE_TARGET_HEIGHT = 360;
const LOGO_IMAGE_TARGET_WIDTH = 320;
const LOGO_IMAGE_TARGET_HEIGHT = 120;
const IMAGE_FETCH_TIMEOUT_MS = 8_000;

const FONT_NORMAL: PdfFont = "F1";
const FONT_BOLD: PdfFont = "F2";

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
  const r = Number.parseInt(safeHex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(safeHex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(safeHex.slice(4, 6), 16) / 255;
  return [r, g, b];
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
    lines[maxLines - 1] = lastLine !== (lines[maxLines - 1] ?? "") ? `${lastLine}...` : lastLine;
  }

  return lines;
}

function createPage(): PdfPage {
  return {
    ops: [],
    usedImages: new Set<string>(),
  };
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

  let op = "S";
  if (options.fill && options.stroke) {
    op = "B";
  } else if (options.fill) {
    op = "f";
  }

  parts.push(
    `${formatNumber(x)} ${formatNumber(pdfY)} ${formatNumber(width)} ${formatNumber(height)} re ${op}`,
  );

  page.ops.push(parts.join("\n"));
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

function drawImage(page: PdfPage, asset: PdfImageAsset, x: number, y: number, width: number, height: number) {
  const pdfY = PAGE_HEIGHT - y - height;
  page.usedImages.add(asset.name);
  page.ops.push(
    `q ${formatNumber(width)} 0 0 ${formatNumber(height)} ${formatNumber(x)} ${formatNumber(pdfY)} cm /${asset.name} Do Q`,
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

function buildCategoryMeasureGroups(products: ShareLinkPdfProduct[]): CategoryMeasureGroup[] {
  const grouped = new Map<string, CategoryMeasureGroup>();

  products.forEach((product) => {
    const categoryName = normalizeLabel(product.categoryName) ?? "Outros Produtos";
    const measureOrder = parseMeasure(product.sizeLabel);
    const groupKey = `${categoryName}::${measureOrder.normalizedKey}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        categoryName,
        measureLabel: measureOrder.displayLabel,
        measureOrder,
        products: [],
      });
    }

    grouped.get(groupKey)!.products.push(product);
  });

  const groups = [...grouped.values()];
  groups.forEach((group) => group.products.sort(compareProducts));
  groups.sort((left, right) => {
    const categoryDiff = compareCategoryName(left.categoryName, right.categoryName);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }
    return compareMeasureOrder(left.measureOrder, right.measureOrder);
  });

  return groups;
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
    const pipeline = sharp(source).rotate();
    const transformed =
      variant === "background"
        ? await pipeline
            .resize(PAGE_WIDTH, PAGE_HEIGHT, {
              fit: "cover",
              position: "centre",
            })
            .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:2:0" })
            .toBuffer({ resolveWithObject: true })
        : variant === "logo"
          ? await pipeline
              .flatten({ background: "#ffffff" })
              .resize(LOGO_IMAGE_TARGET_WIDTH, LOGO_IMAGE_TARGET_HEIGHT, {
                fit: "contain",
                background: "#ffffff",
              })
              .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:2:0" })
              .toBuffer({ resolveWithObject: true })
          : await pipeline
              .flatten({ background: "#ffffff" })
              .resize(PRODUCT_IMAGE_TARGET_WIDTH, PRODUCT_IMAGE_TARGET_HEIGHT, {
                fit: "contain",
                background: "#ffffff",
              })
              .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:2:0" })
              .toBuffer({ resolveWithObject: true });

    return {
      name,
      width: transformed.info.width ?? PAGE_WIDTH,
      height: transformed.info.height ?? PAGE_HEIGHT,
      data: transformed.data,
    };
  } catch {
    return null;
  }
}

function buildPdfBuffer(pages: PdfPage[], imageAssets: PdfImageAsset[]) {
  const pageCount = pages.length;
  const imageCount = imageAssets.length;

  const pageObjectStart = 3;
  const contentObjectStart = pageObjectStart + pageCount;
  const fontObjectStart = contentObjectStart + pageCount;
  const imageObjectStart = fontObjectStart + 2;
  const totalObjects = imageObjectStart + imageCount - 1;

  const objects: Buffer[] = new Array(totalObjects);
  const pageRefs = Array.from({ length: pageCount }, (_, index) => `${pageObjectStart + index} 0 R`).join(" ");

  objects[0] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1");
  objects[1] = Buffer.from(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`, "latin1");

  const imageObjectByName = new Map<string, number>();
  imageAssets.forEach((asset, index) => {
    imageObjectByName.set(asset.name, imageObjectStart + index);
  });

  pages.forEach((page, index) => {
    const pageObject = pageObjectStart + index;
    const contentObject = contentObjectStart + index;
    const resourceEntries = [`/Font << /F1 ${fontObjectStart} 0 R /F2 ${fontObjectStart + 1} 0 R >>`];

    if (page.usedImages.size > 0) {
      const xObjectRefs = [...page.usedImages]
        .sort((left, right) => left.localeCompare(right, "en", { numeric: true }))
        .map((name) => `/${name} ${imageObjectByName.get(name)} 0 R`)
        .join(" ");
      resourceEntries.push(`/XObject << ${xObjectRefs} >>`);
    }

    objects[pageObject - 1] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${resourceEntries.join(" ")} >> /Contents ${contentObject} 0 R >>`,
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

  imageAssets.forEach((asset, index) => {
    const imageObject = imageObjectStart + index;
    objects[imageObject - 1] = Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${asset.width} /Height ${asset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${asset.data.length} >>\nstream\n`,
        "latin1",
      ),
      asset.data,
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

function renderPageDate(page: PdfPage, generatedAt: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(generatedAt);
  const width = estimateTextWidth(label, 9, false);
  drawText(page, label, PAGE_WIDTH - PAGE_MARGIN_RIGHT - width, DATE_Y, {
    font: FONT_NORMAL,
    size: 9,
    color: [0.47, 0.53, 0.64],
  });
}

async function drawBackground(
  page: PdfPage,
  imageCache: Map<string, Promise<PdfImageAsset | null>>,
  imageAssets: PdfImageAsset[],
  backgroundUrl: string | null | undefined,
) {
  const normalized = typeof backgroundUrl === "string" ? backgroundUrl.trim() : "";
  if (!normalized) {
    return;
  }

  if (!imageCache.has(`background:${normalized}`)) {
    const imageName = `Im${imageAssets.length + imageCache.size + 1}`;
    imageCache.set(
      `background:${normalized}`,
      loadImageAsset(normalized, imageName, "background").then((asset) => {
        if (asset) {
          imageAssets.push(asset);
        }
        return asset;
      }),
    );
  }

  const asset = await imageCache.get(`background:${normalized}`)!;
  if (asset) {
    drawImage(page, asset, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }
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

async function renderCatalogHeader(
  page: PdfPage,
  data: ShareLinkPdfData,
  catalog: ShareLinkPdfCatalog,
  imageCache: Map<string, Promise<PdfImageAsset | null>>,
  imageAssets: PdfImageAsset[],
) {
  const headerX = 58;
  const headerY = PAGE_MARGIN_TOP + 16;
  const headerWidth = PAGE_WIDTH - headerX * 2;

  drawRect(page, headerX, headerY, headerWidth, HEADER_HEIGHT, {
    fill: [1, 1, 1],
    stroke: [0.914, 0.82, 0.851],
    lineWidth: 0.8,
  });

  const leftLogoCandidate = catalog.pdfHeaderLeftLogoUrl ?? data.brandLogoUrl ?? null;
  const rightLogoCandidate = catalog.pdfHeaderRightLogoUrl ?? null;
  const leftLogo = await resolveSharedAsset(imageCache, imageAssets, leftLogoCandidate, "logo");
  const rightLogo = await resolveSharedAsset(imageCache, imageAssets, rightLogoCandidate, "logo");

  if (leftLogo) {
    drawImage(page, leftLogo, headerX + 10, headerY + 9, 70, 40);
  }
  if (rightLogo) {
    drawImage(page, rightLogo, headerX + headerWidth - 80, headerY + 9, 70, 40);
  }

  const title = sanitizePdfText(catalog.name);
  const titleWidth = estimateTextWidth(title, 22, true);
  drawText(page, title, headerX + (headerWidth - titleWidth) / 2, headerY + 14, {
    font: FONT_BOLD,
    size: 22,
    color: [0.067, 0.098, 0.153],
  });

  const yearLabel = String(data.generatedAt.getUTCFullYear());
  const yearWidth = estimateTextWidth(yearLabel, 12, false);
  drawText(page, yearLabel, headerX + (headerWidth - yearWidth) / 2, headerY + 39, {
    font: FONT_NORMAL,
    size: 12,
    color: [0.82, 0.17, 0.29],
  });

  return headerY + HEADER_HEIGHT + 18;
}

function renderMeasureStripe(page: PdfPage, catalog: ShareLinkPdfCatalog, categoryName: string, measureLabel: string, y: number) {
  const stripeBg = hexToColor(resolveHexColor(catalog.pdfStripeBgColor, "#0B1B5E"));
  const stripeLine = hexToColor(resolveHexColor(catalog.pdfStripeLineColor, "#D81B3A"));
  const stripeText = hexToColor(resolveHexColor(catalog.pdfStripeTextColor, "#FFFFFF"));

  drawRect(page, 0, y, PAGE_WIDTH, STRIPE_HEIGHT, {
    fill: stripeBg,
  });

  drawText(page, categoryName, PAGE_MARGIN_X, y + 7, {
    font: FONT_BOLD,
    size: 17,
    color: stripeText,
  });

  drawRect(page, PAGE_MARGIN_X + 102, y + 12, 80, 4, {
    fill: stripeLine,
  });

  drawText(page, measureLabel, PAGE_MARGIN_X + 194, y + 7, {
    font: FONT_NORMAL,
    size: 17,
    color: stripeText,
  });

  return y + STRIPE_HEIGHT + STRIPE_GAP_AFTER;
}

async function renderProductCard(
  page: PdfPage,
  product: ShareLinkPdfProduct,
  x: number,
  y: number,
  imageCache: Map<string, Promise<PdfImageAsset | null>>,
  imageAssets: PdfImageAsset[],
) {
  drawRect(page, x, y, CARD_WIDTH, CARD_HEIGHT, {
    fill: [1, 1, 1],
    stroke: [0.914, 0.82, 0.851],
    lineWidth: 0.7,
  });

  const imageX = x + CARD_PADDING;
  const imageY = y + CARD_PADDING;
  const imageWidth = CARD_WIDTH - CARD_PADDING * 2;
  const imageHeight = CARD_IMAGE_HEIGHT;

  const candidate = normalizeLabel(product.primaryImageUrl) ?? normalizeLabel(product.fallbackImageUrl);
  const imageAsset = await resolveSharedAsset(imageCache, imageAssets, candidate, "product");
  if (imageAsset) {
    drawImage(page, imageAsset, imageX, imageY, imageWidth, imageHeight);
  } else {
    drawRect(page, imageX, imageY, imageWidth, imageHeight, {
      fill: [0.96, 0.96, 0.96],
      stroke: [0.87, 0.87, 0.87],
      lineWidth: 0.5,
    });
    drawText(page, "Sem imagem", imageX + 40, imageY + imageHeight / 2 - 6, {
      font: FONT_NORMAL,
      size: 10,
      color: [0.45, 0.45, 0.45],
    });
  }

  const textX = x + CARD_PADDING;
  let textY = imageY + imageHeight + 14;
  const nameLines = wrapText(product.name, 10.5, imageWidth, 3, true);
  nameLines.forEach((line) => {
    drawText(page, line, textX, textY, {
      font: FONT_BOLD,
      size: 10.5,
      color: [0.082, 0.11, 0.161],
    });
    textY += 12;
  });

  const skuLabel = normalizeLabel(product.sku) ?? "SEM SKU";
  const chipWidth = estimateTextWidth(skuLabel, 13.5, true) + 14;
  const chipHeight = 20;
  const chipY = y + CARD_HEIGHT - CARD_PADDING - chipHeight;

  drawRect(page, textX, chipY, chipWidth, chipHeight, {
    fill: [0.086, 0.251, 0.486],
  });
  drawText(page, skuLabel, textX + 7, chipY + 4, {
    font: FONT_BOLD,
    size: 13.5,
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
    let cursorY = await renderCatalogHeader(page, data, catalog, imageCache, imageAssets);

    if (groups.length === 0) {
      drawText(page, "Nenhum produto neste catalogo.", PAGE_MARGIN_X, cursorY + 12, {
        font: FONT_NORMAL,
        size: 11,
        color: [0.35, 0.38, 0.43],
      });
      continue;
    }

    for (const group of groups) {
      const rows = chunkProducts(group.products, PRODUCT_COLUMNS);

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
        const isLeadRow = rowIndex === 0;
        const blockHeight = (isLeadRow ? STRIPE_HEIGHT + STRIPE_GAP_AFTER + STRIPE_GAP_BEFORE : 0) + CARD_HEIGHT + ROW_GAP;

        if (cursorY + blockHeight > CONTENT_BOTTOM) {
          page = createPage();
          pages.push(page);
          await drawBackground(page, imageCache, imageAssets, catalog.pdfBackgroundImageUrl);
          renderPageDate(page, data.generatedAt);
          cursorY = PAGE_MARGIN_TOP + 24;
        }

        if (isLeadRow) {
          cursorY += STRIPE_GAP_BEFORE;
          cursorY = renderMeasureStripe(page, catalog, group.categoryName, group.measureLabel, cursorY);
        }

        const row = rows[rowIndex];
        for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
          const product = row[columnIndex];
          const x = PAGE_MARGIN_X + columnIndex * (CARD_WIDTH + COLUMN_GAP);
          await renderProductCard(page, product, x, cursorY, imageCache, imageAssets);
        }

        cursorY += CARD_HEIGHT + ROW_GAP;
      }

      cursorY += GROUP_GAP_AFTER;
    }
  }

  return buildPdfBuffer(pages, imageAssets);
}

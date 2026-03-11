import sharp from "sharp";

import {
  getPdfTheme,
  type Color,
  type PdfTemplateVersion,
  type PdfTheme,
} from "@/lib/pdf/themes/corporate-v1";
import {
  buildLineCategoryMeasureGroups,
  normalizeCatalogLabel,
  type LineCategoryMeasureGroup,
} from "@/lib/catalog/line-grouping";

type PdfFont = "F1" | "F2";

type PdfImageAsset = {
  name: string;
  width: number;
  height: number;
  data: Buffer;
};

type PdfPageType = "cover" | "catalog";

type PdfPage = {
  type: PdfPageType;
  ops: string[];
  usedImages: Set<string>;
};

export type ShareLinkPdfProduct = {
  id: string;
  name: string;
  sku?: string | null;
  lineLabel?: string | null;
  sizeLabel?: string | null;
  brand?: string | null;
  description?: string | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  primaryImageUrl?: string | null;
  fallbackImageUrl?: string | null;
};

export type ShareLinkPdfCatalog = {
  id: string;
  name: string;
  description?: string | null;
  pdfBackgroundImageUrl?: string | null;
  pdfHeaderLeftLogoUrl?: string | null;
  pdfHeaderRightLogoUrl?: string | null;
  pdfStripeBgColor?: string | null;
  pdfStripeLineColor?: string | null;
  pdfStripeTextColor?: string | null;
  pdfStripeFontFamily?: string | null;
  pdfStripeFontWeight?: number | null;
  pdfStripeFontSize?: number | null;
  products: ShareLinkPdfProduct[];
};

export type ShareLinkPdfData = {
  brandName: string;
  brandLogoUrl?: string | null;
  shareLinkName: string;
  generatedAt: Date;
  catalogs: ShareLinkPdfCatalog[];
  catalogCount?: number;
  templateVersion?: PdfTemplateVersion;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 34;
const MARGIN_BOTTOM = 34;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const PRODUCT_IMAGE_TARGET_WIDTH = 460;
const PRODUCT_IMAGE_TARGET_HEIGHT = 300;
const LOGO_IMAGE_TARGET_WIDTH = 320;
const LOGO_IMAGE_TARGET_HEIGHT = 120;
const IMAGE_FETCH_TIMEOUT_MS = 8_000;

const FONT_NORMAL: PdfFont = "F1";
const FONT_BOLD: PdfFont = "F2";

type RenderLayout = {
  headerHeight: number;
  columnGap: number;
  cardWidth: number;
  cardHeight: number;
  cardPadding: number;
  cardImageHeight: number;
  rowGap: number;
  groupHeaderHeight: number;
  groupGapAfter: number;
  footerHeight: number;
  contentBottom: number;
};

function createLayout(theme: PdfTheme): RenderLayout {
  const cardWidth = (CONTENT_WIDTH - theme.layout.columnGap) / 2;
  return {
    headerHeight: theme.layout.headerHeight,
    columnGap: theme.layout.columnGap,
    cardWidth,
    cardHeight: theme.layout.cardHeight,
    cardPadding: theme.layout.cardPadding,
    cardImageHeight: theme.layout.cardImageHeight,
    rowGap: theme.layout.rowGap,
    groupHeaderHeight: theme.layout.groupHeaderHeight,
    groupGapAfter: theme.layout.groupGapAfter,
    footerHeight: theme.layout.footerHeight,
    contentBottom: PAGE_HEIGHT - MARGIN_BOTTOM - theme.layout.footerHeight,
  };
}

type ProductGroup = {
  categoryName: string;
  measureLabel: string;
  products: ShareLinkPdfProduct[];
};

type ProductLineGroup = {
  lineLabel: string | null;
  groups: ProductGroup[];
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

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (lines.length === maxLines && words.length > 0) {
    const original = lines[maxLines - 1] ?? "";
    if (estimateTextWidth(original, fontSize, bold) > maxWidth) {
      let shortened = original;
      while (shortened.length > 3 && estimateTextWidth(`${shortened}...`, fontSize, bold) > maxWidth) {
        shortened = shortened.slice(0, -1);
      }
      lines[maxLines - 1] = `${shortened}...`;
    }
  }

  return lines;
}

function colorFill(color: Color) {
  return `${formatNumber(color[0])} ${formatNumber(color[1])} ${formatNumber(color[2])} rg`;
}

function colorStroke(color: Color) {
  return `${formatNumber(color[0])} ${formatNumber(color[1])} ${formatNumber(color[2])} RG`;
}

function createPage(type: PdfPageType): PdfPage {
  return {
    type,
    ops: [],
    usedImages: new Set<string>(),
  };
}

function hasSpace(cursorY: number, requiredHeight: number, contentBottom: number) {
  return cursorY + requiredHeight <= contentBottom;
}

function drawRect(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill?: Color;
    stroke?: Color;
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

function drawLine(
  page: PdfPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Color,
  lineWidth = 1,
) {
  const pdfY1 = PAGE_HEIGHT - y1;
  const pdfY2 = PAGE_HEIGHT - y2;
  page.ops.push(
    [
      colorStroke(color),
      `${formatNumber(lineWidth)} w`,
      `${formatNumber(x1)} ${formatNumber(pdfY1)} m ${formatNumber(x2)} ${formatNumber(pdfY2)} l S`,
    ].join("\n"),
  );
}

function drawText(
  page: PdfPage,
  text: string,
  x: number,
  y: number,
  options: {
    font: PdfFont;
    size: number;
    color: Color;
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

function drawCenteredText(
  page: PdfPage,
  text: string,
  centerX: number,
  y: number,
  options: {
    font: PdfFont;
    size: number;
    color: Color;
    bold?: boolean;
  },
) {
  const width = estimateTextWidth(text, options.size, options.bold);
  drawText(page, text, centerX - width / 2, y, {
    font: options.font,
    size: options.size,
    color: options.color,
  });
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
    `q ${formatNumber(width)} 0 0 ${formatNumber(height)} ${formatNumber(x)} ${formatNumber(pdfY)} cm /${asset.name} Do Q`,
  );
}

function groupProducts(products: ShareLinkPdfProduct[]): ProductLineGroup[] {
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

async function loadImageAsset(
  url: string,
  name: string,
  variant: "product" | "logo",
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
      variant === "logo"
        ? await pipeline
            .flatten({ background: "#ffffff" })
            .resize(LOGO_IMAGE_TARGET_WIDTH, LOGO_IMAGE_TARGET_HEIGHT, {
              fit: "contain",
              background: "#ffffff",
            })
            .jpeg({
              quality: 88,
              mozjpeg: true,
              chromaSubsampling: "4:2:0",
            })
            .toBuffer({ resolveWithObject: true })
        : await pipeline
            .resize(PRODUCT_IMAGE_TARGET_WIDTH, PRODUCT_IMAGE_TARGET_HEIGHT, {
              fit: "cover",
              position: "attention",
            })
            .jpeg({
              quality: 82,
              mozjpeg: true,
              chromaSubsampling: "4:2:0",
            })
            .toBuffer({ resolveWithObject: true });

    return {
      name,
      width:
        transformed.info.width ??
        (variant === "logo" ? LOGO_IMAGE_TARGET_WIDTH : PRODUCT_IMAGE_TARGET_WIDTH),
      height:
        transformed.info.height ??
        (variant === "logo" ? LOGO_IMAGE_TARGET_HEIGHT : PRODUCT_IMAGE_TARGET_HEIGHT),
      data: transformed.data,
    };
  } catch {
    return null;
  }
}

function formatCoverDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function renderCover(
  page: PdfPage,
  data: ShareLinkPdfData,
  theme: PdfTheme,
  resolveBrandLogoAsset: () => Promise<PdfImageAsset | null>,
) {
  drawRect(page, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, {
    fill: theme.colors.pageBackground,
  });

  const cardWidth = theme.layout.coverCardWidth;
  const cardHeight = theme.layout.coverCardHeight;
  const cardX = (PAGE_WIDTH - cardWidth) / 2;
  const cardY = (PAGE_HEIGHT - cardHeight) / 2 - 20;

  drawRect(page, cardX, cardY, cardWidth, cardHeight, {
    fill: theme.colors.cardBackground,
    stroke: theme.colors.cardBorder,
    lineWidth: 1,
  });

  drawRect(page, cardX, cardY, cardWidth, theme.layout.coverStripeHeight, {
    fill: theme.colors.accent,
  });

  const centerX = PAGE_WIDTH / 2;
  let cursorY = cardY + 38;
  const logoAsset = await resolveBrandLogoAsset();

  if (logoAsset) {
    const ratio = Math.min(
      theme.layout.logoCoverMaxWidth / logoAsset.width,
      theme.layout.logoCoverMaxHeight / logoAsset.height,
      1,
    );
    const width = logoAsset.width * ratio;
    const height = logoAsset.height * ratio;
    drawImage(page, logoAsset, centerX - width / 2, cursorY, width, height);
    cursorY += height + 20;
  }

  drawCenteredText(page, "CATALOGO COMERCIAL", centerX, cursorY, {
    font: FONT_BOLD,
    size: theme.fonts.coverEyebrow,
    color: theme.colors.textSecondary,
    bold: true,
  });
  cursorY += 30;

  drawCenteredText(page, data.brandName, centerX, cursorY, {
    font: FONT_BOLD,
    size: theme.fonts.coverBrand,
    color: theme.colors.textPrimary,
    bold: true,
  });
  cursorY += 38;

  drawCenteredText(page, data.shareLinkName, centerX, cursorY, {
    font: FONT_NORMAL,
    size: theme.fonts.coverTitle,
    color: theme.colors.textPrimary,
  });
  cursorY += 34;

  const catalogCount = data.catalogCount ?? data.catalogs.length;
  drawCenteredText(page, `${catalogCount} catalogo(s)`, centerX, cursorY, {
    font: FONT_NORMAL,
    size: theme.fonts.coverMeta,
    color: theme.colors.textSecondary,
  });
  cursorY += 18;

  drawCenteredText(page, `Gerado em ${formatCoverDate(data.generatedAt)}`, centerX, cursorY, {
    font: FONT_NORMAL,
    size: theme.fonts.coverMeta,
    color: theme.colors.textSecondary,
  });
}

async function renderCatalogPageFrame(
  page: PdfPage,
  data: ShareLinkPdfData,
  catalog: ShareLinkPdfCatalog,
  continuation: boolean,
  theme: PdfTheme,
  layout: RenderLayout,
  resolveBrandLogoAsset: () => Promise<PdfImageAsset | null>,
) {
  drawRect(page, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, {
    fill: theme.colors.pageBackground,
  });

  drawRect(page, 0, 0, PAGE_WIDTH, layout.headerHeight, {
    fill: theme.colors.headerBackground,
  });

  let titleStartX = MARGIN_X;
  const logoAsset = await resolveBrandLogoAsset();
  if (logoAsset) {
    const ratio = Math.min(
      theme.layout.logoHeaderWidth / logoAsset.width,
      theme.layout.logoHeaderHeight / logoAsset.height,
      1,
    );
    const width = logoAsset.width * ratio;
    const height = logoAsset.height * ratio;
    const logoY = (layout.headerHeight - height) / 2;
    drawImage(page, logoAsset, MARGIN_X, logoY, width, height);
    titleStartX = MARGIN_X + width + 12;
  }

  drawText(page, data.brandName, titleStartX, 13, {
    font: FONT_BOLD,
    size: theme.fonts.headerBrand,
    color: theme.colors.textOnDark,
  });

  drawText(page, data.shareLinkName, titleStartX, 29, {
    font: FONT_NORMAL,
    size: theme.fonts.headerShareLink,
    color: theme.colors.textOnDark,
  });

  const title = continuation ? `${catalog.name} (continuacao)` : catalog.name;
  let cursorY = layout.headerHeight + 18;

  drawText(page, title, MARGIN_X, cursorY, {
    font: FONT_BOLD,
    size: theme.fonts.catalogTitle,
    color: theme.colors.textPrimary,
  });
  cursorY += 26;

  if (!continuation && catalog.description) {
    const lines = wrapText(
      catalog.description,
      theme.fonts.catalogDescription,
      CONTENT_WIDTH,
      3,
      false,
    );

    lines.forEach((line) => {
      drawText(page, line, MARGIN_X, cursorY, {
        font: FONT_NORMAL,
        size: theme.fonts.catalogDescription,
        color: theme.colors.textSecondary,
      });
      cursorY += 13;
    });

    cursorY += 8;
  }

  return cursorY + 14;
}

function renderGroupHeader(
  page: PdfPage,
  title: string,
  y: number,
  theme: PdfTheme,
  layout: RenderLayout,
) {
  drawRect(page, MARGIN_X, y, CONTENT_WIDTH, layout.groupHeaderHeight, {
    fill: theme.colors.mutedBackground,
    stroke: theme.colors.cardBorder,
    lineWidth: 0.7,
  });

  drawText(page, title, MARGIN_X + 10, y + 6, {
    font: FONT_BOLD,
    size: theme.fonts.groupTitle,
    color: theme.colors.textPrimary,
  });

  return y + layout.groupHeaderHeight + 10;
}

function drawSkuChip(
  page: PdfPage,
  skuLabel: string,
  x: number,
  y: number,
  theme: PdfTheme,
) {
  const chipPaddingX = 5;
  const chipPaddingY = 3;
  const textWidth = estimateTextWidth(skuLabel, theme.fonts.cardMeta, true);
  const width = textWidth + chipPaddingX * 2;
  const height = theme.fonts.cardMeta + chipPaddingY * 2 + 1;

  drawRect(page, x, y, width, height, {
    fill: theme.colors.chipBackground,
  });
  drawText(page, skuLabel, x + chipPaddingX, y + chipPaddingY - 1, {
    font: FONT_BOLD,
    size: theme.fonts.cardMeta,
    color: theme.colors.chipText,
  });
}

async function renderProductCard(
  page: PdfPage,
  product: ShareLinkPdfProduct,
  x: number,
  y: number,
  resolveImageAsset: (product: ShareLinkPdfProduct) => Promise<PdfImageAsset | null>,
  theme: PdfTheme,
  layout: RenderLayout,
) {
  drawRect(page, x, y, layout.cardWidth, layout.cardHeight, {
    fill: theme.colors.cardBackground,
    stroke: theme.colors.cardBorder,
    lineWidth: 0.8,
  });

  const innerX = x + layout.cardPadding;
  const imageY = y + layout.cardPadding;
  const imageWidth = layout.cardWidth - layout.cardPadding * 2;

  drawRect(page, innerX, imageY, imageWidth, layout.cardImageHeight, {
    fill: theme.colors.mutedBackground,
    stroke: theme.colors.cardBorder,
    lineWidth: 0.6,
  });

  const asset = await resolveImageAsset(product);

  if (asset) {
    drawImage(page, asset, innerX, imageY, imageWidth, layout.cardImageHeight);
  } else {
    drawCenteredText(
      page,
      "Sem imagem disponivel",
      innerX + imageWidth / 2,
      imageY + layout.cardImageHeight / 2 - 4,
      {
        font: FONT_NORMAL,
        size: theme.fonts.cardMeta,
        color: theme.colors.textSecondary,
      },
    );
  }

  const textWidth = imageWidth;
  let textY = imageY + layout.cardImageHeight + 10;

  const nameLines = wrapText(product.name, theme.fonts.cardName, textWidth, 2, true);
  nameLines.forEach((line) => {
    drawText(page, line, innerX, textY, {
      font: FONT_BOLD,
      size: theme.fonts.cardName,
      color: theme.colors.textPrimary,
    });
    textY += 13;
  });

  const productBrand = normalizeCatalogLabel(product.brand);
  const brandLabel = productBrand ? `Marca: ${productBrand}` : "Marca nao informada";
  drawText(page, brandLabel, innerX, textY + 1, {
    font: FONT_NORMAL,
    size: theme.fonts.cardMeta,
    color: theme.colors.textSecondary,
  });

  const skuLabel = product.sku ? `SKU ${product.sku}` : "SKU --";
  const skuWidth = estimateTextWidth(skuLabel, theme.fonts.cardMeta, true) + 10;
  drawSkuChip(page, skuLabel, innerX + textWidth - skuWidth, textY - 2, theme);
  textY += 14;

  const categoryLabel = normalizeCatalogLabel(product.categoryName) ?? "Sem categoria";
  drawText(page, categoryLabel, innerX, textY, {
    font: FONT_NORMAL,
    size: theme.fonts.cardMeta,
    color: theme.colors.textSecondary,
  });
  textY += 12;

  const descriptionLabel =
    normalizeCatalogLabel(product.description) ?? "Sem descricao para este produto.";
  const descriptionLines = wrapText(
    descriptionLabel,
    theme.fonts.cardDescription,
    textWidth,
    3,
    false,
  );

  descriptionLines.forEach((line) => {
    drawText(page, line, innerX, textY, {
      font: FONT_NORMAL,
      size: theme.fonts.cardDescription,
      color: theme.colors.textSecondary,
    });
    textY += 11;
  });
}

function renderFooter(
  page: PdfPage,
  pageNumber: number,
  totalPages: number,
  data: ShareLinkPdfData,
  theme: PdfTheme,
  layout: RenderLayout,
) {
  const lineY = PAGE_HEIGHT - MARGIN_BOTTOM - layout.footerHeight + 4;
  drawLine(page, MARGIN_X, lineY, PAGE_WIDTH - MARGIN_X, lineY, theme.colors.cardBorder, 0.8);

  drawText(page, data.brandName, MARGIN_X, lineY + 6, {
    font: FONT_NORMAL,
    size: theme.fonts.footer,
    color: theme.colors.textSecondary,
  });

  const label = `Pagina ${pageNumber} de ${totalPages}`;
  drawCenteredText(page, label, PAGE_WIDTH / 2, lineY + 6, {
    font: FONT_NORMAL,
    size: theme.fonts.footer,
    color: theme.colors.textSecondary,
  });

  const generatedLabel = `Gerado em ${formatCoverDate(data.generatedAt)}`;
  const generatedWidth = estimateTextWidth(generatedLabel, theme.fonts.footer, false);
  drawText(page, generatedLabel, PAGE_WIDTH - MARGIN_X - generatedWidth, lineY + 6, {
    font: FONT_NORMAL,
    size: theme.fonts.footer,
    color: theme.colors.textSecondary,
  });
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
  objects[1] = Buffer.from(
    `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`,
    "latin1",
  );

  const imageObjectByName = new Map<string, number>();
  imageAssets.forEach((asset, index) => {
    imageObjectByName.set(asset.name, imageObjectStart + index);
  });

  pages.forEach((page, index) => {
    const pageObject = pageObjectStart + index;
    const contentObject = contentObjectStart + index;

    const resourceEntries = [
      `/Font << /F1 ${fontObjectStart} 0 R /F2 ${fontObjectStart + 1} 0 R >>`,
    ];

    if (page.usedImages.size > 0) {
      const xObjectRefs = [...page.usedImages]
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
        .map((name) => `/${name} ${imageObjectByName.get(name)} 0 R`)
        .join(" ");

      resourceEntries.push(`/XObject << ${xObjectRefs} >>`);
    }

    objects[pageObject - 1] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << ${resourceEntries.join(" ")} >> /Contents ${contentObject} 0 R >>`,
      "latin1",
    );

    const contentStream = Buffer.from(page.ops.join("\n"), "latin1");
    const header = Buffer.from(`<< /Length ${contentStream.length} >>\nstream\n`, "latin1");
    const footer = Buffer.from("\nendstream", "latin1");
    objects[contentObject - 1] = Buffer.concat([header, contentStream, footer]);
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
    const header = Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${asset.width} /Height ${asset.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${asset.data.length} >>\nstream\n`,
      "latin1",
    );
    const footer = Buffer.from("\nendstream", "latin1");
    objects[imageObject - 1] = Buffer.concat([header, asset.data, footer]);
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

export async function generateShareLinkPdf(data: ShareLinkPdfData): Promise<Buffer> {
  const pages: PdfPage[] = [];
  const imageAssets: PdfImageAsset[] = [];
  const templateVersion = data.templateVersion ?? "corporate_v2";
  const theme = getPdfTheme(templateVersion);
  const layout = createLayout(theme);

  const imageCache = new Map<string, Promise<PdfImageAsset | null>>();
  let imageCounter = 1;

  const resolveAssetByUrl = async (
    candidate: string | null | undefined,
    variant: "product" | "logo",
  ) => {
    const normalized = typeof candidate === "string" ? candidate.trim() : "";
    if (!normalized) {
      return null;
    }

    if (!imageCache.has(normalized)) {
      const imageName = `Im${imageCounter}`;
      imageCounter += 1;

      const assetPromise = loadImageAsset(normalized, imageName, variant).then((asset) => {
        if (asset) {
          imageAssets.push(asset);
        }
        return asset;
      });

      imageCache.set(normalized, assetPromise);
    }

    return imageCache.get(normalized)!;
  };

  const resolveBrandLogoAsset = async () => {
    return resolveAssetByUrl(data.brandLogoUrl, "logo");
  };

  const resolveProductImageAsset = async (product: ShareLinkPdfProduct) => {
    const candidate = [product.primaryImageUrl, product.fallbackImageUrl]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find((value) => value.length > 0);

    if (!candidate) {
      return null;
    }

    return resolveAssetByUrl(candidate, "product");
  };

  const coverPage = createPage("cover");
  await renderCover(coverPage, data, theme, resolveBrandLogoAsset);
  pages.push(coverPage);

  for (const catalog of data.catalogs) {
    const groups = groupProducts(catalog.products);

    let page = createPage("catalog");
    let cursorY = await renderCatalogPageFrame(
      page,
      data,
      catalog,
      false,
      theme,
      layout,
      resolveBrandLogoAsset,
    );

    if (groups.length === 0) {
      drawRect(page, MARGIN_X, cursorY, CONTENT_WIDTH, 64, {
        fill: theme.colors.cardBackground,
        stroke: theme.colors.cardBorder,
        lineWidth: 0.8,
      });
      drawText(page, "Nenhum produto neste catalogo.", MARGIN_X + 12, cursorY + 22, {
        font: FONT_NORMAL,
        size: 11,
        color: theme.colors.textSecondary,
      });
      pages.push(page);
      continue;
    }

    for (const lineGroup of groups) {
      if (lineGroup.lineLabel) {
        if (!hasSpace(cursorY, 28, layout.contentBottom)) {
          pages.push(page);
          page = createPage("catalog");
          cursorY = await renderCatalogPageFrame(
            page,
            data,
            catalog,
            true,
            theme,
            layout,
            resolveBrandLogoAsset,
          );
        }

        drawText(page, lineGroup.lineLabel, MARGIN_X, cursorY, {
          font: FONT_BOLD,
          size: 18,
          color: theme.colors.textPrimary,
        });
        cursorY += 18;
        drawLine(
          page,
          MARGIN_X,
          cursorY,
          PAGE_WIDTH - MARGIN_X,
          cursorY,
          theme.colors.cardBorder,
          0.8,
        );
        cursorY += 10;
      }

      for (const group of lineGroup.groups) {
        let groupHeaderRendered = false;
        let rowStart = 0;

        while (rowStart < group.products.length) {
          if (!groupHeaderRendered) {
            const minimumHeight = layout.groupHeaderHeight + layout.cardHeight + layout.rowGap;
            if (!hasSpace(cursorY, minimumHeight, layout.contentBottom)) {
              pages.push(page);
              page = createPage("catalog");
              cursorY = await renderCatalogPageFrame(
                page,
                data,
                catalog,
                true,
                theme,
                layout,
                resolveBrandLogoAsset,
              );
            }

            cursorY = renderGroupHeader(
              page,
              `${group.categoryName} - ${group.measureLabel}`,
              cursorY,
              theme,
              layout,
            );
            groupHeaderRendered = true;
          }

          if (!hasSpace(cursorY, layout.cardHeight + layout.rowGap, layout.contentBottom)) {
            pages.push(page);
            page = createPage("catalog");
            cursorY = await renderCatalogPageFrame(
              page,
              data,
              catalog,
              true,
              theme,
              layout,
              resolveBrandLogoAsset,
            );
            groupHeaderRendered = false;
            continue;
          }

          const leftProduct = group.products[rowStart];
          const rightProduct = group.products[rowStart + 1];

          await renderProductCard(
            page,
            leftProduct,
            MARGIN_X,
            cursorY,
            resolveProductImageAsset,
            theme,
            layout,
          );

          if (rightProduct) {
            await renderProductCard(
              page,
              rightProduct,
              MARGIN_X + layout.cardWidth + layout.columnGap,
              cursorY,
              resolveProductImageAsset,
              theme,
              layout,
            );
          }

          cursorY += layout.cardHeight + layout.rowGap;
          rowStart += 2;
        }

        cursorY += layout.groupGapAfter;
      }
    }

    pages.push(page);
  }

  const totalPages = pages.length;
  pages.forEach((page, index) => {
    renderFooter(page, index + 1, totalPages, data, theme, layout);
  });

  return buildPdfBuffer(pages, imageAssets);
}

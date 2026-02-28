export type Color = [number, number, number];
export type PdfTemplateVersion = "classic" | "corporate_v1" | "corporate_v2" | "corporate_v3";

export type PdfTheme = {
  version: PdfTemplateVersion;
  colors: {
    pageBackground: Color;
    headerBackground: Color;
    accent: Color;
    cardBackground: Color;
    cardBorder: Color;
    mutedBackground: Color;
    textPrimary: Color;
    textSecondary: Color;
    textOnDark: Color;
    chipBackground: Color;
    chipText: Color;
  };
  fonts: {
    coverEyebrow: number;
    coverBrand: number;
    coverTitle: number;
    coverMeta: number;
    headerBrand: number;
    headerShareLink: number;
    catalogTitle: number;
    catalogDescription: number;
    groupTitle: number;
    cardName: number;
    cardMeta: number;
    cardDescription: number;
    footer: number;
  };
  layout: {
    headerHeight: number;
    columnGap: number;
    cardHeight: number;
    cardPadding: number;
    cardImageHeight: number;
    rowGap: number;
    groupHeaderHeight: number;
    groupGapAfter: number;
    footerHeight: number;
    coverCardWidth: number;
    coverCardHeight: number;
    coverStripeHeight: number;
    logoCoverMaxWidth: number;
    logoCoverMaxHeight: number;
    logoHeaderWidth: number;
    logoHeaderHeight: number;
  };
};

const classicTheme: PdfTheme = {
  version: "classic",
  colors: {
    pageBackground: [0.965, 0.969, 0.976],
    headerBackground: [0.118, 0.2, 0.376],
    accent: [0.169, 0.322, 0.545],
    cardBackground: [1, 1, 1],
    cardBorder: [0.82, 0.851, 0.894],
    mutedBackground: [0.92, 0.933, 0.953],
    textPrimary: [0.145, 0.161, 0.196],
    textSecondary: [0.365, 0.396, 0.451],
    textOnDark: [1, 1, 1],
    chipBackground: [0.86, 0.89, 0.94],
    chipText: [0.12, 0.2, 0.36],
  },
  fonts: {
    coverEyebrow: 12,
    coverBrand: 24,
    coverTitle: 19,
    coverMeta: 11,
    headerBrand: 10,
    headerShareLink: 8,
    catalogTitle: 17,
    catalogDescription: 10,
    groupTitle: 10,
    cardName: 11,
    cardMeta: 9,
    cardDescription: 9,
    footer: 9,
  },
  layout: {
    headerHeight: 56,
    columnGap: 12,
    cardHeight: 214,
    cardPadding: 10,
    cardImageHeight: 92,
    rowGap: 12,
    groupHeaderHeight: 24,
    groupGapAfter: 14,
    footerHeight: 24,
    coverCardWidth: 430,
    coverCardHeight: 312,
    coverStripeHeight: 10,
    logoCoverMaxWidth: 220,
    logoCoverMaxHeight: 72,
    logoHeaderWidth: 72,
    logoHeaderHeight: 28,
  },
};

const corporateV1Theme: PdfTheme = {
  version: "corporate_v1",
  colors: {
    pageBackground: [0.97, 0.974, 0.98],
    headerBackground: [0.086, 0.133, 0.251],
    accent: [0.149, 0.302, 0.576],
    cardBackground: [1, 1, 1],
    cardBorder: [0.83, 0.86, 0.91],
    mutedBackground: [0.94, 0.95, 0.97],
    textPrimary: [0.102, 0.125, 0.173],
    textSecondary: [0.325, 0.357, 0.42],
    textOnDark: [1, 1, 1],
    chipBackground: [0.149, 0.302, 0.576],
    chipText: [1, 1, 1],
  },
  fonts: {
    coverEyebrow: 12,
    coverBrand: 26,
    coverTitle: 20,
    coverMeta: 11,
    headerBrand: 11,
    headerShareLink: 8,
    catalogTitle: 18,
    catalogDescription: 10,
    groupTitle: 10,
    cardName: 11,
    cardMeta: 8.8,
    cardDescription: 8.8,
    footer: 9,
  },
  layout: {
    headerHeight: 64,
    columnGap: 12,
    cardHeight: 226,
    cardPadding: 10,
    cardImageHeight: 108,
    rowGap: 12,
    groupHeaderHeight: 25,
    groupGapAfter: 14,
    footerHeight: 24,
    coverCardWidth: 444,
    coverCardHeight: 330,
    coverStripeHeight: 12,
    logoCoverMaxWidth: 240,
    logoCoverMaxHeight: 78,
    logoHeaderWidth: 80,
    logoHeaderHeight: 30,
  },
};

const corporateV2Theme: PdfTheme = {
  version: "corporate_v2",
  colors: {
    pageBackground: [0.962, 0.968, 0.98],
    headerBackground: [0.071, 0.106, 0.2],
    accent: [0.125, 0.341, 0.62],
    cardBackground: [1, 1, 1],
    cardBorder: [0.8, 0.839, 0.898],
    mutedBackground: [0.93, 0.943, 0.965],
    textPrimary: [0.082, 0.11, 0.161],
    textSecondary: [0.286, 0.325, 0.4],
    textOnDark: [1, 1, 1],
    chipBackground: [0.086, 0.251, 0.486],
    chipText: [1, 1, 1],
  },
  fonts: {
    coverEyebrow: 12,
    coverBrand: 28,
    coverTitle: 20,
    coverMeta: 11,
    headerBrand: 11,
    headerShareLink: 8.4,
    catalogTitle: 19,
    catalogDescription: 10,
    groupTitle: 10,
    cardName: 11.2,
    cardMeta: 8.8,
    cardDescription: 8.8,
    footer: 9,
  },
  layout: {
    headerHeight: 64,
    columnGap: 12,
    cardHeight: 228,
    cardPadding: 10,
    cardImageHeight: 110,
    rowGap: 12,
    groupHeaderHeight: 25,
    groupGapAfter: 14,
    footerHeight: 24,
    coverCardWidth: 450,
    coverCardHeight: 334,
    coverStripeHeight: 12,
    logoCoverMaxWidth: 250,
    logoCoverMaxHeight: 80,
    logoHeaderWidth: 82,
    logoHeaderHeight: 30,
  },
};

const corporateV3Theme: PdfTheme = {
  version: "corporate_v3",
  colors: {
    pageBackground: [0.955, 0.962, 0.976],
    headerBackground: [0.059, 0.106, 0.208],
    accent: [0.114, 0.337, 0.663],
    cardBackground: [1, 1, 1],
    cardBorder: [0.772, 0.823, 0.902],
    mutedBackground: [0.914, 0.929, 0.961],
    textPrimary: [0.067, 0.098, 0.153],
    textSecondary: [0.259, 0.302, 0.396],
    textOnDark: [1, 1, 1],
    chipBackground: [0.067, 0.251, 0.533],
    chipText: [1, 1, 1],
  },
  fonts: {
    coverEyebrow: 12,
    coverBrand: 30,
    coverTitle: 20,
    coverMeta: 11,
    headerBrand: 11,
    headerShareLink: 8.6,
    catalogTitle: 20,
    catalogDescription: 10.5,
    groupTitle: 10,
    cardName: 11.4,
    cardMeta: 9,
    cardDescription: 8.8,
    footer: 9,
  },
  layout: {
    headerHeight: 66,
    columnGap: 12,
    cardHeight: 232,
    cardPadding: 10,
    cardImageHeight: 112,
    rowGap: 12,
    groupHeaderHeight: 25,
    groupGapAfter: 14,
    footerHeight: 24,
    coverCardWidth: 454,
    coverCardHeight: 338,
    coverStripeHeight: 12,
    logoCoverMaxWidth: 250,
    logoCoverMaxHeight: 82,
    logoHeaderWidth: 84,
    logoHeaderHeight: 31,
  },
};

export function getPdfTheme(version: PdfTemplateVersion): PdfTheme {
  if (version === "classic") {
    return classicTheme;
  }
  if (version === "corporate_v3") {
    return corporateV3Theme;
  }
  if (version === "corporate_v2") {
    return corporateV2Theme;
  }
  return corporateV1Theme;
}

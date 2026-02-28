export type ProductCardTone = {
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  imagePanelBg: string;
  skuChipBg: string;
  skuChipText: string;
  skuChipRing: string;
};

const DEFAULT_PRODUCT_CARD_TONE: ProductCardTone = {
  cardBg: "hsl(335 45% 98%)",
  cardBorder: "hsl(336 35% 88%)",
  cardShadow: "0 14px 28px rgba(113, 57, 86, 0.12)",
  imagePanelBg: "hsl(335 40% 99%)",
  skuChipBg: "hsl(223 62% 28%)",
  skuChipText: "hsl(0 0% 100%)",
  skuChipRing: "hsla(223, 62%, 38%, 0.45)",
};

const tonePromiseCache = new Map<string, Promise<ProductCardTone>>();

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toHsl = (h: number, s: number, l: number) =>
  `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;

function rgbToHsl(r: number, g: number, b: number) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;

  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === nr) {
      h = ((ng - nb) / delta) % 6;
    } else if (max === ng) {
      h = (nb - nr) / delta + 2;
    } else {
      h = (nr - ng) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: s * 100,
    l: l * 100,
  };
}

function buildToneFromRgb(rgb: { r: number; g: number; b: number }): ProductCardTone {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hue = hsl.h;
  const baseSaturation = clamp(hsl.s, 26, 68);

  const cardSaturation = clamp(baseSaturation * 0.5, 18, 42);
  const borderSaturation = clamp(baseSaturation * 0.62, 24, 52);
  const chipSaturation = clamp(baseSaturation * 1.15, 46, 72);

  return {
    cardBg: toHsl(hue, cardSaturation, 97),
    cardBorder: toHsl(hue, borderSaturation, 88),
    cardShadow: `0 14px 28px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`,
    imagePanelBg: toHsl(hue, clamp(cardSaturation * 0.78, 16, 34), 98),
    skuChipBg: toHsl(hue, chipSaturation, 32),
    skuChipText: "hsl(0 0% 100%)",
    skuChipRing: `hsla(${hue}, ${chipSaturation}%, 42%, 0.38)`,
  };
}

function isPixelNearWhite(r: number, g: number, b: number) {
  return r > 246 && g > 246 && b > 246;
}

function isPixelNearBlack(r: number, g: number, b: number) {
  return r < 16 && g < 16 && b < 16;
}

async function extractDominantRgb(imageUrl: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return new Promise<{ r: number; g: number; b: number } | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        const sampleSize = 24;
        const canvas = document.createElement("canvas");
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0, sampleSize, sampleSize);
        const { data } = context.getImageData(0, 0, sampleSize, sampleSize);

        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 96) {
            continue;
          }

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (isPixelNearWhite(r, g, b) || isPixelNearBlack(r, g, b)) {
            continue;
          }

          sumR += r;
          sumG += g;
          sumB += b;
          count += 1;
        }

        if (count === 0) {
          resolve(null);
          return;
        }

        resolve({
          r: Math.round(sumR / count),
          g: Math.round(sumG / count),
          b: Math.round(sumB / count),
        });
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });
}

export function getDefaultProductCardTone() {
  return DEFAULT_PRODUCT_CARD_TONE;
}

export function resolveProductCardTone(imageUrl?: string | null) {
  const normalizedUrl = imageUrl?.trim();
  if (!normalizedUrl) {
    return Promise.resolve(DEFAULT_PRODUCT_CARD_TONE);
  }

  const cached = tonePromiseCache.get(normalizedUrl);
  if (cached) {
    return cached;
  }

  const tonePromise = extractDominantRgb(normalizedUrl)
    .then((rgb) => (rgb ? buildToneFromRgb(rgb) : DEFAULT_PRODUCT_CARD_TONE))
    .catch(() => DEFAULT_PRODUCT_CARD_TONE);

  tonePromiseCache.set(normalizedUrl, tonePromise);
  return tonePromise;
}


const SMALL_MAX = 100;
const MEDIUM_MAX = 500;

export type ProductImageSizeBand = "small" | "medium" | "large" | "default";

type ParsedSize = {
  amount: number;
  unit: string;
};

function normalizeLabel(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function parseSize(value?: string | null): ParsedSize | null {
  const raw = normalizeLabel(value);
  if (!raw) {
    return null;
  }

  const compact = raw.toLowerCase().replace(/\s+/g, "");
  const match = compact.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/i);
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) {
    return null;
  }

  return {
    amount,
    unit: match[2],
  };
}

function toComparableAmount(parsed: ParsedSize) {
  if (parsed.unit === "kg" || parsed.unit === "l") {
    return parsed.amount * 1000;
  }
  if (parsed.unit === "mg") {
    return parsed.amount / 1000;
  }
  if (parsed.unit === "g" || parsed.unit === "ml") {
    return parsed.amount;
  }
  return null;
}

export function resolveProductImageSizeBand(sizeLabel?: string | null): ProductImageSizeBand {
  const parsed = parseSize(sizeLabel);
  if (!parsed) {
    return "default";
  }

  const comparableAmount = toComparableAmount(parsed);
  if (comparableAmount === null) {
    return "default";
  }

  if (comparableAmount <= SMALL_MAX) {
    return "small";
  }
  if (comparableAmount <= MEDIUM_MAX) {
    return "medium";
  }
  return "large";
}

export function resolveProductImageScale(sizeLabel?: string | null) {
  const band = resolveProductImageSizeBand(sizeLabel);

  switch (band) {
    case "small":
      return 0.82;
    case "medium":
      return 0.9;
    case "large":
      return 0.98;
    default:
      return 0.9;
  }
}

export type ProgressiveDiscountTier = {
  minQuantity: number;
  discountPercent: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "sim", "s"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "nao", "não", "n"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeProgressiveDiscountTiers(
  rawValue: unknown,
): ProgressiveDiscountTier[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((item): ProgressiveDiscountTier | null => {
      if (!isRecord(item)) {
        return null;
      }

      const isActive = toBoolean(item.ativo);
      const type =
        typeof item.tipoDesconto === "string"
          ? item.tipoDesconto.trim().toUpperCase()
          : typeof item.tipo === "string"
            ? item.tipo.trim().toUpperCase()
            : null;
      const minQuantity = toNumber(item.qtde);
      const discountPercent = toNumber(item.desconto);

      if (
        isActive !== true ||
        type !== "PERCENTUAL" ||
        minQuantity === null ||
        discountPercent === null ||
        !Number.isInteger(minQuantity) ||
        minQuantity <= 0 ||
        discountPercent <= 0
      ) {
        return null;
      }

      return {
        minQuantity,
        discountPercent,
      };
    })
    .filter((item): item is ProgressiveDiscountTier => Boolean(item))
    .sort((left, right) => left.minQuantity - right.minQuantity);
}

export function resolveApplicableProgressiveDiscount(
  rawValue: unknown,
  quantity: number,
) {
  const tiers = normalizeProgressiveDiscountTiers(rawValue);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {
      tiers,
      appliedTier: null as ProgressiveDiscountTier | null,
    };
  }

  let appliedTier: ProgressiveDiscountTier | null = null;
  for (const tier of tiers) {
    if (tier.minQuantity <= quantity) {
      appliedTier = tier;
    }
  }

  return {
    tiers,
    appliedTier,
  };
}

export function applyProgressiveDiscountToNumber(
  unitPrice: number | null,
  quantity: number,
  rawValue: unknown,
) {
  const { tiers, appliedTier } = resolveApplicableProgressiveDiscount(
    rawValue,
    quantity,
  );

  if (unitPrice === null) {
    return {
      tiers,
      appliedTier,
      originalUnitPrice: null,
      discountedUnitPrice: null,
      originalLineTotal: null,
      discountedLineTotal: null,
      discountPercent: appliedTier?.discountPercent ?? null,
    };
  }

  const originalUnitPrice = roundCurrency(unitPrice);
  const originalLineTotal = roundCurrency(originalUnitPrice * quantity);

  if (!appliedTier) {
    return {
      tiers,
      appliedTier: null,
      originalUnitPrice,
      discountedUnitPrice: originalUnitPrice,
      originalLineTotal,
      discountedLineTotal: originalLineTotal,
      discountPercent: null,
    };
  }

  const discountedUnitPrice = roundCurrency(
    originalUnitPrice * (1 - appliedTier.discountPercent / 100),
  );
  const discountedLineTotal = roundCurrency(discountedUnitPrice * quantity);

  return {
    tiers,
    appliedTier,
    originalUnitPrice,
    discountedUnitPrice,
    originalLineTotal,
    discountedLineTotal,
    discountPercent: appliedTier.discountPercent,
  };
}

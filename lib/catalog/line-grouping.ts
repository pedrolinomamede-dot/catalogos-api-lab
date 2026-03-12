export type LineSortableProduct = {
  name: string;
  sku?: string | null;
  lineLabel?: string | null;
  categoryName?: string | null;
  sizeLabel?: string | null;
};

export type ParsedMeasure = {
  isMissing: boolean;
  unitRank: number;
  numericValue: number;
  normalizedUnit: string;
  normalizedKey: string;
  displayLabel: string;
};

export type CategoryMeasureGroup<T extends LineSortableProduct> = {
  id: string;
  categoryName: string;
  measureLabel: string;
  measureOrder: ParsedMeasure;
  products: T[];
};

export type LineCategoryMeasureGroup<T extends LineSortableProduct> = {
  id: string;
  lineLabel: string | null;
  groups: CategoryMeasureGroup<T>[];
};

const MEASURE_UNIT_RANK: Record<string, number> = {
  mg: 1,
  g: 2,
  kg: 3,
  ml: 4,
  l: 5,
};

export function normalizeCatalogLabel(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function formatNumericMeasure(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const fixed = value.toFixed(3);
  return fixed.replace(/\.?0+$/, "");
}

export function parseCatalogMeasure(value?: string | null): ParsedMeasure {
  const raw = normalizeCatalogLabel(value);
  if (!raw) {
    return {
      isMissing: true,
      unitRank: Number.POSITIVE_INFINITY,
      numericValue: Number.POSITIVE_INFINITY,
      normalizedUnit: "",
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
      normalizedUnit: compact,
      normalizedKey: `raw:${compact}`,
      displayLabel: raw,
    };
  }

  const numericValue = Number.parseFloat(match[1].replace(",", "."));
  const normalizedUnit = match[2];
  const resolvedNumeric = Number.isFinite(numericValue)
    ? numericValue
    : Number.POSITIVE_INFINITY;
  const numericLabel = formatNumericMeasure(resolvedNumeric);

  return {
    isMissing: false,
    unitRank: MEASURE_UNIT_RANK[normalizedUnit] ?? 99,
    numericValue: resolvedNumeric,
    normalizedUnit,
    normalizedKey: `num:${normalizedUnit}:${resolvedNumeric}`,
    displayLabel: `${numericLabel}${normalizedUnit}`,
  };
}

function compareCategoryName(a: string, b: string) {
  const left = normalizeCatalogLabel(a) ?? "Outros Produtos";
  const right = normalizeCatalogLabel(b) ?? "Outros Produtos";

  if (left === "Outros Produtos" && right !== "Outros Produtos") {
    return 1;
  }
  if (right === "Outros Produtos" && left !== "Outros Produtos") {
    return -1;
  }

  return left.localeCompare(right, "pt-BR", { sensitivity: "base" });
}

function compareLineName(a: string | null, b: string | null) {
  if (a && !b) {
    return -1;
  }
  if (b && !a) {
    return 1;
  }
  if (!a && !b) {
    return 0;
  }

  return (a ?? "").localeCompare(b ?? "", "pt-BR", { sensitivity: "base" });
}

function compareMeasureOrder(a: ParsedMeasure, b: ParsedMeasure) {
  if (a.isMissing !== b.isMissing) {
    return a.isMissing ? 1 : -1;
  }

  if (a.unitRank !== b.unitRank) {
    return a.unitRank - b.unitRank;
  }

  if (a.numericValue !== b.numericValue) {
    return a.numericValue - b.numericValue;
  }

  return a.displayLabel.localeCompare(b.displayLabel, "pt-BR", {
    sensitivity: "base",
  });
}

function compareProductsInGroup<T extends LineSortableProduct>(a: T, b: T) {
  const nameDiff = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
  if (nameDiff !== 0) {
    return nameDiff;
  }

  const skuA = normalizeCatalogLabel(a.sku) ?? "";
  const skuB = normalizeCatalogLabel(b.sku) ?? "";
  return skuA.localeCompare(skuB, "pt-BR", { sensitivity: "base" });
}

export function compareProductsByLineCategoryMeasure<T extends LineSortableProduct>(a: T, b: T) {
  const lineDiff = compareLineName(
    normalizeCatalogLabel(a.lineLabel),
    normalizeCatalogLabel(b.lineLabel),
  );
  if (lineDiff !== 0) {
    return lineDiff;
  }

  const categoryDiff = compareCategoryName(a.categoryName ?? "", b.categoryName ?? "");
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  const measureDiff = compareMeasureOrder(
    parseCatalogMeasure(a.sizeLabel),
    parseCatalogMeasure(b.sizeLabel),
  );
  if (measureDiff !== 0) {
    return measureDiff;
  }

  return compareProductsInGroup(a, b);
}

export function buildLineCategoryMeasureGroups<T extends LineSortableProduct>(
  products: T[],
): LineCategoryMeasureGroup<T>[] {
  const lineGroups = new Map<string, { lineLabel: string | null; products: T[] }>();

  products.forEach((product) => {
    const lineLabel = normalizeCatalogLabel(product.lineLabel);
    const lineKey = lineLabel ?? "__no_line__";

    if (!lineGroups.has(lineKey)) {
      lineGroups.set(lineKey, { lineLabel, products: [] });
    }

    lineGroups.get(lineKey)!.products.push(product);
  });

  const orderedLines = [...lineGroups.values()].sort((left, right) =>
    compareLineName(left.lineLabel, right.lineLabel),
  );

  return orderedLines.map((lineGroup, lineIndex) => {
    const grouped = new Map<string, CategoryMeasureGroup<T>>();

    lineGroup.products.forEach((product) => {
      const categoryName = normalizeCatalogLabel(product.categoryName) ?? "Outros Produtos";
      const measureOrder = parseCatalogMeasure(product.sizeLabel);
      const groupKey = `${categoryName}::${measureOrder.normalizedKey}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          id: `line-${lineIndex + 1}-group-${grouped.size + 1}`,
          categoryName,
          measureLabel: measureOrder.displayLabel,
          measureOrder,
          products: [],
        });
      }

      grouped.get(groupKey)!.products.push(product);
    });

    const groups = [...grouped.values()];
    groups.forEach((group) => {
      group.products.sort(compareProductsInGroup);
    });

    groups.sort((left, right) => {
      const categoryDiff = compareCategoryName(left.categoryName, right.categoryName);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }
      return compareMeasureOrder(left.measureOrder, right.measureOrder);
    });

    return {
      id: `line-${lineIndex + 1}`,
      lineLabel: lineGroup.lineLabel,
      groups,
    };
  });
}

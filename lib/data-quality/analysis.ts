import type {
  Prisma,
  PrismaClient,
  ProductSourceType,
  IntegrationProvider,
} from "@prisma/client";

export const DATA_QUALITY_ISSUE_TYPES = [
  "missing_sku",
  "duplicate_sku",
  "missing_price",
  "missing_image",
  "missing_category",
  "missing_subcategory",
  "missing_description",
  "possible_duplicate_category",
  "possible_duplicate_subcategory",
] as const;

export type DataQualityIssueType = (typeof DATA_QUALITY_ISSUE_TYPES)[number];

export type DataQualityIssueRow = {
  id: string;
  issueType: DataQualityIssueType;
  entityType: "product" | "category" | "subcategory";
  name: string;
  sku?: string | null;
  sourceType?: ProductSourceType | null;
  sourceProvider?: IntegrationProvider | null;
  normalizedName?: string | null;
  duplicateCount?: number | null;
  relatedIds?: string[];
  details?: string | null;
  updatedAt?: Date | null;
};

export type DataQualitySummary = {
  totalProducts: number;
  totalCategories: number;
  totalSubcategories: number;
  issueCounts: Record<DataQualityIssueType, number>;
};

type ProductQualityRow = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  categoryId: string | null;
  subcategoryId: string | null;
  sourceType: ProductSourceType;
  sourceProvider: IntegrationProvider | null;
  updatedAt: Date;
};

type NamedRow = {
  id: string;
  name: string;
};

type Tx = Prisma.TransactionClient | PrismaClient;

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function removeDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function singularizeWord(word: string) {
  if (
    word.length > 4 &&
    word.endsWith("s") &&
    !word.endsWith("ss") &&
    !word.endsWith("is")
  ) {
    return word.slice(0, -1);
  }
  return word;
}

export function normalizeDuplicateName(value: string) {
  return normalizeSpaces(removeDiacritics(value).toLowerCase())
    .split(" ")
    .map((word) => singularizeWord(word))
    .join(" ");
}

function normalizeSkuKey(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized.length > 0 ? normalized : null;
}

async function loadProducts(tx: Tx, brandId: string): Promise<ProductQualityRow[]> {
  const rows = await tx.productBaseV2.findMany({
    where: { brandId },
    select: {
      id: true,
      sku: true,
      name: true,
      description: true,
      imageUrl: true,
      price: true,
      categoryId: true,
      subcategoryId: true,
      sourceType: true,
      sourceProvider: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    price: typeof row.price?.toNumber === "function" ? row.price.toNumber() : null,
  }));
}

async function loadCategories(tx: Tx, brandId: string): Promise<NamedRow[]> {
  return tx.categoryV2.findMany({
    where: { brandId },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });
}

async function loadSubcategories(tx: Tx, brandId: string): Promise<NamedRow[]> {
  return tx.subcategoryV2.findMany({
    where: { brandId },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });
}

function mapProductIssue(
  issueType: DataQualityIssueType,
  product: ProductQualityRow,
  details?: string,
  extra?: Partial<DataQualityIssueRow>,
): DataQualityIssueRow {
  return {
    id: product.id,
    issueType,
    entityType: "product",
    name: product.name,
    sku: product.sku || null,
    sourceType: product.sourceType,
    sourceProvider: product.sourceProvider,
    updatedAt: product.updatedAt,
    details: details ?? null,
    ...extra,
  };
}

function buildMissingSkuRows(products: ProductQualityRow[]) {
  return products
    .filter((product) => product.sku.trim().length === 0)
    .map((product) =>
      mapProductIssue("missing_sku", product, "Produto sem SKU preenchido."),
    );
}

function buildMissingPriceRows(products: ProductQualityRow[]) {
  return products
    .filter((product) => product.price === null)
    .map((product) =>
      mapProductIssue("missing_price", product, "Produto sem preco principal."),
    );
}

function buildMissingImageRows(products: ProductQualityRow[]) {
  return products
    .filter((product) => !product.imageUrl || product.imageUrl.trim().length === 0)
    .map((product) =>
      mapProductIssue(
        "missing_image",
        product,
        "Produto sem imagem principal definida.",
      ),
    );
}

function buildMissingCategoryRows(products: ProductQualityRow[]) {
  return products
    .filter((product) => !product.categoryId)
    .map((product) =>
      mapProductIssue(
        "missing_category",
        product,
        "Produto sem categoria vinculada.",
      ),
    );
}

function buildMissingSubcategoryRows(products: ProductQualityRow[]) {
  return products
    .filter((product) => !product.subcategoryId)
    .map((product) =>
      mapProductIssue(
        "missing_subcategory",
        product,
        "Produto sem subcategoria vinculada.",
      ),
    );
}

function buildMissingDescriptionRows(products: ProductQualityRow[]) {
  return products
    .filter(
      (product) =>
        product.description === null || product.description.trim().length === 0,
    )
    .map((product) =>
      mapProductIssue(
        "missing_description",
        product,
        "Produto sem descricao preenchida.",
      ),
    );
}

function buildDuplicateSkuRows(products: ProductQualityRow[]) {
  const groups = new Map<string, ProductQualityRow[]>();

  products.forEach((product) => {
    const key = normalizeSkuKey(product.sku);
    if (!key) {
      return;
    }
    const current = groups.get(key) ?? [];
    current.push(product);
    groups.set(key, current);
  });

  return [...groups.entries()].flatMap(([key, group]) => {
    if (group.length <= 1) {
      return [];
    }

    return group.map((product) =>
      mapProductIssue(
        "duplicate_sku",
        product,
        `SKU normalizado duplicado: ${key}`,
        {
          normalizedName: key,
          duplicateCount: group.length,
          relatedIds: group.map((item) => item.id),
        },
      ),
    );
  });
}

function buildDuplicateNamedRows(
  issueType: DataQualityIssueType,
  entityType: "category" | "subcategory",
  rows: NamedRow[],
): DataQualityIssueRow[] {
  const groups = new Map<string, NamedRow[]>();

  rows.forEach((row) => {
    const key = normalizeDuplicateName(row.name);
    if (!key) {
      return;
    }
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  });

  return [...groups.entries()].flatMap(([key, group]) => {
    if (group.length <= 1) {
      return [];
    }

    return group.map(
      (row): DataQualityIssueRow => ({
        id: row.id,
        issueType,
        entityType,
        name: row.name,
        normalizedName: key,
        duplicateCount: group.length,
        relatedIds: group.map((item) => item.id),
        details: `Possivel duplicidade por normalizacao com ${group.length} ocorrencia(s).`,
      }),
    );
  });
}

export function buildDataQualityIssueRows(input: {
  products: ProductQualityRow[];
  categories: NamedRow[];
  subcategories: NamedRow[];
}): Record<DataQualityIssueType, DataQualityIssueRow[]> {
  return {
    missing_sku: buildMissingSkuRows(input.products),
    duplicate_sku: buildDuplicateSkuRows(input.products),
    missing_price: buildMissingPriceRows(input.products),
    missing_image: buildMissingImageRows(input.products),
    missing_category: buildMissingCategoryRows(input.products),
    missing_subcategory: buildMissingSubcategoryRows(input.products),
    missing_description: buildMissingDescriptionRows(input.products),
    possible_duplicate_category: buildDuplicateNamedRows(
      "possible_duplicate_category",
      "category",
      input.categories,
    ),
    possible_duplicate_subcategory: buildDuplicateNamedRows(
      "possible_duplicate_subcategory",
      "subcategory",
      input.subcategories,
    ),
  };
}

export async function getDataQualitySummary(tx: Tx, brandId: string) {
  const [products, categories, subcategories] = await Promise.all([
    loadProducts(tx, brandId),
    loadCategories(tx, brandId),
    loadSubcategories(tx, brandId),
  ]);

  const issueRows = buildDataQualityIssueRows({
    products,
    categories,
    subcategories,
  });

  return {
    totalProducts: products.length,
    totalCategories: categories.length,
    totalSubcategories: subcategories.length,
    issueCounts: Object.fromEntries(
      DATA_QUALITY_ISSUE_TYPES.map((type) => [type, issueRows[type].length]),
    ) as Record<DataQualityIssueType, number>,
  } satisfies DataQualitySummary;
}

export async function listDataQualityIssues(
  tx: Tx,
  input: {
    brandId: string;
    issueType: DataQualityIssueType;
    page: number;
    pageSize: number;
  },
) {
  const [products, categories, subcategories] = await Promise.all([
    loadProducts(tx, input.brandId),
    loadCategories(tx, input.brandId),
    loadSubcategories(tx, input.brandId),
  ]);

  const issueRows = buildDataQualityIssueRows({
    products,
    categories,
    subcategories,
  })[input.issueType];

  const total = issueRows.length;
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(Math.max(input.page, 1), totalPages);
  const start = (page - 1) * input.pageSize;
  const end = start + input.pageSize;

  return {
    data: issueRows.slice(start, end),
    meta: {
      page,
      pageSize: input.pageSize,
      total,
      totalPages,
    },
  };
}

export async function exportDataQualityIssues(
  tx: Tx,
  input: {
    brandId: string;
    issueType: DataQualityIssueType;
  },
) {
  const [products, categories, subcategories] = await Promise.all([
    loadProducts(tx, input.brandId),
    loadCategories(tx, input.brandId),
    loadSubcategories(tx, input.brandId),
  ]);

  return buildDataQualityIssueRows({
    products,
    categories,
    subcategories,
  })[input.issueType];
}

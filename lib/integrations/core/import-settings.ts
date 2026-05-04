import { z } from "zod";

const productsFieldsSchema = z.object({
  name: z.boolean(),
  description: z.boolean(),
  brand: z.boolean(),
  line: z.boolean(),
  unit: z.boolean(),
  barcode: z.boolean(),
  additionalBarcodes: z.boolean(),
  size: z.boolean(),
  attributes: z.boolean(),
});

const productsSettingsSchema = z.object({
  enabled: z.boolean(),
  fields: productsFieldsSchema,
});

const syncPolicySettingsSchema = z.object({
  existingProductsMode: z.enum(["UPDATE_ENABLED_FIELDS", "CREATE_ONLY"]),
});

const categoriesSettingsSchema = z.object({
  enabled: z.boolean(),
  strategy: z.enum(["GROUP_SUBGROUP"]),
  storeDepartmentAndSectionAsMetadata: z.boolean(),
});

const pricingSettingsSchema = z.object({
  enabled: z.boolean(),
  primarySource: z.enum(["DEFAULT_PRICE", "SELECTED_PRICE_TABLE"]),
  importCostPrice: z.boolean(),
  importDiscountRules: z.boolean(),
  importProgressiveDiscounts: z.boolean(),
  priceTablesMode: z.enum(["NONE", "SELECTED"]),
  selectedPriceTableRefs: z.array(z.string()),
  primaryPriceTableRef: z.string().nullable(),
  selectedPriceTableIds: z.array(z.string()),
  primaryPriceTableId: z.string().nullable(),
});

const inventorySettingsSchema = z.object({
  enabled: z.boolean(),
  importCurrentStock: z.boolean(),
  importMinMax: z.boolean(),
  importControlMethod: z.boolean(),
  currentStockSource: z.enum(["PRODUCT_PAYLOAD", "SELECTED_ENTITY"]),
  stockEntityRef: z.string().nullable(),
  stockBalanceType: z.enum(["LIQUID"]),
});

const imagesSettingsSchema = z.object({
  enabled: z.boolean(),
  importPrimaryImage: z.boolean(),
  importGallery: z.boolean(),
});

const fiscalSettingsSchema = z.object({
  enabled: z.boolean(),
  importTaxClassification: z.boolean(),
  importTaxMetadata: z.boolean(),
});

const logisticsSettingsSchema = z.object({
  enabled: z.boolean(),
  importDimensions: z.boolean(),
  importWeight: z.boolean(),
});

export const integrationImportSettingsSchema = z.object({
  syncPolicy: syncPolicySettingsSchema,
  products: productsSettingsSchema,
  categories: categoriesSettingsSchema,
  pricing: pricingSettingsSchema,
  inventory: inventorySettingsSchema,
  images: imagesSettingsSchema,
  fiscal: fiscalSettingsSchema,
  logistics: logisticsSettingsSchema,
});

export type IntegrationImportSettings = z.infer<
  typeof integrationImportSettingsSchema
>;

export const defaultIntegrationImportSettings: IntegrationImportSettings = {
  syncPolicy: {
    existingProductsMode: "UPDATE_ENABLED_FIELDS",
  },
  products: {
    enabled: true,
    fields: {
      name: true,
      description: true,
      brand: true,
      line: true,
      unit: true,
      barcode: true,
      additionalBarcodes: true,
      size: true,
      attributes: true,
    },
  },
  categories: {
    enabled: true,
    strategy: "GROUP_SUBGROUP",
    storeDepartmentAndSectionAsMetadata: true,
  },
  pricing: {
    enabled: true,
    primarySource: "DEFAULT_PRICE",
    importCostPrice: true,
    importDiscountRules: true,
    importProgressiveDiscounts: true,
    priceTablesMode: "NONE",
    selectedPriceTableRefs: [],
    primaryPriceTableRef: null,
    selectedPriceTableIds: [],
    primaryPriceTableId: null,
  },
  inventory: {
    enabled: true,
    importCurrentStock: true,
    importMinMax: true,
    importControlMethod: true,
    currentStockSource: "PRODUCT_PAYLOAD",
    stockEntityRef: null,
    stockBalanceType: "LIQUID",
  },
  images: {
    enabled: true,
    importPrimaryImage: true,
    importGallery: true,
  },
  fiscal: {
    enabled: true,
    importTaxClassification: true,
    importTaxMetadata: true,
  },
  logistics: {
    enabled: true,
    importDimensions: true,
    importWeight: true,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNestedRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePriceTablesMode(
  pricing: Record<string, unknown>,
  selectedPriceTableIds: string[],
  primaryPriceTableId: string | null,
): IntegrationImportSettings["pricing"]["priceTablesMode"] {
  const rawMode = pricing.priceTablesMode;
  const hasSelectedTables = selectedPriceTableIds.length > 0;
  const usesSelectedPrimary =
    (pricing.primarySource === "PRICE_TABLE" ||
      pricing.primarySource === "SELECTED_PRICE_TABLE") &&
    Boolean(primaryPriceTableId);

  if (rawMode === "NONE") {
    return "NONE";
  }

  if (rawMode === "ALL") {
    return hasSelectedTables ? "SELECTED" : "NONE";
  }

  if (rawMode === "SELECTED") {
    return hasSelectedTables || usesSelectedPrimary ? "SELECTED" : "NONE";
  }

  if (pricing.importPriceTables === true) {
    return hasSelectedTables || usesSelectedPrimary ? "SELECTED" : "NONE";
  }

  if (pricing.importPriceTables === false) {
    return "NONE";
  }

  return "NONE";
}

export function buildDefaultIntegrationImportSettings(): IntegrationImportSettings {
  return JSON.parse(
    JSON.stringify(defaultIntegrationImportSettings),
  ) as IntegrationImportSettings;
}

export function normalizeIntegrationImportSettings(
  value: unknown,
): IntegrationImportSettings {
  const defaults = buildDefaultIntegrationImportSettings();
  if (!isRecord(value)) {
    return defaults;
  }

  const syncPolicy = getNestedRecord(value, "syncPolicy");
  const products = getNestedRecord(value, "products");
  const productFields = getNestedRecord(products, "fields");
  const categories = getNestedRecord(value, "categories");
  const pricing = getNestedRecord(value, "pricing");
  const inventory = getNestedRecord(value, "inventory");
  const images = getNestedRecord(value, "images");
  const fiscal = getNestedRecord(value, "fiscal");
  const logistics = getNestedRecord(value, "logistics");
  const selectedPriceTableIds = normalizeStringArray(pricing.selectedPriceTableIds);
  const primaryPriceTableId = normalizeNullableString(pricing.primaryPriceTableId);
  const selectedPriceTableRefs = normalizeStringArray(
    pricing.selectedPriceTableRefs,
  );
  const primaryPriceTableRef = normalizeNullableString(
    pricing.primaryPriceTableRef,
  );
  const effectiveSelectedPriceTableRefs =
    selectedPriceTableRefs.length > 0
      ? selectedPriceTableRefs
      : selectedPriceTableIds;
  const effectivePrimaryPriceTableRef =
    primaryPriceTableRef ?? primaryPriceTableId;
  const stockEntityRef = normalizeNullableString(inventory.stockEntityRef);

  const merged = {
    ...defaults,
    syncPolicy: {
      ...defaults.syncPolicy,
      ...syncPolicy,
    },
    products: {
      ...defaults.products,
      ...products,
      fields: {
        ...defaults.products.fields,
        ...productFields,
      },
    },
    categories: {
      ...defaults.categories,
      ...categories,
    },
    pricing: {
      ...defaults.pricing,
      ...pricing,
      primarySource:
        pricing.primarySource === "PRICE_TABLE"
          ? "SELECTED_PRICE_TABLE"
          : pricing.primarySource ?? defaults.pricing.primarySource,
      priceTablesMode: normalizePriceTablesMode(
        pricing,
        effectiveSelectedPriceTableRefs,
        effectivePrimaryPriceTableRef,
      ),
      selectedPriceTableRefs: effectiveSelectedPriceTableRefs,
      primaryPriceTableRef: effectivePrimaryPriceTableRef,
      selectedPriceTableIds: selectedPriceTableIds.length
        ? selectedPriceTableIds
        : effectiveSelectedPriceTableRefs,
      primaryPriceTableId: primaryPriceTableId ?? effectivePrimaryPriceTableRef,
    },
    inventory: {
      ...defaults.inventory,
      ...inventory,
      stockEntityRef,
    },
    images: {
      ...defaults.images,
      ...images,
    },
    fiscal: {
      ...defaults.fiscal,
      ...fiscal,
    },
    logistics: {
      ...defaults.logistics,
      ...logistics,
    },
  };

  const parsed = integrationImportSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaults;
}

export function getIntegrationImportSettingsSyncError(value: unknown) {
  const settings = normalizeIntegrationImportSettings(value);

  if (!settings.pricing.enabled) {
    return null;
  }

  if (
    settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
    !settings.pricing.primaryPriceTableRef
  ) {
    return "Informe o nome ou ID da tabela principal antes de sincronizar.";
  }

  if (
    settings.pricing.priceTablesMode === "SELECTED" &&
    settings.pricing.selectedPriceTableRefs.length === 0 &&
    !(
      settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
      settings.pricing.primaryPriceTableRef
    )
  ) {
    return "Informe os nomes ou IDs das tabelas de preco antes de sincronizar.";
  }

  if (
    settings.inventory.enabled &&
    settings.inventory.importCurrentStock &&
    settings.inventory.currentStockSource === "SELECTED_ENTITY" &&
    !settings.inventory.stockEntityRef
  ) {
    return "Informe o nome ou ID da entidade de estoque antes de sincronizar.";
  }

  return null;
}

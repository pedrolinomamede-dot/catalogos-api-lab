import {
  defaultIntegrationImportSettings,
  getIntegrationImportSettingsSyncError,
  normalizeIntegrationImportSettings,
} from "@/lib/integrations/core/import-settings";

describe("integration import settings", () => {
  it("returns defaults when settings are missing", () => {
    expect(normalizeIntegrationImportSettings(null)).toEqual(
      defaultIntegrationImportSettings,
    );
    expect(defaultIntegrationImportSettings.pricing.priceTablesMode).toBe("NONE");
    expect(
      defaultIntegrationImportSettings.syncPolicy.existingProductsMode,
    ).toBe("UPDATE_ENABLED_FIELDS");
  });

  it("merges partial settings and normalizes selected price table IDs", () => {
    const settings = normalizeIntegrationImportSettings({
      pricing: {
        primarySource: "PRICE_TABLE",
        importPriceTables: true,
        selectedPriceTableIds: [" 12 ", "45", "12", 99],
        primaryPriceTableId: " 45 ",
      },
      categories: {
        enabled: false,
      },
    });

    expect(settings.pricing.primarySource).toBe("SELECTED_PRICE_TABLE");
    expect(settings.pricing.priceTablesMode).toBe("SELECTED");
    expect(settings.pricing.selectedPriceTableIds).toEqual(["12", "45"]);
    expect(settings.pricing.primaryPriceTableId).toBe("45");
    expect(settings.categories.enabled).toBe(false);
    expect(settings.products.fields.name).toBe(true);
  });

  it("normalizes legacy ALL without selected IDs to NONE", () => {
    const settings = normalizeIntegrationImportSettings({
      pricing: {
        priceTablesMode: "ALL",
        selectedPriceTableIds: [],
      },
    });

    expect(settings.pricing.priceTablesMode).toBe("NONE");
    expect(settings.pricing.selectedPriceTableIds).toEqual([]);
  });

  it("normalizes SELECTED without IDs to NONE unless a primary table is set", () => {
    const withoutPrimary = normalizeIntegrationImportSettings({
      pricing: {
        priceTablesMode: "SELECTED",
        selectedPriceTableIds: [],
      },
    });

    const withPrimary = normalizeIntegrationImportSettings({
      pricing: {
        primarySource: "SELECTED_PRICE_TABLE",
        priceTablesMode: "SELECTED",
        selectedPriceTableIds: [],
        primaryPriceTableId: "45",
      },
    });

    expect(withoutPrimary.pricing.priceTablesMode).toBe("NONE");
    expect(withPrimary.pricing.priceTablesMode).toBe("SELECTED");
    expect(withPrimary.pricing.primaryPriceTableId).toBe("45");
  });

  it("reports a clear sync error for selected table pricing without a primary ID", () => {
    expect(
      getIntegrationImportSettingsSyncError({
        pricing: {
          primarySource: "SELECTED_PRICE_TABLE",
          primaryPriceTableId: null,
        },
      }),
    ).toBe("Informe o ID da tabela principal antes de sincronizar.");
  });

  it("keeps the global sync policy when partially configured", () => {
    const settings = normalizeIntegrationImportSettings({
      syncPolicy: {
        existingProductsMode: "CREATE_ONLY",
      },
      images: {
        enabled: false,
      },
    });

    expect(settings.syncPolicy.existingProductsMode).toBe("CREATE_ONLY");
    expect(settings.images.enabled).toBe(false);
    expect(settings.products.enabled).toBe(true);
  });
});

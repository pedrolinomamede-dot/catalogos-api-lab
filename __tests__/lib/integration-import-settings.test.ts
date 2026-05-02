import {
  defaultIntegrationImportSettings,
  normalizeIntegrationImportSettings,
} from "@/lib/integrations/core/import-settings";

describe("integration import settings", () => {
  it("returns defaults when settings are missing", () => {
    expect(normalizeIntegrationImportSettings(null)).toEqual(
      defaultIntegrationImportSettings,
    );
  });

  it("merges partial settings and normalizes selected price table IDs", () => {
    const settings = normalizeIntegrationImportSettings({
      pricing: {
        primarySource: "PRICE_TABLE",
        selectedPriceTableIds: [" 12 ", "45", "12", 99],
      },
      categories: {
        enabled: false,
      },
    });

    expect(settings.pricing.primarySource).toBe("PRICE_TABLE");
    expect(settings.pricing.selectedPriceTableIds).toEqual(["12", "45"]);
    expect(settings.categories.enabled).toBe(false);
    expect(settings.products.fields.name).toBe(true);
  });
});

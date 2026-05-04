import {
  buildDataQualityIssueRows,
  normalizeDuplicateName,
} from "@/lib/data-quality/analysis";

describe("data quality analysis", () => {
  it("normalizes names for duplicate heuristics", () => {
    expect(normalizeDuplicateName(" Espelhos ")).toBe("espelho");
    expect(normalizeDuplicateName("ÁGUA   MICELAR")).toBe("agua micelar");
  });

  it("builds objective product issues and duplicate groups", () => {
    const result = buildDataQualityIssueRows({
      products: [
        {
          id: "1",
          sku: "",
          name: "Produto sem sku",
          description: null,
          imageUrl: null,
          price: null,
          categoryId: null,
          subcategoryId: null,
          sourceType: "INTEGRATION",
          sourceProvider: "VAREJONLINE",
          updatedAt: new Date("2026-05-04T10:00:00.000Z"),
        },
        {
          id: "2",
          sku: "ABC",
          name: "Produto A",
          description: "ok",
          imageUrl: "https://cdn.example.com/a.jpg",
          price: 10,
          categoryId: "cat-1",
          subcategoryId: "sub-1",
          sourceType: "INTEGRATION",
          sourceProvider: "VAREJONLINE",
          updatedAt: new Date("2026-05-04T10:00:00.000Z"),
        },
        {
          id: "3",
          sku: "abc",
          name: "Produto B",
          description: "ok",
          imageUrl: "https://cdn.example.com/b.jpg",
          price: 20,
          categoryId: "cat-2",
          subcategoryId: "sub-2",
          sourceType: "MANUAL",
          sourceProvider: null,
          updatedAt: new Date("2026-05-04T10:00:00.000Z"),
        },
      ],
      categories: [
        { id: "cat-1", name: "Espelho" },
        { id: "cat-2", name: "Espelhos" },
      ],
      subcategories: [
        { id: "sub-1", name: "Base Matte" },
        { id: "sub-2", name: "Base Mattes" },
      ],
    });

    expect(result.missing_sku).toHaveLength(1);
    expect(result.missing_price).toHaveLength(1);
    expect(result.missing_image).toHaveLength(1);
    expect(result.missing_category).toHaveLength(1);
    expect(result.missing_subcategory).toHaveLength(1);
    expect(result.missing_description).toHaveLength(1);
    expect(result.duplicate_sku).toHaveLength(2);
    expect(result.possible_duplicate_category).toHaveLength(2);
    expect(result.possible_duplicate_subcategory).toHaveLength(2);
  });
});

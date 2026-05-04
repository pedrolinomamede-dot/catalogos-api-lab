import {
  applyProgressiveDiscountToNumber,
  normalizeProgressiveDiscountTiers,
  resolveApplicableProgressiveDiscount,
} from "@/lib/pricing/progressive-discounts";

describe("progressive discounts", () => {
  it("normalizes only active percentual tiers", () => {
    expect(
      normalizeProgressiveDiscountTiers([
        { qtde: 4, ativo: true, desconto: 5, tipoDesconto: "PERCENTUAL" },
        { qtde: 8, ativo: false, desconto: 8, tipoDesconto: "PERCENTUAL" },
        { qtde: 10, ativo: true, desconto: 3, tipoDesconto: "VALOR" },
      ]),
    ).toEqual([{ minQuantity: 4, discountPercent: 5 }]);
  });

  it("chooses the highest applicable tier for the line quantity", () => {
    const { appliedTier } = resolveApplicableProgressiveDiscount(
      [
        { qtde: 4, ativo: true, desconto: 5, tipoDesconto: "PERCENTUAL" },
        { qtde: 8, ativo: true, desconto: 8, tipoDesconto: "PERCENTUAL" },
      ],
      9,
    );

    expect(appliedTier).toEqual({ minQuantity: 8, discountPercent: 8 });
  });

  it("does not apply discount when quantity does not reach the first tier", () => {
    const result = applyProgressiveDiscountToNumber(
      10,
      3,
      [{ qtde: 4, ativo: true, desconto: 5, tipoDesconto: "PERCENTUAL" }],
    );

    expect(result.discountPercent).toBeNull();
    expect(result.discountedUnitPrice).toBe(10);
    expect(result.discountedLineTotal).toBe(30);
  });

  it("applies percentual discount to the same product line only", () => {
    const result = applyProgressiveDiscountToNumber(
      10,
      8,
      [{ qtde: 8, ativo: true, desconto: 8, tipoDesconto: "PERCENTUAL" }],
    );

    expect(result.discountPercent).toBe(8);
    expect(result.discountedUnitPrice).toBe(9.2);
    expect(result.discountedLineTotal).toBe(73.6);
  });
});

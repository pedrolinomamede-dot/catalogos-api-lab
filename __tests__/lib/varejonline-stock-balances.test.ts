import { mapVarejonlineProduct } from "@/lib/integrations/providers/varejonline/mapper";
import { applyOfficialStockBalances } from "@/lib/integrations/providers/varejonline/sync-products";

describe("Varejonline official stock balances", () => {
  it("applies liquid stock balance to the normalized product", () => {
    const product = mapVarejonlineProduct({
      id: 126,
      descricao: "BASE FIX - VIZZELA 3",
      codigoInterno: "VZ86/3",
      estoque: 99,
      estoqueMinimo: 1,
      estoqueMaximo: 9,
    });

    const [enriched] = applyOfficialStockBalances(
      [product],
      new Map([
        [
          "126",
          {
            saldoAtual: 0,
            estoqueMinimo: 3,
            estoqueMaximo: 0,
            produto: { id: 126 },
            entidade: { id: 4, nome: "MAQUIADA MATRIZ" },
            quantidadeReservada: 2,
            quantidadeEstoqueTransito: 1,
          },
        ],
      ]),
      { id: 4, nome: "MAQUIADA MATRIZ" },
    );

    expect(enriched.stockQuantity).toBe(0);
    expect(enriched.minStockQuantity).toBe(3);
    expect(enriched.maxStockQuantity).toBe(0);
    expect(enriched.inventoryBalance?.quantidadeReservada).toBe(2);
    expect(enriched.inventoryBalance?.saldoAtual).toBe(0);
    expect(enriched.inventoryEntity).toEqual({ id: 4, nome: "MAQUIADA MATRIZ" });
  });

  it("keeps product payload stock when no official balance is applied", () => {
    const product = mapVarejonlineProduct({
      id: 126,
      descricao: "BASE FIX - VIZZELA 3",
      codigoInterno: "VZ86/3",
      estoque: 99,
    });

    expect(product.stockQuantity).toBe(99);
  });
});

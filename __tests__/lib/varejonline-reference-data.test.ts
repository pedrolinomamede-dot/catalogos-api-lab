import {
  resolveVarejonlineEntityRef,
  resolveVarejonlinePriceTableRef,
} from "@/lib/integrations/providers/varejonline/reference-data";

describe("Varejonline reference data", () => {
  const priceTables = [
    { id: 1, nome: "PADRÃO" },
    { id: 2, nome: "TABELA ATACADO" },
    { id: 5, nome: "FILIAIS" },
  ];
  const entities = [
    { id: 3, nome: "MAQUIADA BELA VISTA" },
    { id: 4, nome: "MAQUIADA MATRIZ" },
  ];

  it("resolves a price table by ID", () => {
    expect(resolveVarejonlinePriceTableRef(priceTables, "2")).toEqual({
      id: 2,
      nome: "TABELA ATACADO",
    });
  });

  it("resolves a price table by name without case or accent sensitivity", () => {
    expect(resolveVarejonlinePriceTableRef(priceTables, "padrao")).toEqual({
      id: 1,
      nome: "PADRÃO",
    });
  });

  it("throws a clear error when a price table name is missing", () => {
    expect(() =>
      resolveVarejonlinePriceTableRef(priceTables, "VAREJO"),
    ).toThrow(
      'Tabela de preco "VAREJO" nao encontrada na Varejonline. Informe o ID ou um nome existente.',
    );
  });

  it("throws a clear error when a price table name is ambiguous", () => {
    expect(() =>
      resolveVarejonlinePriceTableRef(
        [
          ...priceTables,
          { id: 7, nome: "Tabela Atacado" },
        ],
        "tabela atacado",
      ),
    ).toThrow('Mais de uma tabela chamada "tabela atacado" foi encontrada. Informe o ID.');
  });

  it("resolves an entity by ID or name", () => {
    expect(resolveVarejonlineEntityRef(entities, "4")).toEqual({
      id: 4,
      nome: "MAQUIADA MATRIZ",
    });
    expect(resolveVarejonlineEntityRef(entities, "maquiada matriz")).toEqual({
      id: 4,
      nome: "MAQUIADA MATRIZ",
    });
  });
});

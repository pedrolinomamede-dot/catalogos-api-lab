import { mapVarejonlineProduct } from "@/lib/integrations/providers/varejonline/mapper";

describe("Varejonline product mapper", () => {
  it("promotes commercial, taxonomy, fiscal and logistics fields from the product payload", () => {
    const product = mapVarejonlineProduct({
      id: 241,
      ativo: true,
      dataAlteracao: "08-01-2026 12:07:45",
      descricao: "CAMISETA AZUL P",
      descricaoSimplificada: "Camiseta Azul P",
      especificacao: "Camiseta polo azul tamanho P",
      codigoBarras: "6465464654567",
      codigosBarraAdicionais: ["6465464654568", { codigo: "6465464654569" }],
      codigoInterno: "12002",
      codigoSistema: "0002.0001",
      unidade: "UN",
      tamanho: "P",
      peso: "45,5",
      altura: 65,
      largura: 30,
      comprimento: 20,
      classificacao: "REVENDA",
      origem: 0,
      fci: "B01F70AF-10BF-4B1F-848C-65FF57F616FE",
      codigoCest: "22.001.00",
      codigoNCM: "9999.99.99",
      metodoControle: "ESTOCAVEL",
      permiteVenda: true,
      preco: "1.234,56",
      custoReferencial: 987.65,
      descontoMaximo: 10,
      comissao: 5,
      margemLucro: 30,
      estoque: 42,
      estoqueMinimo: 10,
      estoqueMaximo: 100,
      disponivelEcommerce: true,
      disponivelMarketplace: false,
      dadosPorEntidade: [
        {
          entidade: 1,
          estoqueMinimo: 10,
          estoqueMaximo: 100,
          codBeneficioFiscal: "ABC123",
        },
      ],
      fornecedores: [{ cnpj: "25.348.796/0001-07", codigo: "FOR-1" }],
      categorias: [
        { id: "1", nome: "Roupas", nivel: "DEPARTAMENTO" },
        { id: "2", nome: "Camisetas", nivel: "SETOR" },
        { id: "3", nome: "Polo", nivel: "GRUPO" },
        { id: "4", nome: "Manga curta", nivel: "SUBGRUPO" },
        { id: "5", nome: "Marca A", nivel: "MARCA" },
        { id: "6", nome: "Verão", nivel: "LINHA" },
      ],
      valorAtributos: [{ nome: "Tamanho", valor: "P", codigo: "P" }],
      urlsFotosProduto: ["https://cdn.example.com/produto.png"],
    });

    expect(product.externalId).toBe("241");
    expect(product.externalCode).toBe("12002");
    expect(product.sourceUpdatedAt?.getFullYear()).toBe(2026);
    expect(product.name).toBe("Camiseta Azul P");
    expect(product.description).toBe("Camiseta polo azul tamanho P");
    expect(product.line).toBe("Verão");
    expect(product.brand).toBe("Marca A");
    expect(product.barcode).toBe("6465464654567");
    expect(product.additionalBarcodes).toEqual(["6465464654568", "6465464654569"]);
    expect(product.department).toBe("Roupas");
    expect(product.section).toBe("Camisetas");
    expect(product.groupName).toBe("Polo");
    expect(product.subgroupName).toBe("Manga curta");
    expect(product.categoryName).toBe("Roupas");
    expect(product.subcategoryName).toBe("Camisetas");
    expect(product.price).toBe(1234.56);
    expect(product.costPrice).toBe(987.65);
    expect(product.stockQuantity).toBe(42);
    expect(product.minStockQuantity).toBe(10);
    expect(product.maxStockQuantity).toBe(100);
    expect(product.weight).toBe(45.5);
    expect(product.ncmCode).toBe("9999.99.99");
    expect(product.cestCode).toBe("22.001.00");
    expect(product.taxOrigin).toBe(0);
    expect(product.taxBenefitCode).toBe("ABC123");
    expect(product.allowSale).toBe(true);
    expect(product.ecommerceAvailable).toBe(true);
    expect(product.marketplaceAvailable).toBe(false);
    expect(product.taxInfo.entityData).toHaveLength(1);
    expect(product.commercialInfo.price).toBe(1234.56);
    expect(product.logisticsInfo.unit).toBe("UN");
    expect(product.suppliers).toHaveLength(1);
    expect(product.gradeAttributes).toHaveLength(1);
    expect(product.imageUrls).toEqual(["https://cdn.example.com/produto.png"]);
  });
});

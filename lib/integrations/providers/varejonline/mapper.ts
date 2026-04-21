import type {
  NormalizedExternalCategory,
  NormalizedExternalProduct,
} from "@/lib/integrations/core/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = parseNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function parseVarejonlineDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "s", "sim", "ativo"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "n", "nao", "não", "inativo"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = parseBoolean(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function firstArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function compactRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function getNestedString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      const nested = pickString(value, ["descricao", "nome", "name", "valor"]);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function readCategoryName(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return pickString(value, ["descricao", "nome", "name", "valor"]);
}

function readCategoryLevel(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return (
    pickString(value, ["nivel", "tipo", "classificacao"]) ||
    getNestedString(value, ["nivel", "tipo", "classificacao"])
  )?.toUpperCase() ?? null;
}

function readCategories(payload: Record<string, unknown>): NormalizedExternalCategory[] {
  const rawCategories = payload.categorias;
  if (!Array.isArray(rawCategories)) {
    return [];
  }

  return rawCategories
    .map((item) => ({
      id: isRecord(item) ? pickString(item, ["id", "codigo", "codigoSistema"]) : null,
      name: readCategoryName(item),
      level: readCategoryLevel(item),
    }))
    .filter((item): item is NormalizedExternalCategory => Boolean(item.name));
}

function findCategoryByLevel(
  categories: NormalizedExternalCategory[],
  levels: string[],
) {
  return categories.find((item) => {
    const level = item.level ?? "";
    return levels.some((candidate) => level.includes(candidate));
  });
}

function findGroupCategory(categories: NormalizedExternalCategory[]) {
  return categories.find((item) => {
    const level = item.level ?? "";
    return level.includes("GRUPO") && !level.includes("SUB");
  });
}

function readImageUrls(payload: Record<string, unknown>) {
  const candidates = [
    payload.urlsFotosProduto,
    payload.fotos,
    payload.imagens,
    payload.imagensProduto,
  ];

  const urls = candidates.flatMap((candidate) => {
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (isRecord(item)) {
          return pickString(item, ["url", "urlFoto", "imagem", "src"]);
        }
        return null;
      })
      .filter((url): url is string => Boolean(url));
  });

  return Array.from(new Set(urls));
}

function readAdditionalBarcodes(payload: Record<string, unknown>) {
  const candidates = [
    payload.codigosBarraAdicionais,
    payload.codigosBarrasAdicionais,
    payload.codigosEan,
    payload.eans,
    payload.gtins,
  ];

  const barcodes = candidates.flatMap((candidate) => {
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return asString(item);
        }
        if (isRecord(item)) {
          return pickString(item, ["codigoBarras", "ean", "gtin", "codigo", "valor"]);
        }
        return null;
      })
      .filter((barcode): barcode is string => Boolean(barcode));
  });

  return Array.from(new Set(barcodes));
}

function readSuppliers(payload: Record<string, unknown>) {
  const suppliers = firstArray(payload, ["fornecedores"]);
  if (suppliers.length > 0) {
    return suppliers;
  }

  return firstArray(payload, ["cnpjFornecedores"])
    .map((cnpj) => asString(cnpj))
    .filter((cnpj): cnpj is string => Boolean(cnpj))
    .map((cnpj) => ({ cnpj }));
}

function readTaxBenefitCode(payload: Record<string, unknown>) {
  for (const item of firstArray(payload, ["dadosPorEntidade"])) {
    if (!isRecord(item)) {
      continue;
    }
    const code = pickString(item, ["codBeneficioFiscal", "codigoBeneficioFiscal"]);
    if (code) {
      return code;
    }
  }

  return null;
}

function readGradeAttributes(payload: Record<string, unknown>) {
  return [
    ...firstArray(payload, ["valorAtributos"]),
    ...firstArray(payload, ["atributosProduto"]),
  ];
}

export function mapVarejonlineProduct(payload: unknown): NormalizedExternalProduct {
  if (!isRecord(payload)) {
    throw new Error("Varejonline product payload is invalid");
  }

  const externalId =
    pickString(payload, ["id", "codigoSistema", "codigo", "uuid"]) ??
    pickString(payload, ["codigoInterno", "referencia"]);
  const externalCode = pickString(payload, [
    "codigoInterno",
    "codigoSistema",
    "codigo",
    "referencia",
  ]);
  const name = pickString(payload, [
    "descricaoSimplificada",
    "descricao",
    "nome",
    "produto",
  ]);

  if (!externalId || !name) {
    throw new Error("Varejonline product is missing id or name");
  }

  const categories = readCategories(payload);
  const lineCategory = categories.find((item) => item.level?.includes("LINHA"));
  const brandCategory = categories.find((item) => item.level?.includes("MARCA"));
  const departmentCategory = findCategoryByLevel(categories, ["DEPARTAMENTO"]);
  const sectionCategory = findCategoryByLevel(categories, ["SETOR", "SECAO", "SEÇÃO"]);
  const groupCategory = findGroupCategory(categories);
  const subgroupCategory = findCategoryByLevel(categories, ["SUBGRUPO", "SUB GRUPO"]);
  const catalogCategories = categories.filter(
    (item) =>
      !item.level?.includes("LINHA") &&
      !item.level?.includes("MARCA") &&
      !item.level?.includes("FABRICANTE"),
  );
  const category = catalogCategories[0] ?? categories[0] ?? null;
  const subcategory = catalogCategories[1] ?? null;
  const isActive =
    parseBoolean(payload.ativo) ??
    (parseBoolean(payload.desativado) === false ? true : null) ??
    true;
  const barcode = pickString(payload, ["codigoBarras", "ean", "gtin", "barcode"]);
  const additionalBarcodes = readAdditionalBarcodes(payload).filter(
    (item) => item !== barcode,
  );
  const price = pickNumber(payload, [
    "precoVenda",
    "preco",
    "valorVenda",
    "precoFinal",
  ]);
  const costPrice = pickNumber(payload, [
    "custoReferencial",
    "precoCusto",
    "custo",
    "custoMedio",
  ]);
  const minStockQuantity = pickNumber(payload, ["estoqueMinimo", "minStock"]);
  const maxStockQuantity = pickNumber(payload, ["estoqueMaximo", "maxStock"]);
  const weight = pickNumber(payload, ["peso", "weight"]);
  const height = pickNumber(payload, ["altura", "height"]);
  const width = pickNumber(payload, ["largura", "width"]);
  const length = pickNumber(payload, ["comprimento", "length"]);
  const stockQuantity = parseInteger(
    payload.estoqueAtual ?? payload.estoque ?? payload.saldoEstoque ?? payload.saldo,
  );
  const ncmCode = pickString(payload, ["codigoNCM", "codigoNcm", "ncm", "codigoNcmMercosul"]);
  const cestCode = pickString(payload, ["codigoCest", "cest"]);
  const taxOrigin = parseInteger(payload.origem);
  const taxFci = pickString(payload, ["fci"]);
  const taxBenefitCode = readTaxBenefitCode(payload);
  const productClassification = pickString(payload, ["classificacao"]);
  const stockControlMethod = pickString(payload, ["metodoControle"]);
  const allowSale = pickBoolean(payload, ["permiteVenda"]);
  const ecommerceAvailable = pickBoolean(payload, ["disponivelEcommerce"]);
  const marketplaceAvailable = pickBoolean(payload, ["disponivelMarketplace"]);
  const unit = pickString(payload, ["unidade"]) ?? getNestedString(payload, ["unidade"]);
  const suppliers = readSuppliers(payload);
  const gradeAttributes = readGradeAttributes(payload);

  return {
    externalId,
    externalCode,
    sourceUpdatedAt: parseVarejonlineDate(payload.dataAlteracao),
    name,
    description: pickString(payload, ["especificacao", "descricaoCompleta", "observacao"]),
    line:
      pickString(payload, ["linha"]) ??
      getNestedString(payload, ["linha"]) ??
      lineCategory?.name ??
      null,
    brand:
      pickString(payload, ["marca", "fabricante"]) ??
      getNestedString(payload, ["marca", "fabricante"]) ??
      brandCategory?.name ??
      null,
    barcode,
    additionalBarcodes,
    size:
      pickString(payload, ["tamanho", "medida"]) ??
      getNestedString(payload, ["unidadeMedida"]) ??
      null,
    department: departmentCategory?.name ?? null,
    section: sectionCategory?.name ?? null,
    groupName: groupCategory?.name ?? null,
    subgroupName: subgroupCategory?.name ?? null,
    unit,
    categoryExternalId: category?.id ?? null,
    categoryName: category?.name ?? null,
    subcategoryExternalId: subcategory?.id ?? null,
    subcategoryName: subcategory?.name ?? null,
    categories,
    price,
    costPrice,
    stockQuantity,
    minStockQuantity,
    maxStockQuantity,
    weight,
    height,
    width,
    length,
    ncmCode,
    cestCode,
    taxOrigin,
    taxFci,
    taxBenefitCode,
    productClassification,
    stockControlMethod,
    allowSale,
    ecommerceAvailable,
    marketplaceAvailable,
    taxInfo: compactRecord({
      ncmCode,
      cestCode,
      taxOrigin,
      taxFci,
      taxBenefitCode,
      productClassification,
      stockControlMethod,
      allowSale,
      entityData: firstArray(payload, ["dadosPorEntidade"]),
      taxOriginRaw: payload.origem,
    }),
    commercialInfo: compactRecord({
      price,
      costPrice,
      maxDiscountPercent: pickNumber(payload, ["descontoMaximo"]),
      commissionPercent: pickNumber(payload, ["comissao"]),
      profitMarginPercent: pickNumber(payload, ["margemLucro"]),
      variablePrice: pickBoolean(payload, ["precoVariavel"]),
      freeSample: pickBoolean(payload, ["amostraGratis"]),
      priceTables: firstArray(payload, ["precosPorTabelas"]),
      progressiveDiscounts: firstArray(payload, ["descontoProgressivo"]),
      referenceCosts: firstArray(payload, ["listCustoReferencial"]),
    }),
    logisticsInfo: compactRecord({
      unit,
      unitProportions: firstArray(payload, ["unidadesProporcao"]),
      stockQuantity,
      minStockQuantity,
      maxStockQuantity,
      weight,
      height,
      width,
      length,
      lotControl: pickBoolean(payload, ["controlaLote"]),
      lotValidityControl: pickBoolean(payload, ["controlaValidadeLote"]),
      usedProduct: pickBoolean(payload, ["produtoUsado"]),
    }),
    suppliers,
    gradeAttributes,
    isActive,
    imageUrls: readImageUrls(payload),
    rawPayload: payload,
  };
}

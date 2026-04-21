import type { NormalizedExternalProduct } from "@/lib/integrations/core/types";

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

function readCategories(payload: Record<string, unknown>) {
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
    .filter((item) => item.name);
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

  return {
    externalId,
    externalCode,
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
    barcode: pickString(payload, ["codigoBarras", "ean", "gtin", "barcode"]),
    size: pickString(payload, ["tamanho", "medida", "unidadeMedida"]),
    categoryExternalId: category?.id ?? null,
    categoryName: category?.name ?? null,
    subcategoryExternalId: subcategory?.id ?? null,
    subcategoryName: subcategory?.name ?? null,
    price: parseNumber(
      payload.precoVenda ?? payload.preco ?? payload.valorVenda ?? payload.precoFinal,
    ),
    stockQuantity: null,
    isActive,
    imageUrls: readImageUrls(payload),
    rawPayload: payload,
  };
}

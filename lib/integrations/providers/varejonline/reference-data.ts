import { createVarejonlineClient } from "@/lib/integrations/providers/varejonline/client";

export type VarejonlinePriceTableReference = {
  id: number;
  nome: string;
  idsEntidades?: number[];
  ativo?: boolean;
  disponivel?: boolean;
  permanente?: boolean;
  promocao?: boolean;
  compra?: boolean;
  classificacoesCliente?: unknown[];
  idsClassificacoesClientes?: number[];
};

export type VarejonlineEntityReference = {
  id: number;
  nome: string;
  documento?: string | null;
};

export type VarejonlineLiquidStockBalance = {
  saldoAtual: number;
  estoqueMinimo?: number | null;
  estoqueMaximo?: number | null;
  produto?: {
    id?: number;
    descricao?: string;
    codigoBarras?: string;
    codigoInterno?: string;
    codigoSistema?: string;
  };
  entidade?: VarejonlineEntityReference;
  quantidadeEstoqueTransito?: number | null;
  quantidadeReservada?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function normalizeName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readArrayPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isRecord(payload)) {
    for (const key of ["data", "items", "itens", "content", "registros"]) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

export function resolveVarejonlineReferenceByNameOrId<T extends { id: number; nome: string }>(
  refs: T[],
  rawRef: string,
  labels: {
    singular: string;
    notFound: (ref: string) => string;
    ambiguous: (ref: string) => string;
  },
) {
  const ref = rawRef.trim();
  if (!ref) {
    throw new Error(labels.notFound(rawRef));
  }

  const idMatch = refs.find((item) => String(item.id) === ref);
  if (idMatch) {
    return idMatch;
  }

  const normalizedRef = normalizeSearchValue(ref);
  const matches = refs.filter(
    (item) => normalizeSearchValue(item.nome) === normalizedRef,
  );

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(labels.ambiguous(ref));
  }

  throw new Error(labels.notFound(ref));
}

export async function listVarejonlinePriceTables(accessToken: string) {
  const client = createVarejonlineClient(accessToken);
  const payload = await client.get<unknown>("/tabelas-preco", {
    quantidade: 500,
  });
  const items = readArrayPayload(payload);

  return items
    .map((item): VarejonlinePriceTableReference | null => {
      if (!isRecord(item)) {
        return null;
      }

      const id = Number(item.id);
      const nome = normalizeName(item.nome);
      if (!Number.isFinite(id) || !nome) {
        return null;
      }

      return {
        id,
        nome,
        idsEntidades: Array.isArray(item.idsEntidades)
          ? item.idsEntidades
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value))
          : [],
        ativo: typeof item.ativo === "boolean" ? item.ativo : undefined,
        disponivel:
          typeof item.disponivel === "boolean" ? item.disponivel : undefined,
        permanente:
          typeof item.permanente === "boolean" ? item.permanente : undefined,
        promocao: typeof item.promocao === "boolean" ? item.promocao : undefined,
        compra: typeof item.compra === "boolean" ? item.compra : undefined,
        classificacoesCliente: Array.isArray(item.classificacoesCliente)
          ? item.classificacoesCliente
          : [],
        idsClassificacoesClientes: Array.isArray(item.idsClassificacoesClientes)
          ? item.idsClassificacoesClientes
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value))
          : [],
      } satisfies VarejonlinePriceTableReference;
    })
    .filter((item): item is VarejonlinePriceTableReference => Boolean(item));
}

export async function listVarejonlineEntities(accessToken: string) {
  const client = createVarejonlineClient(accessToken);
  const payload = await client.get<unknown>("/entidades", {
    quantidade: 500,
  });
  const items = readArrayPayload(payload);

  return items
    .map((item): VarejonlineEntityReference | null => {
      if (!isRecord(item)) {
        return null;
      }

      const id = Number(item.id);
      const nome = normalizeName(item.nome ?? item.descricao);
      if (!Number.isFinite(id) || !nome) {
        return null;
      }

      return {
        id,
        nome,
        documento:
          typeof item.documento === "string" ? item.documento : undefined,
      } satisfies VarejonlineEntityReference;
    })
    .filter((item): item is VarejonlineEntityReference => Boolean(item));
}

export function resolveVarejonlinePriceTableRef(
  priceTables: VarejonlinePriceTableReference[],
  ref: string,
) {
  return resolveVarejonlineReferenceByNameOrId(priceTables, ref, {
    singular: "tabela de preco",
    notFound: (value) =>
      `Tabela de preco "${value}" nao encontrada na Varejonline. Informe o ID ou um nome existente.`,
    ambiguous: (value) =>
      `Mais de uma tabela chamada "${value}" foi encontrada. Informe o ID.`,
  });
}

export function resolveVarejonlineEntityRef(
  entities: VarejonlineEntityReference[],
  ref: string,
) {
  return resolveVarejonlineReferenceByNameOrId(entities, ref, {
    singular: "entidade",
    notFound: (value) =>
      `Entidade de estoque "${value}" nao encontrada na Varejonline. Informe o ID ou um nome existente.`,
    ambiguous: (value) =>
      `Mais de uma entidade chamada "${value}" foi encontrada. Informe o ID.`,
  });
}

export function getExternalProductId(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return (
    normalizeId(value.id) ??
    normalizeId(value.codigoSistema) ??
    normalizeId(value.codigo)
  );
}

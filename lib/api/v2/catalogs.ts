import type {
  CatalogItemV2,
  CatalogV2,
  CreateCatalogItemV2Request,
  CreateCatalogV2Request,
  UpdateCatalogV2Request,
} from "@/types/api";

import { apiDelete, apiFetch, apiGet, apiPatch, apiPost, withQuery } from "@/lib/api/client";

type ApiEnvelope<T, M = unknown> = {
  ok: true;
  data: T;
  meta?: M;
};

type V2ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CatalogsV2ListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listCatalogsV2(
  params?: CatalogsV2ListParams,
): Promise<CatalogV2[] | { data: CatalogV2[]; meta?: V2ListMeta }> {
  const res = await apiGet<ApiEnvelope<CatalogV2[], V2ListMeta>>(
    "/api/v2/catalogs",
    params,
  );
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function listAllCatalogIds(params?: Pick<CatalogsV2ListParams, "q">) {
  const firstPage = await listCatalogsV2({
    q: params?.q,
    page: 1,
    pageSize: 100,
  });

  const firstItems = Array.isArray(firstPage) ? firstPage : firstPage.data;
  const firstMeta = Array.isArray(firstPage) ? undefined : firstPage.meta;
  const ids = new Set<string>(firstItems.map((item) => item.id));
  const totalPages = Math.max(1, firstMeta?.totalPages ?? 1);

  if (totalPages <= 1) {
    return [...ids];
  }

  const pages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const results = await Promise.all(
    pages.map((page) =>
      listCatalogsV2({
        q: params?.q,
        page,
        pageSize: 100,
      }),
    ),
  );

  results.forEach((result) => {
    const items = Array.isArray(result) ? result : result.data;
    items.forEach((item) => ids.add(item.id));
  });

  return [...ids];
}

export async function createCatalogV2(
  body: CreateCatalogV2Request,
): Promise<CatalogV2> {
  const res = await apiPost<CreateCatalogV2Request, ApiEnvelope<CatalogV2>>(
    "/api/v2/catalogs",
    body,
  );
  return res.data;
}

export async function getCatalogV2(id: string): Promise<CatalogV2> {
  const res = await apiGet<ApiEnvelope<CatalogV2>>(`/api/v2/catalogs/${id}`);
  return res.data;
}

export async function updateCatalogV2(
  id: string,
  body: UpdateCatalogV2Request,
): Promise<CatalogV2> {
  const res = await apiPatch<UpdateCatalogV2Request, ApiEnvelope<CatalogV2>>(
    `/api/v2/catalogs/${id}`,
    body,
  );
  return res.data;
}

export async function deleteCatalogV2(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/v2/catalogs/${id}`);
}

export type CatalogDeleteImpact = {
  itemsCount: number;
  shareLinksCount: number;
};

export async function getCatalogDeleteImpactV2(
  id: string,
): Promise<CatalogDeleteImpact> {
  const url = withQuery(`/api/v2/catalogs/${id}`, { dryRun: true });
  const res = await apiFetch<ApiEnvelope<CatalogDeleteImpact>>(url, { method: "DELETE" });
  return res.data;
}

export async function listCatalogItemsV2(
  catalogId: string,
): Promise<CatalogItemV2[]> {
  const res = await apiGet<ApiEnvelope<CatalogItemV2[]>>(
    `/api/v2/catalogs/${catalogId}/items`,
  );
  return res.data;
}

export async function addCatalogItemV2(
  catalogId: string,
  body: CreateCatalogItemV2Request,
): Promise<CatalogItemV2> {
  const res = await apiPost<CreateCatalogItemV2Request, ApiEnvelope<CatalogItemV2>>(
    `/api/v2/catalogs/${catalogId}/items`,
    body,
  );
  return res.data;
}

export async function deleteCatalogItemV2(
  catalogId: string,
  itemId: string,
): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(
    `/api/v2/catalogs/${catalogId}/items/${itemId}`,
  );
}

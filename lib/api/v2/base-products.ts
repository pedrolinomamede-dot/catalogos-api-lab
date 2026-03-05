import type {
  BaseProductV2,
  BaseProductsImportResultV2,
  CreateBaseProductV2Request,
  ImportBaseProductsCsvV2Item,
  ProductBaseImageV2,
  UpdateBaseProductV2Request,
} from "@/types/api";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { ApiFetchError } from "@/lib/api/client";

type ApiEnvelope<T, M = unknown> = {
  ok: true;
  data: T;
  meta?: M;
};

type BaseProductsListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type BaseProductsListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listBaseProducts(
  params?: BaseProductsListParams,
): Promise<BaseProductV2[] | { data: BaseProductV2[]; meta?: BaseProductsListMeta }> {
  const res = await apiGet<
    ApiEnvelope<BaseProductV2[], BaseProductsListMeta>
  >("/api/v2/produtos-base", params);
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function createBaseProduct(
  body: CreateBaseProductV2Request,
): Promise<BaseProductV2> {
  const res = await apiPost<
    CreateBaseProductV2Request,
    ApiEnvelope<BaseProductV2>
  >("/api/v2/produtos-base", body);
  return res.data;
}

export async function listAllBaseProductIds(params?: Pick<BaseProductsListParams, "q">) {
  const firstPage = await listBaseProducts({
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
      listBaseProducts({
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

export async function importBaseProductsCsvV2(
  items: ImportBaseProductsCsvV2Item[],
): Promise<BaseProductsImportResultV2> {
  const res = await apiPost<
    { items: ImportBaseProductsCsvV2Item[] },
    ApiEnvelope<BaseProductsImportResultV2>
  >("/api/v2/produtos-base/bulk", { items });
  return res.data;
}

export async function deleteBaseProduct(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/v2/produtos-base/${id}`);
}

export async function updateBaseProductV2(
  id: string,
  body: UpdateBaseProductV2Request,
): Promise<BaseProductV2> {
  const res = await apiPatch<UpdateBaseProductV2Request, ApiEnvelope<BaseProductV2>>(
    `/api/v2/produtos-base/${id}`,
    body,
  );
  return res.data;
}

export async function updateBaseProductImageV2(id: string, imageUrl: string | null): Promise<BaseProductV2> {
  const primaryPath = `/api/v2/base-products/${id}/image`;
  const fallbackPath = `/api/v2/produtos-base/${id}/image`;

  return withNotFoundFallback(
    async () => {
      const res = await apiPatch<{ imageUrl: string | null }, ApiEnvelope<BaseProductV2>>(
        primaryPath,
        { imageUrl },
      );
      return res.data;
    },
    async () => {
      const res = await apiPatch<{ imageUrl: string | null }, ApiEnvelope<BaseProductV2>>(
        fallbackPath,
        { imageUrl },
      );
      return res.data;
    },
  );
}

export async function listBaseProductImagesV2(productBaseId: string): Promise<ProductBaseImageV2[]> {
  const primaryPath = `/api/v2/base-products/${productBaseId}/images`;
  const fallbackPath = `/api/v2/produtos-base/${productBaseId}/images`;

  return withNotFoundFallback(
    () => apiGet<ProductBaseImageV2[]>(primaryPath),
    () => apiGet<ProductBaseImageV2[]>(fallbackPath),
  );
}

export async function addBaseProductImageV2(
  productBaseId: string,
  imageUrl: string,
  sortOrder?: number,
): Promise<ProductBaseImageV2> {
  const primaryPath = `/api/v2/base-products/${productBaseId}/images`;
  const fallbackPath = `/api/v2/produtos-base/${productBaseId}/images`;

  return withNotFoundFallback(
    () =>
      apiPost<{ imageUrl: string; sortOrder?: number }, ProductBaseImageV2>(
        primaryPath,
        { imageUrl, sortOrder },
      ),
    () =>
      apiPost<{ imageUrl: string; sortOrder?: number }, ProductBaseImageV2>(
        fallbackPath,
        { imageUrl, sortOrder },
      ),
  );
}

export async function deleteBaseProductImageV2(
  productBaseId: string,
  imageId: string,
): Promise<void> {
  const primaryPath = `/api/v2/base-products/${productBaseId}/images/${imageId}`;
  const fallbackPath = `/api/v2/produtos-base/${productBaseId}/images/${imageId}`;

  await withNotFoundFallback(
    () => apiDelete(primaryPath),
    () => apiDelete(fallbackPath),
  );
}

function isNotFoundError(error: unknown): error is ApiFetchError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { status?: unknown };
  return typeof record.status === "number" && record.status === 404;
}

async function withNotFoundFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (isNotFoundError(error)) {
      return fallback();
    }
    throw error;
  }
}

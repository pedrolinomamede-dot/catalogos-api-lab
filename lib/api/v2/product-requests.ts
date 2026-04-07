import type { ProductRequestSummary } from "@/types/api";

import { apiGet } from "@/lib/api/client";

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

export type ProductRequestsV2ListParams = {
  page?: number;
  pageSize?: number;
};

export async function listProductRequestsV2(
  params?: ProductRequestsV2ListParams,
): Promise<
  ProductRequestSummary[] | { data: ProductRequestSummary[]; meta?: V2ListMeta }
> {
  const res = await apiGet<ApiEnvelope<ProductRequestSummary[], V2ListMeta>>(
    "/api/v2/product-requests",
    params,
  );

  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

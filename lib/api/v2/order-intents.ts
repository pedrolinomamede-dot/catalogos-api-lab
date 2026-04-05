import type {
  OrderIntentSummary,
  UpdateOrderIntentStatusRequest,
} from "@/types/api";

import { apiGet, apiPatch } from "@/lib/api/client";

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

export type OrderIntentsV2ListParams = {
  page?: number;
  pageSize?: number;
};

export async function listOrderIntentsV2(
  params?: OrderIntentsV2ListParams,
): Promise<OrderIntentSummary[] | { data: OrderIntentSummary[]; meta?: V2ListMeta }> {
  const res = await apiGet<ApiEnvelope<OrderIntentSummary[], V2ListMeta>>(
    "/api/v2/order-intents",
    params,
  );
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function updateOrderIntentStatusV2(
  id: string,
  body: UpdateOrderIntentStatusRequest,
) {
  const res = await apiPatch<
    UpdateOrderIntentStatusRequest,
    ApiEnvelope<OrderIntentSummary>
  >(`/api/v2/order-intents/${id}`, body);

  return res.data;
}

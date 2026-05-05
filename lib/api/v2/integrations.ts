import type {
  IntegrationConnectionCreateRequest,
  IntegrationConnectionCreateResponse,
  IntegrationConnectionV2,
  IntegrationProviderDescriptor,
  IntegrationSyncJobV2,
  IntegrationSyncRequest,
  UpdateIntegrationConnectionImportSettingsRequest,
  VarejonlineEntityReference,
  VarejonlinePriceTableReference,
} from "@/types/api";

import { apiGet, apiPatch, apiPost } from "@/lib/api/client";

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

export async function listIntegrationProvidersV2(): Promise<IntegrationProviderDescriptor[]> {
  const res = await apiGet<ApiEnvelope<IntegrationProviderDescriptor[]>>(
    "/api/v2/integrations/providers",
  );
  return res.data;
}

export async function listIntegrationConnectionsV2(): Promise<IntegrationConnectionV2[]> {
  const res = await apiGet<ApiEnvelope<IntegrationConnectionV2[]>>(
    "/api/v2/integrations/connections",
  );
  return res.data;
}

export async function getIntegrationConnectionV2(id: string): Promise<IntegrationConnectionV2> {
  const res = await apiGet<ApiEnvelope<IntegrationConnectionV2>>(
    `/api/v2/integrations/connections/${id}`,
  );
  return res.data;
}

export async function updateIntegrationConnectionImportSettingsV2(
  id: string,
  body: UpdateIntegrationConnectionImportSettingsRequest,
): Promise<IntegrationConnectionV2> {
  const res = await apiPatch<
    UpdateIntegrationConnectionImportSettingsRequest,
    ApiEnvelope<IntegrationConnectionV2>
  >(`/api/v2/integrations/connections/${id}`, body);
  return res.data;
}

export async function listVarejonlineReferenceDataV2(
  id: string,
  resource: "price-tables",
): Promise<VarejonlinePriceTableReference[]>;
export async function listVarejonlineReferenceDataV2(
  id: string,
  resource: "entities",
): Promise<VarejonlineEntityReference[]>;
export async function listVarejonlineReferenceDataV2(
  id: string,
  resource: "price-tables" | "entities",
) {
  const res = await apiGet<
    ApiEnvelope<VarejonlinePriceTableReference[] | VarejonlineEntityReference[]>
  >(`/api/v2/integrations/connections/${id}/reference-data`, {
    resource,
  });
  return res.data;
}

export async function createIntegrationConnectionV2(
  body: IntegrationConnectionCreateRequest,
): Promise<IntegrationConnectionCreateResponse> {
  const res = await apiPost<
    IntegrationConnectionCreateRequest,
    ApiEnvelope<IntegrationConnectionCreateResponse>
  >("/api/v2/integrations/connections", body);
  return res.data;
}

export async function disconnectIntegrationConnectionV2(
  id: string,
): Promise<IntegrationConnectionV2> {
  const res = await apiPost<Record<string, never>, ApiEnvelope<IntegrationConnectionV2>>(
    `/api/v2/integrations/connections/${id}/disconnect`,
    {},
  );
  return res.data;
}

export async function syncIntegrationConnectionV2(
  id: string,
  body: IntegrationSyncRequest,
): Promise<{ jobId: string; status: string }> {
  const res = await apiPost<
    IntegrationSyncRequest,
    ApiEnvelope<{ jobId: string; status: string }>
  >(`/api/v2/integrations/connections/${id}/sync`, body);
  return res.data;
}

export async function cancelIntegrationSyncJobV2(
  connectionId: string,
  jobId: string,
): Promise<{ jobId: string; status: string }> {
  const res = await apiPost<
    Record<string, never>,
    ApiEnvelope<{ jobId: string; status: string }>
  >(
    `/api/v2/integrations/connections/${connectionId}/sync/${jobId}/cancel`,
    {},
  );
  return res.data;
}

export async function listIntegrationConnectionJobsV2(
  id: string,
  params?: { page?: number; pageSize?: number },
): Promise<IntegrationSyncJobV2[] | { data: IntegrationSyncJobV2[]; meta?: V2ListMeta }> {
  const res = await apiGet<ApiEnvelope<IntegrationSyncJobV2[], V2ListMeta>>(
    `/api/v2/integrations/connections/${id}/jobs`,
    params,
  );
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function refreshCatalogFromSourceV2(
  catalogId: string,
): Promise<{ refreshedCount: number }> {
  const res = await apiPost<Record<string, never>, ApiEnvelope<{ refreshedCount: number }>>(
    `/api/v2/catalogs/${catalogId}/refresh-from-source`,
    {},
  );
  return res.data;
}

export async function refreshCatalogItemFromSourceV2(
  catalogId: string,
  itemId: string,
) {
  const res = await apiPost<Record<string, never>, ApiEnvelope<unknown>>(
    `/api/v2/catalogs/${catalogId}/items/${itemId}/refresh-from-source`,
    {},
  );
  return res.data;
}

import type {
  CreatePlatformTenantRequest,
  PlatformTenantSummary,
  UpdatePlatformTenantStatusRequest,
} from "@/types/api";

import { apiGet, apiPatch, apiPost } from "@/lib/api/client";

type ApiEnvelope<T> = {
  ok: true;
  data: T;
};

export async function listPlatformTenants(): Promise<PlatformTenantSummary[]> {
  const res = await apiGet<ApiEnvelope<PlatformTenantSummary[]>>(
    "/api/admin/tenants",
  );
  return res.data;
}

export async function createPlatformTenant(
  body: CreatePlatformTenantRequest,
): Promise<PlatformTenantSummary> {
  const res = await apiPost<CreatePlatformTenantRequest, ApiEnvelope<PlatformTenantSummary>>(
    "/api/admin/tenants",
    body,
  );
  return res.data;
}

export async function updatePlatformTenantStatus(
  id: string,
  body: UpdatePlatformTenantStatusRequest,
): Promise<PlatformTenantSummary> {
  const res = await apiPatch<
    UpdatePlatformTenantStatusRequest,
    ApiEnvelope<PlatformTenantSummary>
  >(`/api/admin/tenants/${id}`, body);
  return res.data;
}

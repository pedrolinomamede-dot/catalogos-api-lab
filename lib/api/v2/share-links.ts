import type { CreateShareLinkV2Request, PdfExportMode, ShareLinkV2 } from "@/types/api";

import { ApiFetchError, apiDelete, apiFetch, apiGet, apiPatch, apiPost, withQuery } from "@/lib/api/client";

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

export type ShareLinksV2ListParams = {
  page?: number;
  pageSize?: number;
};

export type ShareLinkCreateResponse = {
  id: string;
  token: string;
  slug?: string | null;
};

export async function listShareLinksV2(
  params?: ShareLinksV2ListParams,
): Promise<ShareLinkV2[] | { data: ShareLinkV2[]; meta?: V2ListMeta }> {
  const res = await apiGet<ApiEnvelope<ShareLinkV2[], V2ListMeta>>(
    "/api/v2/share-links",
    params,
  );
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function createShareLinkV2(
  body: CreateShareLinkV2Request,
): Promise<ShareLinkCreateResponse> {
  const res = await apiPost<CreateShareLinkV2Request, ApiEnvelope<ShareLinkCreateResponse>>(
    "/api/v2/share-links",
    body,
  );
  return res.data;
}

export async function getShareLinkV2(id: string): Promise<ShareLinkV2> {
  const res = await apiGet<ApiEnvelope<ShareLinkV2>>(`/api/v2/share-links/${id}`);
  return res.data;
}

export async function revokeShareLinkV2(id: string): Promise<ShareLinkV2> {
  const res = await apiPatch<{ action: "revoke" }, ApiEnvelope<ShareLinkV2>>(
    `/api/v2/share-links/${id}`,
    { action: "revoke" },
  );
  return res.data;
}

export type ShareLinkDeleteImpact = {
  catalogsCount: number;
};

export async function getShareLinkDeleteImpactV2(
  id: string,
): Promise<ShareLinkDeleteImpact> {
  const url = withQuery(`/api/v2/share-links/${id}`, { dryRun: true });
  const res = await apiFetch<ApiEnvelope<ShareLinkDeleteImpact>>(url, { method: "DELETE" });
  return res.data;
}

export async function deleteShareLinkV2(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/v2/share-links/${id}`);
}
export async function downloadShareLinkPdfV2(
  id: string,
  mode: PdfExportMode = "final",
): Promise<Blob> {
  const url = withQuery(`/api/v2/share-links/${id}/pdf`, { mode });
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/pdf",
    },
    credentials: "include",
  });

  if (res.ok) {
    return res.blob();
  }

  let message = res.statusText || "Request failed";
  try {
    const payload = await res.json();
    if (payload && typeof payload === "object" && payload.error?.message) {
      message = payload.error.message as string;
    }
  } catch {
    // ignore non-json errors
  }

  const error: ApiFetchError = {
    status: res.status,
    message,
  };
  throw error;
}

import type {
  DataQualityIssueRow,
  DataQualityIssueType,
  DataQualitySummary,
} from "@/types/api";

import { apiGet, withQuery } from "@/lib/api/client";

type ApiEnvelope<T, M = unknown> = {
  ok: true;
  data: T;
  meta?: M;
};

type ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function getDataQualitySummaryV2(): Promise<DataQualitySummary> {
  const res = await apiGet<ApiEnvelope<DataQualitySummary>>(
    "/api/v2/data-quality/summary",
  );
  return res.data;
}

export async function listDataQualityIssuesV2(params: {
  type: DataQualityIssueType;
  page?: number;
  pageSize?: number;
}): Promise<{ data: DataQualityIssueRow[]; meta: ListMeta }> {
  const res = await apiGet<ApiEnvelope<DataQualityIssueRow[], ListMeta>>(
    "/api/v2/data-quality/issues",
    {
      type: params.type,
      page: params.page,
      pageSize: params.pageSize,
    },
  );

  return {
    data: res.data,
    meta: res.meta ?? {
      page: 1,
      pageSize: params.pageSize ?? res.data.length,
      total: res.data.length,
      totalPages: 1,
    },
  };
}

export async function downloadDataQualityIssuesCsvV2(
  type: DataQualityIssueType,
): Promise<Blob> {
  const path = withQuery("/api/v2/data-quality/issues/export", { type });
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "text/csv",
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao exportar CSV de qualidade dos dados.");
  }

  return response.blob();
}

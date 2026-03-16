import type { DashboardSummaryV2 } from "@/types/api";

import { apiGet } from "@/lib/api/client";

type ApiEnvelope<T> = {
  ok: true;
  data: T;
};

export async function getDashboardSummaryV2(): Promise<DashboardSummaryV2> {
  const res = await apiGet<ApiEnvelope<DashboardSummaryV2>>(
    "/api/v2/dashboard/summary",
  );
  return res.data;
}

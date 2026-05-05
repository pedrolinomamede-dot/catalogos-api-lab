import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { cancelIntegrationSyncJob } from "@/lib/integrations/core/sync-jobs";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; jobId: string }> },
) {
  const { id, jobId } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const result = await cancelIntegrationSyncJob(tx, {
      brandId: auth.brandId,
      connectionId: id,
      jobId,
    });

    if (!result.ok) {
      return jsonError(
        result.statusCode,
        result.statusCode === 404 ? "not_found" : "integration_sync_cancel_failed",
        result.message,
      );
    }

    return NextResponse.json({
      ok: true,
      data: { jobId, status: result.status },
    });
  });
}

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/authz";
import { getIntegrationConnectionById } from "@/lib/integrations/core/connection-service";
import { listIntegrationJobs } from "@/lib/integrations/core/sync-jobs";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = parsePagination(searchParams, {
    defaultPageSize: 20,
    maxPageSize: 100,
  });

  return withBrand(auth.brandId, async (tx) => {
    const connection = await getIntegrationConnectionById(tx, auth.brandId, id);
    if (!connection) {
      return jsonError(404, "not_found", "Integration connection not found");
    }

    const { items, total } = await listIntegrationJobs(tx, {
      brandId: auth.brandId,
      connectionId: id,
      take,
      skip,
    });

    return NextResponse.json({
      ok: true,
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  });
}

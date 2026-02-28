import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import {
  disconnectIntegrationConnection,
  getIntegrationConnectionById,
} from "@/lib/integrations/core/connection-service";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const existing = await getIntegrationConnectionById(tx, auth.brandId, id);
    if (!existing) {
      return jsonError(404, "not_found", "Integration connection not found");
    }

    const connection = await disconnectIntegrationConnection(tx, {
      brandId: auth.brandId,
      connectionId: id,
    });

    const activeConnections = await tx.integrationConnectionV2.count({
      where: {
        brandId: auth.brandId,
        status: "CONNECTED",
      },
    });

    if (activeConnections === 0) {
      await tx.brand.update({
        where: { id: auth.brandId },
        data: { integrationMode: "MANUAL_CSV" },
      });
    }

    return NextResponse.json({ ok: true, data: connection });
  });
}

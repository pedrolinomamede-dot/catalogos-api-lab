import { NextResponse } from "next/server";

import { requireUser } from "@/lib/authz";
import { getIntegrationConnectionById } from "@/lib/integrations/core/connection-service";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const connection = await getIntegrationConnectionById(tx, auth.brandId, id);
    if (!connection) {
      return jsonError(404, "not_found", "Integration connection not found");
    }

    return NextResponse.json({ ok: true, data: connection });
  });
}

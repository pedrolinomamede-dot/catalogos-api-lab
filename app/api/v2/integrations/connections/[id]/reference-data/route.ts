import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { decryptSecret } from "@/lib/integrations/core/secrets";
import {
  listVarejonlineEntities,
  listVarejonlinePriceTables,
} from "@/lib/integrations/providers/varejonline/reference-data";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource");
  if (resource !== "price-tables" && resource !== "entities") {
    return jsonError(400, "validation_error", "Unsupported reference resource");
  }

  const connection = await withBrand(auth.brandId, async (tx) =>
    tx.integrationConnectionV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
        provider: "VAREJONLINE",
      },
      select: {
        id: true,
        status: true,
        accessTokenEncrypted: true,
      },
    }),
  );

  if (!connection) {
    return jsonError(404, "not_found", "Integration connection not found");
  }

  if (connection.status !== "CONNECTED" || !connection.accessTokenEncrypted) {
    return jsonError(400, "validation_error", "Integration is not connected");
  }

  const accessToken = decryptSecret(connection.accessTokenEncrypted);
  if (!accessToken) {
    return jsonError(400, "validation_error", "Integration token is empty");
  }

  const data =
    resource === "price-tables"
      ? await listVarejonlinePriceTables(accessToken)
      : await listVarejonlineEntities(accessToken);

  return NextResponse.json({ ok: true, data });
}

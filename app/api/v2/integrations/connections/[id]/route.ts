import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole, requireUser } from "@/lib/authz";
import { integrationImportSettingsSchema } from "@/lib/integrations/core/import-settings";
import { getIntegrationConnectionById } from "@/lib/integrations/core/connection-service";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const updateIntegrationConnectionSchema = z.object({
  importSettings: integrationImportSettingsSchema,
});

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const parsed = updateIntegrationConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      "Invalid integration import settings payload",
      parsed.error.flatten(),
    );
  }

  return withBrand(auth.brandId, async (tx) => {
    const connection = await getIntegrationConnectionById(tx, auth.brandId, id);
    if (!connection) {
      return jsonError(404, "not_found", "Integration connection not found");
    }

    const updated = await tx.integrationConnectionV2.update({
      where: { id: connection.id },
      data: {
        importSettingsJson: toJsonValue(parsed.data.importSettings),
      },
      select: {
        id: true,
        brandId: true,
        provider: true,
        status: true,
        externalCompanyId: true,
        externalCompanyName: true,
        externalCompanyDocument: true,
        tokenExpiresAt: true,
        lastSyncAt: true,
        lastSuccessfulSyncAt: true,
        lastSyncError: true,
        importSettingsJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  });
}

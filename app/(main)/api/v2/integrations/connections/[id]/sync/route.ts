import type {
  IntegrationSyncJobMode,
  IntegrationSyncResource,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { getIntegrationConnectionById } from "@/lib/integrations/core/connection-service";
import { triggerIntegrationSyncJob } from "@/lib/integrations/core/sync-jobs";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const resourceValue =
    isPlainObject(body) && typeof body.resource === "string"
      ? body.resource.trim().toUpperCase()
      : "FULL";
  const modeValue =
    isPlainObject(body) && typeof body.mode === "string"
      ? body.mode.trim().toUpperCase()
      : "MANUAL";

  const allowedResources = new Set(["FULL", "PRODUCTS", "CATEGORIES", "IMAGES"]);
  const allowedModes = new Set(["MANUAL", "SCHEDULED", "WEBHOOK"]);

  if (!allowedResources.has(resourceValue)) {
    return jsonError(400, "validation_error", "Unsupported sync resource");
  }

  if (!allowedModes.has(modeValue)) {
    return jsonError(400, "validation_error", "Unsupported sync mode");
  }

  const resource = resourceValue as IntegrationSyncResource;
  const mode = modeValue as IntegrationSyncJobMode;

  return withBrand(auth.brandId, async (tx) => {
    const connection = await getIntegrationConnectionById(tx, auth.brandId, id);
    if (!connection) {
      return jsonError(404, "not_found", "Integration connection not found");
    }

    const result = await triggerIntegrationSyncJob(tx, {
      brandId: auth.brandId,
      connection: {
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
      },
      resource,
      mode,
    });

    if (!result.ok) {
      return jsonError(501, "integration_sync_not_implemented", result.message, {
        jobId: result.jobId,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          jobId: result.jobId,
          status: "SUCCESS",
        },
      },
      { status: 202 },
    );
  });
}

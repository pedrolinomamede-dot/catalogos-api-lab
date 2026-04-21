import { NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { getIntegrationProvider } from "@/lib/integrations/core/providers";
import { createSignedIntegrationState } from "@/lib/integrations/core/secrets";
import { isIntegrationProviderName } from "@/lib/integrations/core/types";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const connections = await tx.integrationConnectionV2.findMany({
      where: { brandId: auth.brandId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: connections });
  });
}

export async function POST(request: Request) {
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

  if (!isPlainObject(body) || typeof body.provider !== "string") {
    return jsonError(400, "validation_error", "provider is required");
  }

  const providerKey = body.provider.trim().toUpperCase();
  if (!isIntegrationProviderName(providerKey)) {
    return jsonError(400, "validation_error", "Unsupported integration provider");
  }

  const provider = getIntegrationProvider(providerKey);
  if (!provider) {
    return jsonError(404, "not_found", "Integration provider not found");
  }

  if (!provider.descriptor.supportsOauth || !provider.getAuthorizationUrl) {
    return jsonError(
      501,
      "integration_connect_not_supported",
      "This integration provider does not support OAuth connect yet.",
    );
  }

  if (!provider.descriptor.configured) {
    return jsonError(
      503,
      "integration_not_configured",
      "Integration provider is not configured on the server.",
    );
  }

  if (providerKey === "VAREJONLINE") {
    const brand = await withBrand(auth.brandId, (tx) =>
      tx.brand.findUnique({
        where: { id: auth.brandId },
        select: { cnpj: true },
      }),
    );

    if (!brand?.cnpj) {
      return jsonError(
        409,
        "brand_cnpj_required",
        "Configure o CNPJ do cliente antes de conectar a Varejonline.",
      );
    }
  }

  try {
    const state = createSignedIntegrationState({
      brandId: auth.brandId,
      provider: providerKey,
      issuedAt: Date.now(),
    });
    const authorizationUrl = await provider.getAuthorizationUrl(state);
    return NextResponse.json({
      ok: true,
      data: {
        connection: null,
        authorizationUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start integration connect flow";
    return jsonError(500, "integration_connect_failed", message);
  }
}

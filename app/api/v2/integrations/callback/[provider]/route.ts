import { NextResponse } from "next/server";

import { requireUser } from "@/lib/authz";
import { upsertOAuthIntegrationConnection } from "@/lib/integrations/core/connection-service";
import { getIntegrationProvider } from "@/lib/integrations/core/providers";
import {
  isIntegrationProviderName,
  type IntegrationProviderName,
} from "@/lib/integrations/core/types";
import { verifySignedIntegrationState } from "@/lib/integrations/core/secrets";
import { withBrand } from "@/lib/prisma";
import { cnpjMatches, normalizeCnpj } from "@/lib/utils/cnpj";
import { jsonError } from "@/lib/utils/errors";

function buildRedirectUrl(request: Request, search: Record<string, string>) {
  const url = new URL("/dashboard/integrations", request.url);
  Object.entries(search).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await context.params;
  const providerKey = providerParam.trim().toUpperCase();

  if (!isIntegrationProviderName(providerKey)) {
    return jsonError(404, "not_found", "Integration provider not found");
  }

  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      buildRedirectUrl(request, {
        error: "integration_authorization_failed",
        provider: providerKey,
      }),
    );
  }

  if (!code || !stateToken) {
    return jsonError(400, "validation_error", "OAuth callback is missing code or state");
  }

  let state;
  try {
    state = verifySignedIntegrationState(stateToken);
  } catch {
    return jsonError(400, "validation_error", "Invalid integration state");
  }

  if (state.brandId !== auth.brandId || state.provider !== providerKey) {
    return jsonError(403, "forbidden", "Integration callback does not match current brand");
  }

  const provider = getIntegrationProvider(providerKey as IntegrationProviderName);
  if (!provider?.exchangeCode) {
    return jsonError(501, "integration_connect_not_supported", "Provider does not support OAuth callback");
  }

  try {
    const tokens = await provider.exchangeCode(code);
    await withBrand(auth.brandId, async (tx) => {
      const brand = await tx.brand.findUnique({
        where: { id: auth.brandId },
        select: { cnpj: true },
      });
      const externalCompanyDocument = normalizeCnpj(
        tokens.externalCompanyDocument,
      );

      if (providerKey === "VAREJONLINE") {
        if (!brand?.cnpj) {
          throw new Error(
            "Configure o CNPJ do cliente antes de conectar a Varejonline.",
          );
        }

        if (!externalCompanyDocument) {
          throw new Error(
            "A Varejonline nao retornou o CNPJ da empresa autorizada.",
          );
        }

        if (!cnpjMatches(brand.cnpj, externalCompanyDocument)) {
          throw new Error(
            "O CNPJ autorizado na Varejonline nao corresponde ao CNPJ cadastrado neste cliente.",
          );
        }
      }

      await upsertOAuthIntegrationConnection(tx, {
        brandId: auth.brandId,
        provider: providerKey,
        tokens: {
          ...tokens,
          externalCompanyDocument,
        },
      });

      await tx.brand.update({
        where: { id: auth.brandId },
        data: { integrationMode: "INTEGRATION" },
      });
    });

    return NextResponse.redirect(
      buildRedirectUrl(request, {
        connected: "1",
        provider: providerKey,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete integration callback";
    return NextResponse.redirect(
      buildRedirectUrl(request, {
        error: "integration_callback_failed",
        message,
        provider: providerKey,
      }),
    );
  }
}

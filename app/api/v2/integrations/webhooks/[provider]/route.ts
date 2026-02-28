import { NextResponse } from "next/server";

import { getIntegrationProvider } from "@/lib/integrations/core/providers";
import {
  isIntegrationProviderName,
  type IntegrationProviderName,
} from "@/lib/integrations/core/types";
import { jsonError } from "@/lib/utils/errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await context.params;
  const providerKey = providerParam.trim().toUpperCase();

  if (!isIntegrationProviderName(providerKey)) {
    return jsonError(404, "not_found", "Integration provider not found");
  }

  const provider = getIntegrationProvider(providerKey as IntegrationProviderName);
  if (!provider?.handleWebhook || !provider.descriptor.supportsWebhook) {
    return jsonError(
      501,
      "integration_webhook_not_supported",
      "Webhook is not implemented for this provider yet.",
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  await provider.handleWebhook(payload);
  return NextResponse.json({ ok: true });
}

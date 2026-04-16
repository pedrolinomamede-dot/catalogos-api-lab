import type { IntegrationAuthTokens } from "@/lib/integrations/core/types";

const VAREJONLINE_AUTHORIZATION_URL =
  "https://integrador.varejonline.com.br/apps/oauth/authorization";
const VAREJONLINE_TOKEN_URL = "https://erp.varejonline.com.br/apps/oauth/token";

function getConfig() {
  const clientId =
    process.env.VAREJONLINE_CLIENT_ID?.trim() ||
    process.env.VAREJONLINE_APP_ID?.trim();
  const clientSecret =
    process.env.VAREJONLINE_CLIENT_SECRET?.trim() ||
    process.env.VAREJONLINE_APP_SECRET?.trim();
  const redirectUri = process.env.VAREJONLINE_REDIRECT_URI?.trim();

  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret && redirectUri),
  };
}

export function isVarejonlineConfigured() {
  return getConfig().configured;
}

export async function getVarejonlineAuthorizationUrl(state: string) {
  const config = getConfig();
  if (!config.configured || !config.clientId || !config.redirectUri) {
    throw new Error("Varejonline OAuth is not configured");
  }

  const url = new URL(VAREJONLINE_AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeVarejonlineCode(code: string): Promise<IntegrationAuthTokens> {
  const config = getConfig();
  if (
    !config.configured ||
    !config.clientId ||
    !config.clientSecret ||
    !config.redirectUri
  ) {
    throw new Error("Varejonline OAuth is not configured");
  }

  const response = await fetch(VAREJONLINE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok || !payload) {
    throw new Error("Varejonline token exchange failed");
  }

  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : null;

  if (!accessToken) {
    throw new Error("Varejonline token exchange returned no access token");
  }

  return {
    accessToken,
    refreshToken:
      typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    expiresIn:
      typeof payload.expires_in === "number" ? payload.expires_in : null,
    externalCompanyId:
      typeof payload.id_terceiro === "string"
        ? payload.id_terceiro
        : payload.id_terceiro != null
          ? String(payload.id_terceiro)
          : null,
    externalCompanyName:
      typeof payload.nome_terceiro === "string" ? payload.nome_terceiro : null,
    externalCompanyDocument:
      typeof payload.cnpj_empresa === "string" ? payload.cnpj_empresa : null,
  };
}

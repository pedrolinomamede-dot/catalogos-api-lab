import type {
  IntegrationConnectionStatus,
  IntegrationProvider,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { encryptSecret } from "@/lib/integrations/core/secrets";
import type { IntegrationAuthTokens } from "@/lib/integrations/core/types";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function getIntegrationConnectionById(
  tx: Tx,
  brandId: string,
  connectionId: string,
) {
  return tx.integrationConnectionV2.findFirst({
    where: {
      id: connectionId,
      brandId,
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
}

export async function upsertOAuthIntegrationConnection(
  tx: Tx,
  input: {
    brandId: string;
    provider: IntegrationProvider;
    tokens: IntegrationAuthTokens;
    status?: IntegrationConnectionStatus;
  },
) {
  const status = input.status ?? "CONNECTED";
  const tokenExpiresAt =
    typeof input.tokens.expiresIn === "number" && input.tokens.expiresIn > 0
      ? new Date(Date.now() + input.tokens.expiresIn * 1000)
      : null;

  return tx.integrationConnectionV2.upsert({
    where: {
      brandId_provider: {
        brandId: input.brandId,
        provider: input.provider,
      },
    },
    create: {
      brandId: input.brandId,
      provider: input.provider,
      status,
      externalCompanyId: input.tokens.externalCompanyId ?? null,
      externalCompanyName: input.tokens.externalCompanyName ?? null,
      externalCompanyDocument: input.tokens.externalCompanyDocument ?? null,
      accessTokenEncrypted: encryptSecret(input.tokens.accessToken),
      refreshTokenEncrypted: input.tokens.refreshToken
        ? encryptSecret(input.tokens.refreshToken)
        : null,
      tokenExpiresAt,
      lastSyncError: null,
    },
    update: {
      status,
      externalCompanyId: input.tokens.externalCompanyId ?? null,
      externalCompanyName: input.tokens.externalCompanyName ?? null,
      externalCompanyDocument: input.tokens.externalCompanyDocument ?? null,
      accessTokenEncrypted: encryptSecret(input.tokens.accessToken),
      refreshTokenEncrypted: input.tokens.refreshToken
        ? encryptSecret(input.tokens.refreshToken)
        : null,
      tokenExpiresAt,
      lastSyncError: null,
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
}

export async function disconnectIntegrationConnection(
  tx: Tx,
  input: {
    brandId: string;
    connectionId: string;
  },
) {
  const connection = await tx.integrationConnectionV2.findFirst({
    where: {
      id: input.connectionId,
      brandId: input.brandId,
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    return null;
  }

  return tx.integrationConnectionV2.update({
    where: { id: connection.id },
    data: {
      status: "DISCONNECTED",
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      tokenExpiresAt: null,
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
}

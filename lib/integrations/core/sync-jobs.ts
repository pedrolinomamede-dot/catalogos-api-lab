import type {
  IntegrationConnectionV2,
  IntegrationSyncJobMode,
  IntegrationSyncResource,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { getIntegrationProvider } from "@/lib/integrations/core/providers";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function listIntegrationJobs(
  tx: Tx,
  input: {
    brandId: string;
    connectionId: string;
    take: number;
    skip: number;
  },
) {
  const where = {
    brandId: input.brandId,
    integrationConnectionId: input.connectionId,
  } as const;

  const [items, total] = await Promise.all([
    tx.integrationSyncJobV2.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: input.take,
      skip: input.skip,
    }),
    tx.integrationSyncJobV2.count({ where }),
  ]);

  return { items, total };
}

export async function triggerIntegrationSyncJob(
  tx: Tx,
  input: {
    brandId: string;
    connection: Pick<IntegrationConnectionV2, "id" | "provider" | "status">;
    resource: IntegrationSyncResource;
    mode: IntegrationSyncJobMode;
  },
) {
  const startedAt = new Date();
  const provider = getIntegrationProvider(input.connection.provider);

  const job = await tx.integrationSyncJobV2.create({
    data: {
      brandId: input.brandId,
      integrationConnectionId: input.connection.id,
      provider: input.connection.provider,
      resource: input.resource,
      mode: input.mode,
      status: "RUNNING",
      startedAt,
    },
  });

  const syncUnsupportedMessage =
    !provider || !provider.descriptor.supportsSync || !provider.syncProducts
      ? `${input.connection.provider} sync is not implemented yet.`
      : null;

  if (syncUnsupportedMessage) {
    const finishedAt = new Date();
    const errorJson = {
      message: syncUnsupportedMessage,
      provider: input.connection.provider,
      resource: input.resource,
    };

    await Promise.all([
      tx.integrationSyncJobV2.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt,
          errorJson,
        },
      }),
      tx.integrationConnectionV2.update({
        where: { id: input.connection.id },
        data: {
          status: input.connection.status,
          lastSyncAt: startedAt,
          lastSyncError: syncUnsupportedMessage,
        },
      }),
    ]);

    return {
      ok: false as const,
      message: syncUnsupportedMessage,
      jobId: job.id,
    };
  }

  await tx.integrationSyncJobV2.update({
    where: { id: job.id },
    data: {
      status: "SUCCESS",
      finishedAt: new Date(),
      statsJson: {
        message: "Sync completed with provider stub.",
      },
    },
  });

  await tx.integrationConnectionV2.update({
    where: { id: input.connection.id },
    data: {
      status: "CONNECTED",
      lastSyncAt: startedAt,
      lastSuccessfulSyncAt: new Date(),
      lastSyncError: null,
    },
  });

  return {
    ok: true as const,
    jobId: job.id,
  };
}

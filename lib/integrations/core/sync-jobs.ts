import type {
  IntegrationSyncJobMode,
  IntegrationSyncResource,
} from "@prisma/client";

import { getIntegrationProvider } from "@/lib/integrations/core/providers";
import { withBrand } from "@/lib/prisma";

type Tx = Parameters<Parameters<typeof withBrand>[1]>[0];

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
  input: {
    brandId: string;
    connectionId: string;
    resource: IntegrationSyncResource;
    mode: IntegrationSyncJobMode;
  },
) {
  const startedAt = new Date();
  const setup = await withBrand(input.brandId, async (tx) => {
    const connection = await tx.integrationConnectionV2.findFirst({
      where: {
        id: input.connectionId,
        brandId: input.brandId,
      },
      select: {
        id: true,
        provider: true,
        status: true,
        accessTokenEncrypted: true,
        refreshTokenEncrypted: true,
      },
    });

    if (!connection) {
      return null;
    }

    const job = await tx.integrationSyncJobV2.create({
      data: {
        brandId: input.brandId,
        integrationConnectionId: connection.id,
        provider: connection.provider,
        resource: input.resource,
        mode: input.mode,
        status: "RUNNING",
        startedAt,
      },
    });

    return { connection, job };
  });

  if (!setup) {
    return {
      ok: false as const,
      statusCode: 404,
      message: "Integration connection not found",
    };
  }

  const { connection, job } = setup;
  const provider = getIntegrationProvider(connection.provider);
  if (!provider || !provider.descriptor.supportsSync || !provider.syncProducts) {
    const syncUnsupportedMessage = `${connection.provider} sync is not implemented yet.`;
    const finishedAt = new Date();
    const errorJson = {
      message: syncUnsupportedMessage,
      provider: connection.provider,
      resource: input.resource,
    };

    await withBrand(input.brandId, async (tx) => {
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
          where: { id: connection.id },
          data: {
            status: connection.status,
            lastSyncAt: startedAt,
            lastSyncError: syncUnsupportedMessage,
          },
        }),
      ]);
    });

    return {
      ok: false as const,
      statusCode: 501,
      message: syncUnsupportedMessage,
      jobId: job.id,
    };
  }

  const syncProducts = provider.syncProducts;

  try {
    const stats = await syncProducts({
      brandId: input.brandId,
      connection,
      resource: input.resource,
      mode: input.mode,
    });
    const finishedAt = new Date();

    await withBrand(input.brandId, async (tx) => {
      await tx.integrationSyncJobV2.update({
        where: { id: job.id },
        data: {
          status: "SUCCESS",
          finishedAt,
          statsJson: stats,
        },
      });

      await tx.integrationConnectionV2.update({
        where: { id: connection.id },
        data: {
          status: "CONNECTED",
          lastSyncAt: startedAt,
          lastSuccessfulSyncAt: finishedAt,
          lastSyncError: null,
        },
      });
    });

    return {
      ok: true as const,
      jobId: job.id,
      stats,
    };
  } catch (error) {
    const finishedAt = new Date();
    const message =
      error instanceof Error ? error.message : "Integration sync failed";
    const errorJson = {
      message,
      provider: connection.provider,
      resource: input.resource,
    };

    await withBrand(input.brandId, async (tx) => {
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
          where: { id: connection.id },
          data: {
            status: connection.status,
            lastSyncAt: startedAt,
            lastSyncError: message,
          },
        }),
      ]);
    });

    return {
      ok: false as const,
      statusCode: 500,
      message,
      jobId: job.id,
    };
  }
}

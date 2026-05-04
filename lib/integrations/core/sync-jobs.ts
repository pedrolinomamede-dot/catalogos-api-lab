import type {
  IntegrationSyncJobMode,
  IntegrationSyncResource,
} from "@prisma/client";

import { getIntegrationProvider } from "@/lib/integrations/core/providers";
import type {
  IntegrationSyncConnectionContext,
  IntegrationSyncStats,
} from "@/lib/integrations/core/types";
import { getIntegrationImportSettingsSyncError } from "@/lib/integrations/core/import-settings";
import { prisma, withBrand } from "@/lib/prisma";

async function updateJobProgress(jobId: string, stats: IntegrationSyncStats) {
  try {
    await prisma.integrationSyncJobV2.update({
      where: { id: jobId },
      data: { statsJson: stats as unknown as never },
    });
  } catch {
    // progress updates are best-effort — never interrupt the sync
  }
}

type Tx = Parameters<Parameters<typeof withBrand>[1]>[0];

type TriggerSyncJobInput = {
  brandId: string;
  connectionId: string;
  resource: IntegrationSyncResource;
  mode: IntegrationSyncJobMode;
  background?: boolean;
};

type SyncJobSetup = {
  connection: IntegrationSyncConnectionContext;
  job: {
    id: string;
  };
  startedAt: Date;
};

function getErrorStatusCode(error: unknown) {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number") {
      return statusCode;
    }
  }
  return 500;
}

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

async function createSyncJobSetup(input: TriggerSyncJobInput) {
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
        importSettingsJson: true,
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

    return { connection, job: { id: job.id }, startedAt };
  });

  if (!setup) {
    return {
      ok: false as const,
      statusCode: 404,
      message: "Integration connection not found",
    };
  }

  return {
    ok: true as const,
    setup,
  };
}

async function runIntegrationSyncJob(
  input: TriggerSyncJobInput,
  setup: SyncJobSetup,
): Promise<
  | {
      ok: true;
      jobId: string;
      status: "SUCCESS" | "PARTIAL";
      stats: IntegrationSyncStats;
    }
  | {
      ok: false;
      statusCode: number;
      message: string;
      jobId: string;
    }
> {
  const { connection, job, startedAt } = setup;
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
      onProgress: (currentStats) => updateJobProgress(job.id, currentStats),
    });
    const finishedAt = new Date();
    const hasSuccessfulItems = stats.created + stats.updated + stats.skipped > 0;
    const jobStatus =
      stats.failed > 0 && hasSuccessfulItems ? "PARTIAL" : "SUCCESS";

    await withBrand(input.brandId, async (tx) => {
      await tx.integrationSyncJobV2.update({
        where: { id: job.id },
        data: {
          status: jobStatus,
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

    if (stats.failed > 0 && !hasSuccessfulItems) {
      const message = "All synchronized products failed during processing.";

      await withBrand(input.brandId, async (tx) => {
        await Promise.all([
          tx.integrationSyncJobV2.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              errorJson: {
                message,
                provider: connection.provider,
                resource: input.resource,
              },
            },
          }),
          tx.integrationConnectionV2.update({
            where: { id: connection.id },
            data: {
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

    return {
      ok: true as const,
      jobId: job.id,
      status: jobStatus,
      stats,
    };
  } catch (error) {
    const finishedAt = new Date();
    const message =
      error instanceof Error ? error.message : "Integration sync failed";
    const statusCode = getErrorStatusCode(error);
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
      statusCode,
      message,
      jobId: job.id,
    };
  }
}

export async function triggerIntegrationSyncJob(input: TriggerSyncJobInput) {
  const setupResult = await createSyncJobSetup(input);
  if (!setupResult.ok) {
    return setupResult;
  }

  const validationMessage = getIntegrationImportSettingsSyncError(
    setupResult.setup.connection.importSettingsJson,
  );
  if (validationMessage) {
    const { connection, job, startedAt } = setupResult.setup;
    const finishedAt = new Date();
    const errorJson = {
      message: validationMessage,
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
            lastSyncError: validationMessage,
          },
        }),
      ]);
    });

    return {
      ok: false as const,
      statusCode: 400,
      message: validationMessage,
      jobId: job.id,
    };
  }

  if (input.background) {
    void runIntegrationSyncJob(input, setupResult.setup).catch((error) => {
      console.error("Background integration sync failed", error);
    });

    return {
      ok: true as const,
      jobId: setupResult.setup.job.id,
      status: "RUNNING" as const,
    };
  }

  return runIntegrationSyncJob(input, setupResult.setup);
}

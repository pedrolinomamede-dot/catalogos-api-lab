"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  IntegrationConnectionV2,
  IntegrationProvider,
  IntegrationProviderDescriptor,
} from "@/types/api";

import { EmptyState } from "@/components/admin/empty-state";
import { IntegrationImportSettingsDialog } from "@/components/admin/integration-import-settings-dialog";
import { LoadingState } from "@/components/admin/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api/error";
import {
  useCancelIntegrationSyncJobV2,
  useCreateIntegrationConnectionV2,
  useDisconnectIntegrationConnectionV2,
  useIntegrationConnectionJobs,
  useIntegrationConnections,
  useIntegrationProviders,
  useSyncIntegrationConnectionV2,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

function formatDuration(ms: number) {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function parseStats(statsJson: unknown) {
  if (!statsJson || typeof statsJson !== "object") return null;
  const s = statsJson as Record<string, unknown>;
  return {
    fetched: typeof s.fetched === "number" ? s.fetched : null,
    created: typeof s.created === "number" ? s.created : null,
    updated: typeof s.updated === "number" ? s.updated : null,
    skipped: typeof s.skipped === "number" ? s.skipped : null,
    failed: typeof s.failed === "number" ? s.failed : null,
  };
}

function parseErrorMessage(errorJson: unknown): string | null {
  if (!errorJson || typeof errorJson !== "object") return null;
  const e = errorJson as Record<string, unknown>;
  return typeof e.message === "string" ? e.message : null;
}

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStatusVariant(status: IntegrationConnectionV2["status"]) {
  switch (status) {
    case "CONNECTED":
      return "default" as const;
    case "ERROR":
    case "EXPIRED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function getStatusLabel(status: IntegrationConnectionV2["status"]) {
  switch (status) {
    case "CONNECTED":
      return "Conectado";
    case "EXPIRED":
      return "Expirado";
    case "ERROR":
      return "Erro";
    case "DISCONNECTED":
      return "Desconectado";
    default:
      return status;
  }
}

function getProviderCapabilities(provider: IntegrationProviderDescriptor) {
  const labels = [];
  if (provider.capabilities.products) labels.push("Produtos");
  if (provider.capabilities.categories) labels.push("Categorias");
  if (provider.capabilities.images) labels.push("Imagens");
  if (provider.capabilities.price) labels.push("Preco");
  if (provider.capabilities.stock) labels.push("Estoque");
  return labels;
}

function IntegrationJobsPreview({ connectionId }: { connectionId: string }) {
  const { data, isLoading, isError, refetch } = useIntegrationConnectionJobs(
    connectionId,
    {
      page: 1,
      pageSize: 5,
    },
  );

  const cancelMutation = useCancelIntegrationSyncJobV2();
  const [now, setNow] = useState(() => Date.now());

  const jobs = Array.isArray(data) ? data : data?.data ?? [];
  const hasRunningJob = jobs.some((job) => job.status === "RUNNING");

  async function handleCancel(jobId: string) {
    try {
      const result = await cancelMutation.mutateAsync({ connectionId, jobId });
      toastSuccess(
        result.status === "ALREADY_FINISHED"
          ? "Job ja havia finalizado"
          : "Cancelamento solicitado. A sincronizacao para no proximo lote.",
      );
      refetch();
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  }

  useEffect(() => {
    if (!hasRunningJob) {
      return;
    }

    const pollTimer = window.setInterval(() => {
      refetch();
    }, 5000);

    const tickTimer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(pollTimer);
      window.clearInterval(tickTimer);
    };
  }, [hasRunningJob, refetch]);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Carregando historico...</p>;
  }

  if (isError) {
    return <p className="text-xs text-muted-foreground">Nao foi possivel carregar o historico.</p>;
  }

  if (!jobs.length) {
    return <p className="text-xs text-muted-foreground">Nenhum job de sincronizacao registrado ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const stats = parseStats(job.statsJson);
        const errorMessage = parseErrorMessage(job.errorJson);
        const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null;
        const finishedAt = job.finishedAt ? new Date(job.finishedAt).getTime() : null;
        const updatedAt = job.updatedAt ? new Date(job.updatedAt).getTime() : null;
        const durationMs = startedAt
          ? (finishedAt ?? now) - startedAt
          : null;
        const lastUpdateMs = updatedAt ? now - updatedAt : null;
        const isStuck =
          job.status === "RUNNING" &&
          startedAt !== null &&
          now - startedAt > 4 * 60_000 &&
          lastUpdateMs !== null &&
          lastUpdateMs > 4 * 60_000;

        return (
          <div key={job.id} className="rounded-md border px-3 py-2 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{job.resource}</span>
              <Badge
                variant={
                  job.status === "SUCCESS"
                    ? "default"
                    : job.status === "FAILED"
                      ? "destructive"
                      : "outline"
                }
              >
                {job.status}
              </Badge>
              {durationMs !== null && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(durationMs)}
                </span>
              )}
              {isStuck && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                  Sem atualiz. ha {formatDuration(lastUpdateMs ?? 0)}
                </Badge>
              )}
              {job.status === "RUNNING" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancel(job.id)}
                  disabled={cancelMutation.isPending}
                >
                  Parar
                </Button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(job.startedAt ?? job.createdAt)}
              </span>
            </div>
            {stats && (
              <p className="text-xs text-muted-foreground">
                {[
                  stats.fetched !== null && `fetched ${stats.fetched}`,
                  stats.created !== null && `criados ${stats.created}`,
                  stats.updated !== null && `atualizados ${stats.updated}`,
                  stats.skipped !== null && stats.skipped > 0 && `pulados ${stats.skipped}`,
                  stats.failed !== null && stats.failed > 0 && `falhas ${stats.failed}`,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
            {errorMessage && (
              <p className="text-xs text-destructive truncate" title={errorMessage}>
                {errorMessage}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

type ProviderCardProps = {
  provider: IntegrationProviderDescriptor;
  connection?: IntegrationConnectionV2 | null;
  onConnect: (provider: IntegrationProvider) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
  onConfigureImportSettings: (connection: IntegrationConnectionV2) => void;
  onSync: (connectionId: string) => Promise<void>;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isSyncing: boolean;
};

function ProviderCard({
  provider,
  connection,
  onConnect,
  onDisconnect,
  onConfigureImportSettings,
  onSync,
  isConnecting,
  isDisconnecting,
  isSyncing,
}: ProviderCardProps) {
  const capabilities = getProviderCapabilities(provider);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{provider.label}</h3>
            <Badge variant={provider.configured ? "outline" : "destructive"}>
              {provider.configured ? "Configurado" : "Nao configurado"}
            </Badge>
            <Badge variant={provider.supportsOauth ? "outline" : "secondary"}>
              {provider.supportsOauth ? "OAuth" : "Manual"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {connection
              ? `Conexao ativa para este provider.`
              : "Nenhuma conexao ativa para este provider."}
          </p>
        </div>
        {connection ? (
          <Badge variant={getStatusVariant(connection.status)}>
            {getStatusLabel(connection.status)}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {capabilities.length ? (
          capabilities.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma capability habilitada ainda.</p>
        )}
      </div>

      {connection ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Empresa:</span>{" "}
            {connection.externalCompanyName || connection.externalCompanyDocument || "-"}
          </p>
          <p>
            <span className="font-medium text-foreground">Token expira:</span>{" "}
            {formatDate(connection.tokenExpiresAt)}
          </p>
          <p>
            <span className="font-medium text-foreground">Ultima sync:</span>{" "}
            {formatDate(connection.lastSuccessfulSyncAt ?? connection.lastSyncAt)}
          </p>
          {connection.lastSyncError ? (
            <p className="text-destructive">
              <span className="font-medium">Ultimo erro:</span> {connection.lastSyncError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {connection ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConnect(provider.provider)}
              disabled={!provider.configured || isConnecting}
            >
              Reconectar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSync(connection.id)}
              disabled={!provider.supportsSync || isSyncing}
            >
              {provider.supportsSync ? "Sincronizar agora" : "Sync indisponivel"}
            </Button>
            {provider.provider === "VAREJONLINE" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigureImportSettings(connection)}
              >
                Configurar leitura
              </Button>
            ) : null}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDisconnect(connection.id)}
              disabled={isDisconnecting}
            >
              Desconectar
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => onConnect(provider.provider)}
            disabled={!provider.configured || !provider.supportsOauth || isConnecting}
          >
            Conectar
          </Button>
        )}
      </div>

      {connection ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Historico recente</h4>
          <IntegrationJobsPreview connectionId={connection.id} />
        </div>
      ) : null}
    </Card>
  );
}

export function IntegrationsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settingsConnection, setSettingsConnection] =
    useState<IntegrationConnectionV2 | null>(null);
  const {
    data: providers,
    isLoading: isLoadingProviders,
    isError: isProvidersError,
    error: providersError,
    refetch: refetchProviders,
  } = useIntegrationProviders();
  const {
    data: connections,
    isLoading: isLoadingConnections,
    isError: isConnectionsError,
    error: connectionsError,
    refetch: refetchConnections,
  } = useIntegrationConnections();

  const createConnectionMutation = useCreateIntegrationConnectionV2();
  const disconnectMutation = useDisconnectIntegrationConnectionV2();
  const syncMutation = useSyncIntegrationConnectionV2();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    const provider = searchParams.get("provider");

    if (!connected && !error) {
      return;
    }

    if (connected === "1") {
      toastSuccess(`Integracao${provider ? ` ${provider}` : ""} conectada`);
    } else if (error) {
      toastError(
        "Falha na integracao",
        message ?? `Nao foi possivel concluir a integracao${provider ? ` ${provider}` : ""}.`,
      );
    }

    router.replace("/dashboard/integrations");
  }, [router, searchParams]);

  const providerMap = useMemo(() => {
    const map = new Map<IntegrationProvider, IntegrationConnectionV2>();
    (connections ?? []).forEach((connection) => {
      map.set(connection.provider, connection);
    });
    return map;
  }, [connections]);

  async function handleConnect(provider: IntegrationProvider) {
    try {
      const result = await createConnectionMutation.mutateAsync({ provider });
      if (!result.authorizationUrl) {
        toastError("Conexao indisponivel", "O provider nao retornou URL de autorizacao.");
        return;
      }
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  }

  async function handleDisconnect(connectionId: string) {
    try {
      await disconnectMutation.mutateAsync(connectionId);
      toastSuccess("Integracao desconectada");
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  }

  async function handleSync(connectionId: string) {
    try {
      const result = await syncMutation.mutateAsync({
        connectionId,
        body: {
          resource: "FULL",
          mode: "MANUAL",
        },
      });
      toastSuccess(`Sincronizacao iniciada (${result.status})`);
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  }

  if (isLoadingProviders || isLoadingConnections) {
    return <LoadingState label="Carregando integracoes" />;
  }

  if (isProvidersError || isConnectionsError) {
    const message = getErrorMessage(providersError ?? connectionsError);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar integracoes."}
        action={
          <Button
            variant="outline"
            onClick={() => {
              refetchProviders();
              refetchConnections();
            }}
          >
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!providers?.length) {
    return (
      <EmptyState
        title="Nenhum provider registrado"
        description="Cadastre ao menos um provider de integracao para continuar."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Modelo hibrido por marca</h3>
          <p className="text-sm text-muted-foreground">
            A Base Geral continua aceitando CSV/manual. Providers de ERP alimentam a mesma base local
            e os catalogos seguem sendo publicados via snapshot.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.provider}
            provider={provider}
            connection={providerMap.get(provider.provider) ?? null}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onConfigureImportSettings={setSettingsConnection}
            onSync={handleSync}
            isConnecting={createConnectionMutation.isPending}
            isDisconnecting={disconnectMutation.isPending}
            isSyncing={syncMutation.isPending}
          />
        ))}
      </div>

      <IntegrationImportSettingsDialog
        connection={settingsConnection}
        open={Boolean(settingsConnection)}
        onOpenChange={(open) => {
          if (!open) {
            setSettingsConnection(null);
          }
        }}
      />
    </div>
  );
}

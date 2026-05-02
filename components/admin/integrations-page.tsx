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
  useCreateIntegrationConnectionV2,
  useDisconnectIntegrationConnectionV2,
  useIntegrationConnectionJobs,
  useIntegrationConnections,
  useIntegrationProviders,
  useSyncIntegrationConnectionV2,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

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

  const jobs = Array.isArray(data) ? data : data?.data ?? [];
  const hasRunningJob = jobs.some((job) => job.status === "RUNNING");

  useEffect(() => {
    if (!hasRunningJob) {
      return;
    }

    const timer = window.setInterval(() => {
      refetch();
    }, 5000);

    return () => window.clearInterval(timer);
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recurso</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Inicio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="text-xs">{job.resource}</TableCell>
            <TableCell>
              <Badge variant={job.status === "SUCCESS" ? "default" : job.status === "FAILED" ? "destructive" : "outline"}>
                {job.status}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDate(job.startedAt ?? job.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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

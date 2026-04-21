"use client";

import { useMemo, useState } from "react";

import type { PlatformTenantSummary } from "@/types/api";

import { EmptyState } from "@/components/admin/empty-state";
import { LoadingState } from "@/components/admin/loading-state";
import { PlatformTenantFormDialog } from "@/components/admin/platform-tenant-form-dialog";
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
import { usePlatformTenants, useUpdatePlatformTenantStatusV2 } from "@/lib/api/hooks";
import { formatCnpj } from "@/lib/utils/cnpj";
import { toastError, toastSuccess } from "@/lib/ui/toast";

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function PlatformTenantsPageClient() {
  const { data, isLoading, isError, error, refetch } = usePlatformTenants();
  const updateStatus = useUpdatePlatformTenantStatusV2();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);

  const tenants = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  if (isLoading) {
    return <LoadingState label="Carregando clientes" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar os clientes."}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  async function handleToggleTenant(tenant: PlatformTenantSummary) {
    setPendingTenantId(tenant.id);
    try {
      const nextIsActive = !tenant.isActive;
      await updateStatus.mutateAsync({
        id: tenant.id,
        data: { isActive: nextIsActive },
      });

      toastSuccess(
        nextIsActive ? "Cliente reativado" : "Cliente suspenso",
        tenant.name,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    } finally {
      setPendingTenantId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>Novo cliente</Button>
      </div>

      {!tenants.length ? (
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="Crie o primeiro tenant da plataforma para liberar um ambiente zerado ao cliente."
          action={<Button onClick={() => setDialogOpen(true)}>Criar primeiro cliente</Button>}
        />
      ) : (
        <Card className="space-y-4 p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Links</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Solicitacoes</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const isPending =
                  pendingTenantId === tenant.id && updateStatus.isPending;

                return (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.slug} · {tenant.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CNPJ: {formatCnpj(tenant.cnpj) ?? "nao informado"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.isActive ? "outline" : "secondary"}>
                        {tenant.isActive ? "Ativo" : "Suspenso"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.usersCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.shareLinksCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.orderIntentsCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.productRequestsCount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(tenant.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant={tenant.isActive ? "destructive" : "default"}
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggleTenant(tenant)}
                      >
                        {isPending
                          ? "Salvando..."
                          : tenant.isActive
                            ? "Suspender"
                            : "Reativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <PlatformTenantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

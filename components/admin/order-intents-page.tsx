"use client";

import { useEffect, useMemo, useState } from "react";

import type { MeResponse, OrderIntentChannel, OrderIntentStatus, OrderIntentSummary } from "@/types/api";

import { EmptyState } from "@/components/admin/empty-state";
import { ListPagination } from "@/components/admin/list-pagination";
import { LoadingState } from "@/components/admin/loading-state";
import { Badge } from "@/components/ui/badge";
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
import { useMe, useOrderIntentsV2 } from "@/lib/api/hooks";

const PAGE_SIZE = 50;

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

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "A confirmar";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatChannel(channel: OrderIntentChannel) {
  switch (channel) {
    case "SHARE_LINK":
      return "Share Link";
    case "SITE":
      return "Site";
    default:
      return channel;
  }
}

function formatStatus(status: OrderIntentStatus) {
  switch (status) {
    case "OPEN":
      return "Aberto";
    case "BILLED":
      return "Faturado";
    case "CANCELED":
      return "Cancelado";
    case "EXPIRED":
      return "Expirado";
    default:
      return status;
  }
}

function getStatusBadgeClassName(status: OrderIntentStatus) {
  switch (status) {
    case "OPEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "BILLED":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "CANCELED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "EXPIRED":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "";
  }
}

function getCustomerLabel(orderIntent: OrderIntentSummary) {
  const primary =
    orderIntent.customerName?.trim() ||
    orderIntent.customerWhatsapp?.trim() ||
    orderIntent.customerEmail?.trim() ||
    "Cliente não identificado";
  const secondary =
    orderIntent.customerWhatsapp?.trim() ||
    orderIntent.customerEmail?.trim() ||
    null;

  return { primary, secondary };
}

function getSourceLabel(orderIntent: OrderIntentSummary) {
  if (orderIntent.channel === "SITE") {
    return "Loja pública";
  }

  return orderIntent.shareLinkName?.trim() || "Share link";
}

export function OrderIntentsPageClient() {
  const { data: me, isLoading: isMeLoading, isError: isMeError, error: meError } = useMe();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useOrderIntentsV2({
    page,
    pageSize: PAGE_SIZE,
  });

  const orderIntents = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items;
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? orderIntents.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const showOwner = (me as MeResponse | undefined)?.role === "ADMIN";

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (isMeLoading || isLoading) {
    return <LoadingState label="Carregando pedidos" />;
  }

  if (isMeError) {
    const message = getErrorMessage(meError);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel validar o acesso."}
      />
    );
  }

  if (me?.role !== "ADMIN" && me?.role !== "SELLER") {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Somente administradores e vendedores podem acompanhar pedidos."
      />
    );
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar os pedidos."}
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md border border-input px-3 py-2 text-sm"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  if (!orderIntents.length) {
    return (
      <EmptyState
        title="Nenhum pedido registrado"
        description="As intenções salvas antes do WhatsApp vão aparecer aqui conforme os clientes começarem a interagir."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              {showOwner ? <TableHead>Vendedor</TableHead> : null}
              <TableHead>Canal</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderIntents.map((orderIntent) => {
              const customer = getCustomerLabel(orderIntent);
              return (
                <TableRow key={orderIntent.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {customer.primary}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.secondary ?? orderIntent.id}
                      </p>
                    </div>
                  </TableCell>
                  {showOwner ? (
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {orderIntent.sellerNameSnapshot?.trim() || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {orderIntent.sellerWhatsappSnapshot?.trim() || "-"}
                        </p>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Badge variant="outline">{formatChannel(orderIntent.channel)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {getSourceLabel(orderIntent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {orderIntent.shareLinkSlug?.trim() || orderIntent.id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {orderIntent.itemCount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatCurrency(orderIntent.subtotal)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClassName(orderIntent.status)}
                    >
                      {formatStatus(orderIntent.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(orderIntent.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <ListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}

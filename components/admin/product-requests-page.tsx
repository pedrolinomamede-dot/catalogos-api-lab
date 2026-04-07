"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  MeResponse,
  OrderIntentChannel,
  ProductRequestStatus,
  ProductRequestSummary,
} from "@/types/api";

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
import { useMe, useProductRequestsV2 } from "@/lib/api/hooks";
import { isTenantAdminRole } from "@/lib/roles";

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

function formatStatus(status: ProductRequestStatus) {
  switch (status) {
    case "OPEN":
      return "Aberta";
    case "REVIEWED":
      return "Revisada";
    case "CONTACTED":
      return "Contatada";
    case "RESOLVED":
      return "Resolvida";
    case "DISMISSED":
      return "Descartada";
    default:
      return status;
  }
}

function getStatusBadgeClassName(status: ProductRequestStatus) {
  switch (status) {
    case "OPEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REVIEWED":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "CONTACTED":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "RESOLVED":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "DISMISSED":
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
    default:
      return "";
  }
}

function getCustomerLabel(productRequest: ProductRequestSummary) {
  const primary =
    productRequest.customerProfileName?.trim() ||
    productRequest.contactName?.trim() ||
    productRequest.customerProfileWhatsapp?.trim() ||
    productRequest.contactPhone?.trim() ||
    productRequest.customerProfileEmail?.trim() ||
    productRequest.contactEmail?.trim() ||
    "Cliente não identificado";
  const secondary =
    productRequest.customerProfileWhatsapp?.trim() ||
    productRequest.contactPhone?.trim() ||
    productRequest.customerProfileEmail?.trim() ||
    productRequest.contactEmail?.trim() ||
    null;

  return { primary, secondary };
}

function getSourceLabel(productRequest: ProductRequestSummary) {
  if (productRequest.channel === "SITE") {
    return "Loja pública";
  }

  return productRequest.shareLinkName?.trim() || "Share link";
}

export function ProductRequestsPageClient() {
  const { data: me, isLoading: isMeLoading, isError: isMeError, error: meError } = useMe();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useProductRequestsV2({
    page,
    pageSize: PAGE_SIZE,
  });

  const productRequests = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items;
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? productRequests.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const showOwner = isTenantAdminRole((me as MeResponse | undefined)?.role);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (isMeLoading || isLoading) {
    return <LoadingState label="Carregando solicitações" />;
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

  if (!isTenantAdminRole(me?.role) && me?.role !== "SELLER") {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Somente administradores e vendedores podem acompanhar solicitações de produto."
      />
    );
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar as solicitações."}
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

  if (!productRequests.length) {
    return (
      <EmptyState
        title="Nenhuma solicitação registrada"
        description="Os pedidos de produtos que os clientes não encontrarem nos links públicos vão aparecer aqui."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitação</TableHead>
              <TableHead>Cliente</TableHead>
              {showOwner ? <TableHead>Vendedor</TableHead> : null}
              <TableHead>Canal</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productRequests.map((productRequest) => {
              const customer = getCustomerLabel(productRequest);
              const location = [productRequest.city?.trim(), productRequest.state?.trim()]
                .filter(Boolean)
                .join(" / ");

              return (
                <TableRow key={productRequest.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {productRequest.requestText}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {productRequest.categoryHint?.trim() || "Sem categoria sugerida"}
                        {typeof productRequest.quantityHint === "number"
                          ? ` · Qtde ${productRequest.quantityHint}`
                          : ""}
                        {location ? ` · ${location}` : ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {customer.primary}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.secondary ?? productRequest.id}
                      </p>
                    </div>
                  </TableCell>
                  {showOwner ? (
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {productRequest.ownerUserName?.trim() || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {productRequest.ownerUserWhatsapp?.trim() || "-"}
                        </p>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Badge variant="outline">{formatChannel(productRequest.channel)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {getSourceLabel(productRequest)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {productRequest.shareLinkSlug?.trim() || productRequest.id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClassName(productRequest.status)}
                    >
                      {formatStatus(productRequest.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(productRequest.createdAt)}
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

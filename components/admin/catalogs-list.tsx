"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CatalogV2 } from "@/types/api";

import { CatalogFormDialog } from "@/components/admin/catalog-form-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { ListPagination } from "@/components/admin/list-pagination";
import { LoadingState } from "@/components/admin/loading-state";
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
import { getCatalogDeleteImpactV2 } from "@/lib/api/v2/catalogs";
import type { CatalogDeleteImpact } from "@/lib/api/v2/catalogs";
import { useCatalogsV2, useDeleteCatalogV2 } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const PAGE_SIZE = 100;

export function CatalogsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useCatalogsV2({
    page,
    pageSize: PAGE_SIZE,
  });
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogV2 | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogV2 | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<CatalogDeleteImpact | null>(null);
  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const keepDeleteTargetRef = useRef(false);

  const deleteMutation = useDeleteCatalogV2();

  const catalogs = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items;
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? catalogs.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (isLoading) {
    return <LoadingState label="Carregando catalogos" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar catalogos."}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!catalogs.length) {
    return (
      <EmptyState
        title="Nenhum catalogo encontrado"
        description="Nenhum catalogo cadastrado ate o momento."
      />
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Catalogo</TableHead>
            <TableHead>Descricao</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {catalogs.map((catalog) => (
            <TableRow key={catalog.id}>
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {catalog.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {catalog.id}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {catalog.description || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/catalogs/${catalog.id}`}>Abrir</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCatalog(catalog);
                      setIsEditOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteTarget(catalog);
                      setIsDeleteOpen(true);
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ListPagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={meta?.pageSize ?? PAGE_SIZE}
        isLoading={isLoading}
        onPageChange={setPage}
      />

      <CatalogFormDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedCatalog(null);
          }
        }}
        initialValues={selectedCatalog ?? undefined}
      />
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open && !keepDeleteTargetRef.current) {
            setDeleteTarget(null);
          }
          if (!open) {
            keepDeleteTargetRef.current = false;
          }
        }}
        title="Excluir catalogo"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"?`
            : "Tem certeza que deseja excluir este catalogo?"
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending || isCheckingImpact}
        onConfirm={async () => {
          if (!deleteTarget) {
            return false;
          }
          setIsCheckingImpact(true);
          try {
            const impact = await getCatalogDeleteImpactV2(deleteTarget.id);
            const hasImpact =
              impact.itemsCount > 0 || impact.shareLinksCount > 0;
            if (hasImpact) {
              keepDeleteTargetRef.current = true;
              setDeleteImpact(impact);
              setIsImpactOpen(true);
              return true;
            }

            await deleteMutation.mutateAsync(deleteTarget.id);
            toastSuccess("Catalogo excluido");
            setDeleteTarget(null);
            return true;
          } catch (err) {
            const message = getErrorMessage(err);
            toastError(message.title, message.description ?? "Tente novamente.");
            return false;
          } finally {
            setIsCheckingImpact(false);
          }
        }}
      />
      <ConfirmDialog
        open={isImpactOpen}
        onOpenChange={(open) => {
          setIsImpactOpen(open);
          if (!open) {
            setDeleteImpact(null);
            setDeleteTarget(null);
          }
        }}
        title="Confirmar exclusao com vinculos"
        description={
          deleteImpact
            ? `Este catalogo possui ${deleteImpact.itemsCount} itens e ${deleteImpact.shareLinksCount} vinculos de share link. A exclusao removera esses vinculos. Deseja continuar?`
            : "Este catalogo possui vinculos. Deseja continuar?"
        }
        confirmLabel="Excluir mesmo assim"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return false;
          }
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            toastSuccess("Catalogo excluido");
            setDeleteImpact(null);
            setDeleteTarget(null);
            return true;
          } catch (err) {
            const message = getErrorMessage(err);
            toastError(message.title, message.description ?? "Tente novamente.");
            return false;
          }
        }}
      />
    </Card>
  );
}

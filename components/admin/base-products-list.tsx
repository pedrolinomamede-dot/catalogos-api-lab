"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { BaseProductV2 } from "@/types/api";

import { BaseProductEditDialog } from "@/components/admin/base-product-edit-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { ListPagination } from "@/components/admin/list-pagination";
import { LoadingState } from "@/components/admin/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api/error";
import { queryKeys } from "@/lib/api/query-keys";
import { useBaseProducts, useDeleteBaseProductV2 } from "@/lib/api/hooks";
import { listAllBaseProductIds } from "@/lib/api/v2/base-products";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const PAGE_SIZE = 100;

export function BaseProductsList() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BaseProductV2 | null>(null);
  const [isSelectingSearch, setIsSelectingSearch] = useState(false);
  const [isSelectingAllImported, setIsSelectingAllImported] = useState(false);
  const queryClient = useQueryClient();

  const normalizedQuery = debouncedQuery.trim();

  const { data, isLoading, isError, error, refetch } = useBaseProducts({
    q: normalizedQuery || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const deleteMutation = useDeleteBaseProductV2();

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery]);

  const baseProducts = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items;
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? baseProducts.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const selectedCount = selectedIds.size;
  const allPageSelected =
    baseProducts.length > 0 &&
    baseProducts.every((product) => selectedIds.has(product.id));
  const isSelectingGlobal = isSelectingSearch || isSelectingAllImported;
  const isSelectionActionsDisabled = isDeleting || isSelectingGlobal || isLoading;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const toggleSelection = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        baseProducts.forEach((item) => next.delete(item.id));
      } else {
        baseProducts.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const handleSelectCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      baseProducts.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const handleSelectAllFromSearch = async () => {
    setIsSelectingSearch(true);
    try {
      const ids = await listAllBaseProductIds({
        q: normalizedQuery || undefined,
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      toastSuccess(`${ids.length} produto(s) da busca selecionado(s)`);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Falha ao selecionar todos da busca.");
    } finally {
      setIsSelectingSearch(false);
    }
  };

  const handleSelectAllImported = async () => {
    setIsSelectingAllImported(true);
    try {
      const ids = await listAllBaseProductIds();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      toastSuccess(`${ids.length} produto(s) importado(s) selecionado(s)`);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Falha ao selecionar todos importados.");
    } finally {
      setIsSelectingAllImported(false);
    }
  };

  const handleBulkDelete = async (): Promise<boolean> => {
    if (!selectedIds.size) {
      return false;
    }

    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) => deleteMutation.mutateAsync(id)),
    );
    const failed = results.filter((result) => result.status === "rejected");

    await queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });

    if (failed.length > 0) {
      toastError(
        "Falha ao excluir alguns itens",
        "Revise os produtos e tente novamente.",
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id, index) => {
          if (results[index].status === "fulfilled") {
            next.delete(id);
          }
        });
        return next;
      });
      setIsDeleting(false);
      return false;
    }

    toastSuccess("Produtos excluidos");
    setSelectedIds(new Set());
    setIsDeleting(false);
    setIsBulkDeleteOpen(false);
    return true;
  };

  if (isLoading) {
    return <LoadingState label="Carregando Base Geral" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={
          message.description ?? "Nao foi possivel carregar produtos da Base Geral."
        }
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!baseProducts.length) {
    return (
      <EmptyState
        title="Nenhum produto encontrado"
        description={
          normalizedQuery
            ? "Tente ajustar sua busca para encontrar produtos."
            : "Nenhum produto da Base Geral cadastrado ate o momento."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {selectedCount > 0 ? (
        <Card className="border-dashed">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedCount} selecionado(s)
              </p>
              <p className="text-xs text-muted-foreground">
                Acoes em lote disponiveis apenas para exclusao.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(true)}
              disabled={isDeleting}
            >
              Excluir selecionados
            </Button>
          </div>
        </Card>
      ) : null}

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome, SKU, marca, codigo de barras ou tamanho"
        aria-label="Buscar por nome, SKU, marca, codigo de barras ou tamanho"
        className="max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSelectCurrentPage}
          disabled={isSelectionActionsDisabled}
        >
          Selecionar pagina
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSelectAllFromSearch}
          disabled={isSelectionActionsDisabled}
        >
          {isSelectingSearch ? "Selecionando..." : "Selecionar todos da busca"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSelectAllImported}
          disabled={isSelectionActionsDisabled}
        >
          {isSelectingAllImported ? "Selecionando..." : "Selecionar todos importados"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedIds(new Set())}
          disabled={isSelectionActionsDisabled || selectedCount === 0}
        >
          Limpar selecao
        </Button>
      </div>

      <Card className="space-y-4 p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Selecionar pagina atual"
                  checked={allPageSelected}
                  onChange={toggleCurrentPageSelection}
                  className="h-4 w-4 rounded border border-input"
                />
              </TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Imagem</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baseProducts.map((product) => (
              <TableRow
                key={product.id}
                className={selectedIds.has(product.id) ? "bg-surface-soft" : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelection(product.id)}
                    className="h-4 w-4 rounded border border-input"
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU {product.sku}
                    </p>
                    {product.description ? (
                      <p className="text-xs text-muted-foreground">
                        {product.description}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? "default" : "secondary"}>
                    {product.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={product.imageUrl ? "default" : "secondary"}>
                    {product.imageUrl ? "Com imagem" : "Sem imagem"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingProduct(product)}
                  >
                    Editar
                  </Button>
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
      </Card>

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsBulkDeleteOpen(open);
          }
        }}
        title="Excluir produtos da Base Geral"
        description="Excluir os produtos selecionados? Esta acao nao pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />

      <BaseProductEditDialog
        open={Boolean(editingProduct)}
        baseProduct={editingProduct}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingProduct(null);
          }
        }}
      />
    </div>
  );
}

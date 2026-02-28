"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { BaseProductV2 } from "@/types/api";

import { ListPagination } from "@/components/admin/list-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAddCatalogItemV2, useBaseProducts } from "@/lib/api/hooks";
import { listAllBaseProductIds } from "@/lib/api/v2/base-products";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type AssignFailure = {
  productId: string;
  productName: string;
  message: string;
};

type CatalogAddProductsDialogProps = {
  catalogId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PAGE_SIZE = 50;

export function CatalogAddProductsDialog({
  catalogId,
  open,
  onOpenChange,
}: CatalogAddProductsDialogProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [failures, setFailures] = useState<AssignFailure[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelectingSearch, setIsSelectingSearch] = useState(false);
  const [isSelectingAllImported, setIsSelectingAllImported] = useState(false);

  const addMutation = useAddCatalogItemV2(catalogId);
  const normalizedQuery = debouncedQuery.trim();
  const { data, isLoading } = useBaseProducts({
    q: normalizedQuery || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

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
    return items as BaseProductV2[];
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
  const isSelectionDisabled = isSubmitting || isSelectingGlobal;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("");
      setDebouncedQuery("");
      setPage(1);
      setSelectedIds(new Set());
      setFailures([]);
      setIsSubmitting(false);
      setIsSelectingSearch(false);
      setIsSelectingAllImported(false);
    }
    onOpenChange(nextOpen);
  };

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

  const handleToggleCurrentPage = () => {
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
      const ids = await listAllBaseProductIds({ q: normalizedQuery || undefined });
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

  const isConfirmDisabled = isSubmitting || selectedIds.size === 0;
  const isInputsDisabled = isSubmitting;

  const handleSubmit = async () => {
    if (!selectedIds.size) {
      toastError("Selecao vazia", "Selecione ao menos um produto.");
      return;
    }

    setIsSubmitting(true);
    setFailures([]);

    const tasks = Array.from(selectedIds).map(async (productId) => {
      try {
        await addMutation.mutateAsync({ productBaseId: productId });
        return { ok: true, productId } as const;
      } catch (err) {
        return { ok: false, productId, error: err } as const;
      }
    });

    const results = await Promise.allSettled(tasks);
    const failed: AssignFailure[] = [];

    results.forEach((result) => {
      if (result.status !== "fulfilled") {
        return;
      }
      if (result.value.ok) {
        return;
      }
      const product = baseProducts.find((item) => item.id === result.value.productId);
      const message = getErrorMessage(result.value.error);
      failed.push({
        productId: result.value.productId,
        productName: product?.name ?? result.value.productId,
        message: message.description ?? message.title,
      });
    });

    if (failed.length > 0) {
      setFailures(failed);
      toastError(
        "Alguns produtos falharam",
        "Revise os itens com erro e tente novamente.",
      );
      setIsSubmitting(false);
      return;
    }

    toastSuccess("Produtos adicionados");
    setIsSubmitting(false);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar produtos ao catalogo</DialogTitle>
          <DialogDescription>
            Selecione produtos da base geral para adicionar ao catalogo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Input
              id="catalog-products-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, SKU ou codigo de barras"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {selectedCount} selecionados
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectCurrentPage}
                disabled={isSelectionDisabled || baseProducts.length === 0}
              >
                Selecionar pagina
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllFromSearch}
                disabled={isSelectionDisabled}
              >
                {isSelectingSearch ? "Selecionando..." : "Selecionar todos da busca"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllImported}
                disabled={isSelectionDisabled}
              >
                {isSelectingAllImported ? "Selecionando..." : "Selecionar todos importados"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                disabled={isSelectionDisabled || selectedCount === 0}
              >
                Limpar selecao
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando produtos...
            </div>
          ) : baseProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-64 overflow-auto rounded-md border border-input">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={handleToggleCurrentPage}
                          disabled={isInputsDisabled}
                          className="h-4 w-4 rounded border border-input"
                        />
                      </TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {baseProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelection(product.id)}
                            disabled={isInputsDisabled}
                            className="h-4 w-4 rounded border border-input"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.sku}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ListPagination
                page={currentPage}
                totalPages={totalPages}
                total={total}
                pageSize={meta?.pageSize ?? PAGE_SIZE}
                isLoading={isLoading}
                onPageChange={setPage}
              />
            </div>
          )}
          {failures.length > 0 ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="font-semibold">Falhas ao adicionar:</p>
              <ul className="mt-2 space-y-1">
                {failures.map((failure) => (
                  <li key={failure.productId}>
                    {failure.productName}: {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isConfirmDisabled}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { CatalogV2 } from "@/types/api";

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
import { getErrorMessage } from "@/lib/api/error";
import { useCatalogsV2, useCreateShareLinkV2 } from "@/lib/api/hooks";
import { listAllCatalogIds } from "@/lib/api/v2/catalogs";
import { copyTextToClipboard } from "@/lib/browser/copy-to-clipboard";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const PAGE_SIZE = 100;

type ShareLinkFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const buildShareLinkUrl = (identifier: string) => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/s/${identifier}`;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL;
  return fallback ? `${fallback}/s/${identifier}` : `/s/${identifier}`;
};

export function ShareLinkFormDialog({ open, onOpenChange }: ShareLinkFormDialogProps) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [isSelectingAllCatalogs, setIsSelectingAllCatalogs] = useState(false);

  const { data, isLoading } = useCatalogsV2({ page, pageSize: PAGE_SIZE });
  const createMutation = useCreateShareLinkV2();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const catalogs = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items as CatalogV2[];
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? catalogs.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const visibleCatalogs = useMemo(() => {
    if (!normalizedQuery) {
      return catalogs;
    }
    return catalogs.filter((catalog) => {
      const nameValue = catalog.name.toLowerCase();
      const descriptionValue = (catalog.description ?? "").toLowerCase();
      const idValue = catalog.id.toLowerCase();
      return (
        nameValue.includes(normalizedQuery) ||
        descriptionValue.includes(normalizedQuery) ||
        idValue.includes(normalizedQuery)
      );
    });
  }, [catalogs, normalizedQuery]);
  const selectedCount = selectedIds.size;
  const allPageSelected =
    visibleCatalogs.length > 0 &&
    visibleCatalogs.every((catalog) => selectedIds.has(catalog.id));
  const isSubmitting = createMutation.isPending;
  const isSelectionDisabled = isSubmitting || isSelectingAllCatalogs || isLoading;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName("");
      setQuery("");
      setDebouncedQuery("");
      setPage(1);
      setSelectedIds(new Set());
      setCreatedToken(null);
      setCreatedSlug(null);
      setCreatedId(null);
      setIsSelectingAllCatalogs(false);
    }
    onOpenChange(nextOpen);
  };

  const toggleCatalog = (catalogId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) {
        next.delete(catalogId);
      } else {
        next.add(catalogId);
      }
      return next;
    });
  };

  const handleToggleCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        visibleCatalogs.forEach((catalog) => next.delete(catalog.id));
      } else {
        visibleCatalogs.forEach((catalog) => next.add(catalog.id));
      }
      return next;
    });
  };

  const handleSelectCurrentPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleCatalogs.forEach((catalog) => next.add(catalog.id));
      return next;
    });
  };

  const handleSelectAllCatalogs = async () => {
    setIsSelectingAllCatalogs(true);
    try {
      const ids = await listAllCatalogIds();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      toastSuccess(`${ids.length} catalogo(s) selecionado(s)`);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Nao foi possivel selecionar todos.");
    } finally {
      setIsSelectingAllCatalogs(false);
    }
  };

  const handleCopy = async () => {
    const identifier = createdSlug ?? createdToken;
    if (!identifier) {
      return;
    }
    const url = buildShareLinkUrl(identifier);
    try {
      await copyTextToClipboard(url);
      toastSuccess("Link copiado");
    } catch {
      toastError("Falha ao copiar", "Copie manualmente: " + url);
    }
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toastError("Nome obrigatorio", "Informe o nome do link.");
      return;
    }

    const catalogIds = Array.from(selectedIds);
    if (catalogIds.length === 0) {
      toastError("Selecao obrigatoria", "Selecione ao menos um catalogo.");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        name: trimmed,
        catalogIds,
      });
      setCreatedToken(result.token);
      setCreatedSlug(result.slug ?? null);
      setCreatedId(result.id);
      toastSuccess("Share link criado");
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Nao foi possivel criar.");
    }
  };

  const createdIdentifier = createdSlug ?? createdToken;
  const createdUrl = createdIdentifier ? buildShareLinkUrl(createdIdentifier) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo share link</DialogTitle>
          <DialogDescription>
            Combine um ou mais catalogos para compartilhar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Input
              placeholder="Nome do link"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Input
              placeholder="Buscar catalogo na pagina atual"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={isSelectionDisabled}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {selectedCount} selecionado(s)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectCurrentPage}
                disabled={isSelectionDisabled || visibleCatalogs.length === 0}
              >
                Selecionar pagina
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllCatalogs}
                disabled={isSelectionDisabled}
              >
                {isSelectingAllCatalogs ? "Selecionando..." : "Selecionar todos catalogos"}
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

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Catalogos</p>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando catalogos...
              </div>
            ) : visibleCatalogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum catalogo encontrado nesta pagina.</p>
            ) : (
              <div className="space-y-2 rounded-md border border-input p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={handleToggleCurrentPage}
                    disabled={isSelectionDisabled}
                  />
                  Selecionar todos da pagina
                </label>
                <div className="grid gap-2">
                  {visibleCatalogs.map((catalog) => (
                    <label key={catalog.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(catalog.id)}
                        onChange={() => toggleCatalog(catalog.id)}
                        disabled={isSelectionDisabled}
                      />
                      <span>{catalog.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <ListPagination
              page={currentPage}
              totalPages={totalPages}
              total={total}
              pageSize={meta?.pageSize ?? PAGE_SIZE}
              isLoading={isLoading}
              onPageChange={setPage}
            />
          </div>

          {createdToken ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Link gerado</p>
              <p className="break-all text-xs text-emerald-800">{createdUrl}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  Copiar link
                </Button>
                {createdId ? (
                  <span className="text-xs text-emerald-700">ID: {createdId}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Criar link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

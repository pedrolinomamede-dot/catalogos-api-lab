"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CatalogItemV2 } from "@/types/api";
import type { PdfExportMode } from "@/types/api";

import { CatalogAddProductsDialog } from "@/components/admin/catalog-add-products-dialog";
import { CatalogFormDialog } from "@/components/admin/catalog-form-dialog";
import { CatalogImportCsvDialog } from "@/components/admin/catalog-import-csv-dialog";
import { CatalogPdfBackgroundDialog } from "@/components/admin/catalog-pdf-background-dialog";
import { CatalogPdfThemeDialog, type PdfThemeOption } from "@/components/admin/catalog-pdf-theme-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
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
  useCatalogItemsV2,
  useCatalogV2,
  useCreateShareLinkV2,
  useDeleteCatalogItemV2,
  useGenerateShareLinkPdfV2,
  useRefreshCatalogFromSourceV2,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type CatalogDetailsProps = {
  catalogId: string;
};

type CatalogItemFailure = {
  id: string;
  name: string;
  message: string;
};

function toPdfFileName(name: string) {
  const normalized = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "catalogo";
  }

  return normalized;
}

export function CatalogDetails({ catalogId }: CatalogDetailsProps) {
  const {
    data: catalog,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    error: catalogError,
    refetch: refetchCatalog,
  } = useCatalogV2(catalogId);
  const {
    data: itemsData,
    isLoading: isItemsLoading,
    isError: isItemsError,
    error: itemsError,
    refetch: refetchItems,
  } = useCatalogItemsV2(catalogId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPdfBackgroundOpen, setIsPdfBackgroundOpen] = useState(false);
  const [isPdfStyleOpen, setIsPdfStyleOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItemV2 | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkFailures, setBulkFailures] = useState<CatalogItemFailure[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);

  const deleteMutation = useDeleteCatalogItemV2(catalogId);
  const createShareLinkMutation = useCreateShareLinkV2();
  const generatePdfMutation = useGenerateShareLinkPdfV2();
  const refreshCatalogMutation = useRefreshCatalogFromSourceV2(catalogId);

  const items = useMemo(() => itemsData ?? [], [itemsData]);
  const selectedCount = selectedItemIds.size;
  const allSelected = items.length > 0 && items.every((item) => selectedItemIds.has(item.id));

  const toggleSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach((item) => next.delete(item.id));
      } else {
        items.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async (): Promise<boolean> => {
    if (!selectedItemIds.size) {
      return false;
    }

    setIsBulkDeleting(true);
    setBulkFailures([]);

    const ids = Array.from(selectedItemIds);
    const results = await Promise.allSettled(
      ids.map((itemId) => deleteMutation.mutateAsync(itemId)),
    );

    const failures: CatalogItemFailure[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        return;
      }
      const itemId = ids[index];
      const item = items.find((entry) => entry.id === itemId);
      const message = getErrorMessage(result.reason);
      failures.push({
        id: itemId,
        name: item?.productBase?.name ?? itemId,
        message: message.description ?? message.title,
      });
    });

    if (failures.length > 0) {
      setBulkFailures(failures);
      toastError(
        "Alguns itens falharam",
        "Revise os itens com erro e tente novamente.",
      );
      const remaining = new Set(failures.map((failure) => failure.id));
      setSelectedItemIds(remaining);
      setIsBulkDeleting(false);
      return false;
    }

    toastSuccess("Itens removidos");
    setSelectedItemIds(new Set());
    setIsBulkDeleting(false);
    setIsBulkDeleteOpen(false);
    return true;
  };

  const handleExportPdf = async (mode: PdfExportMode, theme?: PdfThemeOption) => {
    if (!catalog || isExportingPdf) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const shareName = `PDF ${catalog.name} ${new Date().toISOString()}`;
      const shareLink = await createShareLinkMutation.mutateAsync({
        name: shareName,
        catalogIds: [catalogId],
      });
      const blob = await generatePdfMutation.mutateAsync({
        shareLinkId: shareLink.id,
        mode,
        theme: theme ?? null,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        mode === "editavel"
          ? `${toPdfFileName(catalog.name)}-editavel.pdf`
          : `${toPdfFileName(catalog.name)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toastSuccess(mode === "editavel" ? "PDF editavel gerado" : "PDF gerado");
      setIsThemeDialogOpen(false);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Tente novamente.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleRefreshFromSource = async () => {
    try {
      const result = await refreshCatalogMutation.mutateAsync();
      toastSuccess(`${result.refreshedCount} snapshot(s) atualizados`);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  };

  if (isCatalogLoading) {
    return <LoadingState label="Carregando catálogo" />;
  }

  if (isCatalogError || !catalog) {
    const message = getErrorMessage(catalogError);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Não foi possível carregar catálogo."}
        action={
          <Button variant="outline" onClick={() => refetchCatalog()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={catalog.name}
        description={catalog.description ?? "Catálogo da Base Geral."}
        breadcrumbs={
          <Link className="text-muted-foreground hover:text-foreground" href="/dashboard/catalogs">
            Catálogos
          </Link>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsThemeDialogOpen(true)}
              disabled={isExportingPdf}
            >
              {isExportingPdf ? "Gerando PDF..." : "Exportar PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshFromSource}
              disabled={refreshCatalogMutation.isPending}
            >
              {refreshCatalogMutation.isPending
                ? "Atualizando..."
                : "Atualizar snapshots"}
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              Importar CSV (SKUs)
            </Button>
            <Button variant="outline" onClick={() => setIsPdfBackgroundOpen(true)}>
              Fundo do PDF
            </Button>
            <Button variant="outline" onClick={() => setIsPdfStyleOpen(true)}>
              Logos e estilo PDF
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              Adicionar produtos
            </Button>
          </div>
        }
      />

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Itens do catálogo</h3>
            <p className="text-xs text-muted-foreground">{items.length} itens</p>
          </div>
          {items.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isBulkDeleting}
              >
                {allSelected ? "Limpar seleção" : "Selecionar todos"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selectedCount === 0 || isBulkDeleting}
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                Remover selecionados ({selectedCount})
              </Button>
            </div>
          ) : null}
        </div>
        {isItemsLoading ? (
          <LoadingState label="Carregando itens" />
        ) : isItemsError ? (
          (() => {
            const message = getErrorMessage(itemsError);
            return (
              <EmptyState
                title={message.title}
                description={message.description ?? "Não foi possível carregar itens."}
                action={
                  <Button variant="outline" onClick={() => refetchItems()}>
                    Tentar novamente
                  </Button>
                }
              />
            );
          })()
        ) : !items.length ? (
          <EmptyState
            title="Nenhum item no catálogo"
            description="Adicione produtos para compor este catálogo."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      disabled={isBulkDeleting}
                      className="h-4 w-4 rounded border border-input"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.productBase?.name ?? "Produto sem nome"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.productBase?.id ?? item.productBaseId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.productBase?.sku ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteTarget(item);
                        setIsDeleteOpen(true);
                      }}
                      disabled={isBulkDeleting}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {bulkFailures.length > 0 ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <p className="font-semibold">Falhas ao remover:</p>
            <ul className="mt-2 space-y-1">
              {bulkFailures.map((failure) => (
                <li key={failure.id}>
                  {failure.name}: {failure.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <CatalogAddProductsDialog
        catalogId={catalogId}
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
      />
      <CatalogImportCsvDialog
        catalogId={catalogId}
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
      <CatalogPdfBackgroundDialog
        catalog={catalog}
        open={isPdfBackgroundOpen}
        onOpenChange={setIsPdfBackgroundOpen}
      />
      <CatalogFormDialog
        mode="edit"
        open={isPdfStyleOpen}
        onOpenChange={setIsPdfStyleOpen}
        initialValues={catalog}
        onSuccess={() => {
          void refetchCatalog();
        }}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Remover item"
        description={
          deleteTarget?.productBase?.name
            ? `Remover "${deleteTarget.productBase.name}" do catálogo?`
            : "Remover este item do catálogo?"
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return false;
          }
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            toastSuccess("Item removido");
            setSelectedItemIds((prev) => {
              const next = new Set(prev);
              next.delete(deleteTarget.id);
              return next;
            });
            setIsDeleteOpen(false);
            setDeleteTarget(null);
            return true;
          } catch (err) {
            const message = getErrorMessage(err);
            toastError(message.title, message.description ?? "Tente novamente.");
            return false;
          }
        }}
      />

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          setIsBulkDeleteOpen(open);
          if (!open) {
            setBulkFailures([]);
          }
        }}
        title="Remover itens selecionados"
        description={
          selectedCount
            ? `Remover ${selectedCount} itens do catálogo?`
            : "Remover itens do catálogo?"
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />

      <CatalogPdfThemeDialog
        open={isThemeDialogOpen}
        onClose={() => setIsThemeDialogOpen(false)}
        onConfirm={(theme, mode) => handleExportPdf(mode, theme)}
        isExporting={isExportingPdf}
      />
    </section>
  );
}

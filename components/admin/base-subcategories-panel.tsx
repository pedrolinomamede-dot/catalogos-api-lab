"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CategoryV2, SubcategoryV2 } from "@/types/api";

import { BaseCategoryAssignProductsDialog } from "@/components/admin/base-category-assign-products-dialog";
import { BaseSubcategoryFormDialog } from "@/components/admin/base-subcategory-form-dialog";
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
import { getSubcategoryDeleteImpactV2 } from "@/lib/api/v2/categories";
import type { SubcategoryDeleteImpact } from "@/lib/api/v2/categories";
import { useDeleteSubcategoryV2, useSubcategoriesV2 } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const PAGE_SIZE = 100;

type BaseSubcategoriesPanelProps = {
  category: CategoryV2;
};

export function BaseSubcategoriesPanel({ category }: BaseSubcategoriesPanelProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useSubcategoriesV2(
    category.id,
    { page, pageSize: PAGE_SIZE },
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<SubcategoryV2 | null>(
    null,
  );
  const [assignTarget, setAssignTarget] = useState<SubcategoryV2 | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubcategoryV2 | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<SubcategoryDeleteImpact | null>(null);
  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const keepDeleteTargetRef = useRef(false);

  const deleteMutation = useDeleteSubcategoryV2(category.id);

  useEffect(() => {
    setPage(1);
  }, [category.id]);

  const subcategories = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items;
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? subcategories.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (isLoading) {
    return <LoadingState label="Carregando subcategorias" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={
          message.description ?? "Nao foi possivel carregar subcategorias."
        }
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Subcategorias</h3>
          <p className="text-xs text-muted-foreground">
            {category.name}
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          Nova subcategoria
        </Button>
      </div>
      {!subcategories.length ? (
        <EmptyState
          title="Nenhuma subcategoria encontrada"
          description="Cadastre a primeira subcategoria para esta categoria."
        />
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subcategoria</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategories.map((subcategory) => (
                <TableRow key={subcategory.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {subcategory.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subcategory.id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignTarget(subcategory)}
                      >
                        Adicionar produtos
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSubcategory(subcategory);
                          setIsEditOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget(subcategory);
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
        </div>
      )}
      <BaseSubcategoryFormDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        categoryId={category.id}
      />
      <BaseSubcategoryFormDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedSubcategory(null);
          }
        }}
        categoryId={category.id}
        initialValues={selectedSubcategory ?? undefined}
      />
      <BaseCategoryAssignProductsDialog
        category={category}
        open={Boolean(assignTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignTarget(null);
          }
        }}
        initialSubcategoryId={assignTarget?.id}
        initialSubcategoryName={assignTarget?.name}
        lockSubcategory
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
        title="Excluir subcategoria"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"?`
            : "Tem certeza que deseja excluir esta subcategoria?"
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
            const impact = await getSubcategoryDeleteImpactV2(deleteTarget.id);
            const hasImpact = impact.productsCount > 0;
            if (hasImpact) {
              keepDeleteTargetRef.current = true;
              setDeleteImpact(impact);
              setIsImpactOpen(true);
              return true;
            }

            await deleteMutation.mutateAsync(deleteTarget.id);
            toastSuccess("Subcategoria excluida");
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
            ? `Esta subcategoria possui ${deleteImpact.productsCount} produtos vinculados. A exclusao desvinculara esses produtos. Deseja continuar?`
            : "Esta subcategoria possui vinculos. Deseja continuar?"
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
            toastSuccess("Subcategoria excluida");
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

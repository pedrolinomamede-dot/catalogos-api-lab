"use client";

import { useMemo, useState } from "react";

import type { ApiError, Category } from "@/types/api";

import { EmptyState } from "@/components/admin/empty-state";
import { LoadingState } from "@/components/admin/loading-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
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
import { useCategories, useDeleteCategory } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type CategoriesListProps = {
  query?: string;
};

const isCategoryHasProductsError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const payload = "payload" in error ? (error as { payload?: unknown }).payload : error;
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const record = payload as ApiError;
  return record.ok === false && record.error?.code === "category_has_products";
};

export function CategoriesList({ query }: CategoriesListProps) {
  const normalizedQuery = (query ?? "").trim().toLowerCase();
  const { data, isLoading, isError, error, refetch } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const deleteMutation = useDeleteCategory({
    onSuccess: () => {
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      toastSuccess("Categoria excluída");
    },
    onError: (mutationError) => {
      if (isCategoryHasProductsError(mutationError)) {
        toastError(
          "Não foi possível excluir",
          "Esta categoria tem produtos vinculados.",
        );
        return;
      }
      toastError("Não foi possível excluir", "Tente novamente.");
    },
  });

  const categories = useMemo(() => {
    const items = data ?? [];
    if (!normalizedQuery) {
      return items;
    }
    return items.filter((category) =>
      category.name.toLowerCase().includes(normalizedQuery),
    );
  }, [data, normalizedQuery]);

  if (isLoading) {
    return <LoadingState label="Carregando categorias" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Não foi possível carregar categorias."}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!categories.length) {
    return (
      <EmptyState
        title="Nenhuma categoria encontrada"
        description={
          normalizedQuery
            ? "Tente ajustar sua busca para encontrar categorias."
            : "Nenhuma categoria cadastrada até o momento."
        }
      />
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {category.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {category.id}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {category.productCount ?? 0}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {category.sortOrder}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(category);
                      setIsEditOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteTarget(category);
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
      <CategoryFormDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedCategory(null);
          }
        }}
        initialValues={selectedCategory ?? undefined}
        onSuccess={() => setSelectedCategory(null)}
      />
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Excluir categoria"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"?`
            : "Tem certeza que deseja excluir esta categoria?"
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return false;
          }
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            return true;
          } catch {
            return false;
          }
        }}
      />
    </Card>
  );
}

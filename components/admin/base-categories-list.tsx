"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CategoryV2 } from "@/types/api";

import { BaseCategoryAssignProductsDialog } from "@/components/admin/base-category-assign-products-dialog";
import { BaseCategoryFormDialog } from "@/components/admin/base-category-form-dialog";
import { BaseSubcategoriesPanel } from "@/components/admin/base-subcategories-panel";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { ListPagination } from "@/components/admin/list-pagination";
import { LoadingState } from "@/components/admin/loading-state";
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
import { getCategoryDeleteImpactV2 } from "@/lib/api/v2/categories";
import type { CategoryDeleteImpact } from "@/lib/api/v2/categories";
import { useCategoriesV2, useDeleteCategoryV2 } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const PAGE_SIZE = 100;

export function BaseCategoriesList() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryV2 | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryV2 | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<CategoryDeleteImpact | null>(null);
  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const keepDeleteTargetRef = useRef(false);
  const [activeCategory, setActiveCategory] = useState<CategoryV2 | null>(null);
  const [assignCategory, setAssignCategory] = useState<CategoryV2 | null>(null);

  const deleteMutation = useDeleteCategoryV2();
  const normalizedQuery = debouncedQuery.trim();

  const { data, isLoading, isError, error, refetch } = useCategoriesV2({
    q: normalizedQuery || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery]);

  const categories = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items;
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? categories.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (isLoading) {
    return <LoadingState label="Carregando categorias (Base Geral)" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={
          message.description ?? "Nao foi possivel carregar categorias da Base Geral."
        }
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
            : "Nenhuma categoria da Base Geral cadastrada ate o momento."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome"
        aria-label="Buscar por nome"
        className="max-w-sm"
      />
      <Card className="space-y-4 p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
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
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
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
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveCategory(category)}
                    >
                      Gerenciar subcategorias
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignCategory(category)}
                    >
                      Adicionar produtos
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

        <ListPagination
          page={currentPage}
          totalPages={totalPages}
          total={total}
          pageSize={meta?.pageSize ?? PAGE_SIZE}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </Card>
      {activeCategory ? <BaseSubcategoriesPanel category={activeCategory} /> : null}
      <BaseCategoryFormDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedCategory(null);
          }
        }}
        initialValues={selectedCategory ?? undefined}
      />
      <BaseCategoryAssignProductsDialog
        category={assignCategory}
        open={Boolean(assignCategory)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignCategory(null);
          }
        }}
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
        title="Excluir categoria"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"?`
            : "Tem certeza que deseja excluir esta categoria?"
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
            const impact = await getCategoryDeleteImpactV2(deleteTarget.id);
            const hasImpact =
              impact.productsCount > 0 || impact.subcategoriesCount > 0;
            if (hasImpact) {
              keepDeleteTargetRef.current = true;
              setDeleteImpact(impact);
              setIsImpactOpen(true);
              return true;
            }

            await deleteMutation.mutateAsync(deleteTarget.id);
            toastSuccess("Categoria excluida");
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
            ? `Esta categoria possui ${deleteImpact.subcategoriesCount} subcategorias e ${deleteImpact.productsCount} produtos vinculados. A exclusao removera as subcategorias e desvinculara os produtos. Deseja continuar?`
            : "Esta categoria possui vinculos. Deseja continuar?"
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
            toastSuccess("Categoria excluida");
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
    </div>
  );
}

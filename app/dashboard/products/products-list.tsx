"use client";

import { useMemo, useState } from "react";

import type { Category, Product } from "@/types/api";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { LoadingState } from "@/components/admin/loading-state";
import { ProductFormDialog } from "@/components/admin/product-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api/error";
import { useCategories, useDeleteProduct, useProducts } from "@/lib/api/hooks";

export function ProductsList() {
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const { data, isLoading, isError, error, refetch } = useProducts();
  const { data: categories } = useCategories();
  const categoriesById = useMemo(() => {
    const items = categories ?? [];
    return new Map<string, string>(
      items.map((category: Category) => [category.id, category.name]),
    );
  }, [categories]);
  const deleteMutation = useDeleteProduct({
    onSuccess: () => {
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    },
  });

  const products = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    if (!normalizedQuery) {
      return items;
    }
    return items.filter((product) => {
      const name = product.name.toLowerCase();
      const sku = product.sku.toLowerCase();
      return name.includes(normalizedQuery) || sku.includes(normalizedQuery);
    });
  }, [data, normalizedQuery]);

  if (isLoading) {
    return <LoadingState label="Carregando produtos" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Não foi possível carregar produtos."}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        title="Nenhum produto encontrado"
        description={
          normalizedQuery
            ? "Tente ajustar sua busca para encontrar produtos."
            : "Nenhum produto cadastrado até o momento."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome ou SKU"
      />
      <div className="space-y-3">
        {products.map((product) => (
          <Card key={product.id} className="p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  SKU {product.sku}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  {product.category?.name ??
                    (product.categoryId
                      ? categoriesById.get(product.categoryId)
                      : undefined) ??
                    "Sem categoria"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsEditOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(product);
                    setIsDeleteOpen(true);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <ProductFormDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedProduct(null);
          }
        }}
        initialValues={selectedProduct ?? undefined}
        onSuccess={() => setSelectedProduct(null)}
      />
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Excluir produto?"
        description="Esta ação inativa o produto (soft delete). O SKU permanece reservado e só pode ser reutilizado reativando este produto."
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
    </div>
  );
}

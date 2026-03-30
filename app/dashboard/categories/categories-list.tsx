"use client";

import { useMemo } from "react";

import { EmptyState } from "@/components/admin/empty-state";
import { LoadingState } from "@/components/admin/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/api/error";
import { useCategories } from "@/lib/api/hooks";

type CategoriesListProps = {
  query?: string;
};

export function CategoriesList({ query }: CategoriesListProps) {
  const normalizedQuery = (query ?? "").trim().toLowerCase();
  const { data, isLoading, isError, error, refetch } = useCategories();

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
    <div className="space-y-3">
      {categories.map((category) => (
        <Card key={category.id} className="p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {category.name}
              </p>
              <p className="text-xs text-muted-foreground">{category.id}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Produtos: {category.productCount ?? 0}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}


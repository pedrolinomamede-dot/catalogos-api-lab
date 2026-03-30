import { Suspense } from "react";

import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
import { CategoriesActions } from "@/components/admin/categories-actions";
import { CategoriesList } from "@/components/admin/categories-list";
import { SearchToolbar } from "@/components/admin/search-toolbar";
import { SearchToolbarFallback } from "@/components/admin/search-toolbar-fallback";

type CategoriesPageProps = {
  searchParams?: { query?: string };
};

export default function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const query = typeof searchParams?.query === "string" ? searchParams.query : "";

  return (
    <section className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Lista de categorias cadastradas."
        actions={<CategoriesActions />}
      />
      <Suspense fallback={<SearchToolbarFallback />}>
        <SearchToolbar placeholder="Buscar categorias..." />
      </Suspense>
      <Suspense fallback={<LoadingState label="Carregando categorias" />}>
        <CategoriesList query={query} />
      </Suspense>
    </section>
  );
}

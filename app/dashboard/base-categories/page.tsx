import { Suspense } from "react";

import { BaseCategoriesActions } from "@/components/admin/base-categories-actions";
import { BaseCategoriesList } from "@/components/admin/base-categories-list";
import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";

export default function BaseCategoriesPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Categorias (Base Geral)"
        description="Gerencie categorias e subcategorias da Base Geral."
        actions={<BaseCategoriesActions />}
      />
      <Suspense fallback={<LoadingState label="Carregando categorias (Base Geral)" />}>
        <BaseCategoriesList />
      </Suspense>
    </section>
  );
}

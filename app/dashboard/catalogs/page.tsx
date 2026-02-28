import { Suspense } from "react";

import { CatalogsActions } from "@/components/admin/catalogs-actions";
import { CatalogsList } from "@/components/admin/catalogs-list";
import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";

export default function CatalogsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Catalogos"
        description="Gerencie os catalogos da base geral."
        actions={<CatalogsActions />}
      />
      <Suspense fallback={<LoadingState label="Carregando catalogos" />}>
        <CatalogsList />
      </Suspense>
    </section>
  );
}

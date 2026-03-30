import { Suspense } from "react";

import { BaseProductsActions } from "@/components/admin/base-products-actions";
import { BaseProductsList } from "@/components/admin/base-products-list";
import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";

export default function BaseProductsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Base Geral"
        description="Produtos da Base Geral."
        actions={<BaseProductsActions />}
      />
      <Suspense fallback={<LoadingState label="Carregando Base Geral" />}>
        <BaseProductsList />
      </Suspense>
    </section>
  );
}

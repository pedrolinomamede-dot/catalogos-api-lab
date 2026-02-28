import { Suspense } from "react";

import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
import { ProductsActions } from "@/components/admin/products-actions";
import { ProductsList } from "./products-list";

export default function ProductsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Lista de produtos cadastrados."
        actions={<ProductsActions />}
      />
      <Suspense fallback={<LoadingState label="Carregando produtos" />}>
        <ProductsList />
      </Suspense>
    </section>
  );
}

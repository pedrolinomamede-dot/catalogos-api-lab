import { Suspense } from "react";

import { CatalogDetails } from "@/components/admin/catalog-details";
import { LoadingState } from "@/components/admin/loading-state";

type CatalogDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CatalogDetailPage({ params }: CatalogDetailPageProps) {
  const resolvedParams = await params;

  return (
    <Suspense fallback={<LoadingState label="Carregando catalogo" />}>
      <CatalogDetails catalogId={resolvedParams.id} />
    </Suspense>
  );
}

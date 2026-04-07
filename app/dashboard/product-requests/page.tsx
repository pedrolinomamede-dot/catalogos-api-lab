import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
import { ProductRequestsPageClient } from "@/components/admin/product-requests-page";
import { getAuthSession } from "@/lib/auth";

export default async function ProductRequestsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SELLER") {
    redirect("/dashboard");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Solicitações de Produto"
        description="Acompanhe pedidos de produtos que ainda não estão disponíveis no share link e identifique demanda reprimida por vendedor e origem."
      />
      <Suspense fallback={<LoadingState label="Carregando solicitações" />}>
        <ProductRequestsPageClient />
      </Suspense>
    </section>
  );
}

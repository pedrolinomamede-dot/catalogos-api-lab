import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DataQualityPageClient } from "@/components/admin/data-quality-page";
import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
import { getAuthSession } from "@/lib/auth";
import { isTenantAdminRole } from "@/lib/roles";

export default async function DataQualityPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isTenantAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Qualidade dos dados"
        description="Analise a saude da Base Geral, identifique inconsistencias e exporte relatorios em CSV."
      />
      <Suspense fallback={<LoadingState label="Carregando qualidade dos dados" />}>
        <DataQualityPageClient />
      </Suspense>
    </section>
  );
}

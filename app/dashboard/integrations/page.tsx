import { redirect } from "next/navigation";
import { Suspense } from "react";

import { IntegrationsPageClient } from "@/components/admin/integrations-page";
import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
import { getAuthSession } from "@/lib/auth";
import { isTenantAdminRole } from "@/lib/roles";

export default async function IntegrationsPage() {
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
        title="Integracoes"
        description="Conecte ERPs, acompanhe o status da sincronizacao e preserve o fluxo CSV/manual."
      />
      <Suspense fallback={<LoadingState label="Carregando integracoes" />}>
        <IntegrationsPageClient />
      </Suspense>
    </section>
  );
}

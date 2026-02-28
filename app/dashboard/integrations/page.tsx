import { Suspense } from "react";

import { IntegrationsPageClient } from "@/components/admin/integrations-page";
import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";

export default function IntegrationsPage() {
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

import { Suspense } from "react";

import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
import { ShareLinksPageClient } from "@/components/admin/share-links-page";

export default function ShareLinksPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Share Links"
        description="Gerencie links compartilhados para catálogos."
      />
      <Suspense fallback={<LoadingState label="Carregando links" />}>
        <ShareLinksPageClient />
      </Suspense>
    </section>
  );
}

import { Suspense } from "react";

import { BrandSettingsPanel } from "@/components/admin/brand-settings-panel";

export default function SettingsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Configuracoes</h1>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Carregando...</p>
        }
      >
        <BrandSettingsPanel />
      </Suspense>
    </section>
  );
}

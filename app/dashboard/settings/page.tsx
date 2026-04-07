import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BrandSettingsPanel } from "@/components/admin/brand-settings-panel";
import { getAuthSession } from "@/lib/auth";
import { isTenantAdminRole } from "@/lib/roles";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isTenantAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

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

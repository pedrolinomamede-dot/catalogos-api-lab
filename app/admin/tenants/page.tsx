import { PlatformTenantsPageClient } from "@/components/admin/platform-tenants-page";

export default function PlatformTenantsPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Plataforma
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Clientes / Tenants</h1>
        <p className="text-sm text-slate-600">
          Crie clientes zerados, gere o admin inicial e suspenda ou reative o acesso completo do tenant.
        </p>
      </div>

      <PlatformTenantsPageClient />
    </section>
  );
}

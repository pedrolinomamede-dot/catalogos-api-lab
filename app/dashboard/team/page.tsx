import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingState } from "@/components/admin/loading-state";
import { PageHeader } from "@/components/admin/page-header";
import { UsersPageClient } from "@/components/admin/users-page";
import { getAuthSession } from "@/lib/auth";

export default async function TeamPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Cadastre vendedores, ajuste acessos e mantenha o WhatsApp comercial de cada usuário."
      />
      <Suspense fallback={<LoadingState label="Carregando equipe" />}>
        <UsersPageClient />
      </Suspense>
    </section>
  );
}

import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingState } from "@/components/admin/loading-state";
import { OrderIntentsPageClient } from "@/components/admin/order-intents-page";
import { PageHeader } from "@/components/admin/page-header";
import { getAuthSession } from "@/lib/auth";

export default async function OrdersPage() {
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
        title="Pedidos"
        description="Acompanhe intenções registradas antes do WhatsApp e veja a origem comercial de cada pedido."
      />
      <Suspense fallback={<LoadingState label="Carregando pedidos" />}>
        <OrderIntentsPageClient />
      </Suspense>
    </section>
  );
}

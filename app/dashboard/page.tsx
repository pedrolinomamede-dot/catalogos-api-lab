import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const cards = [
  {
    title: "Base Geral",
    description: "Liste, busque e importe a Base Geral.",
    href: "/dashboard/base-products",
    action: "Abrir Base Geral",
  },
  {
    title: "Categorias (Base Geral)",
    description: "Gerencie categorias e subcategorias da Base Geral.",
    href: "/dashboard/base-categories",
    action: "Gerenciar categorias",
  },
  {
    title: "Integracoes",
    description: "Conecte ERPs e acompanhe a sincronizacao da Base Geral.",
    href: "/dashboard/integrations",
    action: "Abrir integrações",
  },
  {
    title: "Catálogos",
    description: "Monte catálogos com produtos da Base Geral.",
    href: "/dashboard/catalogs",
    action: "Abrir catálogos",
  },
  {
    title: "Share Links",
    description: "Crie e revogue links para compartilhar catálogos.",
    href: "/dashboard/share-links",
    action: "Abrir Share Links",
  },
];

const quickActions = [
  { href: "/dashboard/base-products", label: "Importar Base Geral" },
  { href: "/dashboard/integrations", label: "Conectar ERP" },
  { href: "/dashboard/base-categories", label: "Criar categoria" },
  { href: "/dashboard/catalogs", label: "Criar catálogo" },
  { href: "/dashboard/share-links", label: "Criar Share Link" },
];

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Visão geral"
        description="Painel operacional do fluxo V2"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.href} className="p-5">
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={card.href}>{card.action}</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Ações rápidas</h3>
            <p className="text-sm text-muted-foreground">
              Atalhos para tarefas comuns no fluxo V2.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action.href} asChild size="sm" variant="secondary">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
}

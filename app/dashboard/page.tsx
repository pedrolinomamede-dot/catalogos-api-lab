"use client";

import { motion } from "motion/react";
import { Database, FolderKanban, Plug, ScrollText, Share2 } from "lucide-react";

import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { useDashboardSummaryV2 } from "@/lib/api/hooks";

function formatRelativeDate(value?: string | Date | null) {
  if (!value) {
    return "Sem importações registradas";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem importações registradas";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatProviders(providers: string[] | undefined) {
  if (!providers || providers.length === 0) {
    return "Nenhum provider conectado";
  }

  return providers
    .map((provider) => {
      switch (provider) {
        case "VAREJONLINE":
          return "Varejonline";
        case "OMIE":
          return "Omie";
        case "TINY":
          return "Tiny";
        case "BLING":
          return "Bling";
        case "CUSTOM":
          return "Custom";
        default:
          return provider;
      }
    })
    .join(" | ");
}

const quickActions = [
  { href: "/dashboard/base-products", label: "Importar Base" },
  { href: "/dashboard/integrations", label: "Conectar ERP" },
  { href: "/dashboard/base-categories", label: "Criar Categoria" },
  { href: "/dashboard/catalogs", label: "Criar Catálogo" },
  { href: "/dashboard/share-links", label: "Criar Link" },
];

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummaryV2();
  const summary = data;

  const baseProducts = summary?.baseProducts;
  const categories = summary?.categories;
  const integrations = summary?.integrations;
  const catalogs = summary?.catalogs;
  const shareLinks = summary?.shareLinks;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 lg:gap-3 xl:gap-4">
      <DashboardHero
        title="Resumo Geral"
        description="Acompanhe as métricas e o desempenho do seu catálogo"
        className="flex-shrink-0"
      />

      {/* Grid principal de cards */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-3 xl:gap-4">
        {/* Coluna Esquerda: Base Geral + Integrações */}
        <div className="flex min-h-0 flex-col gap-3 lg:flex-[1.18] lg:gap-3 xl:gap-4">
          <motion.div
            className="flex min-h-0 flex-[1.6] flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0 }}
          >
            <DashboardStatCard
              embossed
              icon={Database}

              title="Base Geral"
              actionHref="/dashboard/base-products"
              actionLabel="Abrir Base Geral"
              body={
                <>
                  <p className="font-serif text-4xl leading-none lg:text-5xl">
                    <span className="bg-gradient-to-b from-[#f8ead6] via-[#c49a6c] to-[#8c6239] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                      {isLoading ? "..." : `${baseProducts?.active ?? 0}`}
                    </span>
                    {!isLoading ? (
                      <span className="ml-2 text-sm font-medium text-white/70">
                        SKUs ativos
                      </span>
                    ) : null}
                  </p>
                  <p className="text-center text-sm">
                    {isError
                      ? "Não foi possível carregar os dados da Base Geral."
                      : `Total de SKUs: ${baseProducts?.total ?? 0}.`}
                  </p>
                  <div className="grid gap-0.5 text-center text-xs text-white/50">
                    <span>Atividade: {formatRelativeDate(baseProducts?.latestImportedAt)}</span>
                    <span>Atividades: {formatRelativeDate(baseProducts?.latestUpdatedAt)}</span>
                  </div>
                </>
              }
              className="flex-1"
            />
          </motion.div>

          <motion.div
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
          >
            <DashboardStatCard
              embossed
              icon={Plug}

              title="Integrações Ativas"
              actionHref="/dashboard/integrations"
              actionLabel="Abrir Integrações"
              body={
                <>
                  <div
                    className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      (integrations?.connected ?? 0) > 0
                        ? "border-[#2e6c58]/40 bg-[#2e6c58]/20 text-[#7ecfb0]"
                        : "border-white/10 bg-white/5 text-white/50"
                    }`}
                  >
                    {(integrations?.connected ?? 0) > 0 ? "Conectado" : "Nenhuma conectada"}
                  </div>
                  <p className="text-center text-sm font-semibold text-white">
                    {isError
                      ? "Não foi possível carregar o resumo das integrações."
                      : formatProviders(integrations?.providers)}
                  </p>
                </>
              }
              compact
              className="flex-1"
            />
          </motion.div>
        </div>

        {/* Coluna Direita: Categorias + Catálogos + Links */}
        <div className="flex min-h-0 flex-col gap-3 lg:flex-[0.82] lg:gap-3 xl:gap-4">
          <motion.div
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.15 }}
          >
            <DashboardStatCard
              embossed
              icon={FolderKanban}

              title="Categorias"
              actionHref="/dashboard/base-categories"
              actionLabel="Gerenciar Categorias"
              actionClassName="translate-y-[5px]"
              body={
                <p className="pt-4 text-center text-xs font-semibold text-white">
                  {isLoading
                    ? "Carregando categorias..."
                    : `Categorias: ${categories?.categoriesTotal ?? 0} | Subcategoria: ${categories?.subcategoriesTotal ?? 0}`}
                </p>
              }
              compact
              className="flex-1"
            />
          </motion.div>

          <motion.div
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 }}
          >
            <DashboardStatCard
              embossed
              icon={ScrollText}

              title="Catálogos Criados"
              actionHref="/dashboard/catalogs"
              actionLabel="Abrir Catálogos"
              actionClassName="translate-y-[5px]"
              body={
                <p className="pt-4 text-center text-xs font-semibold text-white">
                  {isLoading
                    ? "Carregando catálogos..."
                    : `Catálogos: ${catalogs?.total ?? 0} | Itens: ${catalogs?.itemsTotal ?? 0}`}
                </p>
              }
              compact
              className="flex-1"
            />
          </motion.div>

          <motion.div
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.25 }}
          >
            <DashboardStatCard
              embossed
              icon={Share2}

              title="Links de Compartilhamento"
              actionHref="/dashboard/share-links"
              actionLabel="Abrir Share Links"
              actionClassName="translate-y-[5px]"
              body={
                <p className="pt-4 text-center text-xs font-semibold text-white">
                  {isLoading
                    ? "Carregando share links..."
                    : `Ativos: ${shareLinks?.active ?? 0} | Revogados: ${shareLinks?.revoked ?? 0}`}
                </p>
              }
              compact
              className="flex-1"
            />
          </motion.div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <DashboardQuickActions
        title="Ações Rápidas"
        description="Atalhos para tarefas comuns no Catálogo Fácil."
        actions={quickActions}
        className="flex-shrink-0"
      />
    </section>
  );
}

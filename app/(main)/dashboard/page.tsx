"use client";

import { Database, FolderKanban, Plug, BookCopy, Share2, Network, Link as LinkIcon } from "lucide-react";

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
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <DashboardHero
        title="Resumo Geral"
        description="Acompanhe as métricas e o desempenho do seu catálogo"
        className="flex-shrink-0"
      />

      {/* Grid 12 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Base Geral — gradient purple, large */}
        <DashboardStatCard
          variant="gradient-purple"
          buttonVariant="light"
          icon={Database}
          title="Base Geral"
          actionHref="/dashboard/base-products"
          actionLabel="Abrir Base Geral"
          delay={0.1}
          className="col-span-1 md:col-span-12 lg:col-span-7 min-h-[210px]"
          body={
            <>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-6xl font-light tracking-tighter text-white">
                  {isLoading ? "..." : `${baseProducts?.active ?? 0}`}
                </span>
                <span className="text-base font-medium text-white/80">SKUs ativos</span>
              </div>
              <p className="text-sm text-white/70">
                {isError
                  ? "Não foi possível carregar os dados da Base Geral."
                  : `Atividade: ${formatRelativeDate(baseProducts?.latestImportedAt)} - Atividades: ${formatRelativeDate(baseProducts?.latestUpdatedAt)}`}
              </p>
            </>
          }
        />

        {/* Categorias — glass */}
        <DashboardStatCard
          variant="glass"
          buttonVariant="dark"
          icon={Network}
          title="Categorias"
          actionHref="/dashboard/base-categories"
          actionLabel="Gerenciar Categorias"
          delay={0.2}
          className="col-span-1 md:col-span-6 lg:col-span-5 min-h-[210px]"
          body={
            <div className="mt-2">
              <span className="text-5xl font-light tracking-tighter text-slate-900">
                {isLoading ? "..." : `${categories?.categoriesTotal ?? 0}`}
              </span>
              <p className="text-sm text-slate-500 mt-1">
                Subcategoria: {categories?.subcategoriesTotal ?? 0}
              </p>
            </div>
          }
        />

        {/* Catálogos Criados — glass */}
        <DashboardStatCard
          variant="glass"
          buttonVariant="outline"
          icon={BookCopy}
          title="Catálogos Criados"
          actionHref="/dashboard/catalogs"
          actionLabel="Abrir Catálogos"
          delay={0.3}
          className="col-span-1 md:col-span-6 lg:col-span-4 min-h-[170px]"
          body={
            <div className="mt-1">
              <span className="text-4xl font-light tracking-tighter text-slate-900">
                {isLoading ? "..." : `${catalogs?.total ?? 0}`}
              </span>
              <p className="text-sm text-slate-500">
                Itens: {catalogs?.itemsTotal ?? 0}
              </p>
            </div>
          }
        />

        {/* Integrações — gradient blue */}
        <DashboardStatCard
          variant="gradient-blue"
          buttonVariant="dark"
          icon={Plug}
          title="Integrações"
          actionHref="/dashboard/integrations"
          actionLabel="Abrir Integrações"
          delay={0.4}
          className="col-span-1 md:col-span-6 lg:col-span-4 min-h-[170px]"
          body={
            <div className="mt-1">
              <span className="inline-block bg-white/40 backdrop-blur-sm text-slate-800 text-xs font-medium px-3 py-1 rounded-full border border-white/50">
                {(integrations?.connected ?? 0) > 0
                  ? `${integrations?.connected} conectada(s)`
                  : "Nenhuma conectada"}
              </span>
            </div>
          }
        />

        {/* Share Links — glass */}
        <DashboardStatCard
          variant="glass"
          buttonVariant="outline"
          icon={LinkIcon}
          title="Share Links"
          actionHref="/dashboard/share-links"
          actionLabel="Abrir Share Links"
          delay={0.5}
          className="col-span-1 md:col-span-6 lg:col-span-4 min-h-[170px]"
          body={
            <div className="mt-1">
              <span className="text-4xl font-light tracking-tighter text-slate-900">
                {isLoading ? "..." : `${shareLinks?.active ?? 0}`}
              </span>
              <p className="text-sm text-slate-500">
                Revogados: {shareLinks?.revoked ?? 0}
              </p>
            </div>
          }
        />

        {/* Ações Rápidas — glass, full width */}
        <div className="col-span-1 md:col-span-12">
          <DashboardQuickActions
            title="Ações Rápidas"
            description="Atalhos para tarefas comuns no Catálogo Fácil."
            actions={quickActions}
          />
        </div>
      </div>
    </section>
  );
}

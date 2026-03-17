"use client";

import {
  Boxes,
  CheckCircle2,
  FolderTree,
  Link2,
  PlugZap,
  ScrollText,
} from "lucide-react";

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
  { href: "/dashboard/base-products", label: "Importar Base Geral" },
  { href: "/dashboard/integrations", label: "Conectar ERP" },
  { href: "/dashboard/base-categories", label: "Criar Categoria" },
  { href: "/dashboard/catalogs", label: "Criar Catálogo" },
  { href: "/dashboard/share-links", label: "Criar Link de Compartilhamento" },
];

function BaseFlowVisual() {
  return (
    <div className="relative h-full min-h-[110px] overflow-hidden rounded-[24px] border border-[rgba(196,182,160,0.24)] bg-[radial-gradient(circle_at_top_left,rgba(234,243,233,0.95),rgba(250,245,237,0.94))]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 140" fill="none">
        <defs>
          <linearGradient id="base-line" x1="30" y1="108" x2="320" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C9D9C8" />
            <stop offset="0.55" stopColor="#7E988C" />
            <stop offset="1" stopColor="#4A7763" />
          </linearGradient>
        </defs>
        <path
          d="M32 108C79 95 123 86 161 87C212 89 241 61 286 52C301 49 316 47 330 47"
          stroke="url(#base-line)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute left-[54px] top-[82px] rounded-full bg-white/95 p-2 shadow-sm">
        <Boxes className="h-4 w-4 text-[#8a6f4d]" />
      </div>
      <div className="absolute left-[155px] top-[74px] rounded-full bg-white/95 p-2 shadow-sm">
        <PlugZap className="h-4 w-4 text-[#68826e]" />
      </div>
      <div className="absolute left-[292px] top-[44px] rounded-full bg-white/98 p-2.5 shadow-md">
        <CheckCircle2 className="h-5 w-5 text-[#3f755f]" />
      </div>
    </div>
  );
}

function ClusterVisual({
  icon,
  accent,
}: {
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="relative h-full min-h-[84px] overflow-hidden rounded-[22px] border border-[rgba(201,189,166,0.22)] bg-[linear-gradient(145deg,rgba(255,252,247,0.9),rgba(247,241,231,0.76))]">
      <div className="absolute inset-x-4 top-4 h-px bg-gradient-to-r from-transparent via-[#d7cdbd] to-transparent" />
      <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/80 bg-white/90 shadow-sm">
        <div style={{ color: accent }}>{icon}</div>
      </div>
      <div className="absolute right-4 bottom-4 h-9 w-9 rounded-full border border-[rgba(196,182,160,0.3)] bg-white/82" />
      <div className="absolute right-9 top-7 h-2 w-2 rounded-full bg-[#d6cdbd]" />
      <div className="absolute right-13 bottom-10 h-1.5 w-1.5 rounded-full bg-[#c6d6c8]" />
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummaryV2();
  const summary = data;

  const baseProducts = summary?.baseProducts;
  const categories = summary?.categories;
  const integrations = summary?.integrations;
  const catalogs = summary?.catalogs;
  const shareLinks = summary?.shareLinks;

  return (
    <section className="flex flex-col gap-3 lg:gap-3.5 xl:gap-4 xl:pt-1">
      <DashboardHero
        title="Resumo Geral"
        description="Uma visão operacional clara da Base Geral, integrações, categorias, catálogos e links de compartilhamento."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(21rem,0.96fr)] xl:items-start xl:gap-4 2xl:gap-5">
        <div className="grid auto-rows-min gap-3 xl:gap-4 2xl:gap-5">
          <DashboardStatCard
            eyebrow="Painel central"
            title="Base Geral"
            actionHref="/dashboard/base-products"
            actionLabel="Abrir Base Geral"
            body={
              <>
                <p className="text-[1.55rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--dashboard-title)] lg:text-[1.9rem]">
                  {isLoading ? "Carregando..." : `${baseProducts?.active ?? 0}`}
                  {!isLoading ? (
                    <span className="ml-2 text-[0.92rem] font-medium tracking-[-0.01em] text-[var(--dashboard-subtitle)] lg:text-[1.02rem]">
                      SKUs ativos
                    </span>
                  ) : null}
                </p>
                <p className="text-[14px] leading-6 lg:text-[15px]">
                  {isError
                    ? "Não foi possível carregar os dados da Base Geral."
                    : `Total de SKUs: ${baseProducts?.total ?? 0}.`}
                </p>
                <div className="grid gap-1 text-sm font-medium text-[#635648]">
                  <span>Última importação: {formatRelativeDate(baseProducts?.latestImportedAt)}</span>
                  <span>Última atualização geral: {formatRelativeDate(baseProducts?.latestUpdatedAt)}</span>
                </div>
              </>
            }
            visual={<BaseFlowVisual />}
            className="min-h-[18rem] xl:min-h-[clamp(17rem,18vw,18.5rem)]"
          />

          <DashboardStatCard
            eyebrow="Conectores"
            title="Integrações Ativas"
            actionHref="/dashboard/integrations"
            actionLabel="Abrir Integrações"
            body={
              <>
                <div
                  className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                    (integrations?.connected ?? 0) > 0
                      ? "border-[#d2dfcf] bg-[#eef7ea] text-[#3e6d45]"
                      : "border-[#e3d8c6] bg-[#f7f0e7] text-[#7a6650]"
                  }`}
                >
                  {(integrations?.connected ?? 0) > 0 ? "Conectado" : "Nenhuma integração conectada"}
                </div>
                <p className="text-[14px] font-semibold leading-5 text-[var(--dashboard-title)]">
                  {isError
                    ? "Não foi possível carregar o resumo das integrações."
                    : formatProviders(integrations?.providers)}
                </p>
              </>
            }
            visual={<ClusterVisual accent="#4c7b66" icon={<PlugZap className="h-6 w-6" />} />}
            compact
            className="min-h-[11.5rem] xl:min-h-[clamp(11rem,11vw,12rem)]"
          />
        </div>

        <div className="grid auto-rows-min gap-3 xl:gap-4 2xl:gap-5">
          <DashboardStatCard
            eyebrow="Estrutura"
            title="Categorias"
            actionHref="/dashboard/base-categories"
            actionLabel="Gerenciar Categorias"
            body={
              <>
                <p className="text-[14px] font-semibold leading-5 text-[var(--dashboard-title)]">
                  {isLoading
                    ? "Carregando categorias..."
                    : `Categorias: ${categories?.categoriesTotal ?? 0} | Subcategoria: ${categories?.subcategoriesTotal ?? 0}`}
                </p>
                <p className="text-[13px] leading-5">
                  {isError
                    ? "Não foi possível carregar a estrutura de categorias."
                    : "Estruture a navegação da Base Geral e dê clareza ao catálogo."}
                </p>
              </>
            }
            visual={<ClusterVisual accent="#7c7f6c" icon={<FolderTree className="h-6 w-6" />} />}
            compact
            className="min-h-[10.25rem] xl:min-h-[clamp(9.75rem,9.4vw,10.75rem)]"
          />

          <DashboardStatCard
            eyebrow="Catálogos"
            title="Catálogos Criados"
            actionHref="/dashboard/catalogs"
            actionLabel="Abrir Catálogos"
            body={
              <>
                <p className="text-[14px] font-semibold leading-5 text-[var(--dashboard-title)]">
                  {isLoading
                    ? "Carregando catálogos..."
                    : `Catálogos: ${catalogs?.total ?? 0} | Itens: ${catalogs?.itemsTotal ?? 0}`}
                </p>
                <p className="text-[13px] leading-5 text-[var(--dashboard-subtitle)]">
                  {isError
                    ? "Não foi possível carregar o resumo de catálogos."
                    : "Monte catálogos, organize os itens e faça o download do material para distribuição."}
                </p>
              </>
            }
            visual={<ClusterVisual accent="#8c7251" icon={<ScrollText className="h-6 w-6" />} />}
            compact
            className="min-h-[10.5rem] xl:min-h-[clamp(10rem,9.8vw,11.25rem)]"
          />

          <DashboardStatCard
            eyebrow="Distribuição"
            title="Links de Compartilhamento"
            actionHref="/dashboard/share-links"
            actionLabel="Abrir Share Links"
            body={
              <>
                <p className="text-[14px] font-semibold leading-5 text-[var(--dashboard-title)]">
                  {isLoading
                    ? "Carregando share links..."
                    : `Ativos: ${shareLinks?.active ?? 0} | Revogados: ${shareLinks?.revoked ?? 0}`}
                </p>
                <p className="text-[13px] leading-5 text-[var(--dashboard-subtitle)]">
                  {isError
                    ? "Não foi possível carregar o resumo dos links."
                    : "Compartilhe catálogos e acompanhe o material publicado com links reais do sistema, criados por você."}
                </p>
              </>
            }
            visual={<ClusterVisual accent="#3f6c5a" icon={<Link2 className="h-6 w-6" />} />}
            compact
            className="min-h-[10.5rem] xl:min-h-[clamp(10rem,9.8vw,11.25rem)]"
          />
        </div>
      </div>

      <DashboardQuickActions
        title="Ações Rápidas"
        description="Atalhos para tarefas comuns no Catálogo Fácil."
        actions={quickActions}
        className="min-h-[6.25rem] xl:min-h-[clamp(5.75rem,5.8vw,6.5rem)] xl:p-4"
      />
    </section>
  );
}

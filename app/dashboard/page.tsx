"use client";

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

function BaseGeralVisual() {
  return (
    <div style={{ borderRadius: 20, overflow: "hidden", width: "100%", height: "100%", minHeight: 80, position: "relative", background: "linear-gradient(145deg, #fff8f0 0%, #f5ede0 100%)" }}>
      {/* conveyor belt */}
      <div style={{ alignItems: "center", bottom: 32, display: "flex", left: 16, position: "absolute", right: 16 }}>
        <div style={{ background: "linear-gradient(180deg,#d4c4ae 0%,#c2b09a 100%)", borderRadius: 5, boxShadow: "rgba(100,60,20,0.18) 0px 2px 6px", height: 10, left: 0, position: "absolute", right: 0 }} />
        <div style={{ background: "linear-gradient(145deg,#b89a7a,#8c6a4a)", borderRadius: "50%", border: "2px solid #a07858", boxShadow: "rgba(80,40,10,0.22) 0px 2px 4px", height: 16, left: 4, position: "absolute", top: -3, width: 16 }} />
        <div style={{ background: "linear-gradient(145deg,#b89a7a,#8c6a4a)", borderRadius: "50%", border: "2px solid #a07858", boxShadow: "rgba(80,40,10,0.22) 0px 2px 4px", height: 14, left: "50%", position: "absolute", top: -2, translate: "-50%", width: 14 }} />
        <div style={{ background: "linear-gradient(145deg,#b89a7a,#8c6a4a)", borderRadius: "50%", border: "2px solid #a07858", boxShadow: "rgba(80,40,10,0.22) 0px 2px 4px", height: 16, position: "absolute", right: 4, top: -3, width: 16 }} />
      </div>
      {/* box */}
      <div style={{ bottom: 44, height: 48, left: 38, position: "absolute", width: 52 }}>
        <div style={{ background: "linear-gradient(160deg,#d4a96a 0%,#b8843c 100%)", borderRadius: "4px 4px 3px 3px", bottom: 0, boxShadow: "rgba(80,40,10,0.24) 0px 4px 10px", height: 40, left: 0, position: "absolute", width: 52 }} />
        <div style={{ background: "linear-gradient(180deg,#c8924a 0%,#b8843c 100%)", borderRadius: "3px 3px 0 0", height: 14, left: 0, position: "absolute", top: 0, width: 52 }} />
        <div style={{ backgroundColor: "rgba(255,220,160,0.6)", height: 3, left: 0, position: "absolute", right: 0, top: 10 }} />
        <div style={{ backgroundColor: "rgba(100,60,20,0.12)", bottom: 0, left: 25, position: "absolute", top: 14, width: 2 }} />
      </div>
      {/* gear */}
      <div style={{ bottom: 50, left: 128, position: "absolute" }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <path d="M22 14a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" fill="#C9A96E" opacity="0.9"/>
          <path d="M22 10a12 12 0 1 1 0 24 12 12 0 0 1 0-24z" fill="none" stroke="#C9A96E" strokeWidth="2" opacity="0.4"/>
          <rect x="20" y="4" width="4" height="7" rx="2" fill="#C9A96E" opacity="0.85"/>
          <rect x="20" y="33" width="4" height="7" rx="2" fill="#C9A96E" opacity="0.85"/>
          <rect x="4" y="20" width="7" height="4" rx="2" fill="#C9A96E" opacity="0.85"/>
          <rect x="33" y="20" width="7" height="4" rx="2" fill="#C9A96E" opacity="0.85"/>
          <rect x="8.5" y="8.5" width="4" height="7" rx="2" fill="#C9A96E" opacity="0.72" transform="rotate(45 10.5 12)"/>
          <rect x="31.5" y="8.5" width="4" height="7" rx="2" fill="#C9A96E" opacity="0.72" transform="rotate(-45 33.5 12)"/>
          <rect x="8.5" y="28.5" width="4" height="7" rx="2" fill="#C9A96E" opacity="0.72" transform="rotate(-45 10.5 32)"/>
          <rect x="31.5" y="28.5" width="4" height="7" rx="2" fill="#C9A96E" opacity="0.72" transform="rotate(45 33.5 32)"/>
          <circle cx="22" cy="22" r="4" fill="#F5EDE0"/>
        </svg>
      </div>
      {/* checkmark */}
      <div style={{ bottom: 50, position: "absolute", right: 24 }}>
        <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
          <circle cx="23" cy="23" r="22" fill="#2E6C58" opacity="0.12"/>
          <circle cx="23" cy="23" r="18" fill="#2E6C58" opacity="0.18"/>
          <circle cx="23" cy="23" r="14" fill="#2E6C58"/>
          <path d="M15 23l5.5 5.5L31 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {/* decorative dots */}
      <div style={{ backgroundColor: "#C9A96E", borderRadius: "50%", height: 5, opacity: 0.35, position: "absolute", right: 20, top: 16, width: 5 }} />
      <div style={{ backgroundColor: "#2E6C58", borderRadius: "50%", height: 3, opacity: 0.3, position: "absolute", right: 36, top: 26, width: 3 }} />
      <div style={{ backgroundColor: "#B8843C", borderRadius: "50%", height: 4, left: 20, opacity: 0.28, position: "absolute", top: 20, width: 4 }} />
    </div>
  );
}

function CategoriasVisual() {
  return (
    <div style={{ backgroundColor: "#F0ECE4", borderRadius: 18, overflow: "hidden", width: "100%", height: "100%", minHeight: 68, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="128" height="80" viewBox="0 0 128 80" fill="none">
        <line x1="64" y1="16" x2="32" y2="44" stroke="#A8C4B0" strokeWidth="1.5"/>
        <line x1="64" y1="16" x2="96" y2="44" stroke="#A8C4B0" strokeWidth="1.5"/>
        <line x1="32" y1="44" x2="16" y2="68" stroke="#A8C4B0" strokeWidth="1.5"/>
        <line x1="32" y1="44" x2="48" y2="68" stroke="#A8C4B0" strokeWidth="1.5"/>
        <line x1="96" y1="44" x2="80" y2="68" stroke="#A8C4B0" strokeWidth="1.5"/>
        <line x1="96" y1="44" x2="112" y2="68" stroke="#A8C4B0" strokeWidth="1.5"/>
        <circle cx="64" cy="16" r="9" fill="#2E6C58" opacity="0.15"/>
        <circle cx="64" cy="16" r="6" fill="#2E6C58"/>
        <circle cx="32" cy="44" r="7" fill="#2E6C58" opacity="0.15"/>
        <circle cx="32" cy="44" r="5" fill="#3D8068"/>
        <circle cx="96" cy="44" r="7" fill="#2E6C58" opacity="0.15"/>
        <circle cx="96" cy="44" r="5" fill="#3D8068"/>
        <circle cx="16" cy="68" r="5" fill="#2E6C58" opacity="0.12"/>
        <circle cx="16" cy="68" r="3.5" fill="#5A9E82"/>
        <circle cx="48" cy="68" r="5" fill="#2E6C58" opacity="0.12"/>
        <circle cx="48" cy="68" r="3.5" fill="#5A9E82"/>
        <circle cx="80" cy="68" r="5" fill="#2E6C58" opacity="0.12"/>
        <circle cx="80" cy="68" r="3.5" fill="#5A9E82"/>
        <circle cx="112" cy="68" r="5" fill="#2E6C58" opacity="0.12"/>
        <circle cx="112" cy="68" r="3.5" fill="#5A9E82"/>
      </svg>
    </div>
  );
}

function CatalogosVisual() {
  return (
    <div style={{ backgroundColor: "#F8F3EC", borderRadius: 18, overflow: "hidden", width: "100%", height: "100%", minHeight: 68, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="120" height="76" viewBox="0 0 120 76" fill="none">
        <rect x="72" y="18" width="22" height="52" rx="3" fill="#8C7251"/>
        <rect x="72" y="18" width="4" height="52" fill="#6B5238" opacity="0.7"/>
        <line x1="80" y1="24" x2="91" y2="24" stroke="rgba(255,240,210,0.4)"/>
        <line x1="80" y1="28" x2="91" y2="28" stroke="rgba(255,240,210,0.3)"/>
        <rect x="50" y="14" width="24" height="56" rx="3" fill="#C35A2F"/>
        <rect x="50" y="14" width="5" height="56" fill="#9E3D18" opacity="0.7"/>
        <line x1="59" y1="22" x2="71" y2="22" stroke="rgba(255,230,210,0.45)" strokeWidth="1.2"/>
        <line x1="59" y1="27" x2="71" y2="27" stroke="rgba(255,230,210,0.3)"/>
        <line x1="59" y1="32" x2="71" y2="32" stroke="rgba(255,230,210,0.2)"/>
        <rect x="26" y="10" width="26" height="60" rx="3" fill="#2E6C58"/>
        <rect x="26" y="10" width="6" height="60" fill="#1E4D3E" opacity="0.7"/>
        <line x1="36" y1="20" x2="49" y2="20" stroke="rgba(200,240,220,0.5)" strokeWidth="1.2"/>
        <line x1="36" y1="26" x2="49" y2="26" stroke="rgba(200,240,220,0.35)"/>
        <line x1="36" y1="32" x2="49" y2="32" stroke="rgba(200,240,220,0.25)"/>
        <line x1="36" y1="38" x2="49" y2="38" stroke="rgba(200,240,220,0.2)"/>
        <ellipse cx="60" cy="10" rx="30" ry="4" fill="#F0E8D8" opacity="0.7"/>
        <ellipse cx="60" cy="73" rx="32" ry="3.5" fill="#8C6A3E" opacity="0.15"/>
      </svg>
    </div>
  );
}

function ShareLinksVisual() {
  return (
    <div style={{ backgroundColor: "#F8F4EE", borderRadius: 18, overflow: "hidden", width: "100%", height: "100%", minHeight: 68, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="80" height="72" viewBox="0 0 80 72" fill="none">
        <path d="M8 34 C8 18 20 6 40 6 C60 6 72 18 72 34" stroke="#2E6C58" strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
        <path d="M14 36 C14 22 26 10 40 10 C54 10 66 22 66 36" stroke="#2E6C58" strokeWidth="5" strokeLinecap="round" opacity="0.25"/>
        <path d="M22 38 C22 28 30 20 40 20 C50 20 58 28 58 38" stroke="#2E6C58" strokeWidth="5" strokeLinecap="round" opacity="0.55"/>
        <path d="M30 40 C30 34 34 28 40 28 C46 28 50 34 50 40" stroke="#2E6C58" strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
        <circle cx="40" cy="58" r="5" fill="#2E6C58"/>
        <ellipse cx="40" cy="64" rx="4" ry="1.5" fill="#2E6C58" opacity="0.15"/>
      </svg>
    </div>
  );
}

/* Integrações: visual placeholder — futuro: exibir logo do ERP provider via API */
function IntegrationVisual() {
  return (
    <div style={{ background: "linear-gradient(145deg,#fafaf7 0%,#f2ede6 100%)", borderRadius: 18, overflow: "hidden", width: "100%", height: "100%", minHeight: 68, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="110" height="76" viewBox="0 0 110 76" fill="none">
        <rect x="28" y="20" width="54" height="36" rx="18" fill="#EEF6F0" stroke="#B8D8C4" strokeWidth="1.2"/>
        <path d="M50 34 L50 28 M60 34 L60 28" stroke="#2E6C58" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M46 34 L64 34 L64 40 C64 44 60 47 55 47 C50 47 46 44 46 40 Z" fill="#2E6C58" opacity="0.9"/>
        <path d="M58 40 L53 44 L55 40 L50 40 L55 36 L53 40 Z" fill="white" opacity="0.95"/>
        <circle cx="18" cy="16" r="7" fill="#2E6C58" opacity="0.06"/>
        <circle cx="18" cy="16" r="4" fill="#2E6C58" opacity="0.08"/>
        <circle cx="92" cy="60" r="8" fill="#2E6C58" opacity="0.06"/>
        <circle cx="92" cy="60" r="5" fill="#2E6C58" opacity="0.08"/>
        <circle cx="28" cy="56" r="2" fill="#B8D8C4"/>
        <circle cx="82" cy="20" r="2" fill="#B8D8C4"/>
      </svg>
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
    <section className="flex min-h-0 flex-1 flex-col gap-2 lg:gap-2 xl:gap-2.5">
      <DashboardHero
        title="Resumo Geral"
        description="Uma visão operacional clara da Base Geral, integrações, categorias, catálogos e links de compartilhamento."
        className="flex-shrink-0"
      />

      {/* Grid principal de cards — preenche o espaço disponível */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-2 xl:gap-2.5">
        {/* Coluna Esquerda: Base Geral + Integrações */}
        <div className="flex min-h-0 flex-col gap-2 lg:flex-[1.18] lg:gap-2 xl:gap-2.5">
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
            visual={<BaseGeralVisual />}
            className="lg:min-h-[clamp(8rem,18dvh,14rem)] lg:flex-[1.6]"
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
            visual={<IntegrationVisual />}
            compact
            className="lg:min-h-[clamp(5.5rem,12dvh,10rem)] lg:flex-1"
          />
        </div>

        {/* Coluna Direita: Categorias + Catálogos + Links */}
        <div className="flex min-h-0 flex-col gap-2 lg:flex-[0.82] lg:gap-2 xl:gap-2.5">
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
                <p className="text-[13px] leading-5 lg:hidden">
                  {isError
                    ? "Não foi possível carregar a estrutura de categorias."
                    : "Estruture a navegação da Base Geral e dê clareza ao catálogo."}
                </p>
              </>
            }
            visual={<CategoriasVisual />}
            compact
            className="lg:min-h-[clamp(4rem,9dvh,8rem)] lg:flex-1"
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
                <p className="text-[13px] leading-5 lg:hidden text-[var(--dashboard-subtitle)]">
                  {isError
                    ? "Não foi possível carregar o resumo de catálogos."
                    : "Monte catálogos, organize os itens e faça o download do material para distribuição."}
                </p>
              </>
            }
            visual={<CatalogosVisual />}
            compact
            className="lg:min-h-[clamp(4rem,9.5dvh,8rem)] lg:flex-1"
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
                <p className="text-[13px] leading-5 lg:hidden text-[var(--dashboard-subtitle)]">
                  {isError
                    ? "Não foi possível carregar o resumo dos links."
                    : "Compartilhe catálogos e acompanhe o material publicado com links reais do sistema, criados por você."}
                </p>
              </>
            }
            visual={<ShareLinksVisual />}
            compact
            className="lg:min-h-[clamp(4rem,9.5dvh,8rem)] lg:flex-1"
          />
        </div>
      </div>

      {/* Ações Rápidas — fixo na parte inferior */}
      <DashboardQuickActions
        title="Ações Rápidas"
        description="Atalhos para tarefas comuns no Catálogo Fácil."
        actions={quickActions}
        className="flex-shrink-0 xl:p-3.5"
      />
    </section>
  );
}

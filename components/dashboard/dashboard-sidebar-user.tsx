import { CircleHelp, ShieldCheck, UserCircle2 } from "lucide-react";

export function DashboardSidebarUser() {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[var(--dashboard-sidebar-border)] bg-white/6 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:min-h-[86px]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[var(--dashboard-sidebar-text)]">
            <UserCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--dashboard-sidebar-text)]">
              Usuário
            </p>
            <p className="text-xs text-[var(--dashboard-sidebar-muted)]">
              Melhor Qualidade
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border border-[var(--dashboard-sidebar-border)] bg-white/5 px-4 py-4 lg:min-h-[89px]">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--dashboard-sidebar-text)]">
          <ShieldCheck className="h-4 w-4 text-[#cae5c9]" />
          <span>Sistema saudável</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--dashboard-sidebar-muted)]">
          <CircleHelp className="h-4 w-4" />
          <span>Ajuda e suporte</span>
        </div>
      </div>
    </div>
  );
}

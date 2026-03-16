import Image from "next/image";
import { CircleHelp, Globe, Instagram, Mail, ShieldCheck, UserCircle2 } from "lucide-react";

export function DashboardSidebarUser() {
  return (
    <div className="space-y-3">
      <div className="rounded-[22px] border border-[var(--dashboard-sidebar-border)] bg-white/6 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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

      <div className="space-y-3 rounded-[22px] border border-[var(--dashboard-sidebar-border)] bg-white/5 px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--dashboard-sidebar-text)]">
          <ShieldCheck className="h-4 w-4 text-[#cae5c9]" />
          <span>Sistema saudável</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--dashboard-sidebar-muted)]">
          <CircleHelp className="h-4 w-4" />
          <span>Ajuda e suporte</span>
        </div>
      </div>

      <div className="rounded-[22px] border border-[var(--dashboard-sidebar-border)] bg-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px] bg-white/92 p-1.5 shadow-sm">
            <Image
              src="/solução-viavel-logo.png"
              alt="Solução Viável"
              width={44}
              height={44}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--dashboard-sidebar-text)]">
              Solução Viável
            </p>
            <p className="text-[11px] text-[var(--dashboard-sidebar-muted)]">
              Sistemas para diversas necessidades
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 text-xs text-[var(--dashboard-sidebar-muted)]">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            <span>contato@solucaoviavel.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Instagram className="h-3.5 w-3.5" />
            <span>@solucaoviavel</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" />
            <span>solucaoviavel.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

import { DashboardSurfaceCard } from "@/components/dashboard/dashboard-surface-card";
import { cn } from "@/lib/utils";

type QuickAction = {
  href: string;
  label: string;
};

type DashboardQuickActionsProps = {
  title: string;
  description: string;
  actions: QuickAction[];
  className?: string;
};

export function DashboardQuickActions({
  title,
  description,
  actions,
  className,
}: DashboardQuickActionsProps) {
  return (
    <DashboardSurfaceCard
      embossed
      className={cn("dashboard-compact-qa flex-shrink-0", className)}
      style={{ minHeight: "160px" }}
    >
      <div className="space-y-0.5">
        <h2
          className="text-[20px] font-semibold uppercase tracking-[0.12em] bg-gradient-to-b from-[#fffae6] via-[#f5c518] to-[#996515] bg-clip-text text-transparent drop-shadow-sm"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          {title}
        </h2>
        <p className="dashboard-compact-qa-desc text-xs text-white/60">{description}</p>
      </div>

      {/* Spacer — 3x o espaço original entre título e botões */}
      <div className="flex-1" />

      <div className="flex flex-wrap gap-4">
        {actions.map((action) => (
          <div key={action.href} className="group relative inline-block">
            <div className="absolute inset-[-2px] z-0 rounded-xl bg-[#f5c518] opacity-40 blur-[5px] transition-all duration-300 group-hover:opacity-60 group-hover:blur-[7px]" />
            <Link
              href={action.href}
              className={cn(
                "relative z-10 inline-flex h-9 items-center rounded-xl border border-[#b58b57]/50 px-4 text-[14px] font-bold",
                "bg-[#0e2e22] bg-[url('/textura-couro.jpg')] bg-cover bg-center",
                "shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.15)]",
                "transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110",
              )}
            >
              <div className="absolute left-1/4 top-0 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
              <span className="bg-gradient-to-b from-[#fffae6] via-[#f5c518] to-[#996515] bg-clip-text text-transparent">
                {action.label}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </DashboardSurfaceCard>
  );
}

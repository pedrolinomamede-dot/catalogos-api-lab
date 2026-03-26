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
      variant="glass"
      delay={0.6}
      className={cn("flex-shrink-0", className)}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-medium text-slate-800">
            {title}
          </h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex h-9 items-center rounded-full border border-white/60 bg-white/40 px-4 text-[14px] font-medium text-slate-800 backdrop-blur-sm shadow-[5px_10px_5px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/60"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </DashboardSurfaceCard>
  );
}

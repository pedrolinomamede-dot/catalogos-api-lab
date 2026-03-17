import Link from "next/link";

import { DashboardSurfaceCard } from "@/components/dashboard/dashboard-surface-card";
import { Button } from "@/components/ui/button";
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
    <DashboardSurfaceCard className={cn("gap-2 sm:gap-2.5", className)}>
      <div className="space-y-1">
        <h2 className="text-[1.4rem] font-medium leading-none tracking-[-0.04em] text-[var(--dashboard-title)] lg:text-[1.62rem]">
          {title}
        </h2>
        <p className="text-[13px] text-[var(--dashboard-subtitle)] lg:text-sm">{description}</p>
      </div>

      <div className="mt-0.5 flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            size="sm"
            className="h-7 rounded-full border border-[#d0c1ad] bg-[rgba(255,250,241,0.92)] px-3.5 text-[12px] font-semibold text-[#2f261e] shadow-none hover:bg-[#f4eadc] lg:h-7.5"
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>
    </DashboardSurfaceCard>
  );
}

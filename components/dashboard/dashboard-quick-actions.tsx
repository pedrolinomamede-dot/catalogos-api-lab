import Link from "next/link";

import { DashboardSurfaceCard } from "@/components/dashboard/dashboard-surface-card";
import { Button } from "@/components/ui/button";

type QuickAction = {
  href: string;
  label: string;
};

type DashboardQuickActionsProps = {
  title: string;
  description: string;
  actions: QuickAction[];
};

export function DashboardQuickActions({
  title,
  description,
  actions,
}: DashboardQuickActionsProps) {
  return (
    <DashboardSurfaceCard className="gap-3">
      <div className="space-y-1.5">
        <h2 className="text-[1.65rem] font-medium leading-none tracking-[-0.04em] text-[var(--dashboard-title)] lg:text-[1.9rem]">
          {title}
        </h2>
        <p className="text-sm lg:text-base text-[var(--dashboard-subtitle)]">{description}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5">
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            size="sm"
            className="h-10 rounded-full border border-[#d0c1ad] bg-[rgba(255,250,241,0.92)] px-4 text-sm font-semibold text-[#2f261e] shadow-none hover:bg-[#f4eadc]"
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>
    </DashboardSurfaceCard>
  );
}

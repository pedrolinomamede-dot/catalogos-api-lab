import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DashboardSurfaceCard } from "@/components/dashboard/dashboard-surface-card";
import { cn } from "@/lib/utils";

type DashboardStatCardProps = {
  title: string;
  eyebrow?: string;
  body: ReactNode;
  visual?: ReactNode;
  footer?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  compact?: boolean;
};

export function DashboardStatCard({
  title,
  eyebrow,
  body,
  visual,
  footer,
  actionHref,
  actionLabel,
  className,
  compact = false,
}: DashboardStatCardProps) {
  return (
    <DashboardSurfaceCard
      className={cn(
        "dashboard-compact-card-gap flex flex-col",
        compact ? "lg:p-4" : "",
        compact ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-2.5",
        className,
      )}
    >
      <div className="space-y-1">
        {eyebrow ? (
          <p className="dashboard-compact-eyebrow text-xs font-semibold uppercase tracking-[0.28em] text-[#6f665b]">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-medium leading-none tracking-[-0.04em] text-[var(--dashboard-title)]",
            compact
              ? "text-[1.35rem] lg:text-[1.48rem] xl:text-[1.56rem]"
              : "text-[1.55rem] lg:text-[1.72rem] xl:text-[1.82rem]",
          )}
        >
          {title}
        </h2>
      </div>

      {compact ? (
        <div className="relative min-w-0 flex-1 text-[var(--dashboard-subtitle)]">
          <div className="dashboard-compact-card-body flex flex-col space-y-1.5 lg:pr-[9.75rem]">{body}</div>
          {visual ? (
            <div className="dashboard-compact-card-visual mt-2 min-h-[68px] lg:pointer-events-none lg:absolute lg:right-0 lg:top-1/2 lg:mt-0 lg:w-[9rem] lg:-translate-y-1/2 lg:min-h-[76px]">
              {visual}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(9rem,0.88fr)] lg:items-center lg:gap-3 xl:gap-4">
          <div className="space-y-2 text-[var(--dashboard-subtitle)]">{body}</div>
          {visual ? <div className="min-h-[80px] lg:min-h-[72px] xl:min-h-[100px]">{visual}</div> : null}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-0.5">
        {actionHref && actionLabel ? (
          <Button
            asChild
            size="sm"
            className={cn(
              "rounded-full border border-[#c9baa6] bg-[#f8f2e9] px-4 text-sm font-semibold text-[#2f261e] shadow-none hover:bg-[#f0e7d9]",
              compact ? "h-8 px-3.5 text-[12px]" : "h-9",
            )}
          >
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
        {footer}
      </div>
    </DashboardSurfaceCard>
  );
}

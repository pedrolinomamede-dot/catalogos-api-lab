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
}: DashboardStatCardProps) {
  return (
    <DashboardSurfaceCard className={cn("flex flex-col gap-3.5", className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6f665b]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[1.6rem] font-medium leading-none tracking-[-0.04em] text-[var(--dashboard-title)] lg:text-[1.82rem]">
          {title}
        </h2>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.16fr_0.84fr] lg:items-center">
        <div className="space-y-2.5 text-[var(--dashboard-subtitle)]">{body}</div>
        {visual ? <div className="min-h-[96px] lg:min-h-[110px]">{visual}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
        {actionHref && actionLabel ? (
          <Button
            asChild
            size="sm"
            className="h-9 rounded-full border border-[#c9baa6] bg-[#f8f2e9] px-4 text-sm font-semibold text-[#2f261e] shadow-none hover:bg-[#f0e7d9]"
          >
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
        {footer}
      </div>
    </DashboardSurfaceCard>
  );
}

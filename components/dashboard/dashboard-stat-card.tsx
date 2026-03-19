import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardSurfaceCard } from "@/components/dashboard/dashboard-surface-card";
import { cn } from "@/lib/utils";

type DashboardStatCardProps = {
  title: string;
  body: ReactNode;
  icon?: LucideIcon;
  footer?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  actionClassName?: string;
  className?: string;
  compact?: boolean;
  embossed?: boolean;
};

export function DashboardStatCard({
  title,
  body,
  icon: Icon,
  footer,
  actionHref,
  actionLabel,
  actionClassName,
  className,
  compact = false,
  embossed = false,
}: DashboardStatCardProps) {
  return (
    <DashboardSurfaceCard
      embossed={embossed}
      className={cn(
        "dashboard-compact-card-gap relative flex flex-col",
        compact ? "gap-2.5 sm:gap-3" : "gap-3 sm:gap-3.5",
        className,
      )}
    >
      {/* Icon — gold embroidered on card */}
      {Icon ? (
        <div className={cn("absolute z-20", compact ? "right-3 top-3 sm:right-4 sm:top-4" : "right-4 top-4 sm:right-5 sm:top-5")}>
          <Icon
            className={cn(
              "text-[#d4af37]/70 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
              compact ? "h-8 w-8" : "h-10 w-10",
            )}
            strokeWidth={1.2}
          />
        </div>
      ) : null}

      {/* Title — gold gradient, pulled up */}
      <h2
        className={cn(
          "-mt-2 font-semibold uppercase tracking-[0.12em] drop-shadow-sm",
          embossed
            ? "bg-gradient-to-b from-[#fffae6] via-[#f5c518] to-[#996515] bg-clip-text text-transparent"
            : "text-[var(--dashboard-title)]",
          compact ? "text-base" : "text-[20px]",
        )}
        style={{ fontFamily: "var(--font-editorial)" }}
      >
        {title}
      </h2>

      {/* Body */}
      <div
        className={cn(
          "flex-1",
          compact ? "space-y-1" : "space-y-1.5",
          embossed ? "text-white/70" : "text-[var(--dashboard-subtitle)]",
        )}
      >
        {body}
      </div>

      {/* Action button — pushed down */}
      <div className={cn("mt-auto flex flex-wrap items-center gap-2 pt-2", actionClassName)}>
        {actionHref && actionLabel ? (
          embossed ? (
            <div className="group relative inline-block">
              <div className="absolute inset-[-2px] z-0 rounded-xl bg-[#f5c518] opacity-40 blur-[5px] transition-all duration-300 group-hover:opacity-60 group-hover:blur-[7px]" />
              <Link
                href={actionHref}
                className={cn(
                  "relative z-10 inline-flex items-center rounded-xl border border-[#b58b57]/50 text-sm font-bold",
                  "bg-[#0e2e22] bg-[url('/textura-couro.jpg')] bg-cover bg-center",
                  "shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.15)]",
                  "transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110",
                  "h-9 px-4 text-[14px]",
                )}
              >
                <div className="absolute left-1/4 top-0 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
                <span className="bg-gradient-to-b from-[#fffae6] via-[#f5c518] to-[#996515] bg-clip-text text-transparent">
                  {actionLabel}
                </span>
              </Link>
            </div>
          ) : (
            <Link
              href={actionHref}
              className={cn(
                "inline-flex items-center rounded-full border border-[#c9baa6] bg-[#f8f2e9] px-4 text-sm font-semibold text-[#2f261e] shadow-none hover:bg-[#f0e7d9]",
                "h-9 px-4 text-[14px]",
              )}
            >
              {actionLabel}
            </Link>
          )
        ) : null}
        {footer}
      </div>
    </DashboardSurfaceCard>
  );
}

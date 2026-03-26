import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { DashboardSurfaceCard, type GlassVariant } from "@/components/dashboard/dashboard-surface-card";
import { cn } from "@/lib/utils";

export type ButtonVariant = "dark" | "light" | "outline";

type DashboardStatCardProps = {
  title: string;
  body: ReactNode;
  icon?: LucideIcon;
  footer?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  variant?: GlassVariant;
  buttonVariant?: ButtonVariant;
  delay?: number;
};

const buttonClasses: Record<ButtonVariant, string> = {
  dark: "bg-[#1c1c1e] text-white hover:bg-black shadow-[4px_8px_12px_rgba(0,0,0,0.25)]",
  light:
    "bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/30 shadow-[3px_6px_10px_rgba(0,0,0,0.10)]",
  outline:
    "bg-white/40 backdrop-blur-sm border border-white/60 text-slate-800 hover:bg-white/60 shadow-[3px_6px_10px_rgba(0,0,0,0.10)]",
};

export function DashboardStatCard({
  title,
  body,
  icon: Icon,
  footer,
  actionHref,
  actionLabel,
  className,
  variant = "glass",
  buttonVariant = "dark",
  delay = 0,
}: DashboardStatCardProps) {
  const isOnDark = variant === "gradient-purple";

  return (
    <DashboardSurfaceCard
      variant={variant}
      delay={delay}
      className={cn("flex flex-col", className)}
    >
      {/* Header: title + icon */}
      <div className="flex justify-between items-start mb-4">
        <h3
          className={cn(
            "text-lg font-medium",
            isOnDark ? "text-white/90" : "text-slate-800",
          )}
        >
          {title}
        </h3>
        {Icon ? (
          <div
            className={cn(
              "p-2 rounded-full shadow-sm",
              isOnDark
                ? "bg-white/20 backdrop-blur-md"
                : "bg-white/50",
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5",
                isOnDark ? "text-white" : "text-[#9b8bf4]",
              )}
            />
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex-1">
        {body}
      </div>

      {/* Action button */}
      {actionHref && actionLabel ? (
        <div className="mt-4">
          <Link
            href={actionHref}
            className={cn(
              "inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 active:scale-95",
              buttonClasses[buttonVariant],
            )}
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </DashboardSurfaceCard>
  );
}

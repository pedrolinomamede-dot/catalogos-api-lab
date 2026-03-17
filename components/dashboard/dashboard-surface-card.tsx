import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type DashboardSurfaceCardProps = HTMLAttributes<HTMLDivElement>;

export function DashboardSurfaceCard({
  className,
  style,
  ...props
}: DashboardSurfaceCardProps) {
  return (
    <div
      className={cn("dashboard-panel flex flex-col rounded-[28px] p-4 sm:p-5 xl:p-6", className)}
      style={style}
      {...props}
    />
  );
}

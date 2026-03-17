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
      className={cn("dashboard-panel flex flex-col rounded-[28px] p-3.5 sm:p-4 lg:p-4 xl:p-5", className)}
      style={style}
      {...props}
    />
  );
}

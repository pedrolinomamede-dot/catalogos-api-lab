import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type DashboardSurfaceCardProps = HTMLAttributes<HTMLDivElement>;

export function DashboardSurfaceCard({
  className,
  ...props
}: DashboardSurfaceCardProps) {
  return (
    <div
      className={cn("dashboard-panel rounded-[28px] p-4 sm:p-5 xl:p-6", className)}
      {...props}
    />
  );
}

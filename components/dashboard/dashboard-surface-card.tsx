import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type DashboardSurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  embossed?: boolean;
};

export function DashboardSurfaceCard({
  className,
  style,
  embossed = false,
  children,
  ...props
}: DashboardSurfaceCardProps) {
  if (embossed) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[28px] border border-[#1a100a]",
          "bg-[#4a3018] bg-[url('/textura-couro.jpg')] bg-cover bg-center",
          "shadow-[0_15px_30px_rgba(0,0,0,0.9),0_5px_10px_rgba(0,0,0,0.5)]",
          "flex flex-col",
          className,
        )}
        style={style}
        {...props}
      >
        {/* Inner recessed area */}
        <div
          className={cn(
            "absolute inset-[6px] rounded-[22px]",
            "bg-[#2a1c13] bg-[url('/textura-couro.jpg')] bg-cover bg-center",
            "border border-[#150d08]",
            "shadow-[inset_6px_12px_24px_rgba(0,0,0,0.95),inset_-1px_-2px_4px_rgba(255,255,255,0.1)]",
          )}
        />
        {/* Dark overlay on inner */}
        <div className="absolute inset-[6px] rounded-[22px] bg-black/50" />
        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col px-3.5 pb-[24px] pt-3.5 sm:px-4 sm:pt-4 lg:px-4 lg:pt-4 xl:px-5 xl:pt-5">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("dashboard-panel flex flex-col rounded-[28px] p-3.5 sm:p-4 lg:p-4 xl:p-5", className)}
      style={style}
      {...props}
    />
  );
}

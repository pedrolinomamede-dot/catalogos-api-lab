import type { HTMLAttributes } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export type GlassVariant = "glass" | "gradient-purple" | "gradient-blue";

type DashboardSurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: GlassVariant;
  delay?: number;
};

const glassClasses: Record<GlassVariant, string> = {
  glass:
    "bg-white/10 border-white/50 border-b-white/10 border-r-white/10 shadow-[15px_25px_40px_rgba(0,0,0,0.12),inset_1px_1px_0px_rgba(255,255,255,0.5)]",
  "gradient-purple":
    "bg-gradient-to-br from-[#9b8bf4]/25 to-[#7a65e8]/25 border-white/50 border-b-white/10 border-r-white/10 shadow-[15px_25px_40px_rgba(120,100,200,0.25),inset_1px_1px_0px_rgba(255,255,255,0.4)]",
  "gradient-blue":
    "bg-gradient-to-br from-[#e0eafc]/25 to-[#cfdef3]/25 border-white/50 border-b-white/10 border-r-white/10 shadow-[15px_25px_40px_rgba(166,193,238,0.25),inset_1px_1px_0px_rgba(255,255,255,0.4)]",
};

export function DashboardSurfaceCard({
  className,
  style,
  variant = "glass",
  delay = 0,
  children,
  ...props
}: DashboardSurfaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      className={cn(
        "group relative p-5 rounded-[2rem] transition-all duration-300 hover:-translate-y-1",
        className,
      )}
      style={style}
      {...props}
    >
      {/* Glass Layer */}
      <div
        className={cn(
          "absolute inset-0 rounded-[2rem] backdrop-blur-xl border overflow-hidden pointer-events-none transition-shadow duration-300 group-hover:shadow-[20px_30px_50px_rgba(0,0,0,0.18),inset_1px_1px_0px_rgba(255,255,255,0.5)]",
          glassClasses[variant],
        )}
      >
        {variant === "gradient-purple" && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        )}
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full flex flex-col drop-shadow-md">
        {children}
      </div>
    </motion.div>
  );
}

import type { HTMLAttributes } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LoadingStateProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
};

export function LoadingState({
  label = "Carregando…",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <Card
      className={cn("p-6", className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded-md bg-muted" aria-hidden />
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded-md bg-muted" aria-hidden />
          <div className="h-3 w-5/6 animate-pulse rounded-md bg-muted" aria-hidden />
          <div className="h-3 w-2/3 animate-pulse rounded-md bg-muted" aria-hidden />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </Card>
  );
}


import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  const Icon = icon;

  return (
    <Card className="p-10">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
        {Icon ? (
          <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
        ) : null}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </Card>
  );
}


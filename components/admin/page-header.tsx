import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
};

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {breadcrumbs ? (
        <div className="text-sm text-white/50">{breadcrumbs}</div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#D8CFBC]">{title}</h1>
          {description ? (
            <p className="text-sm text-white/60">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <Separator className="bg-white/10" />
    </div>
  );
}


import { cn } from "@/lib/utils";

type DashboardHeroProps = {
  title: string;
  description: string;
  className?: string;
};

export function DashboardHero({
  title,
  description,
  className,
}: DashboardHeroProps) {
  return (
    <section className={cn("flex-shrink-0 space-y-1", className)}>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </section>
  );
}

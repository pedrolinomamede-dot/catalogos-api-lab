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
    <section className={cn("flex-shrink-0 space-y-1 lg:space-y-1.5", className)}>
      <div className="space-y-1">
        <h1
          className="text-[1.9rem] font-medium uppercase leading-[0.93] tracking-[-0.05em] text-[var(--dashboard-title)] sm:text-[2.3rem] lg:text-[2.3rem] xl:text-[2.5rem]"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          {title}
        </h1>
        <p className="dashboard-compact-hero-desc max-w-[70ch] text-[14px] leading-5 text-[var(--dashboard-subtitle)] sm:text-[15px] sm:leading-6 lg:line-clamp-1 lg:text-[14px] lg:leading-5 xl:text-[15px]">
          {description}
        </p>
      </div>
      <div className="dashboard-compact-hero-divider h-px w-full bg-gradient-to-r from-[#d8c8b4] via-[#e7ddd0] to-transparent" />
    </section>
  );
}

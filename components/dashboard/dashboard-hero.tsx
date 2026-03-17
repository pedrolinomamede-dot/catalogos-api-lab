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
    <section className={cn("space-y-2.5 xl:h-[108px]", className)}>
      <div className="space-y-1">
        <h1
          className="text-[1.9rem] font-medium uppercase leading-[0.93] tracking-[-0.05em] text-[var(--dashboard-title)] sm:text-[2.4rem] lg:text-[2.75rem]"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          {title}
        </h1>
        <p className="max-w-2xl text-[14px] leading-6 text-[var(--dashboard-subtitle)] sm:text-[15px] sm:leading-6 lg:text-[1rem]">
          {description}
        </p>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-[#d8c8b4] via-[#e7ddd0] to-transparent" />
    </section>
  );
}

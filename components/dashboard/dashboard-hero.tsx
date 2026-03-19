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
      <h1
        className="text-[1.9rem] font-medium uppercase leading-[0.93] tracking-[-0.05em] text-[var(--dashboard-title)] drop-shadow-md sm:text-[2.3rem] lg:text-[2.3rem] xl:text-[2.5rem]"
        style={{ fontFamily: "var(--font-editorial)" }}
      >
        {title}
      </h1>
      <p className="mt-1 text-sm font-medium text-white">
        {description}
      </p>
    </section>
  );
}

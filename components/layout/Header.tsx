"use client";

import { useUiStore } from "@/lib/stores/ui-store";
import { DashboardSearchShell } from "@/components/dashboard/dashboard-search-shell";

type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav);

  const handleMenuClick = () => {
    toggleMobileNav();
    onMenuClick();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(201,185,162,0.28)] bg-[rgba(245,238,228,0.94)] px-4 py-2 backdrop-blur-md sm:px-5 lg:px-6 lg:py-3 xl:px-8 2xl:px-10">
      <div className="mx-auto w-full max-w-[1680px]">
        <DashboardSearchShell showMenuButton onMenuClick={handleMenuClick} />
      </div>
    </header>
  );
}

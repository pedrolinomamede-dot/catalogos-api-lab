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
    <header className="sticky top-0 z-20 border-b border-[rgba(201,185,162,0.28)] bg-[rgba(245,238,228,0.9)] px-4 py-2.5 backdrop-blur-md lg:px-8 lg:py-3">
      <DashboardSearchShell showMenuButton onMenuClick={handleMenuClick} />
    </header>
  );
}

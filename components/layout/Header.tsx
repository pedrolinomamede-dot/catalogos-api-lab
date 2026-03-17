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
    <header className="sticky top-0 z-20 border-b border-[rgba(201,185,162,0.28)] bg-[rgba(245,238,228,0.94)] px-4 py-2.5 backdrop-blur-md lg:px-0 lg:py-[17px]">
      <div className="mx-auto w-full max-w-[1160px] px-0 lg:px-[28px]">
        <DashboardSearchShell showMenuButton onMenuClick={handleMenuClick} />
      </div>
    </header>
  );
}

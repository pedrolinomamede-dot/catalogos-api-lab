"use client";

import type { ReactNode } from "react";

import { useUiStore } from "@/lib/stores/ui-store";

type HeaderProps = {
  title?: ReactNode;
  onMenuClick: () => void;
};

export function Header({ title = "Dashboard", onMenuClick }: HeaderProps) {
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav);

  const handleMenuClick = () => {
    toggleMobileNav();
    onMenuClick();
  };

  return (
    <header className="flex items-center justify-between border-b border-stroke bg-surface/95 px-4 py-3 shadow-soft backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMenuClick}
          className="inline-flex items-center justify-center rounded-md border border-stroke bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:bg-surface-soft lg:hidden"
          aria-label="Abrir menu"
        >
          Menu
        </button>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
      </div>
    </header>
  );
}

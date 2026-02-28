"use client";

import { useEffect } from "react";
import Link from "next/link";

import { useUiStore } from "@/lib/stores/ui-store";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const links = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/base-products", label: "Base Geral" },
  { href: "/dashboard/base-categories", label: "Categorias (Base Geral)" },
  { href: "/dashboard/catalogs", label: "Catálogos" },
  { href: "/dashboard/share-links", label: "Share Links" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const closeMobileNav = useUiStore((state) => state.closeMobileNav);

  useEffect(() => {
    setMobileNavOpen(isOpen);
  }, [isOpen, setMobileNavOpen]);

  const isMobileOpen = mobileNavOpen;
  const isDesktopOpen = sidebarOpen;

  const handleClose = () => {
    closeMobileNav();
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden ${
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden={!isMobileOpen}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-stroke bg-surface px-4 py-6 shadow-soft transition-transform duration-200 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isDesktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full"}`}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between pb-6">
          <span className="text-sm font-semibold uppercase tracking-widest text-muted">
            Painel
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-stroke px-2 py-1 text-xs font-medium text-ink lg:hidden"
            aria-label="Fechar menu"
          >
            Fechar
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface-soft"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}

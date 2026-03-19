"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesCombined,
  Database,
  FileStack,
  FolderKanban,
  Link2,
  PlugZap,
} from "lucide-react";

import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SidebarLink = {
  href: string;
  label: string;
  icon: typeof ChartNoAxesCombined;
  section?: string;
};

const links: SidebarLink[] = [
  {
    href: "/dashboard",
    label: "Visão Geral",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/dashboard/base-products",
    label: "Base Geral",
    icon: Database,
    section: "Base Geral",
  },
  {
    href: "/dashboard/base-categories",
    label: "Categorias",
    icon: FolderKanban,
  },
  {
    href: "/dashboard/integrations",
    label: "Integrações",
    icon: PlugZap,
    section: "Integrações",
  },
  {
    href: "/dashboard/catalogs",
    label: "Catálogos",
    icon: FileStack,
    section: "Catálogos",
  },
  {
    href: "/dashboard/share-links",
    label: "Share Links",
    icon: Link2,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
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

  let renderedSection: string | null = null;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-[#07140f]/55 transition-opacity lg:hidden ${
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden={!isMobileOpen}
      />
      <aside
        className={cn(
          "fixed top-4 bottom-4 left-4 z-40 w-[260px] transform overflow-hidden rounded-[2rem] px-[14px] py-6 transition-transform duration-200",
          "bg-[#0e2e22] bg-[url('/textura-couro.jpg')] bg-cover bg-center",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isDesktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full",
        )}
        style={{
          border: "1px solid var(--dashboard-sidebar-border)",
          boxShadow: "8px 0 24px rgba(0,0,0,0.60), inset 0 1px 2px rgba(255,255,255,0.15)",
        }}
        aria-label="Navegação principal"
      >
        {/* Dark overlay */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-black/30" />
        {/* Inner glow */}
        <div className="pointer-events-none absolute left-[-30%] top-1/4 z-0 h-1/2 w-[160%] rounded-full bg-[#2a6a55] opacity-15 blur-[80px] mix-blend-screen" />

        <div className="relative z-10 flex h-full flex-col">
          {/* Branding */}
          <div className="flex items-start justify-between pb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/solução-viavel-logo.png"
                alt="Solução Viável"
                width={52}
                height={52}
                className="h-[3.2rem] w-[3.2rem] shrink-0 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                priority
              />
              <div className="space-y-1 pt-1">
                <p
                  className="bg-gradient-to-b from-[#fffae6] via-[#f5c518] to-[#996515] bg-clip-text text-[2rem] font-medium leading-[0.92] tracking-[-0.05em] text-transparent drop-shadow-[0_1.5px_0.5px_rgba(0,0,0,0.95)]"
                  style={{ fontFamily: "var(--font-editorial)" }}
                >
                  Catálogo
                  <br />
                  Fácil
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#f5c518]/50">
                  Solução viável
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-[#d4af37]/30 px-3 py-1 text-xs font-medium text-[#f5c518]/60 lg:hidden"
              aria-label="Fechar menu"
            >
              Fechar
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-3 overflow-y-auto pb-2">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;
              const showSection = link.section && link.section !== renderedSection;
              if (showSection) {
                renderedSection = link.section ?? null;
              }

              return (
                <div key={link.href} className="space-y-2">
                  {showSection ? (
                    <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.26em] text-[#f5c518]/40">
                      {link.section}
                    </p>
                  ) : null}
                  <Link
                    href={link.href}
                    onClick={handleClose}
                    className={cn(
                      "relative flex items-center gap-3 overflow-hidden rounded-[24px] border px-4 py-3 text-[20px] font-medium transition-all duration-300",
                      active
                        ? "border-[#d4af37]/30 bg-gradient-to-r from-black/20 to-transparent shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_4px_4px_rgba(0,0,0,0.50)]"
                        : "border-transparent hover:bg-black/10",
                    )}
                  >
                    {/* Gold left bar indicator (active only) */}
                    {active && (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#fffae6] via-[#f5c518] to-[#996515] shadow-[0_0_8px_rgba(245,197,24,0.6)]" />
                    )}
                    <div
                      className={cn(
                        "relative z-10 flex items-center gap-3",
                        active
                          ? "text-[#f5c518] drop-shadow-[0_1.5px_0.5px_rgba(0,0,0,0.95)]"
                          : "text-[#f5c518]/50",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span
                        className={cn(
                          active
                            ? "bg-gradient-to-b from-[#fffae6] via-[#f5c518] to-[#996515] bg-clip-text font-semibold text-transparent"
                            : "",
                        )}
                      >
                        {link.label}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

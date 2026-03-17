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
        className={`fixed inset-y-0 left-0 z-40 w-[280px] transform border-r px-[14px] py-6 transition-transform duration-200 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isDesktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full"}`}
        style={{
          background:
            "linear-gradient(180deg, rgba(15,77,59,0.98) 0%, rgba(11,63,49,0.98) 100%)",
          borderColor: "var(--dashboard-sidebar-border)",
          boxShadow: "0 18px 48px rgba(7, 20, 15, 0.36)",
        }}
        aria-label="Navegação principal"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between pb-6">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-white/5 p-2 text-[#d7ebdf] shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
                <Image
                  src="/solução-viavel-logo.png"
                  alt="Solução Viável"
                  width={56}
                  height={56}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="space-y-1 pt-1">
                <p
                  className="text-[2rem] font-medium leading-[0.92] tracking-[-0.05em] text-[var(--dashboard-sidebar-text)]"
                  style={{ fontFamily: "var(--font-editorial)" }}
                >
                  Catálogo
                  <br />
                  Fácil
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--dashboard-sidebar-muted)]">
                  Solução viável
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-white/12 px-3 py-1 text-xs font-medium text-[var(--dashboard-sidebar-text)] lg:hidden"
              aria-label="Fechar menu"
            >
              Fechar
            </button>
          </div>

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
                    <p className="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--dashboard-sidebar-muted)]">
                      {link.section}
                    </p>
                  ) : null}
                  <Link
                    href={link.href}
                    onClick={handleClose}
                    className={cn(
                      "flex items-center gap-3 rounded-[24px] border px-4 py-3 text-[15px] font-medium transition duration-200",
                      active
                        ? "dashboard-sidebar-active text-white"
                        : "border-transparent text-[var(--dashboard-sidebar-muted)] hover:border-white/10 hover:bg-white/6 hover:text-[var(--dashboard-sidebar-text)]",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{link.label}</span>
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

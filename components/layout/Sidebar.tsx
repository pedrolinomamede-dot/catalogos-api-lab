"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Database,
  FolderKanban,
  PlugZap,
  FileStack,
  Link2,
  LayoutGrid,
  X,
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
  icon: typeof Home;
};

const links: SidebarLink[] = [
  { href: "/dashboard", label: "Visão Geral", icon: Home },
  { href: "/dashboard/base-products", label: "Base Geral", icon: Database },
  { href: "/dashboard/base-categories", label: "Categorias", icon: FolderKanban },
  { href: "/dashboard/integrations", label: "Integrações", icon: PlugZap },
  { href: "/dashboard/catalogs", label: "Catálogos", icon: FileStack },
  { href: "/dashboard/share-links", label: "Share Links", icon: Link2 },
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

  return (
    <aside
      className={cn(
        "fixed md:relative top-0 left-0 h-full md:h-[98%] w-[280px] md:w-[240px] p-6 md:pr-12 md:-mr-8 flex flex-col shrink-0 overflow-y-auto z-50 md:z-10",
        "bg-white/80 md:bg-white/10 backdrop-blur-3xl md:backdrop-blur-2xl",
        "shadow-2xl md:shadow-[-20px_40px_80px_rgba(0,0,0,0.15),inset_1px_1px_0px_rgba(255,255,255,0.5)]",
        "rounded-r-3xl md:rounded-l-[2rem] md:rounded-r-none",
        "border border-white/50 md:border-white/30 md:border-r-transparent",
        "transition-transform duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        isDesktopOpen ? "md:translate-x-0" : "md:-translate-x-full",
      )}
      aria-label="Navegação principal"
    >
      {/* Close button inside sidebar for mobile */}
      <button
        onClick={handleClose}
        className="md:hidden absolute top-6 right-6 p-2 bg-black/5 rounded-full"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Subtle inner shadow for depth */}
      <div className="hidden md:block absolute inset-0 pointer-events-none rounded-l-[2rem]" />

      <div className="relative z-10 flex flex-col h-full mt-12 md:mt-0">
        {/* Logo */}
        <div className="hidden md:flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1c1c1e] to-[#3a3a3c] rounded-xl flex items-center justify-center shadow-md shrink-0">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            Catálogo Fácil
          </span>
        </div>

        {/* Nav */}
        <nav className="space-y-2">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleClose}
                className={cn(
                  "flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden",
                  active
                    ? "bg-[#222225] text-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 hover:shadow-sm",
                )}
              >
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium text-[15px]">{link.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

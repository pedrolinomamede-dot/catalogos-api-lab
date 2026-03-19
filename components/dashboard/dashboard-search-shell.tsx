import { Bell, ChevronDown, Search } from "lucide-react";

type DashboardSearchShellProps = {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
};

export function DashboardSearchShell({
  showMenuButton = false,
  onMenuClick,
}: DashboardSearchShellProps) {
  return (
    <div className="flex w-full items-center justify-end gap-2.5 sm:gap-3">
      {showMenuButton ? (
        <button
          type="button"
          onClick={onMenuClick}
          className="mr-auto inline-flex h-9 items-center justify-center rounded-full border border-white/60 bg-white/30 px-4 text-sm font-medium text-white shadow-sm backdrop-blur-xl lg:hidden"
        >
          Menu
        </button>
      ) : null}

      {/* Search pill — compact, right-aligned */}
      <div className="flex h-[38px] w-64 items-center gap-2 rounded-full border border-white/60 bg-white/30 px-4 backdrop-blur-xl transition-all hover:bg-white/40">
        <Search className="h-4 w-4 shrink-0 text-white/70" />
        <span className="truncate text-sm text-white/70">Rescan...</span>
      </div>

      {/* Bell */}
      <div className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/60 bg-white/30 text-white backdrop-blur-xl shadow-[0_4px_4px_rgba(0,0,0,0.50),inset_0_2px_4px_rgba(255,255,255,0.8)] transition-all hover:bg-white/50">
        <Bell className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-[#e63946] shadow-[0_0_5px_rgba(230,57,70,0.5)]" />
      </div>

      {/* User avatar */}
      <div className="flex h-[38px] items-center gap-2 rounded-full border border-white/80 bg-gradient-to-b from-[#f8ead6] to-[#d4b380] py-1.5 pl-3.5 pr-3 shadow-[0_4px_4px_rgba(0,0,0,0.50),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.1)]">
        <span className="text-sm font-semibold text-[#3d2e1f] drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">EC</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#3d2e1f]/70" />
      </div>
    </div>
  );
}

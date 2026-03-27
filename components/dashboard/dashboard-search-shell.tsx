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
          className="mr-auto inline-flex h-9 items-center justify-center rounded-full border border-white/60 bg-white/40 px-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-xl lg:hidden"
        >
          Menu
        </button>
      ) : null}

      {/* Search pill */}
      <div className="flex h-[38px] w-64 items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 backdrop-blur-xl transition-all hover:bg-white/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.04)]">
        <Search className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="truncate text-sm text-slate-500">Pesquisar...</span>
      </div>

      {/* Bell */}
      <div className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/60 bg-white/40 text-slate-700 backdrop-blur-xl transition-all hover:bg-white/50">
        <Bell className="h-5 w-5" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-[#9b8bf4] shadow-[0_0_5px_rgba(155,139,244,0.5)]" />
      </div>

      {/* User avatar */}
      <div className="flex h-[38px] items-center gap-2 rounded-full bg-[#1c1c1e] py-2 pl-4 pr-3">
        <span className="text-sm font-semibold text-white">EC</span>
        <ChevronDown className="h-3.5 w-3.5 text-white/70" />
      </div>
    </div>
  );
}

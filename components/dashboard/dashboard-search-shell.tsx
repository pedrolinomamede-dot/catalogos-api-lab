import { Bell, Info, Search } from "lucide-react";

type DashboardSearchShellProps = {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
};

export function DashboardSearchShell({
  showMenuButton = false,
  onMenuClick,
}: DashboardSearchShellProps) {
  return (
    <div className="flex w-full items-center gap-2.5 sm:gap-3 lg:gap-4 xl:gap-5">
      {showMenuButton ? (
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[rgba(198,181,158,0.5)] bg-[rgba(255,251,245,0.9)] px-4 text-sm font-medium text-[#2f261e] shadow-sm lg:hidden"
        >
          Menu
        </button>
      ) : null}

      <div className="dashboard-panel flex min-h-[56px] flex-1 items-center gap-2 rounded-[22px] px-3 py-2 sm:min-h-[64px] sm:gap-3 sm:rounded-[28px] sm:px-4 sm:py-3 lg:min-h-[68px] lg:rounded-[30px] lg:px-4 xl:min-h-[72px] xl:px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4ecdf] text-[#6a6258] sm:h-10 sm:w-10 lg:h-10 lg:w-10">
          <Search className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="flex h-10 w-full items-center rounded-full border border-[#ddd1c2] bg-[#fffaf3] px-4 text-[14px] text-[#7a7267] sm:h-12 sm:px-5 sm:text-[15px] lg:h-[52px]"
            style={{ boxShadow: "inset 0 2px 5px rgba(25, 18, 10, 0.08)" }}
          >
            <span className="truncate sm:hidden">Busque...</span>
            <span className="hidden truncate sm:block">
              Busque por produtos, categorias ou status de integração...
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-2.5 sm:flex lg:gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ddcfbe] bg-[#fffaf4] text-[#2f261e] lg:h-12 lg:w-12 xl:h-[56px] xl:w-[56px] 2xl:h-[60px] 2xl:w-[60px]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f6eadb,#d2ddcf)] text-sm font-semibold text-[#244438] lg:h-12 lg:w-12 xl:h-[56px] xl:w-[56px] 2xl:h-[60px] 2xl:w-[60px]">
            EC
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#104d3b] text-white">
              <Info className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

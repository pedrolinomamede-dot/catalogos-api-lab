"use client";

import { useState } from "react";
import { DashboardSystemFooter } from "@/components/dashboard/dashboard-system-footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell h-dvh min-h-dvh text-foreground">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex h-dvh min-h-0 flex-col lg:pl-[280px]">
        <Header onMenuClick={() => setSidebarOpen((open) => !open)} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto flex w-full max-w-[1680px] flex-1 min-h-0 flex-col gap-2 px-4 pb-2 pt-2 sm:px-5 sm:pt-2.5 lg:gap-2.5 lg:px-6 lg:pb-3 lg:pt-2.5 xl:gap-3 xl:px-8 2xl:px-10">
            {children}
            <DashboardSystemFooter />
          </div>
        </main>
      </div>
    </div>
  );
}

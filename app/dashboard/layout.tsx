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
          <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-4 pb-6 pt-4 sm:px-5 lg:px-6 lg:pb-8 lg:pt-5 xl:gap-6 xl:px-8 2xl:px-10">
            {children}
            <DashboardSystemFooter />
          </div>
        </main>
      </div>
    </div>
  );
}

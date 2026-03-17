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
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-0 lg:py-0">
          <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-4 py-4 lg:px-[27px] lg:py-0">
            {children}
            <DashboardSystemFooter />
          </div>
        </main>
      </div>
    </div>
  );
}

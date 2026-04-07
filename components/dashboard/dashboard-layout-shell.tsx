"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";

import { DashboardSystemFooter } from "@/components/dashboard/dashboard-system-footer";
import { DecorativeSpheres } from "@/components/dashboard/dashboard-decorative-spheres";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell min-h-dvh flex items-center justify-center p-0 md:p-4 lg:p-8 font-sans text-slate-800 selection:bg-[#9b8bf4] selection:text-white">
      <DecorativeSpheres />

      <div className="relative z-10 w-full max-w-[1400px] h-[100dvh] md:h-[90vh] flex flex-col md:flex-row items-center">
        <div className="md:hidden w-full bg-white/20 backdrop-blur-xl border-b border-white/30 p-4 flex justify-between items-center z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md shrink-0 overflow-hidden bg-white/50">
              <Image
                src="/solução-viavel-logo.png"
                alt="Catálogo Fácil"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Catálogo Fácil
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-white/40 rounded-full shadow-sm"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {sidebarOpen ? (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <div className="flex flex-col flex-1 h-full w-full min-w-0 overflow-hidden relative z-20 bg-white/30 md:bg-white/10 backdrop-blur-xl md:backdrop-blur-2xl shadow-none md:shadow-[25px_40px_60px_rgba(0,0,0,0.12),inset_1px_1px_0px_rgba(255,255,255,0.5)] rounded-none md:rounded-[2.5rem] border-0 md:border md:border-white/30 md:border-l-white/20">
          <Header onMenuClick={() => setSidebarOpen((open) => !open)} />
          <main className="flex-1 p-6 md:px-8 overflow-y-auto pb-24 md:pb-6">
            {children}
            <DashboardSystemFooter />
          </main>
        </div>
      </div>
    </div>
  );
}

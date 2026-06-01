"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Fondo oscuro en móvil cuando el cajón está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--background-light)] overflow-hidden">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

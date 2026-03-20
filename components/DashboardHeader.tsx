"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Panel de Control",
  "/dashboard/estudiantes": "Gestión de Estudiantes",
};

export default function DashboardHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Panel de Control";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <h2 className="text-slate-800 font-bold text-lg">{title}</h2>
      <div className="flex items-center gap-4">
        <button className="relative cursor-pointer" type="button" aria-label="Notificaciones">
          <span className="material-symbols-outlined text-slate-600 hover:text-[#0F2B4B] transition-colors">
            notifications
          </span>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
            4
          </span>
        </button>

        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="size-8 rounded-full bg-[#0F2B4B]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#0F2B4B] text-[18px]">person</span>
          </div>
          <span className="text-sm font-semibold text-slate-700">{user?.fullName || "Admin Usuario"}</span>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { documentManagementAPI } from "@/lib/api";

const pageTitles: Record<string, string> = {
  "/dashboard": "Panel de Control",
  "/dashboard/estudiantes": "Gestión de Estudiantes",
  "/dashboard/acudientes": "Gestión de Acudientes",
  "/dashboard/conductores": "Gestión de Conductores",
  "/dashboard/vehiculos": "Gestión de Vehículos",
  "/dashboard/usuarios": "Gestión de Usuarios",
  "/dashboard/alertas": "Alertas Documentales",
};

export default function DashboardHeader() {
  const { user, token } = useAuth();
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Panel de Control";
  const [unreadCount, setUnreadCount] = useState(0);

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return "";
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [unreadCount]);

  const loadUnread = useCallback(async () => {
    if (!token) return;

    try {
      const response = await documentManagementAPI.findAlerts(token, {
        isRead: false,
        page: 1,
        limit: 1,
      });
      setUnreadCount(response.data.meta.totalItems ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [token]);

  useEffect(() => {
    void loadUnread();
  }, [loadUnread]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <h2 className="text-slate-800 font-bold text-lg">{title}</h2>
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/alertas"
          className="relative cursor-pointer"
          aria-label="Notificaciones"
        >
          <span className="material-symbols-outlined text-slate-600 hover:text-[#0F2B4B] transition-colors">
            notifications
          </span>
          {unreadLabel && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 flex items-center justify-center rounded-full border-2 border-white">
              {unreadLabel}
            </span>
          )}
        </Link>

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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { notificationsAPI } from "@/lib/api";
import type { NotificationRecord } from "@/lib/api";
import { isDriver } from "@/lib/roles";

const pageTitles: Record<string, string> = {
  "/dashboard": "Panel de Control",
  "/dashboard/estudiantes": "Gestión de Estudiantes",
  "/dashboard/acudientes": "Gestión de Acudientes",
  "/dashboard/conductores": "Gestión de Conductores",
  "/dashboard/vehiculos": "Gestión de Vehículos",
  "/dashboard/usuarios": "Gestión de Usuarios",
  "/dashboard/alertas": "Alertas Documentales",
  "/dashboard/rutas": "Gestión de Rutas",
  "/dashboard/viajes": "Gestión de Viajes",
  "/dashboard/mis-rutas": "Mis Rutas",
  "/dashboard/mis-viajes": "Mis Viajes",
  "/dashboard/mi-licencia": "Mi Licencia",
  "/dashboard/rutas-hijo": "Rutas de mi hijo",
};

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Panel de Control";

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const tripsHref = isDriver(user?.role)
    ? "/dashboard/mis-viajes"
    : "/dashboard/viajes";

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return "";
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [unreadCount]);

  const loadUnread = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notificationsAPI.unreadCount(token);
      setUnreadCount(res.data.count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [token]);

  const loadList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notificationsAPI.findMine(token);
      setNotifications(res.data);
    } catch {
      setNotifications([]);
    }
  }, [token]);

  useEffect(() => {
    void loadUnread();
    const interval = setInterval(() => void loadUnread(), 60000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void loadList();
  };

  const onNotificationClick = async (notification: NotificationRecord) => {
    if (token && !notification.isRead) {
      try {
        await notificationsAPI.markRead(notification.id, token);
      } catch {
        // sin bloquear la navegación
      }
    }
    setOpen(false);
    void loadUnread();
    router.push(tripsHref);
  };

  const markAll = async () => {
    if (!token) return;
    try {
      await notificationsAPI.markAllRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // no-op
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden text-slate-600 hover:text-[#0F2B4B] shrink-0"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="text-slate-800 font-bold text-base md:text-lg truncate">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <div className="relative">
          <button
            onClick={toggle}
            className="relative cursor-pointer flex items-center"
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
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-700">
                    Notificaciones
                  </span>
                  <button
                    onClick={markAll}
                    className="text-xs font-semibold text-[#0F2B4B] hover:underline"
                  >
                    Marcar todas
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">
                      No tienes notificaciones.
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => onNotificationClick(notification)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                          notification.isRead ? "" : "bg-sky-50/60"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!notification.isRead && (
                            <span className="mt-1.5 size-2 rounded-full bg-sky-500 shrink-0" />
                          )}
                          <div className={notification.isRead ? "pl-4" : ""}>
                            <p className="text-sm font-semibold text-slate-700">
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1">
                              {formatWhen(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 pl-3 md:pl-4 border-l border-slate-200">
          <div className="size-8 rounded-full bg-[#0F2B4B]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#0F2B4B] text-[18px]">
              person
            </span>
          </div>
          <span className="hidden sm:inline text-sm font-semibold text-slate-700 truncate max-w-[160px]">
            {user?.fullName || "Admin Usuario"}
          </span>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const userRole = user?.role?.trim().toLowerCase() ?? "";

  const menuItems = [
    {
      label: "Panel de Control",
      href: "/dashboard",
      icon: "dashboard",
    },
    {
      label: "Estudiantes",
      href: "/dashboard/estudiantes",
      icon: "groups",
    },
    {
      label: "Acudientes",
      href: "/dashboard/acudientes",
      icon: "badge",
    },
    {
      label: "Conductores",
      href: "/dashboard/conductores",
      icon: "directions_bus",
    },
    {
      label: "Vehiculos",
      href: "/dashboard/vehiculos",
      icon: "directions_bus",
    },
    {
      label: "Rutas",
      href: "/dashboard/rutas",
      icon: "route",
    },
    {
      label: "Documentación",
      href: "/dashboard/documentacion",
      icon: "description",
    },
    {
      label: "Alertas",
      href: "/dashboard/alertas",
      icon: "notifications_active",
    },
    ...(userRole === "admin"
      ? [
          {
            label: "Usuarios",
            href: "/dashboard/usuarios",
            icon: "manage_accounts",
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-[#0F2B4B] rounded-lg p-2 flex items-center justify-center text-white">
          <span className="material-symbols-outlined">directions_bus</span>
        </div>
        <div>
          <h1 className="text-[#0F2B4B] font-bold text-xl leading-none">RutaSegura</h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
            Colegio Villa Fontana
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-0.5 mt-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
              isActive(item.href)
                ? "bg-[#0F2B4B] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer group"
          onClick={handleLogout}
        >
          <div className="size-9 rounded-full bg-[#0F2B4B]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#0F2B4B] text-[18px]">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.fullName || "Admin Usuario"}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role || "Coordinador"}</p>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-[18px] group-hover:text-red-500 transition-colors">
            logout
          </span>
        </div>
      </div>
    </aside>
  );
}

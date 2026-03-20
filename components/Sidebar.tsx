"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

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
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 rounded-lg p-2 flex items-center justify-center text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1m-2 16h4v-2h-4v2m0-4h4V7h-4v6z" />
          </svg>
        </div>
        <div>
          <h1 className="text-blue-600 font-bold text-xl leading-none">RutaSegura</h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
            Colegio Villa Fontana
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-0.5 mt-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
              isActive(item.href)
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {item.icon === "dashboard" && <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
              {item.icon === "groups" && <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />}
            </svg>
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Info and Logout */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-600/10 border-2 border-blue-600/20 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
            {user?.fullName?.charAt(0) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.fullName || "Usuario"}</p>
            <p className="text-[10px] text-slate-500 truncate capitalize">{user?.role || "Usuario"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-left flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

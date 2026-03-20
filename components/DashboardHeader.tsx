"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="text-slate-800 font-bold text-lg">RutaSegura</h2>
      </div>
      <div className="flex items-center gap-6">
        <button className="relative cursor-pointer text-slate-600 hover:text-blue-600 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
            3
          </span>
        </button>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800 leading-none">
              {user?.fullName || "Usuario"}
            </p>
            <p className="text-[11px] text-slate-500 font-medium capitalize">
              {user?.role || "Usuario"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-600/10 border-2 border-blue-600/20 flex items-center justify-center text-blue-600 font-bold">
            {user?.fullName?.charAt(0) || "U"}
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 text-slate-600 hover:text-red-600 transition-colors"
            title="Cerrar sesión"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { homeRouteForRole } from "@/lib/roles";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const loggedUser = await login(email, password);
      router.push(homeRouteForRole(loggedUser.role));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Usuario o contraseña incorrectos";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Background Image with Text */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img
          src="/fondo-login.webp"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003D7A]/70 via-[#003D7A]/60 to-[#0066CC]/50"></div>

        {/* Text Content */}
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="text-white font-bold text-4xl leading-tight mb-6 tracking-tight">
              Conectando educación, innovación y excelencia para construir el futuro.
            </h2>
            <p className="text-white text-xl font-semibold">
              Bienvenido a la plataforma RutaSegura Villa Fontana.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 bg-[var(--background-light)] flex items-center justify-center p-4 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm border border-slate-200">
          <div className="flex flex-col items-center mb-8 gap-3">
            <img src="/logo-villafontana.png" alt="Villa Fontana" className="h-16 w-16" />
            <div className="text-center">
              <h1 className="text-[#003D7A] font-bold text-2xl leading-none">RutaSegura</h1>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
                Gimnasio Villa Fontana
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Usuario
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rutasegura.com"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#003D7A]/20 focus:border-[#003D7A] outline-none transition-all"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#003D7A]/20 focus:border-[#003D7A] outline-none transition-all"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#003D7A] hover:bg-[#0066CC] disabled:bg-slate-400 transition-colors text-white font-bold py-2.5 rounded-lg text-sm shadow-md active:scale-95 disabled:cursor-not-allowed"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

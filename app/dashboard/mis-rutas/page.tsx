"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { driverPortalAPI } from "@/lib/api";
import type { RouteRecord } from "@/lib/api";
import { DRIVER_ROLES } from "@/lib/roles";

function formatTime(value: string | null): string {
  if (!value) return "—";
  // Las horas se guardan como Time (1970-01-01THH:mm:ssZ); mostramos HH:mm UTC.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function formatDistance(meters: number | null): string {
  if (!meters && meters !== 0) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds && seconds !== 0) return "—";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function MisRutasContent() {
  const { token } = useAuth();
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<number | null>(null);

  const loadRoutes = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await driverPortalAPI.findMyRoutes(token);
      setRoutes(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar tus rutas",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  const openInGoogleMaps = async (routeId: number) => {
    if (!token) return;
    setOpeningId(routeId);
    try {
      const response = await driverPortalAPI.getGoogleMapsUrl(routeId, token);
      window.open(response.data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "No se pudo abrir la ruta en Google Maps",
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2B4B]">Mis Rutas</h1>
        <p className="text-slate-500 text-sm mt-1">
          Rutas que tienes asignadas. Ábrelas en Google Maps para iniciar el
          recorrido.
        </p>
      </div>

      {isLoading && (
        <div className="text-slate-500 text-sm">Cargando rutas...</div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {!isLoading && !error && routes.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
          No tienes rutas asignadas por ahora.
        </div>
      )}

      <div className="grid gap-4">
        {routes.map((route) => {
          const isActive = (route.status ?? "").toUpperCase() === "ACTIVE";
          const isCalculated = !!route.routeCalculatedAt;
          return (
            <div
              key={route.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-[#0F2B4B]">
                    {route.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {route.zone?.name ?? "Sin zona"} ·{" "}
                    {route.destination?.name ?? "Sin destino"}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {route.status ?? "—"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs uppercase">Salida</p>
                  <p className="font-semibold">{formatTime(route.startTime)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Regreso</p>
                  <p className="font-semibold">{formatTime(route.endTime)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Distancia</p>
                  <p className="font-semibold">
                    {formatDistance(route.routeDistance)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Duración</p>
                  <p className="font-semibold">
                    {formatDuration(route.routeDuration)}
                  </p>
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-600">
                <span className="font-medium">Vehículo:</span>{" "}
                {route.vehicle
                  ? `${route.vehicle.plate} · ${route.vehicle.brand ?? ""} ${
                      route.vehicle.model ?? ""
                    }`.trim()
                  : "Sin asignar"}
              </div>

              {route.stops.length > 0 && (
                <div className="mt-4">
                  <p className="text-slate-400 text-xs uppercase mb-2">
                    Paradas ({route.stops.length})
                  </p>
                  <ol className="space-y-1.5">
                    {route.stops.map((stop) => (
                      <li
                        key={stop.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="size-6 shrink-0 rounded-full bg-[#0F2B4B]/10 text-[#0F2B4B] flex items-center justify-center text-xs font-bold">
                          {stop.stopOrder}
                        </span>
                        <span className="flex-1 text-slate-600">
                          {stop.description ?? "Parada"}
                        </span>
                        <span className="text-slate-400">
                          {formatTime(stop.estimatedTime)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => openInGoogleMaps(route.id)}
                  disabled={!isCalculated || openingId === route.id}
                  className="inline-flex items-center gap-2 bg-[#0F2B4B] hover:bg-[#163a63] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    map
                  </span>
                  {openingId === route.id
                    ? "Abriendo..."
                    : "Abrir en Google Maps"}
                </button>
                {!isCalculated && (
                  <span className="text-xs text-slate-400">
                    La ruta aún no ha sido calculada por el coordinador.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MisRutasPage() {
  return (
    <ProtectedRoute allowedRoles={DRIVER_ROLES} redirectTo="/dashboard">
      <MisRutasContent />
    </ProtectedRoute>
  );
}

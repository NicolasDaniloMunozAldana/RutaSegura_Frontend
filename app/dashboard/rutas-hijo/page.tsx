"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { guardianPortalAPI, guardianTripsAPI } from "@/lib/api";
import type { GuardianActiveTrip, GuardianChild } from "@/lib/api";
import { GUARDIAN_ROLES } from "@/lib/roles";
import LiveTrackingModal from "./LiveTrackingModal";

function formatTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function fullName(child: GuardianChild): string {
  return [
    child.firstName,
    child.middleName,
    child.firstLastname,
    child.secondLastname,
  ]
    .filter(Boolean)
    .join(" ");
}

function RutasHijoContent() {
  const { token } = useAuth();
  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [activeTrips, setActiveTrips] = useState<GuardianActiveTrip[]>([]);
  const [trackingTripId, setTrackingTripId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadChildren = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await guardianPortalAPI.findChildrenRoutes(token);
      setChildren(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las rutas de tus hijos",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadActiveTrips = useCallback(async () => {
    if (!token) return;
    try {
      const response = await guardianTripsAPI.findActive(token);
      setActiveTrips(response.data);
    } catch {
      setActiveTrips([]);
    }
  }, [token]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  // Revisa periódicamente si hay buses en curso para mostrar "Ver en vivo".
  useEffect(() => {
    void loadActiveTrips();
    const interval = setInterval(() => void loadActiveTrips(), 20000);
    return () => clearInterval(interval);
  }, [loadActiveTrips]);

  // routeId -> viaje en curso (para mostrar el botón en la ruta correspondiente).
  const activeTripByRoute = useMemo(() => {
    const map = new Map<number, GuardianActiveTrip>();
    for (const trip of activeTrips) map.set(trip.routeId, trip);
    return map;
  }, [activeTrips]);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2B4B]">Rutas de mi hijo</h1>
        <p className="text-slate-500 text-sm mt-1">
          Consulta la ruta de transporte asignada a cada uno de tus hijos.
        </p>
      </div>

      {isLoading && (
        <div className="text-slate-500 text-sm">Cargando información...</div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {!isLoading && !error && children.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
          No encontramos estudiantes asociados a tu cuenta.
        </div>
      )}

      <div className="space-y-6">
        {children.map((child) => (
          <div
            key={child.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-full bg-[#0F2B4B]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#0F2B4B]">
                  child_care
                </span>
              </div>
              <div>
                <h2 className="font-bold text-[#0F2B4B]">{fullName(child)}</h2>
                <p className="text-xs text-slate-400">Estudiante</p>
              </div>
            </div>

            {child.routes.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
                Este estudiante no tiene una ruta activa asignada.
              </p>
            ) : (
              <div className="space-y-4">
                {child.routes.map(({ route, stop, assignmentId }) => (
                  <div
                    key={assignmentId}
                    className="border border-slate-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-[#0F2B4B]">
                          {route.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {route.zone?.name ?? "Sin zona"} ·{" "}
                          {route.destination?.name ?? "Sin destino"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTripByRoute.has(route.id) && (
                          <button
                            onClick={() =>
                              setTrackingTripId(
                                activeTripByRoute.get(route.id)!.tripId,
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors animate-pulse"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              location_on
                            </span>
                            Ver en vivo
                          </button>
                        )}
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          {route.status ?? "—"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs uppercase">
                          Hora de salida
                        </p>
                        <p className="font-semibold">
                          {formatTime(route.startTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase">
                          Conductor
                        </p>
                        <p className="font-semibold">
                          {route.driver
                            ? `${route.driver.firstName} ${route.driver.firstLastname}`
                            : "Sin asignar"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase">
                          Vehículo
                        </p>
                        <p className="font-semibold">
                          {route.vehicle?.plate ?? "Sin asignar"}
                        </p>
                      </div>
                    </div>

                    {stop && (
                      <div className="mt-4 bg-[#0F2B4B]/5 rounded-lg p-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#0F2B4B]">
                          location_on
                        </span>
                        <div className="text-sm">
                          <p className="font-medium text-[#0F2B4B]">
                            Parada de {child.firstName}:{" "}
                            {stop.description ?? `Parada ${stop.stopOrder}`}
                          </p>
                          <p className="text-slate-500">
                            Hora estimada de recogida:{" "}
                            {formatTime(stop.estimatedTime)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {trackingTripId !== null && (
        <LiveTrackingModal
          tripId={trackingTripId}
          token={token}
          onClose={() => setTrackingTripId(null)}
        />
      )}
    </div>
  );
}

export default function RutasHijoPage() {
  return (
    <ProtectedRoute allowedRoles={GUARDIAN_ROLES} redirectTo="/dashboard">
      <RutasHijoContent />
    </ProtectedRoute>
  );
}

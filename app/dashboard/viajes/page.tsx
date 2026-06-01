"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { routesAPI, tripsAPI } from "@/lib/api";
import type { RouteRecord, TripRecord } from "@/lib/api";
import {
  TRIP_STATUS_OPTIONS,
  formatTripDate,
  tripStatusBadgeClass,
  tripStatusLabel,
} from "@/lib/trips";
import {
  confirmDialog,
  promptDialog,
  showErrorDialog,
  showSuccessDialog,
} from "@/lib/dialogs";
import TripReviewModal from "./TripReviewModal";

function driverName(trip: TripRecord): string {
  const d = trip.driver;
  return [d.firstName, d.middleName, d.firstLastname, d.secondLastname]
    .filter(Boolean)
    .join(" ");
}

export default function ViajesPage() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [routeId, setRouteId] = useState<string>("");
  const [tripDate, setTripDate] = useState<string>("");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const [reviewTrip, setReviewTrip] = useState<TripRecord | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await tripsAPI.findAll(token);
      setTrips(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los viajes");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trips.filter((trip) => {
      const statusPass =
        !statusFilter || (trip.status ?? "").toUpperCase() === statusFilter;
      const searchPass =
        !q ||
        trip.route.name.toLowerCase().includes(q) ||
        trip.vehiclePlate.toLowerCase().includes(q) ||
        driverName(trip).toLowerCase().includes(q);
      return statusPass && searchPass;
    });
  }, [trips, statusFilter, query]);

  const selectedRoute = useMemo(
    () => routes.find((r) => String(r.id) === routeId) ?? null,
    [routes, routeId],
  );

  const openCreate = async () => {
    if (!token) return;
    setCreateError("");
    setRouteId("");
    setTripDate("");
    setObservations("");
    setCreateOpen(true);
    try {
      const res = await routesAPI.findAll(token, { status: "ACTIVE" });
      setRoutes(res.data);
    } catch {
      setRoutes([]);
    }
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    if (!routeId || !tripDate) {
      setCreateError("Selecciona una ruta y una fecha.");
      return;
    }
    setSubmitting(true);
    setCreateError("");
    try {
      await tripsAPI.create(
        {
          routeId: Number(routeId),
          tripDate,
          observations: observations.trim() || undefined,
        },
        token,
      );
      showSuccessDialog("Viaje programado correctamente.");
      setCreateOpen(false);
      await load();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "No se pudo programar el viaje",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cancelTrip = async (trip: TripRecord) => {
    if (!token) return;
    const reason = await promptDialog({
      title: "Cancelar viaje",
      inputLabel: "Motivo de la cancelación",
      confirmButtonText: "Cancelar viaje",
      confirmButtonColor: "#dc2626",
    });
    if (!reason) return;
    try {
      await tripsAPI.cancel(trip.id, reason, token);
      showSuccessDialog("Viaje cancelado.");
      await load();
    } catch (err) {
      showErrorDialog(err instanceof Error ? err.message : "No se pudo cancelar el viaje");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestión de Viajes</h3>
          <p className="text-sm text-slate-500 mt-0.5">{trips.length} viajes registrados</p>
        </div>
        <button
          onClick={() => void openCreate()}
          className="bg-[#0F2B4B] hover:bg-[#163a63] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Programar Viaje
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por ruta, placa o conductor"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
        >
          {TRIP_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ruta</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Conductor</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehículo</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
                    Cargando viajes…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
                    No hay viajes para mostrar.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filtered.map((trip) => {
                  const status = (trip.status ?? "").toUpperCase();
                  const canCancel =
                    status !== "COMPLETED" && status !== "CANCELLED";
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-slate-700">
                        {formatTripDate(trip.tripDate)}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">
                        {trip.route.name}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{driverName(trip)}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{trip.vehiclePlate}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tripStatusBadgeClass(
                            trip.status,
                          )}`}
                        >
                          {tripStatusLabel(trip.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setReviewTrip(trip)}
                            className="p-1.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 text-slate-400 transition-colors"
                            title={status === "PENDING_REVIEW" ? "Revisar" : "Ver detalle"}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {status === "PENDING_REVIEW" ? "fact_check" : "visibility"}
                            </span>
                          </button>
                          {canCancel && (
                            <button
                              onClick={() => void cancelTrip(trip)}
                              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                              title="Cancelar viaje"
                            >
                              <span className="material-symbols-outlined text-[16px]">cancel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-500 font-medium">
          Mostrando {filtered.length} de {trips.length} viajes
        </div>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
          onClick={() => !submitting && setCreateOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Programar Viaje</h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Ruta</label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                >
                  <option value="">Selecciona una ruta activa</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                      {route.zone?.name ? ` · ${route.zone.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRoute && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 space-y-1">
                  <p>
                    <span className="font-semibold">Vehículo:</span>{" "}
                    {selectedRoute.vehicle
                      ? selectedRoute.vehicle.plate
                      : "Sin asignar"}
                  </p>
                  <p>
                    <span className="font-semibold">Conductor:</span>{" "}
                    {selectedRoute.driver
                      ? [
                          selectedRoute.driver.firstName,
                          selectedRoute.driver.firstLastname,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : "Sin asignar"}
                  </p>
                  <p className="text-xs text-slate-400">
                    El viaje hereda el vehículo y conductor de la ruta.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fecha del viaje</label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Observaciones (opcional)</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                />
              </div>

              {createError && <p className="text-sm font-medium text-red-600">{createError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-60"
                >
                  {submitting ? "Programando…" : "Programar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewTrip && (
        <TripReviewModal
          tripId={reviewTrip.id}
          token={token}
          onClose={() => setReviewTrip(null)}
          onReviewed={() => {
            setReviewTrip(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

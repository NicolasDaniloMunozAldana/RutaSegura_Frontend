"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { driverTripsAPI } from "@/lib/api";
import type { TripRecord } from "@/lib/api";
import { DRIVER_ROLES } from "@/lib/roles";
import {
  TRIP_STATUS_OPTIONS,
  formatTripDate,
  tripStatusBadgeClass,
  tripStatusLabel,
} from "@/lib/trips";
import { confirmDialog, showErrorDialog, showSuccessDialog } from "@/lib/dialogs";
import ChecklistModal from "./ChecklistModal";

function MisViajesContent() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [checklistTrip, setChecklistTrip] = useState<TripRecord | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await driverTripsAPI.findMine(token);
      setTrips(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar tus viajes");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!statusFilter) return trips;
    return trips.filter((t) => (t.status ?? "").toUpperCase() === statusFilter);
  }, [trips, statusFilter]);

  const startTrip = async (trip: TripRecord) => {
    if (!token) return;
    const ok = await confirmDialog({
      title: "¿Iniciar viaje?",
      text: "Se validará que el vehículo no tenga documentos vencidos.",
      confirmButtonText: "Sí, iniciar",
      confirmButtonColor: "#0F2B4B",
    });
    if (!ok) return;
    setBusyId(trip.id);
    try {
      await driverTripsAPI.start(trip.id, token);
      showSuccessDialog("Viaje iniciado.");
      await load();
    } catch (err) {
      showErrorDialog(err instanceof Error ? err.message : "No se pudo iniciar el viaje");
    } finally {
      setBusyId(null);
    }
  };

  const finishTrip = async (trip: TripRecord) => {
    if (!token) return;
    const ok = await confirmDialog({
      title: "¿Finalizar viaje?",
      text: "Marca el viaje como completado.",
      confirmButtonText: "Sí, finalizar",
      confirmButtonColor: "#059669",
    });
    if (!ok) return;
    setBusyId(trip.id);
    try {
      await driverTripsAPI.finish(trip.id, undefined, token);
      showSuccessDialog("Viaje finalizado.");
      await load();
    } catch (err) {
      showErrorDialog(err instanceof Error ? err.message : "No se pudo finalizar el viaje");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2B4B]">Mis Viajes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Realiza la inspección preoperacional e inicia tus viajes del día.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
        >
          {TRIP_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="text-slate-500 text-sm">Cargando viajes…</div>}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
          No tienes viajes {statusFilter ? "en este estado" : "programados"} por ahora.
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map((trip) => {
          const status = (trip.status ?? "").toUpperCase();
          const canChecklist =
            status === "PENDING_CHECKLIST" || status === "REJECTED";
          return (
            <div
              key={trip.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-[#0F2B4B]">{trip.route.name}</h2>
                  <p className="text-sm text-slate-500">
                    {formatTripDate(trip.tripDate)} · {trip.vehiclePlate}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tripStatusBadgeClass(
                    trip.status,
                  )}`}
                >
                  {tripStatusLabel(trip.status)}
                </span>
              </div>

              {status === "REJECTED" && trip.checklist?.reviewNotes && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <span className="font-semibold">Motivo del rechazo: </span>
                  {trip.checklist.reviewNotes}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {canChecklist && (
                  <button
                    onClick={() => setChecklistTrip(trip)}
                    className="inline-flex items-center gap-2 bg-[#0F2B4B] hover:bg-[#163a63] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">checklist</span>
                    {status === "REJECTED"
                      ? "Corregir y reenviar"
                      : "Realizar preoperacional"}
                  </button>
                )}

                {status === "PENDING_REVIEW" && (
                  <span className="text-sm text-amber-600 font-medium">
                    Enviado. Esperando aprobación del coordinador.
                  </span>
                )}

                {status === "ENABLED" && (
                  <button
                    onClick={() => void startTrip(trip)}
                    disabled={busyId === trip.id}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    {busyId === trip.id ? "Iniciando…" : "Iniciar viaje"}
                  </button>
                )}

                {status === "IN_PROGRESS" && (
                  <button
                    onClick={() => void finishTrip(trip)}
                    disabled={busyId === trip.id}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">flag</span>
                    {busyId === trip.id ? "Finalizando…" : "Finalizar viaje"}
                  </button>
                )}

                {(status === "COMPLETED" || status === "CANCELLED") && (
                  <span className="text-sm text-slate-500">
                    {status === "COMPLETED" ? "Viaje completado." : "Viaje cancelado."}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {checklistTrip && (
        <ChecklistModal
          trip={checklistTrip}
          token={token}
          onClose={() => setChecklistTrip(null)}
          onSubmitted={() => {
            setChecklistTrip(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

export default function MisViajesPage() {
  return (
    <ProtectedRoute allowedRoles={DRIVER_ROLES} redirectTo="/dashboard">
      <MisViajesContent />
    </ProtectedRoute>
  );
}

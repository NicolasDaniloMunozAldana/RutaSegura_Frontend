"use client";

import { useCallback, useEffect, useState } from "react";
import SecureImage from "@/components/SecureImage";
import SecureFileLink from "@/components/SecureFileLink";
import { tripsAPI } from "@/lib/api";
import type { TripRecord } from "@/lib/api";
import {
  formatTripDate,
  tripStatusBadgeClass,
  tripStatusLabel,
} from "@/lib/trips";
import { promptDialog, showErrorDialog, showSuccessDialog } from "@/lib/dialogs";

interface TripReviewModalProps {
  tripId: number;
  token: string | null;
  onClose: () => void;
  onReviewed: () => void;
}

function driverName(trip: TripRecord): string {
  const d = trip.driver;
  return [d.firstName, d.middleName, d.firstLastname, d.secondLastname]
    .filter(Boolean)
    .join(" ");
}

export default function TripReviewModal({
  tripId,
  token,
  onClose,
  onReviewed,
}: TripReviewModalProps) {
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await tripsAPI.findOne(tripId, token);
      setTrip(res.data);
    } catch (err) {
      showErrorDialog(
        err instanceof Error ? err.message : "No se pudo cargar el viaje",
      );
    } finally {
      setLoading(false);
    }
  }, [tripId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async () => {
    if (!token) return;
    setWorking(true);
    try {
      await tripsAPI.approve(tripId, undefined, token);
      showSuccessDialog("Viaje aprobado y habilitado.");
      onReviewed();
    } catch (err) {
      showErrorDialog(err instanceof Error ? err.message : "No se pudo aprobar");
    } finally {
      setWorking(false);
    }
  };

  const reject = async () => {
    if (!token) return;
    const reason = await promptDialog({
      title: "Rechazar preoperacional",
      inputLabel: "Motivo del rechazo",
      confirmButtonText: "Rechazar",
      confirmButtonColor: "#dc2626",
    });
    if (!reason) return;
    setWorking(true);
    try {
      await tripsAPI.reject(tripId, reason, token);
      showSuccessDialog("Preoperacional rechazado.");
      onReviewed();
    } catch (err) {
      showErrorDialog(err instanceof Error ? err.message : "No se pudo rechazar");
    } finally {
      setWorking(false);
    }
  };

  const checklist = trip?.checklist ?? null;
  const status = (trip?.status ?? "").toUpperCase();
  const canReview = status === "PENDING_REVIEW";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={() => !working && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Detalle del viaje</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading || !trip ? (
          <p className="py-8 text-center text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Ruta</p>
                <p className="text-sm font-semibold text-slate-800">{trip.route.name}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Fecha</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatTripDate(trip.tripDate)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Conductor</p>
                <p className="text-sm font-semibold text-slate-800">{driverName(trip)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Estado</p>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tripStatusBadgeClass(
                    trip.status,
                  )}`}
                >
                  {tripStatusLabel(trip.status)}
                </span>
              </div>
            </div>

            {!checklist ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                El conductor aún no ha enviado el preoperacional.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Foto del vehículo
                    </p>
                    <SecureImage
                      fileKey={checklist.vehiclePhotoKey}
                      token={token}
                      alt="Foto del vehículo"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Firma del conductor
                    </p>
                    <SecureImage
                      fileKey={checklist.signatureKey}
                      token={token}
                      alt="Firma del conductor"
                      className="w-full h-48 rounded-xl border border-slate-200 object-contain bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  {checklist.latitude && checklist.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${checklist.latitude},${checklist.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#0F2B4B] font-semibold hover:underline"
                    >
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                      Ver ubicación
                    </a>
                  )}
                  {checklist.submittedAt && (
                    <span className="text-xs text-slate-500">
                      Enviado:{" "}
                      {new Date(checklist.submittedAt).toLocaleString("es-CO")}
                    </span>
                  )}
                </div>

                {checklist.generalObservations && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <span className="font-semibold">Observaciones: </span>
                    {checklist.generalObservations}
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Ítems revisados
                  </p>
                  <div className="space-y-2">
                    {checklist.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700">
                            {item.itemName}
                          </p>
                          {item.observations && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.observations}
                            </p>
                          )}
                          {item.fileUrl && (
                            <div className="mt-1">
                              <SecureFileLink
                                fileKey={item.fileUrl}
                                token={token}
                                label="Ver evidencia"
                              />
                            </div>
                          )}
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            item.passed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {item.passed ? "Bueno" : "Malo"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {checklist.reviewNotes && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <span className="font-semibold">Nota de revisión: </span>
                    {checklist.reviewNotes}
                  </div>
                )}
              </>
            )}

            {canReview && checklist && (
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => void reject()}
                  disabled={working}
                  className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => void approve()}
                  disabled={working}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-60"
                >
                  {working ? "Procesando…" : "Aprobar y habilitar"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

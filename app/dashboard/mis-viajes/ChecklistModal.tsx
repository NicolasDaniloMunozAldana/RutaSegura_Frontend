"use client";

import { useCallback, useEffect, useState } from "react";
import FileUpload from "@/components/FileUpload";
import SignaturePad from "@/components/SignaturePad";
import { checklistAPI, driverTripsAPI } from "@/lib/api";
import type { ChecklistTemplateItem, TripRecord } from "@/lib/api";
import { getGeolocation } from "@/lib/trips";
import { uploadToR2 } from "@/lib/upload";
import { showErrorDialog, showSuccessDialog } from "@/lib/dialogs";

type ItemState = { passed: boolean; observations: string; fileKey: string };

interface ChecklistModalProps {
  trip: TripRecord;
  token: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ChecklistModal({
  trip,
  token,
  onClose,
  onSubmitted,
}: ChecklistModalProps) {
  const [templateItems, setTemplateItems] = useState<ChecklistTemplateItem[]>([]);
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [vehiclePhotoKey, setVehiclePhotoKey] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [generalObs, setGeneralObs] = useState("");
  const [geo, setGeo] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [geoError, setGeoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    if (!token) return;
    setLoading(true);
    checklistAPI
      .getTemplate(token)
      .then((res) => {
        if (!active) return;
        setTemplateItems(res.data);
        const init: Record<string, ItemState> = {};
        for (const tpl of res.data) {
          const prev = trip.checklist?.items.find(
            (i) => i.itemName === tpl.itemName,
          );
          init[tpl.itemName] = prev
            ? {
                passed: prev.passed,
                observations: prev.observations ?? "",
                fileKey: prev.fileUrl ?? "",
              }
            : { passed: true, observations: "", fileKey: "" };
        }
        setItems(init);
        if (trip.checklist) {
          setVehiclePhotoKey(trip.checklist.vehiclePhotoKey ?? "");
          setGeneralObs(trip.checklist.generalObservations ?? "");
        }
      })
      .catch(() => {
        if (active) setFormError("No se pudo cargar el checklist.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, trip]);

  const captureGeo = useCallback(async () => {
    try {
      const position = await getGeolocation();
      setGeo(position);
      setGeoError("");
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Ubicación no disponible");
    }
  }, []);

  useEffect(() => {
    void captureGeo();
  }, [captureGeo]);

  const setItemField = (itemName: string, patch: Partial<ItemState>) => {
    setItems((prev) => ({
      ...prev,
      [itemName]: { ...prev[itemName], ...patch },
    }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    setFormError("");

    if (!vehiclePhotoKey) {
      setFormError("Debes subir la foto general del vehículo (con la placa visible).");
      return;
    }
    if (!geo) {
      setFormError("Necesitamos tu ubicación. Activa el permiso e inténtalo de nuevo.");
      return;
    }
    if (!signatureFile) {
      setFormError("Debes firmar el preoperacional.");
      return;
    }
    const failedWithoutPhoto = templateItems.filter(
      (tpl) => !items[tpl.itemName]?.passed && !items[tpl.itemName]?.fileKey,
    );
    if (failedWithoutPhoto.length) {
      setFormError(
        `Sube la foto de evidencia de: ${failedWithoutPhoto
          .map((t) => t.itemName)
          .join(", ")}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const signatureKey = await uploadToR2({
        file: signatureFile,
        folder: "checklist",
        token,
      });

      await driverTripsAPI.submitChecklist(
        trip.id,
        {
          items: templateItems.map((tpl) => ({
            itemName: tpl.itemName,
            passed: items[tpl.itemName]?.passed ?? true,
            observations: items[tpl.itemName]?.observations || undefined,
            fileKey: items[tpl.itemName]?.fileKey || undefined,
          })),
          vehiclePhotoKey,
          signatureKey,
          latitude: geo.latitude,
          longitude: geo.longitude,
          generalObservations: generalObs || undefined,
        },
        token,
      );

      showSuccessDialog("Preoperacional enviado para revisión.");
      onSubmitted();
    } catch (err) {
      showErrorDialog(
        err instanceof Error ? err.message : "No se pudo enviar el preoperacional",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Inspección preoperacional
            </h3>
            <p className="text-sm text-slate-500">
              {trip.route.name} · {trip.vehiclePlate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {trip.checklist?.status === "REJECTED" && trip.checklist.reviewNotes && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="font-semibold">Rechazado: </span>
            {trip.checklist.reviewNotes}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Cargando checklist…</p>
        ) : (
          <div className="space-y-5">
            {/* Geolocalización */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-[#0F2B4B]">
                  location_on
                </span>
                {geo ? (
                  <span className="text-slate-600">
                    Ubicación capturada ({geo.latitude.toFixed(5)},{" "}
                    {geo.longitude.toFixed(5)})
                  </span>
                ) : (
                  <span className="text-red-600">{geoError || "Obteniendo ubicación…"}</span>
                )}
              </div>
              {!geo && (
                <button
                  type="button"
                  onClick={() => void captureGeo()}
                  className="text-xs font-semibold text-[#0F2B4B] hover:underline"
                >
                  Reintentar
                </button>
              )}
            </div>

            {/* Foto general del vehículo */}
            <FileUpload
              label="Foto del vehículo (placa visible) — obligatoria"
              folder="checklist"
              token={token}
              value={vehiclePhotoKey || null}
              onChange={(key) => setVehiclePhotoKey(key ?? "")}
            />

            {/* Ítems */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                Ítems de revisión
              </h4>
              <div className="space-y-3">
                {templateItems.map((tpl) => {
                  const state = items[tpl.itemName] ?? {
                    passed: true,
                    observations: "",
                    fileKey: "",
                  };
                  return (
                    <div
                      key={tpl.id}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">
                          {tpl.itemName}
                        </span>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setItemField(tpl.itemName, { passed: true })}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              state.passed
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-slate-500 border-slate-200"
                            }`}
                          >
                            Bueno
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemField(tpl.itemName, { passed: false })}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              !state.passed
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-white text-slate-500 border-slate-200"
                            }`}
                          >
                            Malo
                          </button>
                        </div>
                      </div>

                      {!state.passed && (
                        <div className="mt-3 space-y-2">
                          <input
                            type="text"
                            value={state.observations}
                            onChange={(e) =>
                              setItemField(tpl.itemName, {
                                observations: e.target.value,
                              })
                            }
                            placeholder="Describe el problema…"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                          />
                          <FileUpload
                            label="Foto de evidencia (obligatoria)"
                            folder="checklist"
                            token={token}
                            value={state.fileKey || null}
                            onChange={(key) =>
                              setItemField(tpl.itemName, { fileKey: key ?? "" })
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Observaciones generales */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Observaciones generales (opcional)
              </label>
              <textarea
                value={generalObs}
                onChange={(e) => setGeneralObs(e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
              />
            </div>

            {/* Firma */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Firma del conductor — obligatoria
              </label>
              <SignaturePad onChange={setSignatureFile} />
            </div>

            {formError && (
              <p className="text-sm font-medium text-red-600">{formError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex-1 py-2.5 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-60"
              >
                {submitting ? "Enviando…" : "Enviar para revisión"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

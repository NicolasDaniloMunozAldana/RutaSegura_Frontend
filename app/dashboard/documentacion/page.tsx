"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import SecureFileLink from "@/components/SecureFileLink";
import {
  PersonDocumentRecord,
  VehicleDocumentRecord,
  VehicleRecord,
  documentManagementAPI,
  vehiclesAPI,
} from "@/lib/api";

const DOCUMENT_FIELDS = [
  { key: "soat", label: "SOAT", hasExpiryDate: true },
  { key: "technicalInspection", label: "Tecnomecanica", hasExpiryDate: true },
  { key: "insurance", label: "Seguro", hasExpiryDate: true },
  { key: "propertyCard", label: "Tarjeta de propiedad", hasExpiryDate: false },
] as const;

type VehicleDocumentField = (typeof DOCUMENT_FIELDS)[number]["key"];

type DocumentStatusTone = "ok" | "warn" | "exp" | "neutral";

type DocumentStatus = {
  tone: DocumentStatusTone;
  label: string;
  helper?: string;
};

type DocumentDateForm = {
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
};

type VehicleDocsForm = Record<VehicleDocumentField, DocumentDateForm>;

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CO");
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

function normalizeDateInput(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function calculateExpiryDate(issueDate: string): string {
  const normalized = issueDate.trim();
  if (!normalized) return "";

  const [yearText, monthText, dayText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return "";

  date.setUTCFullYear(date.getUTCFullYear() + 1);

  const nextYear = String(date.getUTCFullYear());
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function createDocumentDateForm(
  document: VehicleDocumentRecord | null,
  options?: { hasExpiryDate?: boolean },
): DocumentDateForm {
  const hasExpiryDate = options?.hasExpiryDate ?? true;
  const issueDate = toDateInput(document?.issueDate);
  const fallbackExpiry = toDateInput(document?.expiryDate);

  const expiryDate = hasExpiryDate
    ? issueDate
      ? calculateExpiryDate(issueDate)
      : fallbackExpiry
    : "";

  return {
    documentNumber: document?.documentNumber ?? "",
    issueDate,
    expiryDate,
    fileUrl: document?.fileUrl ?? "",
  };
}

function mapVehicleDocsForm(vehicle: VehicleRecord): VehicleDocsForm {
  return {
    soat: createDocumentDateForm(vehicle.soat, { hasExpiryDate: true }),
    technicalInspection: createDocumentDateForm(vehicle.technicalInspection, {
      hasExpiryDate: true,
    }),
    insurance: createDocumentDateForm(vehicle.insurance, { hasExpiryDate: true }),
    propertyCard: createDocumentDateForm(vehicle.propertyCard, { hasExpiryDate: false }),
  };
}

function resolveExpiryStatus(expiryDate: string | null | undefined): DocumentStatus {
  if (!expiryDate) {
    return { tone: "neutral", label: "Sin vencimiento" };
  }

  const today = new Date();
  const expiry = new Date(expiryDate);

  if (Number.isNaN(expiry.getTime())) {
    return { tone: "neutral", label: "Sin dato" };
  }

  const daysRemaining = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysRemaining < 0) {
    return { tone: "exp", label: "Vencido", helper: formatDateLabel(expiryDate) };
  }

  if (daysRemaining <= 30) {
    return { tone: "warn", label: "Por vencer", helper: formatDateLabel(expiryDate) };
  }

  return { tone: "ok", label: "Al dia", helper: formatDateLabel(expiryDate) };
}

function resolveDocumentStatus(document: VehicleDocumentRecord | null): DocumentStatus {
  if (!document) {
    return { tone: "neutral", label: "Sin documento" };
  }

  return resolveExpiryStatus(document.expiryDate);
}

function documentBadge(status: DocumentStatus) {
  const styles: Record<DocumentStatusTone, string> = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    exp: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const icons: Record<DocumentStatusTone, string> = {
    ok: "check_circle",
    warn: "warning",
    exp: "error",
    neutral: "info",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        styles[status.tone]
      }`}
    >
      <span className="material-symbols-outlined text-[13px]">{icons[status.tone]}</span>
      {status.label}
      {status.helper ? (
        <span className="ml-1 font-normal normal-case tracking-normal">
          {status.helper}
        </span>
      ) : null}
    </span>
  );
}

function personFullName(person: PersonDocumentRecord["personDocumentLinks"][number]["person"]) {
  return [person.firstName, person.firstLastname].filter(Boolean).join(" ");
}

export default function DocumentacionPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [personDocs, setPersonDocs] = useState<PersonDocumentRecord[]>([]);
  const [docTab, setDocTab] = useState<"vehiculos" | "conductores">("vehiculos");
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docVehicle, setDocVehicle] = useState<VehicleRecord | null>(null);
  const [docForm, setDocForm] = useState<VehicleDocsForm>(() => ({
    soat: createDocumentDateForm(null, { hasExpiryDate: true }),
    technicalInspection: createDocumentDateForm(null, { hasExpiryDate: true }),
    insurance: createDocumentDateForm(null, { hasExpiryDate: true }),
    propertyCard: createDocumentDateForm(null, { hasExpiryDate: false }),
  }));
  const [docSubmitLoading, setDocSubmitLoading] = useState(false);
  const [docSubmitError, setDocSubmitError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [vehiclesRes, docsRes] = await Promise.all([
        vehiclesAPI.findAll(token),
        documentManagementAPI.findPersonDocuments(token),
      ]);

      setVehicles(vehiclesRes.data);
      setPersonDocs(docsRes.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar la documentacion";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const openDocModal = useCallback((vehicle: VehicleRecord) => {
    setDocVehicle(vehicle);
    setDocForm(mapVehicleDocsForm(vehicle));
    setDocSubmitError(null);
    setDocModalOpen(true);
  }, []);

  const closeDocModal = useCallback(() => {
    if (docSubmitLoading) return;
    setDocModalOpen(false);
  }, [docSubmitLoading]);

  const updateDocField = useCallback(
    (key: VehicleDocumentField, field: keyof DocumentDateForm, value: string) => {
      const config = DOCUMENT_FIELDS.find((item) => item.key === key);

      setDocForm((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value,
          ...(field === "issueDate" && config?.hasExpiryDate
            ? { expiryDate: calculateExpiryDate(value) }
            : field === "issueDate"
              ? { expiryDate: "" }
              : {}),
        },
      }));
    },
    [],
  );

  const validateDocForm = useCallback((values: VehicleDocsForm) => {
    for (const config of DOCUMENT_FIELDS) {
      const entry = values[config.key];

      if (!entry.documentNumber.trim()) {
        return `Falta el numero de ${config.label}.`;
      }

      if (
        config.hasExpiryDate &&
        entry.issueDate &&
        entry.expiryDate &&
        entry.issueDate > entry.expiryDate
      ) {
        return `En ${config.label}, la fecha de expedicion no puede ser posterior al vencimiento.`;
      }
    }

    return null;
  }, []);

  const handleDocSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!token || !docVehicle) return;

      const validationError = validateDocForm(docForm);
      if (validationError) {
        setDocSubmitError(validationError);
        return;
      }

      try {
        setDocSubmitLoading(true);
        setDocSubmitError(null);

        const documentsPayload = {} as Record<
          VehicleDocumentField,
          {
            documentNumber: string;
            issueDate?: string;
            expiryDate?: string;
            fileUrl?: string;
          }
        >;

        for (const config of DOCUMENT_FIELDS) {
          const entry = docForm[config.key];

          const computedExpiry = config.hasExpiryDate
            ? entry.issueDate
              ? calculateExpiryDate(entry.issueDate)
              : entry.expiryDate
            : "";

          documentsPayload[config.key] = {
            documentNumber: entry.documentNumber.trim(),
            issueDate: normalizeDateInput(entry.issueDate),
            expiryDate: config.hasExpiryDate
              ? normalizeDateInput(computedExpiry)
              : undefined,
            fileUrl: normalizeOptionalText(entry.fileUrl),
          };
        }

        await vehiclesAPI.update(
          docVehicle.plate,
          { documents: documentsPayload },
          token,
        );

        await loadDocuments();
        setDocModalOpen(false);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudieron actualizar las fechas.";
        setDocSubmitError(message);
      } finally {
        setDocSubmitLoading(false);
      }
    },
    [docForm, docVehicle, loadDocuments, token, validateDocForm],
  );

  const driverDocRows = useMemo(() => {
    const rows = personDocs.flatMap((doc) =>
      doc.personDocumentLinks.map((link) => ({ doc, person: link.person })),
    );

    return rows.filter((row) => row.person.personType?.toLowerCase() === "driver");
  }, [personDocs]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documentacion</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestion rapida de fechas de documentos vehiculares y conductores
        </p>
      </div>

      {error && (
        <div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setDocTab("vehiculos")}
            className={
              docTab === "vehiculos"
                ? "px-4 py-1.5 rounded-md text-xs font-semibold bg-white text-[#0F2B4B] shadow-sm"
                : "px-4 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-700"
            }
          >
            Vehiculos
          </button>
          <button
            type="button"
            onClick={() => setDocTab("conductores")}
            className={
              docTab === "conductores"
                ? "px-4 py-1.5 rounded-md text-xs font-semibold bg-white text-[#0F2B4B] shadow-sm"
                : "px-4 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:text-slate-700"
            }
          >
            Conductores
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {docTab === "vehiculos" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vehiculo</th>
                  <th className="px-4 py-3 font-semibold">SOAT</th>
                  <th className="px-4 py-3 font-semibold">Tecnomecanica</th>
                  <th className="px-4 py-3 font-semibold">Seguro</th>
                  <th className="px-4 py-3 font-semibold">Tarjeta</th>
                  <th className="px-4 py-3 font-semibold text-right">Actualizar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                      Cargando documentos...
                    </td>
                  </tr>
                )}

                {!loading && vehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                      No hay vehiculos registrados.
                    </td>
                  </tr>
                )}

                {!loading &&
                  vehicles.map((vehicle) => {
                    const canUpdate = Boolean(
                      vehicle.soat &&
                        vehicle.technicalInspection &&
                        vehicle.insurance &&
                        vehicle.propertyCard,
                    );

                    return (
                      <tr key={vehicle.plate} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{vehicle.plate}</p>
                          <p className="text-xs text-slate-500">
                            {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") ||
                              "Sin detalle"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {documentBadge(resolveDocumentStatus(vehicle.soat))}
                        </td>
                        <td className="px-4 py-3">
                          {documentBadge(
                            resolveDocumentStatus(vehicle.technicalInspection),
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {documentBadge(resolveDocumentStatus(vehicle.insurance))}
                        </td>
                        <td className="px-4 py-3">
                          {documentBadge(resolveDocumentStatus(vehicle.propertyCard))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openDocModal(vehicle)}
                            disabled={!canUpdate}
                            className={
                              canUpdate
                                ? "border border-slate-200 bg-white hover:bg-[#0F2B4B] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 transition-all"
                                : "border border-slate-200 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 cursor-not-allowed"
                            }
                          >
                            Actualizar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {docTab === "conductores" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Conductor</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Numero</th>
                  <th className="px-4 py-3 font-semibold">Vencimiento</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Archivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                      Cargando documentos...
                    </td>
                  </tr>
                )}

                {!loading && driverDocRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                      No hay documentos de conductores.
                    </td>
                  </tr>
                )}

                {!loading &&
                  driverDocRows.map((row) => {
                    const status = resolveExpiryStatus(row.doc.expiryDate);

                    return (
                      <tr
                        key={`${row.doc.id}-${row.person.id}`}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">
                            {personFullName(row.person)}
                          </p>
                          <p className="text-xs text-slate-500">ID {row.person.id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.doc.documentType?.name || "Documento"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.doc.documentNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.doc.expiryDate
                            ? formatDateLabel(row.doc.expiryDate)
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3">{documentBadge(status)}</td>
                        <td className="px-4 py-3">
                          <SecureFileLink
                            fileKey={row.doc.fileUrl}
                            token={token}
                            label="Ver"
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {docModalOpen && docVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
          onClick={closeDocModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Actualizar documentacion
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Vehiculo: {docVehicle.plate}
                </p>
              </div>
              <button
                onClick={closeDocModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleDocSubmit} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {DOCUMENT_FIELDS.map((field) => {
                  const entry = docForm[field.key];

                  return (
                    <div
                      key={field.key}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {field.label}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Ajusta fechas sin cambiar el numero del documento.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                            Numero
                          </label>
                          <input
                            type="text"
                            value={entry.documentNumber}
                            disabled
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                            Expedicion
                          </label>
                          <input
                            type="date"
                            value={entry.issueDate}
                            onChange={(event) =>
                              updateDocField(field.key, "issueDate", event.target.value)
                            }
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                            Vencimiento
                          </label>
                          <input
                            type="date"
                            value={entry.expiryDate}
                            readOnly
                            disabled={!field.hasExpiryDate}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-500"
                          />

                          {!field.hasExpiryDate && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              No aplica vencimiento para este documento.
                            </p>
                          )}

                          {field.hasExpiryDate && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              Se calcula automaticamente con base en la expedicion.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {docSubmitError && (
                <p className="text-sm font-medium text-red-600">{docSubmitError}</p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeDocModal}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={docSubmitLoading}
                  className="flex-1 py-2.5 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
                >
                  {docSubmitLoading ? "Guardando..." : "Actualizar fechas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
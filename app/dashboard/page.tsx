"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  DocumentAlertRecord,
  PersonDocumentRecord,
  VehicleDocumentRecord,
  VehicleRecord,
  documentManagementAPI,
  driversAPI,
  studentsAPI,
  vehiclesAPI,
} from "@/lib/api";

const ALERT_WINDOW_DAYS = 30;
const MAX_ALERTS = 4;
const MAX_VEHICLES = 6;
const MAX_PERSON_DOCS = 6;
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
  if (!normalized) {
    return "";
  }

  const [yearText, monthText, dayText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return "";
  }

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

  if (daysRemaining <= ALERT_WINDOW_DAYS) {
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

function alertTone(alert: DocumentAlertRecord) {
  const classification = alert.classification ?? "UPCOMING";

  if (classification === "EXPIRED") {
    return {
      icon: "error",
      iconClass: "bg-red-50 text-red-600",
      helperClass: "text-red-500",
    };
  }

  if (classification === "EXPIRING_SOON") {
    return {
      icon: "warning",
      iconClass: "bg-amber-50 text-amber-600",
      helperClass: "text-amber-600",
    };
  }

  return {
    icon: "notifications",
    iconClass: "bg-sky-50 text-sky-600",
    helperClass: "text-slate-500",
  };
}

function scopeLabel(alert: DocumentAlertRecord) {
  if (alert.vehiclePlate) return `Vehiculo ${alert.vehiclePlate}`;
  if (alert.personId) return `Persona #${alert.personId}`;
  return "Sin referencia";
}

function personFullName(person: PersonDocumentRecord["personDocumentLinks"][number]["person"]) {
  return [person.firstName, person.firstLastname].filter(Boolean).join(" ");
}

export default function Dashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    students: 0,
    drivers: 0,
    vehicles: 0,
    alerts: 0,
  });
  const [alerts, setAlerts] = useState<DocumentAlertRecord[]>([]);
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

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [studentsRes, driversRes, vehiclesRes, alertsRes, docsRes] =
        await Promise.all([
          studentsAPI.findAll(token),
          driversAPI.findAll(token),
          vehiclesAPI.findAll(token),
          documentManagementAPI.findAlerts(token, { page: 1, limit: 10, isRead: false }),
          documentManagementAPI.findPersonDocuments(token),
        ]);

      setStats({
        students: studentsRes.data.length,
        drivers: driversRes.data.length,
        vehicles: vehiclesRes.data.length,
        alerts: alertsRes.data.meta.totalItems,
      });
      setAlerts(alertsRes.data.items);
      setVehicles(vehiclesRes.data);
      setPersonDocs(docsRes.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el panel";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

        await loadDashboard();
        setDocModalOpen(false);
      } catch (err: unknown) {
        const message = err instanceof Error
          ? err.message
          : "No se pudieron actualizar las fechas.";
        setDocSubmitError(message);
      } finally {
        setDocSubmitLoading(false);
      }
    },
    [docForm, docVehicle, loadDashboard, token, validateDocForm],
  );

  const criticalAlerts = useMemo(() => {
    return alerts
      .filter(
        (alert) =>
          alert.classification === "EXPIRED" || alert.classification === "EXPIRING_SOON",
      )
      .slice(0, MAX_ALERTS);
  }, [alerts]);

  const vehiclePreview = useMemo(() => vehicles.slice(0, MAX_VEHICLES), [vehicles]);

  const driverDocRows = useMemo(() => {
    const rows = personDocs.flatMap((doc) =>
      doc.personDocumentLinks.map((link) => ({ doc, person: link.person })),
    );

    return rows
      .filter((row) => row.person.personType?.toLowerCase() === "driver")
      .slice(0, MAX_PERSON_DOCS);
  }, [personDocs]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Panel de Control</h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumen general de documentos y alertas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md">
              <span className="material-symbols-outlined text-[18px]">person_pin</span>
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Estudiantes
            </p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {loading ? "-" : stats.students}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md">
              <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Conductores
            </p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {loading ? "-" : stats.drivers}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md">
              <span className="material-symbols-outlined text-[18px]">airport_shuttle</span>
            </div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Vehiculos
            </p>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {loading ? "-" : stats.vehicles}
          </h3>
        </div>

        <div className="bg-red-50/30 p-5 rounded-xl border border-red-100 border-l-4 border-l-red-500 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-1.5 bg-red-100 text-red-600 rounded-md">
              <span className="material-symbols-outlined text-[18px]">report</span>
            </div>
            <p className="text-red-700/70 text-xs font-semibold uppercase tracking-wider">
              Alertas
            </p>
          </div>
          <h3 className="text-2xl font-bold text-red-600 tracking-tight">
            {loading ? "-" : stats.alerts}
          </h3>
        </div>
      </div>

      {error && (
        <div className="bg-white border border-red-200 rounded-xl p-5 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-800 font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">priority_high</span>
                Alertas Criticas
              </h3>
              <Link
                href="/dashboard/alertas"
                className="text-[#003D7A] text-xs font-bold hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {loading && (
                <div className="p-6 text-center text-slate-500 text-sm">Cargando alertas...</div>
              )}
              {!loading && criticalAlerts.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No hay alertas criticas por ahora.
                </div>
              )}
              {!loading &&
                criticalAlerts.map((alert) => {
                  const tone = alertTone(alert);
                  return (
                    <div
                      key={alert.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${tone.iconClass}`}>
                          <span className="material-symbols-outlined text-xl">
                            {tone.icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800">
                            {alert.message || "Alerta documental"}
                          </p>
                          <p className={`text-[11px] font-medium ${tone.helperClass}`}>
                            {alert.daysRemaining !== null && alert.daysRemaining !== undefined
                              ? alert.daysRemaining < 0
                                ? `Vencido hace ${Math.abs(alert.daysRemaining)} dias`
                                : `Vence en ${alert.daysRemaining} dias`
                              : scopeLabel(alert)}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/alertas"
                        className="border border-slate-200 hover:bg-[#003D7A] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 transition-all"
                      >
                        Gestionar
                      </Link>
                    </div>
                  );
                })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-800 font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[#003D7A]">description</span>
                Control Documental
              </h3>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setDocTab("vehiculos")}
                  className={
                    docTab === "vehiculos"
                      ? "px-4 py-1.5 rounded-md text-xs font-semibold bg-white text-[#003D7A] shadow-sm"
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
                      ? "px-4 py-1.5 rounded-md text-xs font-semibold bg-white text-[#003D7A] shadow-sm"
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
                      {!loading && vehiclePreview.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-5 text-center text-slate-500">
                            No hay vehiculos registrados.
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        vehiclePreview.map((vehicle) => {
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
                                {documentBadge(resolveDocumentStatus(vehicle.technicalInspection))}
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
                                      ? "border border-slate-200 bg-white hover:bg-[#003D7A] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 transition-all"
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading && (
                        <tr>
                          <td colSpan={5} className="px-4 py-5 text-center text-slate-500">
                            Cargando documentos...
                          </td>
                        </tr>
                      )}
                      {!loading && driverDocRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-5 text-center text-slate-500">
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
                                {row.doc.expiryDate ? formatDateLabel(row.doc.expiryDate) : "N/A"}
                              </td>
                              <td className="px-4 py-3">{documentBadge(status)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-800 font-bold text-lg">Acciones Rapidas</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard/estudiantes"
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl gap-2 hover:border-[#003D7A] hover:bg-slate-50/50 transition-all group"
              >
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-[#003D7A]/10">
                  <span className="material-symbols-outlined text-slate-500 text-[20px] group-hover:text-[#003D7A] transition-colors">
                    person_add
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-700">Nuevo Estudiante</span>
              </Link>
              <Link
                href="/dashboard/conductores"
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl gap-2 hover:border-[#003D7A] hover:bg-slate-50/50 transition-all group"
              >
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-[#003D7A]/10">
                  <span className="material-symbols-outlined text-slate-500 text-[20px] group-hover:text-[#003D7A] transition-colors">
                    assignment_ind
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-700">Nuevo Conductor</span>
              </Link>
              <Link
                href="/dashboard/vehiculos"
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl gap-2 hover:border-[#003D7A] hover:bg-slate-50/50 transition-all group"
              >
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-[#003D7A]/10">
                  <span className="material-symbols-outlined text-slate-500 text-[20px] group-hover:text-[#003D7A] transition-colors">
                    airport_shuttle
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-700">Nuevo Vehiculo</span>
              </Link>
              <Link
                href="/dashboard/alertas"
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl gap-2 hover:border-[#003D7A] hover:bg-slate-50/50 transition-all group"
              >
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-[#003D7A]/10">
                  <span className="material-symbols-outlined text-slate-500 text-[20px] group-hover:text-[#003D7A] transition-colors">
                    notifications
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-700">Ver Alertas</span>
              </Link>
            </div>
          </section>
        </div>
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
                        <h4 className="text-sm font-semibold text-slate-800">{field.label}</h4>
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
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
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
                            className={
                              field.hasExpiryDate
                                ? "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-500"
                                : "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-500"
                            }
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
                  className="flex-1 py-2.5 bg-[#003D7A] hover:bg-[#0066CC] text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
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


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import {
  AlertListMeta,
  AlertQueryParams,
  AlertType,
  DocumentAlertRecord,
  documentManagementAPI,
} from "@/lib/api";

const ALERT_TYPES: Array<{ value: "" | AlertType; label: string }> = [
  { value: "", label: "Todos los tipos" },
  { value: "EXPIRY_WARNING", label: "Por vencer" },
  { value: "EXPIRY_INFO", label: "Informativa" },
  { value: "EXPIRED", label: "Vencida" },
];

const READ_FILTERS = [
  { value: "", label: "Todos los estados" },
  { value: "unread", label: "No leidas" },
  { value: "read", label: "Leidas" },
] as const;

const initialMeta: AlertListMeta = {
  totalItems: 0,
  totalPages: 1,
  page: 1,
  limit: 10,
};

function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-CO");
}

function alertTypeLabel(value: string | null | undefined) {
  if (value === "EXPIRED") return "Vencida";
  if (value === "EXPIRY_WARNING") return "Por vencer";
  if (value === "EXPIRY_INFO") return "Informativa";
  return value ?? "Sin tipo";
}

function classificationBadge(alert: DocumentAlertRecord) {
  const classification = alert.classification ?? "UPCOMING";
  const label =
    classification === "EXPIRED"
      ? "Vencida"
      : classification === "EXPIRING_SOON"
      ? "Vence pronto"
      : "Proxima";

  const className =
    classification === "EXPIRED"
      ? "border-red-200 bg-red-50 text-red-700"
      : classification === "EXPIRING_SOON"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function readBadge(isRead: boolean) {
  return (
    <span
      className={
        isRead
          ? "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
          : "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
      }
    >
      <span
        className={
          isRead
            ? "size-1.5 rounded-full bg-slate-500"
            : "size-1.5 rounded-full bg-emerald-600"
        }
      />
      {isRead ? "Leida" : "No leida"}
    </span>
  );
}

function scopeLabel(alert: DocumentAlertRecord) {
  if (alert.vehiclePlate) return `Vehiculo ${alert.vehiclePlate}`;
  if (alert.personId) return `Persona #${alert.personId}`;
  return "Sin referencia";
}

function daysRemainingLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "Sin dato";
  if (value < 0) return `Vencida hace ${Math.abs(value)} dias`;
  if (value === 0) return "Vence hoy";
  return `Vence en ${value} dias`;
}

function alertTone(alert: DocumentAlertRecord) {
  const classification = alert.classification ?? "UPCOMING";

  if (classification === "EXPIRED") {
    return {
      card: "border-red-100 border-l-red-500 bg-red-50/50",
      icon: "error",
      iconClass: "bg-red-100 text-red-600",
    };
  }

  if (classification === "EXPIRING_SOON") {
    return {
      card: "border-amber-100 border-l-amber-500 bg-amber-50/40",
      icon: "warning",
      iconClass: "bg-amber-100 text-amber-600",
    };
  }

  return {
    card: "border-sky-100 border-l-sky-500 bg-sky-50/40",
    icon: "notifications",
    iconClass: "bg-sky-100 text-sky-600",
  };
}

function showErrorDialog(message: string) {
  void Swal.fire({
    title: "Ocurrio un problema",
    text: message,
    icon: "error",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#0F2B4B",
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });
}

export default function AlertasPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<DocumentAlertRecord[]>([]);
  const [meta, setMeta] = useState<AlertListMeta>(initialMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [alertType, setAlertType] = useState<"" | AlertType>("");
  const [readFilter, setReadFilter] = useState<(typeof READ_FILTERS)[number]["value"]>("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [personId, setPersonId] = useState("");
  const [daysAhead, setDaysAhead] = useState("");
  const [limit, setLimit] = useState(String(initialMeta.limit));

  const currentPage = meta.page;

  const requestParams = useMemo<AlertQueryParams>(() => {
    const normalizedQuery = query.trim();
    const normalizedPlate = vehiclePlate.trim();
    const parsedPersonId = Number(personId);
    const parsedDaysAhead = Number(daysAhead);
    const parsedLimit = Number(limit);

    return {
      q: normalizedQuery || undefined,
      alertType: alertType || undefined,
      vehiclePlate: normalizedPlate ? normalizedPlate.toUpperCase() : undefined,
      personId: Number.isInteger(parsedPersonId) && parsedPersonId > 0 ? parsedPersonId : undefined,
      daysAhead:
        Number.isInteger(parsedDaysAhead) && parsedDaysAhead > 0 ? parsedDaysAhead : undefined,
      isRead:
        readFilter === "read" ? true : readFilter === "unread" ? false : undefined,
      page: currentPage,
      limit: Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : initialMeta.limit,
    };
  }, [
    alertType,
    currentPage,
    daysAhead,
    limit,
    personId,
    query,
    readFilter,
    vehiclePlate,
  ]);

  const loadAlerts = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await documentManagementAPI.findAlerts(token, requestParams);
      setAlerts(response.data.items);
      setMeta(response.data.meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar las alertas";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [requestParams, token]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      void loadAlerts();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadAlerts, token]);

  async function handleMarkAsRead(alert: DocumentAlertRecord) {
    if (!token) return;
    if (alert.isRead) return;

    try {
      await documentManagementAPI.markAlertAsRead(alert.id, token);
      await loadAlerts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo marcar la alerta";
      showErrorDialog(message);
    }
  }

  const summary = useMemo(() => {
    const unread = alerts.filter((item) => !item.isRead).length;
    const expired = alerts.filter((item) => item.classification === "EXPIRED").length;
    const expiring = alerts.filter((item) => item.classification === "EXPIRING_SOON").length;

    return {
      unread,
      expired,
      expiring,
    };
  }, [alerts]);

  const totalLabel = `${meta.totalItems} alertas`;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Alertas Documentales</h3>
          <p className="text-sm text-slate-500 mt-0.5">{totalLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Sincronizacion automatica
          </div>
          <button
            onClick={loadAlerts}
            className="border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{meta.totalItems}</p>
          <p className="text-xs text-slate-400 mt-1">Resultados actuales</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">No leidas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{summary.unread}</p>
          <p className="text-xs text-slate-400 mt-1">En esta vista</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Por vencer</p>
          <p className="text-2xl font-bold text-amber-700 mt-2">{summary.expiring}</p>
          <p className="text-xs text-slate-400 mt-1">En esta vista</p>
        </div>
        <div className="bg-red-50/40 border border-red-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Vencidas</p>
          <p className="text-2xl font-bold text-red-700 mt-2">{summary.expired}</p>
          <p className="text-xs text-slate-400 mt-1">En esta vista</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-6 gap-3 items-center">
        <div className="relative xl:col-span-2">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setMeta((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Buscar por mensaje o referencia"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
          value={alertType}
          onChange={(e) => {
            setAlertType(e.target.value as "" | AlertType);
            setMeta((prev) => ({ ...prev, page: 1 }));
          }}
        >
          {ALERT_TYPES.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
          value={readFilter}
          onChange={(e) => {
            setReadFilter(e.target.value as (typeof READ_FILTERS)[number]["value"]);
            setMeta((prev) => ({ ...prev, page: 1 }));
          }}
        >
          {READ_FILTERS.map((item) => (
            <option key={item.label} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={vehiclePlate}
          onChange={(event) => {
            setVehiclePlate(event.target.value);
            setMeta((prev) => ({ ...prev, page: 1 }));
          }}
          placeholder="Placa"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
        />
        <input
          type="number"
          min={1}
          value={personId}
          onChange={(event) => {
            setPersonId(event.target.value);
            setMeta((prev) => ({ ...prev, page: 1 }));
          }}
          placeholder="Persona ID"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
        />
        <input
          type="number"
          min={1}
          value={daysAhead}
          onChange={(event) => {
            setDaysAhead(event.target.value);
            setMeta((prev) => ({ ...prev, page: 1 }));
          }}
          placeholder="Dias a vencer"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
        />
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
          value={limit}
          onChange={(e) => {
            setLimit(e.target.value);
            setMeta((prev) => ({ ...prev, page: 1 }));
          }}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} por pagina
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
            Cargando alertas...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white border border-red-200 rounded-xl p-6 text-center text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">
            No hay alertas con los filtros actuales.
          </div>
        )}

        {!loading &&
          !error &&
          alerts.map((alert) => {
            const tone = alertTone(alert);
            return (
              <div
                key={alert.id}
                className={`border border-l-4 rounded-xl p-4 flex flex-col gap-4 ${tone.card}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${tone.iconClass}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {tone.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {alert.message || "Sin detalle"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {daysRemainingLabel(alert.daysRemaining)} • {scopeLabel(alert)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {classificationBadge(alert)}
                    {readBadge(alert.isRead)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Tipo: {alertTypeLabel(alert.alertType)}</span>
                    <span>Vence: {formatDateLabel(alert.documentExpiryDate)}</span>
                    <span>Generada: {formatDateLabel(alert.generatedAt)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(alert)}
                    disabled={alert.isRead}
                    className={
                      alert.isRead
                        ? "text-slate-400 text-xs font-semibold"
                        : "text-[#0F2B4B] hover:text-[#163a63] text-xs font-semibold"
                    }
                  >
                    {alert.isRead ? "Leida" : "Marcar leida"}
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-medium">
        <span>
          Pagina {meta.page} de {meta.totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMeta((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={meta.page <= 1}
            className="px-3 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() =>
              setMeta((prev) => ({
                ...prev,
                page: Math.min(prev.totalPages, prev.page + 1),
              }))
            }
            disabled={meta.page >= meta.totalPages}
            className="px-3 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

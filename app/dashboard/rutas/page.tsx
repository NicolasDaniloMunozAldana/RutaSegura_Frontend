"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  RouteFormOptions,
  RoutePayload,
  RouteRecord,
  RouteType,
  UpdateRoutePayload,
  routesAPI,
} from "@/lib/api";
import { confirmDialog, showErrorDialog, showSuccessDialog } from "./dialogs";
import RouteAssignmentsModal from "./RouteAssignmentsModal";
import RouteMapModal from "./RouteMapModal";

const PAGE_SIZE = 8;

const MANAGER_ROLES = ["admin", "coordinator", "coordinador"];

const ROUTE_TYPE_OPTIONS: Array<{ value: RouteType; label: string }> = [
  { value: "PICKUP", label: "Recogida" },
  { value: "DROPOFF", label: "Entrega" },
];

const ROUTE_TYPE_CARDS: Array<{
  value: RouteType;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    value: "PICKUP",
    title: "Recogida",
    description: "Traer estudiantes al colegio",
    icon: "directions_bus",
  },
  {
    value: "DROPOFF",
    title: "Entrega",
    description: "Llevar estudiantes a casa",
    icon: "home",
  },
];

type FormState = {
  name: string;
  routeType: RouteType | "";
  zoneId: string;
  destinationId: string;
  vehiclePlate: string;
  driverPersonId: string;
  startTime: string;
};

const initialForm: FormState = {
  name: "",
  routeType: "",
  zoneId: "",
  destinationId: "",
  vehiclePlate: "",
  driverPersonId: "",
  startTime: "",
};

const emptyOptions: RouteFormOptions = {
  zones: [],
  destinations: [],
  vehicles: [],
  drivers: [],
};

function toTimeInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : "";
}

function formatTimeLabel(value: string | null | undefined): string {
  const time = toTimeInput(value);
  return time || "Sin hora";
}

function routeTypeLabel(value: string | null | undefined): string {
  if (value === "PICKUP") return "Recogida";
  if (value === "DROPOFF") return "Entrega";
  return "Sin tipo";
}

function formatDistance(distance: number | null | undefined): string {
  if (distance === null || distance === undefined) {
    return "Sin calcular";
  }

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`;
  }

  return `${Math.round(distance)} m`;
}

function formatDuration(duration: number | null | undefined): string {
  if (duration === null || duration === undefined) {
    return "Sin calcular";
  }

  const totalMinutes = Math.round(duration / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}

function driverName(route: RouteRecord): string {
  if (!route.driver) {
    return "Sin conductor";
  }

  return `${route.driver.firstName} ${route.driver.firstLastname}`.trim();
}

function vehicleLabel(route: RouteRecord): string {
  if (!route.vehicle) {
    return route.vehiclePlate || "Sin vehículo";
  }

  const details = [route.vehicle.brand, route.vehicle.model]
    .filter(Boolean)
    .join(" ")
    .trim();

  return details
    ? `${route.vehicle.plate} · ${details}`
    : route.vehicle.plate;
}

function mapRouteToForm(route: RouteRecord): FormState {
  return {
    name: route.name ?? "",
    routeType: (route.routeType as RouteType) ?? "",
    zoneId: route.zoneId ? String(route.zoneId) : "",
    destinationId: route.destinationId ? String(route.destinationId) : "",
    vehiclePlate: route.vehiclePlate ?? "",
    driverPersonId: route.driverPersonId ? String(route.driverPersonId) : "",
    startTime: toTimeInput(route.startTime),
  };
}

function toCreatePayload(form: FormState): RoutePayload {
  return {
    name: form.name.trim(),
    routeType: form.routeType as RouteType,
    zoneId: Number(form.zoneId),
    destinationId: Number(form.destinationId),
    startTime: form.startTime.trim(),
    vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
    driverPersonId: Number(form.driverPersonId),
  };
}

function toUpdatePayload(form: FormState): UpdateRoutePayload {
  return {
    name: form.name.trim(),
    routeType: form.routeType as RouteType,
    zoneId: Number(form.zoneId),
    destinationId: Number(form.destinationId),
    startTime: form.startTime.trim(),
    vehiclePlate: form.vehiclePlate.trim().toUpperCase(),
    driverPersonId: Number(form.driverPersonId),
  };
}

function isRouteActive(status: string | null | undefined) {
  return status?.toLowerCase() === "active";
}

function statusBadge(status: string | null | undefined) {
  const isActive = isRouteActive(status);
  return (
    <span
      className={
        isActive
          ? "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      }
    >
      <span
        className={
          isActive
            ? "size-1.5 rounded-full bg-emerald-600"
            : "size-1.5 rounded-full bg-slate-500"
        }
      />
      {isActive ? "Activa" : "Inactiva"}
    </span>
  );
}

function routeTypeBadge(routeType: string | null | undefined) {
  const isPickup = routeType === "PICKUP";
  return (
    <span
      className={
        isPickup
          ? "inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
          : "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
      }
    >
      <span className="material-symbols-outlined text-[14px]">
        {isPickup ? "north_east" : "south_west"}
      </span>
      {routeTypeLabel(routeType)}
    </span>
  );
}

export default function RutasPage() {
  const { token, user } = useAuth();
  const userRole = user?.role?.trim().toLowerCase() ?? "";
  const canManage = MANAGER_ROLES.includes(userRole);

  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const [options, setOptions] = useState<RouteFormOptions>(emptyOptions);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewRoute, setViewRoute] = useState<RouteRecord | null>(null);

  const [assignmentsRoute, setAssignmentsRoute] = useState<RouteRecord | null>(
    null,
  );
  const [mapRoute, setMapRoute] = useState<RouteRecord | null>(null);

  const loadRoutes = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await routesAPI.findAll(token);
      setRoutes(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar las rutas";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadOptions = useCallback(async () => {
    if (!token) return;

    try {
      setOptionsError(null);
      const response = await routesAPI.getFormOptions(token);
      setOptions(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las opciones del formulario";
      setOptionsError(message);
    }
  }, [token]);

  useEffect(() => {
    void loadRoutes();
    void loadOptions();
  }, [loadRoutes, loadOptions]);

  const zoneNames = useMemo(() => {
    const map = new Map<number, string>();
    options.zones.forEach((zone) => map.set(zone.id, zone.name));
    routes.forEach((route) => {
      if (route.zone) {
        map.set(route.zone.id, route.zone.name);
      }
    });
    return map;
  }, [options.zones, routes]);

  const zoneFilterOptions = useMemo(() => {
    return Array.from(zoneNames.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [zoneNames]);

  const filteredRoutes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return routes.filter((route) => {
      const name = route.name.toLowerCase();
      const origin = (route.originDescription ?? "").toLowerCase();
      const destination = (route.destination?.name ?? "").toLowerCase();
      const driver = driverName(route).toLowerCase();
      const plate = (route.vehiclePlate ?? "").toLowerCase();
      const status = (route.status ?? "").toLowerCase();

      const searchPass =
        !normalizedQuery ||
        name.includes(normalizedQuery) ||
        origin.includes(normalizedQuery) ||
        destination.includes(normalizedQuery) ||
        driver.includes(normalizedQuery) ||
        plate.includes(normalizedQuery);

      const statusPass = !statusFilter || status === statusFilter;
      const zonePass = !zoneFilter || String(route.zoneId ?? "") === zoneFilter;
      const typePass = !typeFilter || route.routeType === typeFilter;

      return searchPass && statusPass && zonePass && typePass;
    });
  }, [routes, query, statusFilter, zoneFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, zoneFilter, typeFilter]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedRoutes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRoutes.slice(start, start + PAGE_SIZE);
  }, [filteredRoutes, page]);

  function openCreateModal() {
    setIsEditMode(false);
    setSelectedRouteId(null);
    setSubmitError(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function openEditModal(route: RouteRecord) {
    setIsEditMode(true);
    setSelectedRouteId(route.id);
    setSubmitError(null);
    setForm(mapRouteToForm(route));
    setIsModalOpen(true);
  }

  function openViewModal(route: RouteRecord) {
    setViewRoute(route);
    setIsViewModalOpen(true);
  }

  function closeViewModal() {
    setIsViewModalOpen(false);
  }

  function closeModal() {
    if (submitLoading) return;
    setIsModalOpen(false);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm(values: FormState): string | null {
    if (values.name.trim().length < 3) {
      return "El nombre de la ruta debe tener al menos 3 caracteres.";
    }

    if (values.name.trim().length > 100) {
      return "El nombre de la ruta no puede superar 100 caracteres.";
    }

    if (!values.routeType) {
      return "Selecciona el tipo de ruta.";
    }

    if (!values.zoneId) {
      return "Selecciona la zona de la ruta.";
    }

    if (!values.destinationId) {
      return "Selecciona la sede de destino.";
    }

    if (!values.vehiclePlate) {
      return "Selecciona el vehículo asignado.";
    }

    if (!values.driverPersonId) {
      return "Selecciona el conductor asignado.";
    }

    if (!values.startTime) {
      return "La hora de salida es obligatoria.";
    }

    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitLoading(true);
      setSubmitError(null);

      const validationError = validateForm(form);
      if (validationError) {
        setSubmitError(validationError);
        return;
      }

      if (isEditMode && selectedRouteId !== null) {
        const payload = toUpdatePayload(form);
        await routesAPI.update(selectedRouteId, payload, token);
        showSuccessDialog("Ruta actualizada correctamente.");
      } else {
        const payload = toCreatePayload(form);
        await routesAPI.create(payload, token);
        showSuccessDialog("Ruta registrada correctamente.");
      }

      await loadRoutes();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar la ruta";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleInactivate(route: RouteRecord) {
    if (!token) return;

    const confirmed = await confirmDialog({
      title: "¿Inactivar ruta?",
      text: "Esta acción inactivará la ruta y limitará su uso en el sistema.",
      confirmButtonText: "Sí, inactivar",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed) return;

    try {
      await routesAPI.inactivate(route.id, token);
      await loadRoutes();
      showSuccessDialog("Ruta inactivada correctamente.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo inactivar la ruta";
      showErrorDialog(message);
    }
  }

  async function handleActivate(route: RouteRecord) {
    if (!token) return;

    const confirmed = await confirmDialog({
      title: "¿Activar ruta?",
      text: "Esta acción permitirá nuevamente el uso de la ruta en el sistema.",
      confirmButtonText: "Sí, activar",
      confirmButtonColor: "#059669",
    });
    if (!confirmed) return;

    try {
      await routesAPI.activate(route.id, token);
      await loadRoutes();
      showSuccessDialog("Ruta activada correctamente.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo activar la ruta";
      showErrorDialog(message);
    }
  }

  const rangeStart =
    filteredRoutes.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredRoutes.length);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestión de Rutas</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {routes.length} rutas registradas
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="bg-[#003D7A] hover:bg-[#0066CC] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] cursor-pointer">
              add
            </span>
            Registrar Ruta
          </button>
        )}
      </div>

      {optionsError && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          {optionsError}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, destino, conductor o placa"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
        >
          <option value="">Todas las zonas</option>
          {zoneFilterOptions.map((zone) => (
            <option key={zone.id} value={String(zone.id)}>
              {zone.name}
            </option>
          ))}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {ROUTE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ruta
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Destino
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Horario
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Conductor
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-slate-500"
                  >
                    Cargando rutas...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredRoutes.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-slate-500"
                  >
                    {routes.length === 0
                      ? "Aún no hay rutas registradas."
                      : "No se encontraron rutas con los filtros aplicados."}
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                paginatedRoutes.map((route) => (
                  <tr
                    key={route.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">
                          {route.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {route.stops.length} parada
                          {route.stops.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">{routeTypeBadge(route.routeType)}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {route.zone?.name ?? "Sin zona"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {route.destination?.name ?? "Sin destino"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {formatTimeLabel(route.startTime)}
                      {route.endTime ? ` - ${formatTimeLabel(route.endTime)}` : ""}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {driverName(route)}
                    </td>
                    <td className="px-5 py-3">{statusBadge(route.status)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openViewModal(route)}
                          className="p-1.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 text-slate-400 transition-colors cursor-pointer"
                          title="Ver detalle"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            visibility
                          </span>
                        </button>
                        <button
                          onClick={() => setAssignmentsRoute(route)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-slate-400 transition-colors cursor-pointer"
                          title="Asignaciones"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            groups
                          </span>
                        </button>
                        <button
                          onClick={() => setMapRoute(route)}
                          className="p-1.5 rounded-lg hover:bg-teal-50 hover:text-teal-700 text-slate-400 transition-colors cursor-pointer"
                          title="Trazado y mapa"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            route
                          </span>
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEditModal(route)}
                              className="p-1.5 rounded-lg hover:bg-[#003D7A] hover:text-white text-slate-400 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                edit
                              </span>
                            </button>
                            {isRouteActive(route.status) ? (
                              <button
                                onClick={() => handleInactivate(route)}
                                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                                title="Inactivar"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  block
                                </span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(route)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-colors cursor-pointer"
                                title="Activar"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  check_circle
                                </span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando {rangeStart}-{rangeEnd} de {filteredRoutes.length} rutas
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md border border-slate-200 text-slate-600 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {isViewModalOpen && viewRoute && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/45"
          onClick={closeViewModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Detalle de Ruta
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">{viewRoute.name}</p>
              </div>
              <button
                onClick={closeViewModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {routeTypeBadge(viewRoute.routeType)}
              {statusBadge(viewRoute.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Zona
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {viewRoute.zone?.name ?? "Sin zona"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Destino
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {viewRoute.destination?.name ?? "Sin destino"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Hora de salida
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatTimeLabel(viewRoute.startTime)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Regreso estimado
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {viewRoute.endTime
                    ? formatTimeLabel(viewRoute.endTime)
                    : "Sin calcular"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Vehículo
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {vehicleLabel(viewRoute)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Conductor
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {driverName(viewRoute)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Distancia
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDistance(viewRoute.routeDistance)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Duración total estimada
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDuration(viewRoute.routeDuration)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                Recorrido (paradas de estudiantes)
              </h4>
              {viewRoute.stops.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm font-medium text-slate-500">
                  La ruta aún no se ha calculado. Asigna estudiantes y calcula el
                  trazado.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[480px] text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Orden
                        </th>
                        <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Estudiante
                        </th>
                        <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Hora estimada de llegada
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewRoute.stops.map((stop) => (
                        <tr key={stop.id}>
                          <td className="px-4 py-2.5 text-sm font-semibold text-slate-800">
                            {stop.stopOrder}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">
                            {stop.description || "Estudiante"}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">
                            {formatTimeLabel(stop.estimatedTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={closeViewModal}
                className="w-full py-2.5 bg-[#003D7A] hover:bg-[#0066CC] text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {isEditMode ? "Editar Ruta" : "Registrar Ruta"}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                  Datos Generales
                </h4>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Tipo de Ruta
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROUTE_TYPE_CARDS.map((card) => {
                      const active = form.routeType === card.value;
                      return (
                        <button
                          type="button"
                          key={card.value}
                          onClick={() => updateField("routeType", card.value)}
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                            active
                              ? "border-[#003D7A] bg-[#003D7A]/5 ring-2 ring-[#003D7A]/20"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[24px] ${
                              active ? "text-[#003D7A]" : "text-slate-400"
                            }`}
                          >
                            {card.icon}
                          </span>
                          <span>
                            <span
                              className={`block text-sm font-bold ${
                                active ? "text-[#003D7A]" : "text-slate-700"
                              }`}
                            >
                              {card.title}
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                              {card.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Nombre
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={100}
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Zona
                    </label>
                    <select
                      required
                      value={form.zoneId}
                      onChange={(e) => updateField("zoneId", e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    >
                      <option value="">Selecciona una zona</option>
                      {options.zones.map((zone) => (
                        <option key={zone.id} value={String(zone.id)}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Sede de Destino
                    </label>
                    <select
                      required
                      value={form.destinationId}
                      onChange={(e) =>
                        updateField("destinationId", e.target.value)
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    >
                      <option value="">Selecciona una sede</option>
                      {options.destinations.map((destination) => (
                        <option
                          key={destination.id}
                          value={String(destination.id)}
                        >
                          {destination.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Vehículo
                    </label>
                    <select
                      required
                      value={form.vehiclePlate}
                      onChange={(e) =>
                        updateField("vehiclePlate", e.target.value)
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    >
                      <option value="">Selecciona un vehículo</option>
                      {options.vehicles.map((vehicle) => {
                        const details = [vehicle.brand, vehicle.model]
                          .filter(Boolean)
                          .join(" ")
                          .trim();
                        return (
                          <option key={vehicle.plate} value={vehicle.plate}>
                            {details
                              ? `${vehicle.plate} · ${details}`
                              : vehicle.plate}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Conductor
                    </label>
                    <select
                      required
                      value={form.driverPersonId}
                      onChange={(e) =>
                        updateField("driverPersonId", e.target.value)
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    >
                      <option value="">Selecciona un conductor</option>
                      {options.drivers.map((driver) => (
                        <option key={driver.id} value={String(driver.id)}>
                          {`${driver.firstName} ${driver.firstLastname}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Hora de Salida
                    </label>
                    <input
                      type="time"
                      required
                      value={form.startTime}
                      onChange={(e) => updateField("startTime", e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Hora de salida desde el colegio. El regreso se calcula
                      automáticamente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-[20px] text-sky-700">
                  info
                </span>
                <p className="text-xs font-medium text-sky-800">
                  Las paradas de la ruta son las casas de los estudiantes
                  asignados. Después de guardar, asigna estudiantes y usa{" "}
                  <strong>Trazado y mapa</strong> para calcular el recorrido
                  óptimo desde y hacia el colegio.
                </p>
              </div>

              {submitError && (
                <p className="text-sm font-medium text-red-600">{submitError}</p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 py-2.5 bg-[#003D7A] hover:bg-[#0066CC] text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
                >
                  {submitLoading
                    ? "Guardando..."
                    : isEditMode
                      ? "Actualizar"
                      : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignmentsRoute && token && (
        <RouteAssignmentsModal
          route={assignmentsRoute}
          token={token}
          canManage={canManage}
          onClose={() => setAssignmentsRoute(null)}
        />
      )}

      {mapRoute && token && (
        <RouteMapModal
          route={mapRoute}
          token={token}
          canManage={canManage}
          onClose={() => setMapRoute(null)}
          onCalculated={() => {
            void loadRoutes();
          }}
        />
      )}
    </div>
  );
}


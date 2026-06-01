"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import FileUpload from "@/components/FileUpload";
import SecureFileLink from "@/components/SecureFileLink";
import SecureImage from "@/components/SecureImage";
import {
  UpdateVehiclePayload,
  VehicleDocumentPayload,
  VehicleDocumentRecord,
  VehiclePayload,
  VehicleRecord,
  vehiclesAPI,
} from "@/lib/api";

type VehicleDocumentField =
  | "soat"
  | "technicalInspection"
  | "insurance"
  | "propertyCard";

type VehicleDocumentFormState = {
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
};

type FormState = {
  plate: string;
  passengerCapacity: string;
  brand: string;
  model: string;
  year: string;
  documents: Record<VehicleDocumentField, VehicleDocumentFormState>;
};

const DOCUMENT_CONFIG: Array<{
  key: VehicleDocumentField;
  label: string;
  description: string;
  hasExpiryDate: boolean;
}> = [
  {
    key: "soat",
    label: "SOAT",
    description: "Seguro obligatorio del vehículo",
    hasExpiryDate: true,
  },
  {
    key: "technicalInspection",
    label: "Tecnomecánica",
    description: "Inspección técnico-mecánica",
    hasExpiryDate: true,
  },
  {
    key: "insurance",
    label: "Seguro",
    description: "Póliza de seguro adicional",
    hasExpiryDate: true,
  },
  {
    key: "propertyCard",
    label: "Tarjeta de Propiedad",
    description: "Documento de propiedad del vehículo",
    hasExpiryDate: false,
  },
];

function createDocumentForm(): VehicleDocumentFormState {
  return {
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    fileUrl: "",
  };
}

function createDocumentsForm(): Record<VehicleDocumentField, VehicleDocumentFormState> {
  return {
    soat: createDocumentForm(),
    technicalInspection: createDocumentForm(),
    insurance: createDocumentForm(),
    propertyCard: createDocumentForm(),
  };
}

const initialForm: FormState = {
  plate: "",
  passengerCapacity: "",
  brand: "",
  model: "",
  year: "",
  documents: createDocumentsForm(),
};

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeDateInput(value: string): string | undefined {
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

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
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

function toDateInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

function mapDocumentToForm(
  document: VehicleDocumentRecord | null | undefined,
): VehicleDocumentFormState {
  return {
    documentNumber: document?.documentNumber ?? "",
    issueDate: toDateInput(document?.issueDate),
    expiryDate: toDateInput(document?.expiryDate),
    fileUrl: document?.fileUrl ?? "",
  };
}

function mapVehicleToForm(vehicle: VehicleRecord): FormState {
  return {
    plate: vehicle.plate ?? "",
    passengerCapacity: String(vehicle.passengerCapacity ?? ""),
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year ? String(vehicle.year) : "",
    documents: {
      soat: mapDocumentToForm(vehicle.soat),
      technicalInspection: mapDocumentToForm(vehicle.technicalInspection),
      insurance: mapDocumentToForm(vehicle.insurance),
      propertyCard: mapDocumentToForm(vehicle.propertyCard),
    },
  };
}

function toDocumentPayload(
  form: VehicleDocumentFormState,
  options?: {
    includeExpiryDate?: boolean;
  },
): VehicleDocumentPayload {
  const includeExpiryDate = options?.includeExpiryDate ?? true;

  return {
    documentNumber: form.documentNumber.trim(),
    issueDate: normalizeDateInput(form.issueDate),
    expiryDate: includeExpiryDate ? normalizeDateInput(form.expiryDate) : undefined,
    fileUrl: normalizeOptionalText(form.fileUrl),
  };
}

function toCreatePayload(form: FormState): VehiclePayload {
  const year = form.year.trim();

  return {
    plate: form.plate.trim().toUpperCase(),
    passengerCapacity: Number(form.passengerCapacity),
    brand: normalizeOptionalText(form.brand),
    model: normalizeOptionalText(form.model),
    year: year ? Number(year) : undefined,
    documents: {
      soat: toDocumentPayload(form.documents.soat, { includeExpiryDate: true }),
      technicalInspection: toDocumentPayload(form.documents.technicalInspection, {
        includeExpiryDate: true,
      }),
      insurance: toDocumentPayload(form.documents.insurance, {
        includeExpiryDate: true,
      }),
      propertyCard: toDocumentPayload(form.documents.propertyCard, {
        includeExpiryDate: false,
      }),
    },
  };
}

function toUpdatePayload(form: FormState): UpdateVehiclePayload {
  const year = form.year.trim();

  return {
    passengerCapacity: Number(form.passengerCapacity),
    brand: normalizeOptionalText(form.brand),
    model: normalizeOptionalText(form.model),
    year: year ? Number(year) : undefined,
    documents: {
      soat: toDocumentPayload(form.documents.soat, { includeExpiryDate: true }),
      technicalInspection: toDocumentPayload(form.documents.technicalInspection, {
        includeExpiryDate: true,
      }),
      insurance: toDocumentPayload(form.documents.insurance, {
        includeExpiryDate: true,
      }),
      propertyCard: toDocumentPayload(form.documents.propertyCard, {
        includeExpiryDate: false,
      }),
    },
  };
}

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

function vehicleDescription(vehicle: VehicleRecord): string {
  const parts = [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim();
  if (parts && vehicle.year) {
    return `${parts} (${vehicle.year})`;
  }

  if (parts) {
    return parts;
  }

  if (vehicle.year) {
    return `Año ${vehicle.year}`;
  }

  return "Sin información";
}

function statusBadge(status: string | null | undefined) {
  const isActive = status?.toLowerCase() === "active";
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
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function isVehicleActive(status: string | null | undefined) {
  return status?.toLowerCase() === "active";
}

function documentPreview(document: VehicleDocumentRecord | null | undefined) {
  if (!document) {
    return {
      number: "Sin documento",
      helper: "No asociado",
    };
  }

  return {
    number: document.documentNumber,
    helper: document.expiryDate
      ? `Vence: ${formatDateLabel(document.expiryDate)}`
      : "Sin vencimiento",
  };
}

function getDocumentByField(
  vehicle: VehicleRecord,
  key: VehicleDocumentField,
): VehicleDocumentRecord | null {
  if (key === "soat") return vehicle.soat;
  if (key === "technicalInspection") return vehicle.technicalInspection;
  if (key === "insurance") return vehicle.insurance;
  return vehicle.propertyCard;
}

function isImageUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("data:image/")) {
    return true;
  }

  return /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.svg)(\?.*)?$/.test(normalized);
}

async function confirmDialog(options: {
  title: string;
  text: string;
  confirmButtonText: string;
  confirmButtonColor: string;
}) {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText,
    cancelButtonText: "Cancelar",
    confirmButtonColor: options.confirmButtonColor,
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });

  return result.isConfirmed;
}

function showErrorDialog(message: string) {
  void Swal.fire({
    title: "Ocurrió un problema",
    text: message,
    icon: "error",
    confirmButtonText: "Entendido",
    confirmButtonColor: "#003D7A",
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });
}

function showSuccessDialog(message: string) {
  void Swal.fire({
    title: "Operación exitosa",
    text: message,
    icon: "success",
    timer: 1600,
    showConfirmButton: false,
    customClass: {
      popup: "rounded-2xl",
      title: "text-slate-800",
      htmlContainer: "text-slate-600",
    },
  });
}

export default function VehiculosPage() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewVehicle, setViewVehicle] = useState<VehicleRecord | null>(null);

  const filteredVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const plate = vehicle.plate.toLowerCase();
      const details = vehicleDescription(vehicle).toLowerCase();
      const status = (vehicle.status ?? "").toLowerCase();
      const soatNumber = (vehicle.soat?.documentNumber ?? "").toLowerCase();
      const techNumber = (vehicle.technicalInspection?.documentNumber ?? "").toLowerCase();
      const insuranceNumber = (vehicle.insurance?.documentNumber ?? "").toLowerCase();
      const propertyCardNumber = (vehicle.propertyCard?.documentNumber ?? "").toLowerCase();

      const searchPass =
        !normalizedQuery ||
        plate.includes(normalizedQuery) ||
        details.includes(normalizedQuery) ||
        soatNumber.includes(normalizedQuery) ||
        techNumber.includes(normalizedQuery) ||
        insuranceNumber.includes(normalizedQuery) ||
        propertyCardNumber.includes(normalizedQuery);

      const statusPass = !statusFilter || status === statusFilter;

      return searchPass && statusPass;
    });
  }, [vehicles, query, statusFilter]);

  const loadVehicles = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await vehiclesAPI.findAll(token);
      setVehicles(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los vehículos";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  function openCreateModal() {
    setIsEditMode(false);
    setSelectedPlate(null);
    setSubmitError(null);
    setForm({
      ...initialForm,
      documents: createDocumentsForm(),
    });
    setIsModalOpen(true);
  }

  function openEditModal(vehicle: VehicleRecord) {
    setIsEditMode(true);
    setSelectedPlate(vehicle.plate);
    setSubmitError(null);
    setForm(mapVehicleToForm(vehicle));
    setIsModalOpen(true);
  }

  function openViewModal(vehicle: VehicleRecord) {
    setViewVehicle(vehicle);
    setIsViewModalOpen(true);
  }

  function closeViewModal() {
    setIsViewModalOpen(false);
  }

  function closeModal() {
    if (submitLoading) return;
    setIsModalOpen(false);
  }

  function updateDocumentField(
    key: VehicleDocumentField,
    field: keyof VehicleDocumentFormState,
    value: string,
  ) {
    const config = DOCUMENT_CONFIG.find((item) => item.key === key);

    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [key]: {
          ...prev.documents[key],
          [field]: value,
          ...(field === "issueDate"
            ? {
                expiryDate: config?.hasExpiryDate
                  ? calculateExpiryDate(value)
                  : "",
              }
            : {}),
        },
      },
    }));
  }

  function validateForm(values: FormState, editing: boolean): string | null {
    if (!editing && !values.plate.trim()) {
      return "La placa es obligatoria.";
    }

    const passengerCapacity = Number(values.passengerCapacity);
    if (!Number.isInteger(passengerCapacity) || passengerCapacity < 1) {
      return "La capacidad de pasajeros debe ser un número entero mayor o igual a 1.";
    }

    if (values.year.trim()) {
      const parsedYear = Number(values.year);
      if (!Number.isInteger(parsedYear) || parsedYear < 1900) {
        return "El año debe ser un número entero mayor o igual a 1900.";
      }
    }

    for (const documentConfig of DOCUMENT_CONFIG) {
      const document = values.documents[documentConfig.key];
      if (!document.documentNumber.trim()) {
        return `El número de documento de ${documentConfig.label} es obligatorio.`;
      }

      if (
        documentConfig.hasExpiryDate &&
        document.issueDate &&
        document.expiryDate &&
        document.issueDate > document.expiryDate
      ) {
        return `En ${documentConfig.label}, la fecha de expedición no puede ser posterior al vencimiento.`;
      }
    }

    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitLoading(true);
      setSubmitError(null);

      const validationError = validateForm(form, isEditMode);
      if (validationError) {
        setSubmitError(validationError);
        return;
      }

      if (isEditMode && selectedPlate) {
        const payload = toUpdatePayload(form);
        await vehiclesAPI.update(selectedPlate, payload, token);
        showSuccessDialog("Vehículo actualizado correctamente.");
      } else {
        const payload = toCreatePayload(form);
        await vehiclesAPI.create(payload, token);
        showSuccessDialog("Vehículo registrado correctamente.");
      }

      await loadVehicles();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el vehículo";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleInactivate(plate: string) {
    if (!token) return;

    const confirmed = await confirmDialog({
      title: "¿Inhabilitar vehículo?",
      text: "Esta acción inhabilitará el vehículo y limitará su uso en el sistema.",
      confirmButtonText: "Sí, inhabilitar",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed) return;

    try {
      await vehiclesAPI.inactivate(plate, token);
      await loadVehicles();
      showSuccessDialog("Vehículo inhabilitado correctamente.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo inhabilitar el vehículo";
      showErrorDialog(message);
    }
  }

  async function handleActivate(plate: string) {
    if (!token) return;

    const confirmed = await confirmDialog({
      title: "¿Habilitar vehículo?",
      text: "Esta acción permitirá nuevamente el uso del vehículo en el sistema.",
      confirmButtonText: "Sí, habilitar",
      confirmButtonColor: "#059669",
    });
    if (!confirmed) return;

    try {
      await vehiclesAPI.activate(plate, token);
      await loadVehicles();
      showSuccessDialog("Vehículo habilitado correctamente.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo habilitar el vehículo";
      showErrorDialog(message);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestión de Vehículos</h3>
          <p className="text-sm text-slate-500 mt-0.5">{vehicles.length} vehículos registrados</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#003D7A] hover:bg-[#0066CC] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] cursor-pointer">add</span>
          Registrar Vehículo
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
            placeholder="Buscar por placa, detalle o documento"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Placa</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehículo</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Capacidad</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">SOAT</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tecnomecánica</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Seguro</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarjeta Propiedad</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center text-sm text-slate-500">
                    Cargando vehículos...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center text-sm text-slate-500">
                    Aún no hay vehículos registrados.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filteredVehicles.map((vehicle) => {
                  const soat = documentPreview(vehicle.soat);
                  const technicalInspection = documentPreview(vehicle.technicalInspection);
                  const insurance = documentPreview(vehicle.insurance);
                  const propertyCard = documentPreview(vehicle.propertyCard);

                  return (
                    <tr key={vehicle.plate} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">{vehicle.plate}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{vehicleDescription(vehicle)}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{vehicle.passengerCapacity}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{soat.number}</span>
                          <span className="text-xs text-slate-500">{soat.helper}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{technicalInspection.number}</span>
                          <span className="text-xs text-slate-500">{technicalInspection.helper}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{insurance.number}</span>
                          <span className="text-xs text-slate-500">{insurance.helper}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{propertyCard.number}</span>
                          <span className="text-xs text-slate-500">{propertyCard.helper}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">{statusBadge(vehicle.status)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openViewModal(vehicle)}
                            className="p-1.5 rounded-lg hover:bg-sky-50 hover:text-sky-700 text-slate-400 transition-colors cursor-pointer"
                            title="Ver detalle"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          <button
                            onClick={() => openEditModal(vehicle)}
                            className="p-1.5 rounded-lg hover:bg-[#003D7A] hover:text-white text-slate-400 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          {isVehicleActive(vehicle.status) ? (
                            <button
                              onClick={() => handleInactivate(vehicle.plate)}
                              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                              title="Inhabilitar"
                            >
                              <span className="material-symbols-outlined text-[16px]">block</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(vehicle.plate)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-colors cursor-pointer"
                              title="Habilitar"
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
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
          Mostrando {filteredVehicles.length} de {vehicles.length} vehículos
        </div>
      </div>

      {isViewModalOpen && viewVehicle && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/45"
          onClick={closeViewModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Detalle de Vehículo</h3>
                <p className="text-sm text-slate-500 mt-0.5">Placa: {viewVehicle.plate}</p>
              </div>
              <button
                onClick={closeViewModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Placa</p>
                <p className="text-sm font-semibold text-slate-800">{viewVehicle.plate}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Vehículo</p>
                <p className="text-sm font-semibold text-slate-800">{vehicleDescription(viewVehicle)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Capacidad</p>
                <p className="text-sm font-semibold text-slate-800">{viewVehicle.passengerCapacity} pasajeros</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Estado</p>
                <div>{statusBadge(viewVehicle.status)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Documentos del Vehículo</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {DOCUMENT_CONFIG.map((documentConfig) => {
                  const document = getDocumentByField(viewVehicle, documentConfig.key);

                  return (
                    <div
                      key={documentConfig.key}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="mb-3">
                        <h5 className="text-sm font-semibold text-slate-800">{documentConfig.label}</h5>
                        <p className="text-xs text-slate-500">{documentConfig.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Número</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">
                            {document?.documentNumber ?? "Sin documento"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estado</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">
                            {document?.status ?? "Sin estado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Expedición</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">
                            {formatDateLabel(document?.issueDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vencimiento</p>
                          <p className="text-sm font-medium text-slate-800 mt-1">
                            {documentConfig.hasExpiryDate
                              ? formatDateLabel(document?.expiryDate)
                              : "No aplica"}
                          </p>
                        </div>
                      </div>

                      {document?.fileUrl ? (
                        <div className="space-y-2">
                          {isImageUrl(document.fileUrl) ? (
                            <SecureImage
                              fileKey={document.fileUrl}
                              token={token}
                              alt={`Imagen ${documentConfig.label} - ${viewVehicle.plate}`}
                            />
                          ) : (
                            <div className="w-full h-48 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center px-4 text-center text-xs font-medium text-slate-500">
                              Documento cargado (PDF). Usa “Abrir archivo” para verlo.
                            </div>
                          )}
                          <SecureFileLink
                            fileKey={document.fileUrl}
                            token={token}
                            label="Abrir archivo"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 rounded-xl border border-dashed border-slate-300 bg-white flex items-center justify-center px-4 text-center text-xs font-medium text-slate-500">
                          Este documento no tiene archivo cargado.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {isEditMode ? "Editar Vehículo" : "Registrar Vehículo"}
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
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Datos Generales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Placa</label>
                    <input
                      type="text"
                      required
                      value={form.plate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plate: e.target.value.toUpperCase(),
                        }))
                      }
                      disabled={isEditMode}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    {isEditMode && (
                      <p className="mt-1 text-xs text-slate-500">La placa no se puede modificar.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Capacidad</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.passengerCapacity}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          passengerCapacity: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Año</label>
                    <input
                      type="number"
                      min={1900}
                      value={form.year}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          year: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Marca</label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          brand: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Modelo</label>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          model: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Documentos del Vehículo</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {DOCUMENT_CONFIG.map((documentConfig) => {
                    const doc = form.documents[documentConfig.key];

                    return (
                      <div
                        key={documentConfig.key}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div className="mb-3">
                          <h5 className="text-sm font-semibold text-slate-800">{documentConfig.label}</h5>
                          <p className="text-xs text-slate-500">{documentConfig.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                              Número de Documento
                            </label>
                            <input
                              type="text"
                              required
                              value={doc.documentNumber}
                              onChange={(e) =>
                                updateDocumentField(
                                  documentConfig.key,
                                  "documentNumber",
                                  e.target.value,
                                )
                              }
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                            />
                          </div>

                          <div className={documentConfig.hasExpiryDate ? "" : "md:col-span-2"}>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                              Fecha de Expedición
                            </label>
                            <input
                              type="date"
                              value={doc.issueDate}
                              onChange={(e) =>
                                updateDocumentField(documentConfig.key, "issueDate", e.target.value)
                              }
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#003D7A]/20"
                            />
                          </div>

                          {documentConfig.hasExpiryDate ? (
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                                Fecha de Vencimiento
                              </label>
                              <input
                                type="date"
                                value={doc.expiryDate}
                                readOnly
                                disabled
                                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-100 text-slate-500 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <div className="md:col-span-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-500">
                              Este documento no tiene fecha de vencimiento.
                            </div>
                          )}

                          <div className="md:col-span-2">
                            <FileUpload
                              label="Archivo del documento"
                              folder="vehicle-documents"
                              token={token}
                              value={doc.fileUrl || null}
                              onChange={(key) =>
                                updateDocumentField(
                                  documentConfig.key,
                                  "fileUrl",
                                  key ?? "",
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

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
                  {submitLoading ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


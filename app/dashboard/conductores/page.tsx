"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import FileUpload from "@/components/FileUpload";
import SecureFileLink from "@/components/SecureFileLink";
import { DriverPayload, DriverRecord, driversAPI } from "@/lib/api";

const LICENSE_ROLE = "DRIVER_LICENSE";

type FormState = {
  firstName: string;
  middleName: string;
  firstLastname: string;
  secondLastname: string;
  phone: string;
  email: string;
  documentType: string;
  documentNumber: string;
  documentDescription: string;
  // Licencia de conducción (documento independiente)
  licenseNumber: string;
  licenseIssue: string;
  licenseFileKey: string;
};

// El vencimiento de la licencia de servicio público es 3 años después de la
// fecha de expedición. Se calcula solo para mostrarlo (el backend lo recalcula).
function addThreeYears(issueDate: string): string {
  const value = issueDate.trim();
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(Date.UTC(y + 3, m - 1, d));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const initialForm: FormState = {
  firstName: "",
  middleName: "",
  firstLastname: "",
  secondLastname: "",
  phone: "",
  email: "",
  documentType: "CC",
  documentNumber: "",
  documentDescription: "",
  licenseNumber: "",
  licenseIssue: "",
  licenseFileKey: "",
};

// El documento de identidad nunca es la licencia (esa va aparte).
const DOCUMENT_TYPES = ["CC", "TI", "CE", "PASAPORTE"] as const;

function getDocumentTypeName(documentType: unknown): string {
  if (typeof documentType === "string") {
    return documentType;
  }
  if (
    typeof documentType === "object" &&
    documentType !== null &&
    "name" in documentType &&
    typeof (documentType as { name?: unknown }).name === "string"
  ) {
    return (documentType as { name: string }).name;
  }
  return "";
}

function normalizeDocumentType(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

function getDocumentTypeCode(documentType: unknown): string | null {
  const normalized = normalizeDocumentType(getDocumentTypeName(documentType));
  if (!normalized) return null;

  if (
    normalized === "CC" ||
    normalized.startsWith("CEDULA DE CIUDADANIA") ||
    normalized === "CEDULA"
  ) {
    return "CC";
  }
  if (normalized === "TI" || normalized.startsWith("TARJETA")) {
    return "TI";
  }
  if (normalized === "CE" || normalized.startsWith("CEDULA DE EXTRANJERIA")) {
    return "CE";
  }
  if (normalized === "PASAPORTE") {
    return "PASAPORTE";
  }
  return null;
}

function isNumericDocumentType(documentType: string): boolean {
  return documentType === "CC" || documentType === "TI" || documentType === "CE";
}

function formatDocumentTypeLabel(documentType: unknown): string {
  const code = getDocumentTypeCode(documentType);
  if (code === "PASAPORTE") return "Pasaporte";
  if (code) return code;
  return getDocumentTypeName(documentType);
}

function fullName(driver: DriverRecord): string {
  return [
    driver.firstName,
    driver.middleName,
    driver.firstLastname,
    driver.secondLastname,
  ]
    .filter(Boolean)
    .join(" ");
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

function isDriverActive(status: string | null | undefined) {
  return status?.toLowerCase() === "active";
}

type DriverDocument = DriverRecord["personDocumentLinks"][number]["personDocument"];

function getIdentityDoc(driver: DriverRecord): DriverDocument | null {
  const link =
    driver.personDocumentLinks.find((l) => l.documentRole !== LICENSE_ROLE) ??
    driver.personDocumentLinks[0];
  return link?.personDocument ?? null;
}

function getLicenseDoc(driver: DriverRecord): DriverDocument | null {
  return (
    driver.personDocumentLinks.find((l) => l.documentRole === LICENSE_ROLE)
      ?.personDocument ?? null
  );
}

function identityLabel(driver: DriverRecord): string {
  const doc = getIdentityDoc(driver);
  if (!doc) return "Sin documento";
  return `${formatDocumentTypeLabel(doc.documentType)} ${doc.documentNumber}`.trim();
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CO");
}

// Estado de vencimiento de la licencia.
function licenseExpiryTone(
  expiry: string | null | undefined,
): { label: string; className: string } {
  if (!expiry) {
    return { label: "Sin vencimiento", className: "text-slate-500" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(expiry);
  const days = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: "Vencida", className: "text-red-600 font-semibold" };
  if (days <= 30)
    return { label: "Por vencer", className: "text-amber-600 font-semibold" };
  return { label: "Vigente", className: "text-emerald-600 font-semibold" };
}

function mapDriverToForm(driver: DriverRecord): FormState {
  const identity = getIdentityDoc(driver);
  const license = getLicenseDoc(driver);

  return {
    firstName: driver.firstName ?? "",
    middleName: driver.middleName ?? "",
    firstLastname: driver.firstLastname ?? "",
    secondLastname: driver.secondLastname ?? "",
    phone: driver.phone ?? "",
    email: driver.email ?? "",
    documentType: getDocumentTypeCode(identity?.documentType) ?? "CC",
    documentNumber: identity?.documentNumber ?? "",
    documentDescription: identity?.description ?? "",
    licenseNumber: license?.documentNumber ?? "",
    licenseIssue: toDateInput(license?.issueDate),
    licenseFileKey: license?.fileUrl ?? "",
  };
}

function toCreatePayload(form: FormState): DriverPayload {
  const normalizedDocumentNumber = isNumericDocumentType(form.documentType)
    ? form.documentNumber.replace(/\D/g, "")
    : form.documentNumber;

  const payload: DriverPayload = {
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim() || undefined,
    firstLastname: form.firstLastname.trim(),
    secondLastname: form.secondLastname.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    document: {
      documentType: form.documentType.trim(),
      documentNumber: normalizedDocumentNumber.trim(),
      description: form.documentDescription.trim() || undefined,
      documentRole: "DRIVER_ID",
    },
  };

  if (form.licenseNumber.trim()) {
    payload.license = {
      documentNumber: form.licenseNumber.trim(),
      issueDate: form.licenseIssue.trim() || undefined,
      fileKey: form.licenseFileKey.trim() || undefined,
    };
  }

  return payload;
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
    confirmButtonColor: "#0F2B4B",
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

export default function ConductoresPage() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filteredDrivers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return drivers.filter((driver) => {
      const name = fullName(driver).toLowerCase();
      const idText = String(driver.id);
      const email = (driver.email ?? "").toLowerCase();
      const documentNumber = (
        getIdentityDoc(driver)?.documentNumber ?? ""
      ).toLowerCase();
      const status = (driver.status ?? "").toLowerCase();

      const searchPass =
        !normalizedQuery ||
        name.includes(normalizedQuery) ||
        idText.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        documentNumber.includes(normalizedQuery);

      const statusPass = !statusFilter || status === statusFilter;

      return searchPass && statusPass;
    });
  }, [drivers, query, statusFilter]);

  const loadDrivers = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await driversAPI.findAll(token);
      setDrivers(response.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los conductores";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  function openCreateModal() {
    setIsEditMode(false);
    setSelectedId(null);
    setSubmitError(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function openEditModal(driver: DriverRecord) {
    setIsEditMode(true);
    setSelectedId(driver.id);
    setSubmitError(null);
    setForm(mapDriverToForm(driver));
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitLoading) return;
    setIsModalOpen(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitLoading(true);
      setSubmitError(null);

      const payload = toCreatePayload(form);

      if (isEditMode && selectedId) {
        // La actualización no acepta licencia; se gestiona en su endpoint propio.
        const { license, ...updatePayload } = payload;
        void license;
        await driversAPI.update(selectedId, updatePayload, token);

        if (form.licenseNumber.trim()) {
          await driversAPI.upsertLicense(
            selectedId,
            {
              documentNumber: form.licenseNumber.trim(),
              issueDate: form.licenseIssue.trim() || undefined,
              fileKey: form.licenseFileKey.trim() || undefined,
            },
            token,
          );
        }

        showSuccessDialog("Conductor actualizado correctamente.");
      } else {
        await driversAPI.create(payload, token);
        showSuccessDialog("Conductor registrado correctamente.");
      }

      await loadDrivers();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el conductor";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleInactivate(driverId: number) {
    if (!token) return;
    const confirmed = await confirmDialog({
      title: "¿Inactivar conductor?",
      text: "Esta acción inactivará el conductor y limitará su uso en el sistema.",
      confirmButtonText: "Sí, inactivar",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmed) return;

    try {
      await driversAPI.inactivate(driverId, token);
      await loadDrivers();
      showSuccessDialog("Conductor inactivado correctamente.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo inactivar el conductor";
      showErrorDialog(message);
    }
  }

  async function handleActivate(driverId: number) {
    if (!token) return;
    const confirmed = await confirmDialog({
      title: "¿Habilitar conductor?",
      text: "Esta acción permitirá nuevamente el uso del conductor en el sistema.",
      confirmButtonText: "Sí, habilitar",
      confirmButtonColor: "#059669",
    });
    if (!confirmed) return;

    try {
      await driversAPI.activate(driverId, token);
      await loadDrivers();
      showSuccessDialog("Conductor habilitado correctamente.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo habilitar el conductor";
      showErrorDialog(message);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestión de Conductores</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {drivers.length} conductores registrados
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#0F2B4B] hover:bg-[#163a63] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] cursor-pointer">add</span>
          Registrar Conductor
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
            placeholder="Buscar por nombre"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
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
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Licencia</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Correo</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
                    Cargando conductores...
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

              {!loading && !error && filteredDrivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-slate-500">
                    Aún no hay conductores registrados.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                filteredDrivers.map((driver) => {
                  const license = getLicenseDoc(driver);
                  const tone = licenseExpiryTone(license?.expiryDate);
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">{fullName(driver)}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{identityLabel(driver)}</td>
                      <td className="px-5 py-3 text-sm">
                        {license ? (
                          <div className="flex flex-col">
                            <span className="text-slate-700">{license.documentNumber}</span>
                            <span className={`text-xs ${tone.className}`}>
                              {tone.label}
                              {license.expiryDate
                                ? ` · ${formatDateLabel(license.expiryDate)}`
                                : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin licencia</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{driver.email ?? "Sin correo"}</td>
                      <td className="px-5 py-3">{statusBadge(driver.status)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(driver)}
                            className="p-1.5 rounded-lg hover:bg-[#0F2B4B] hover:text-white text-slate-400 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          {isDriverActive(driver.status) ? (
                            <button
                              onClick={() => handleInactivate(driver.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors cursor-pointer"
                              title="Inactivar"
                            >
                              <span className="material-symbols-outlined text-[16px]">block</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(driver.id)}
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
          Mostrando {filteredDrivers.length} de {drivers.length} conductores
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {isEditMode ? "Editar Conductor" : "Registrar Conductor"}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Primer Nombre</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Segundo Nombre</label>
                  <input
                    type="text"
                    value={form.middleName}
                    onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Primer Apellido</label>
                  <input
                    type="text"
                    required
                    value={form.firstLastname}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstLastname: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Segundo Apellido</label>
                  <input
                    type="text"
                    value={form.secondLastname}
                    onChange={(e) => setForm((prev) => ({ ...prev, secondLastname: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
              </div>

              {/* Documento de identidad */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Documento de identidad
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo</label>
                    <select
                      value={form.documentType}
                      onChange={(e) =>
                        setForm((prev) => {
                          const nextDocumentType = e.target.value;
                          return {
                            ...prev,
                            documentType: nextDocumentType,
                            documentNumber: isNumericDocumentType(nextDocumentType)
                              ? prev.documentNumber.replace(/\D/g, "")
                              : prev.documentNumber,
                          };
                        })
                      }
                      disabled={isEditMode}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20 disabled:bg-slate-100"
                    >
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type === "PASAPORTE" ? "Pasaporte" : type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Número</label>
                    <input
                      type="text"
                      required
                      inputMode={isNumericDocumentType(form.documentType) ? "numeric" : "text"}
                      pattern={isNumericDocumentType(form.documentType) ? "[0-9]*" : undefined}
                      value={form.documentNumber}
                      disabled={isEditMode}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          documentNumber: isNumericDocumentType(prev.documentType)
                            ? e.target.value.replace(/\D/g, "")
                            : e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>
                {isEditMode && (
                  <p className="text-xs text-slate-500">
                    El número de documento de identidad no se puede modificar.
                  </p>
                )}
              </div>

              {/* Licencia de conducción */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Licencia de conducción
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Número de licencia</label>
                    <input
                      type="text"
                      value={form.licenseNumber}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))
                      }
                      placeholder="Ej. LIC-C2-00123"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fecha de expedición</label>
                    <input
                      type="date"
                      value={form.licenseIssue}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, licenseIssue: e.target.value }))
                      }
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                    />
                  </div>
                </div>
                {form.licenseIssue && (
                  <p className="text-xs text-slate-500">
                    Vence el{" "}
                    <span className="font-semibold text-slate-700">
                      {addThreeYears(form.licenseIssue)}
                    </span>{" "}
                    (3 años después de la expedición).
                  </p>
                )}
                <FileUpload
                  label="Foto de la licencia"
                  folder="driver-license"
                  token={token}
                  value={form.licenseFileKey || null}
                  onChange={(key) =>
                    setForm((prev) => ({ ...prev, licenseFileKey: key ?? "" }))
                  }
                />
                {form.licenseFileKey && (
                  <SecureFileLink
                    fileKey={form.licenseFileKey}
                    token={token}
                    label="Ver licencia actual"
                  />
                )}
                <p className="text-xs text-slate-500">
                  La licencia es opcional al crear; puedes subirla o reemplazarla luego.
                </p>
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
                  className="flex-1 py-2.5 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
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

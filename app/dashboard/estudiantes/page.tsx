"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  GuardianRecord,
  StudentPayload,
  StudentRecord,
  guardiansAPI,
  studentsAPI,
} from "@/lib/api";
import type * as Leaflet from "leaflet";

type AddressForm = {
  address: string;
  latitude: string;
  longitude: string;
};

type FormState = {
  guardianId: string;
  firstName: string;
  middleName: string;
  firstLastname: string;
  secondLastname: string;
  phone: string;
  email: string;
  documentType: string;
  documentNumber: string;
  documentDescription: string;
  addresses: AddressForm[];
};

type MapPickerState = {
  open: boolean;
  addressIndex: number | null;
};

type LatLng = {
  lat: number;
  lng: number;
};

const TUNJA_CENTER: LatLng = {
  lat: 5.53528,
  lng: -73.36778,
};

const initialAddress: AddressForm = {
  address: "",
  latitude: "",
  longitude: "",
};

const initialForm: FormState = {
  guardianId: "",
  firstName: "",
  middleName: "",
  firstLastname: "",
  secondLastname: "",
  phone: "",
  email: "",
  documentType: "CC",
  documentNumber: "",
  documentDescription: "",
  addresses: [{ ...initialAddress }],
};

const DOCUMENT_TYPES = ["CC", "TI", "CE", "Pasaporte"];

function guardianName(guardian: GuardianRecord): string {
  return [
    guardian.firstName,
    guardian.middleName,
    guardian.firstLastname,
    guardian.secondLastname,
  ]
    .filter(Boolean)
    .join(" ");
}

function mapStudentToForm(student: StudentRecord): FormState {
  const firstDocument = student.personDocumentLinks[0]?.personDocument;
  const mappedAddresses: AddressForm[] =
    student.personAddresses.length > 0
      ? student.personAddresses.map((item) => ({
          address: item.address.address ?? "",
          latitude: String(item.address.latitude ?? ""),
          longitude: String(item.address.longitude ?? ""),
        }))
      : [{ ...initialAddress }];

  return {
    guardianId: String(student.guardianId ?? ""),
    firstName: student.firstName ?? "",
    middleName: student.middleName ?? "",
    firstLastname: student.firstLastname ?? "",
    secondLastname: student.secondLastname ?? "",
    phone: student.phone ?? "",
    email: student.email ?? "",
    documentType: firstDocument?.documentType ?? "CC",
    documentNumber: firstDocument?.documentNumber ?? "",
    documentDescription: "",
    addresses: mappedAddresses,
  };
}

function toPayload(form: FormState): StudentPayload {
  return {
    guardianId: Number(form.guardianId),
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim() || undefined,
    firstLastname: form.firstLastname.trim(),
    secondLastname: form.secondLastname.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim(),
    document: {
      documentType: form.documentType.trim(),
      documentNumber: form.documentNumber.trim(),
      description: form.documentDescription.trim() || undefined,
      createPersonDocumentLink: true,
      documentRole: "student",
    },
    addresses: form.addresses.map((item) => ({
      address: item.address.trim(),
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
    })),
  };
}

function firstAddressLabel(student: StudentRecord): string {
  if (student.personAddresses.length === 0) {
    return "Sin dirección";
  }

  const first = student.personAddresses[0].address.address;
  if (student.personAddresses.length === 1) {
    return first;
  }

  return `${first} (+${student.personAddresses.length - 1})`;
}

function getInitialMapPoint(address: AddressForm | undefined): LatLng | null {
  if (!address) {
    return null;
  }

  const rawLat = address.latitude.trim();
  const rawLng = address.longitude.trim();
  if (!rawLat || !rawLng) {
    return null;
  }

  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return { lat, lng };
}

function MapPickerModal({
  open,
  initialPoint,
  onClose,
  onConfirm,
}: {
  open: boolean;
  initialPoint: LatLng | null;
  onClose: () => void;
  onConfirm: (value: LatLng) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.CircleMarker | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<LatLng | null>(initialPoint);

  useEffect(() => {
    setSelectedPoint(initialPoint);
  }, [initialPoint, open]);

  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    async function mountMap() {
      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) {
        return;
      }

      const defaultCenter: [number, number] = initialPoint
        ? [initialPoint.lat, initialPoint.lng]
        : [TUNJA_CENTER.lat, TUNJA_CENTER.lng];

      const map = L.map(mapContainerRef.current).setView(defaultCenter, initialPoint ? 16 : 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      if (initialPoint) {
        markerRef.current = L.circleMarker([initialPoint.lat, initialPoint.lng], {
          radius: 8,
          color: "#0F2B4B",
          fillColor: "#0F2B4B",
          fillOpacity: 0.8,
        }).addTo(map);
      }

      map.on("click", (evt: Leaflet.LeafletMouseEvent) => {
        const point = { lat: evt.latlng.lat, lng: evt.latlng.lng };
        setSelectedPoint(point);

        if (markerRef.current) {
          markerRef.current.setLatLng(evt.latlng);
          return;
        }

        markerRef.current = L.circleMarker(evt.latlng, {
          radius: 8,
          color: "#0F2B4B",
          fillColor: "#0F2B4B",
          fillOpacity: 0.8,
        }).addTo(map);
      });

      setTimeout(() => map.invalidateSize(), 10);
    }

    void mountMap();

    return () => {
      isMounted = false;
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open, initialPoint]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-3xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-slate-800">Seleccionar ubicación en mapa</h4>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Haz click en el mapa para seleccionar coordenadas. Se autocompleta latitud y longitud.
        </p>

        <div ref={mapContainerRef} className="h-80 w-full rounded-xl border border-slate-200" />

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {selectedPoint
              ? `Lat: ${selectedPoint.lat.toFixed(6)} | Lng: ${selectedPoint.lng.toFixed(6)}`
              : "No hay punto seleccionado"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!selectedPoint}
              onClick={() => selectedPoint && onConfirm(selectedPoint)}
              className="py-2 px-4 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-60"
            >
              Usar coordenadas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fullName(student: StudentRecord): string {
  return [
    student.firstName,
    student.middleName,
    student.firstLastname,
    student.secondLastname,
  ]
    .filter(Boolean)
    .join(" ");
}

function statusBadge(status: string) {
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

export default function EstudiantesPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [guardians, setGuardians] = useState<GuardianRecord[]>([]);
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
  const [mapPicker, setMapPicker] = useState<MapPickerState>({ open: false, addressIndex: null });
  const [guardianQuery, setGuardianQuery] = useState("");

  const filteredGuardians = useMemo(() => {
    if (!guardianQuery) {
      return guardians;
    }

    const q = guardianQuery.toLowerCase();
    return guardians.filter((guardian) => {
      const name = guardianName(guardian).toLowerCase();
      const email = (guardian.email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || String(guardian.id).includes(q);
    });
  }, [guardians, guardianQuery]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const name = fullName(student).toLowerCase();
      const idText = String(student.id);
      const searchPass =
        !query ||
        name.includes(query.toLowerCase()) ||
        idText.includes(query.toLowerCase()) ||
        student.email.toLowerCase().includes(query.toLowerCase());

      const statusPass = !statusFilter || student.status?.toLowerCase() === statusFilter;

      return searchPass && statusPass;
    });
  }, [students, query, statusFilter]);

  const loadStudents = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const response = await studentsAPI.findAll(token);
      setStudents(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los estudiantes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadGuardians = useCallback(async () => {
    if (!token) return;

    try {
      const response = await guardiansAPI.findAll(token);
      setGuardians(response.data);
    } catch {
      setGuardians([]);
    }
  }, [token]);

  useEffect(() => {
    void loadStudents();
    void loadGuardians();
  }, [loadStudents, loadGuardians]);

  function openCreateModal() {
    setIsEditMode(false);
    setSelectedId(null);
    setSubmitError(null);
    setForm(initialForm);
    setGuardianQuery("");
    setIsModalOpen(true);
  }

  function openEditModal(student: StudentRecord) {
    setIsEditMode(true);
    setSelectedId(student.id);
    setSubmitError(null);
    setForm(mapStudentToForm(student));
    const selectedGuardian = guardians.find((item) => item.id === student.guardianId);
    setGuardianQuery(selectedGuardian ? guardianName(selectedGuardian) : "");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitLoading) return;
    setIsModalOpen(false);
  }

  function updateAddress(index: number, field: keyof AddressForm, value: string) {
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addAddressRow() {
    setForm((prev) => ({
      ...prev,
      addresses: [...prev.addresses, { ...initialAddress }],
    }));
  }

  function removeAddressRow(index: number) {
    setForm((prev) => {
      if (prev.addresses.length === 1) {
        return prev;
      }

      return {
        ...prev,
        addresses: prev.addresses.filter((_, i) => i !== index),
      };
    });
  }

  function openMapPicker(index: number) {
    setMapPicker({ open: true, addressIndex: index });
  }

  function closeMapPicker() {
    setMapPicker({ open: false, addressIndex: null });
  }

  async function reverseGeocode(point: LatLng): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}`,
      );
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { display_name?: string };
      return data.display_name ?? null;
    } catch {
      return null;
    }
  }

  async function handleMapConfirm(point: LatLng) {
    if (mapPicker.addressIndex === null) {
      closeMapPicker();
      return;
    }

    const addressFromMap = await reverseGeocode(point);

    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.map((item, index) => {
        if (index !== mapPicker.addressIndex) {
          return item;
        }

        return {
          ...item,
          latitude: point.lat.toFixed(7),
          longitude: point.lng.toFixed(7),
          address: item.address || addressFromMap || item.address,
        };
      }),
    }));

    closeMapPicker();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    try {
      setSubmitLoading(true);
      setSubmitError(null);

      const hasInvalidAddress = form.addresses.some(
        (item) =>
          !item.address.trim() ||
          item.latitude.trim() === "" ||
          item.longitude.trim() === "" ||
          Number.isNaN(Number(item.latitude)) ||
          Number.isNaN(Number(item.longitude)),
      );

      if (hasInvalidAddress) {
        setSubmitError("Completa todas las direcciones con coordenadas válidas (puedes usar el mapa).");
        return;
      }

      const payload = toPayload(form);

      if (isEditMode && selectedId) {
        await studentsAPI.update(selectedId, payload, token);
      } else {
        await studentsAPI.create(payload, token);
      }

      await loadStudents();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el estudiante";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleInactivate(studentId: number) {
    if (!token) return;
    const confirmed = window.confirm("Esta acción inactivará el estudiante. ¿Deseas continuar?");
    if (!confirmed) return;

    try {
      await studentsAPI.inactivate(studentId, token);
      await loadStudents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo inactivar el estudiante";
      window.alert(message);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestión de Estudiantes</h3>
          <p className="text-sm text-slate-500 mt-0.5">{students.length} estudiantes registrados</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#0F2B4B] hover:bg-[#163a63] text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Registrar Estudiante
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
            placeholder="Buscar por nombre o ID..."
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
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Acudiente</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                  Cargando estudiantes...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500">
                  Aún no hay estudiantes registrados.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">{fullName(student)}</td>
                  <td className="px-5 py-3 text-xs font-mono text-slate-600">#{student.id}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {firstAddressLabel(student)}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{student.phone ?? "Sin teléfono"}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {student.guardian
                      ? `${student.guardian.firstName} ${student.guardian.firstLastname}`
                      : "Sin acudiente"}
                  </td>
                  <td className="px-5 py-3">{statusBadge(student.status)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(student)}
                        className="p-1.5 rounded-lg hover:bg-[#0F2B4B] hover:text-white text-slate-400 transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleInactivate(student.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                        title="Inactivar"
                      >
                        <span className="material-symbols-outlined text-[16px]">block</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-500 font-medium">
          Mostrando {filteredStudents.length} de {students.length} estudiantes
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
                {isEditMode ? "Editar Estudiante" : "Registrar Estudiante"}
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
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Acudiente</label>
                  <input
                    type="text"
                    value={guardianQuery}
                    onChange={(e) => setGuardianQuery(e.target.value)}
                    placeholder="Buscar acudiente por nombre"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20 mb-2"
                  />
                  <select
                    required
                    value={form.guardianId}
                    onChange={(e) => setForm((prev) => ({ ...prev, guardianId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  >
                    <option value="">Seleccionar acudiente...</option>
                    {filteredGuardians.map((guardian) => (
                      <option key={guardian.id} value={guardian.id}>
                        {guardianName(guardian)}{guardian.email ? ` - ${guardian.email}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo Documento</label>
                  <select
                    value={form.documentType}
                    onChange={(e) => setForm((prev) => ({ ...prev, documentType: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Número Documento</label>
                  <input
                    type="text"
                    required
                    value={form.documentNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, documentNumber: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Descripción Documento</label>
                  <input
                    type="text"
                    value={form.documentDescription}
                    onChange={(e) => setForm((prev) => ({ ...prev, documentDescription: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Dirección</label>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Puedes registrar múltiples direcciones para el estudiante.</p>
                  <button
                    type="button"
                    onClick={addAddressRow}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Añadir dirección
                  </button>
                </div>

                <div className="space-y-3">
                  {form.addresses.map((item, index) => (
                    <div key={`address-${index}`} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Dirección {index + 1}
                        </p>
                        {form.addresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAddressRow(index)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Quitar
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Dirección</label>
                          <input
                            type="text"
                            required
                            value={item.address}
                            onChange={(e) => updateAddress(index, "address", e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20 bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Latitud</label>
                            <input
                              type="number"
                              step="any"
                              required
                              value={item.latitude}
                              onChange={(e) => updateAddress(index, "latitude", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Longitud</label>
                            <input
                              type="number"
                              step="any"
                              required
                              value={item.longitude}
                              onChange={(e) => updateAddress(index, "longitude", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2B4B]/20 bg-white"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openMapPicker(index)}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#0F2B4B]/20 bg-white px-3 py-2 text-xs font-semibold text-[#0F2B4B] hover:bg-[#0F2B4B]/5"
                        >
                          <span className="material-symbols-outlined text-[16px]">map</span>
                          Seleccionar coordenadas en mapa
                        </button>
                      </div>
                    </div>
                  ))}
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
                  className="flex-1 py-2.5 bg-[#0F2B4B] hover:bg-[#163a63] text-white rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
                >
                  {submitLoading ? "Guardando..." : isEditMode ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MapPickerModal
        open={mapPicker.open}
        initialPoint={
          mapPicker.addressIndex !== null
            ? getInitialMapPoint(form.addresses[mapPicker.addressIndex])
            : null
        }
        onClose={closeMapPicker}
        onConfirm={handleMapConfirm}
      />
    </div>
  );
}

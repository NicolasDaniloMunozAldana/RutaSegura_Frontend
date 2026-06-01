import type { TripStatus } from "@/lib/api";

export const TRIP_STATUS_LABEL: Record<string, string> = {
  PENDING_CHECKLIST: "Pendiente de preoperacional",
  PENDING_REVIEW: "Pendiente de revisión",
  ENABLED: "Habilitado",
  REJECTED: "Rechazado",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export function tripStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return TRIP_STATUS_LABEL[status.toUpperCase()] ?? status;
}

export function tripStatusBadgeClass(status: string | null | undefined): string {
  switch ((status ?? "").toUpperCase()) {
    case "PENDING_CHECKLIST":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "PENDING_REVIEW":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ENABLED":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";
    case "IN_PROGRESS":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "CANCELLED":
      return "bg-slate-200 text-slate-500 border-slate-300";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export const TRIP_STATUS_OPTIONS: { value: TripStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "PENDING_CHECKLIST", label: "Pendiente de preoperacional" },
  { value: "PENDING_REVIEW", label: "Pendiente de revisión" },
  { value: "ENABLED", label: "Habilitado" },
  { value: "REJECTED", label: "Rechazado" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
];

export function formatTripDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CO", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Captura la geolocalización del navegador como promesa.
export function getGeolocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Tu dispositivo no permite geolocalización"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () =>
        reject(
          new Error(
            "No se pudo obtener tu ubicación. Activa el permiso de ubicación.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

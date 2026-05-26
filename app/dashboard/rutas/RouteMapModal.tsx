"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { RouteRecord, routesAPI } from "@/lib/api";
import { showErrorDialog, showSuccessDialog } from "./dialogs";

type RouteMapModalProps = {
  route: RouteRecord;
  token: string;
  canManage: boolean;
  onClose: () => void;
  onCalculated: (route: RouteRecord) => void;
};

const TUNJA_CENTER: [number, number] = [5.53528, -73.36778];

function formatDuration(duration: number | null | undefined): string {
  if (duration === null || duration === undefined) {
    return "Sin calcular";
  }
  const totalMinutes = Math.round(duration / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function toTimeLabel(value: string | null | undefined): string {
  if (!value) return "Sin calcular";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : "Sin calcular";
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function schoolPoint(route: RouteRecord): [number, number] | null {
  const address = route.destination?.address;
  if (!address) return null;
  const lat = toNumber(address.latitude);
  const lng = toNumber(address.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

export default function RouteMapModal({
  route,
  token,
  canManage,
  onClose,
  onCalculated,
}: RouteMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layersRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);

  const [currentRoute, setCurrentRoute] = useState<RouteRecord>(route);
  const [mapReady, setMapReady] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const hasGeometry = Boolean(currentRoute.routeGeometry?.coordinates?.length);
  const school = schoolPoint(currentRoute);

  useEffect(() => {
    setCurrentRoute(route);
  }, [route]);

  // Mount the leaflet map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let isMounted = true;

    async function mountMap() {
      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) {
        return;
      }

      leafletRef.current = L;
      const map = L.map(mapContainerRef.current).setView(
        school ?? TUNJA_CENTER,
        13,
      );
      mapRef.current = map;
      layersRef.current = L.layerGroup().addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 10);
    }

    void mountMap();

    return () => {
      isMounted = false;
      layersRef.current = null;
      leafletRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [school]);

  // Redraw markers + polyline whenever the route or map changes.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!mapReady || !L || !map || !layers) return;

    layers.clearLayers();

    const bounds: [number, number][] = [];

    if (school) {
      L.circleMarker(school, {
        radius: 10,
        color: "#059669",
        fillColor: "#059669",
        fillOpacity: 0.9,
      })
        .addTo(layers)
        .bindTooltip(`Colegio: ${currentRoute.destination?.name ?? "Sede"}`);
      bounds.push(school);
    }

    currentRoute.stops.forEach((stop) => {
      const lat = toNumber(stop.latitude);
      const lng = toNumber(stop.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      L.circleMarker([lat, lng], {
        radius: 8,
        color: "#003D7A",
        fillColor: "#003D7A",
        fillOpacity: 0.85,
      })
        .addTo(layers)
        .bindTooltip(`${stop.stopOrder}. ${stop.description ?? "Estudiante"}`);
      bounds.push([lat, lng]);
    });

    const coordinates = currentRoute.routeGeometry?.coordinates ?? [];
    if (coordinates.length) {
      const latLngs = coordinates.map(
        (coord) => [coord[1], coord[0]] as [number, number],
      );
      L.polyline(latLngs, {
        color: "#003D7A",
        weight: 4,
        opacity: 0.8,
      }).addTo(layers);
      latLngs.forEach((point) => bounds.push(point));
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [mapReady, currentRoute, school]);

  async function handleCalculate() {
    if (!canManage) return;

    try {
      setCalcLoading(true);
      const response = await routesAPI.calculate(currentRoute.id, token);
      setCurrentRoute(response.data);
      onCalculated(response.data);
      showSuccessDialog("Ruta calculada correctamente.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo calcular la ruta";
      showErrorDialog(message);
    } finally {
      setCalcLoading(false);
    }
  }

  async function handleOpenGoogleMaps() {
    try {
      setActionLoading(true);
      const response = await routesAPI.getGoogleMapsUrl(currentRoute.id, token);
      window.open(response.data.url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo generar el enlace de Google Maps";
      showErrorDialog(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownloadGpx() {
    try {
      setActionLoading(true);
      const blob = await routesAPI.exportGpx(currentRoute.id, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ruta-${currentRoute.id}.gpx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo descargar el GPX";
      showErrorDialog(message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Trazado de la Ruta
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {currentRoute.name} ·{" "}
              {currentRoute.destination?.name ?? "Sin sede"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Hora de salida
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {toTimeLabel(currentRoute.startTime)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Duración total
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {formatDuration(currentRoute.routeDuration)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Regreso al colegio
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {toTimeLabel(currentRoute.endTime)}
            </p>
          </div>
        </div>

        <div
          ref={mapContainerRef}
          className="h-72 w-full rounded-xl border border-slate-200"
        />
        <p className="mt-2 text-xs text-slate-500">
          El recorrido parte del colegio, visita las casas de los estudiantes en
          orden optimizado y regresa al colegio.
        </p>

        <div className="mt-4">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
            Secuencia del recorrido
          </h4>

          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="material-symbols-outlined text-[20px] text-emerald-700">
                trip_origin
              </span>
              <span className="flex-1 text-sm font-semibold text-slate-800">
                Salida · {currentRoute.destination?.name ?? "Colegio"}
              </span>
              <span className="text-sm font-semibold text-emerald-700">
                {toTimeLabel(currentRoute.startTime)}
              </span>
            </div>

            {currentRoute.stops.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-4 text-center text-xs font-medium text-slate-500">
                Aún no hay recorrido calculado. Asigna estudiantes y presiona
                «Calcular ruta».
              </div>
            ) : (
              currentRoute.stops.map((stop) => (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#003D7A] text-xs font-bold text-white">
                    {stop.stopOrder}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-700">
                    {stop.description ?? "Estudiante"}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    {toTimeLabel(stop.estimatedTime)}
                  </span>
                </div>
              ))
            )}

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="material-symbols-outlined text-[20px] text-slate-600">
                location_on
              </span>
              <span className="flex-1 text-sm font-semibold text-slate-800">
                Regreso · {currentRoute.destination?.name ?? "Colegio"}
              </span>
              <span className="text-sm font-semibold text-slate-600">
                {toTimeLabel(currentRoute.endTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {canManage && (
            <button
              type="button"
              onClick={handleCalculate}
              disabled={calcLoading}
              className="inline-flex items-center gap-2 bg-[#003D7A] hover:bg-[#0066CC] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-md disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">route</span>
              {calcLoading ? "Calculando..." : "Calcular ruta"}
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            disabled={!hasGeometry || actionLoading}
            className="inline-flex items-center gap-2 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            Abrir en Google Maps
          </button>
          <button
            type="button"
            onClick={handleDownloadGpx}
            disabled={!hasGeometry || actionLoading}
            className="inline-flex items-center gap-2 border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            Descargar GPX
          </button>
        </div>
      </div>
    </div>
  );
}


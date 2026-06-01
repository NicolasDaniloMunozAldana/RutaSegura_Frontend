"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { guardianTripsAPI } from "@/lib/api";
import type { GuardianActiveTrip } from "@/lib/api";

interface LiveTrackingModalProps {
  tripId: number;
  token: string | null;
  onClose: () => void;
}

const TUNJA_CENTER: [number, number] = [5.53528, -73.36778];
const POLL_MS = 10000;

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LiveTrackingModal({
  tripId,
  token,
  onClose,
}: LiveTrackingModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.CircleMarker | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const centeredRef = useRef(false);

  const [trip, setTrip] = useState<GuardianActiveTrip | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");

  // Monta el mapa una vez.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let mounted = true;

    async function mountMap() {
      const L = await import("leaflet");
      if (!mounted || !mapContainerRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapContainerRef.current).setView(TUNJA_CENTER, 13);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 10);
    }

    void mountMap();

    return () => {
      mounted = false;
      markerRef.current = null;
      leafletRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const res = await guardianTripsAPI.findActive(token);
      const match = res.data.find((t) => t.tripId === tripId) ?? null;
      setTrip(match);
      setError("");
      if (!match) {
        setError("El viaje finalizó o ya no está en curso.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la ubicación");
    }
  }, [token, tripId]);

  // Polling cada 10s.
  useEffect(() => {
    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // Actualiza el marcador del bus cuando llega nueva posición.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map || !trip) return;
    if (trip.latitude == null || trip.longitude == null) return;

    const position: [number, number] = [trip.latitude, trip.longitude];

    if (!markerRef.current) {
      markerRef.current = L.circleMarker(position, {
        radius: 10,
        color: "#1d4ed8",
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(map);
      markerRef.current.bindTooltip("Bus", { permanent: false });
    } else {
      markerRef.current.setLatLng(position);
    }

    if (!centeredRef.current) {
      map.setView(position, 15);
      centeredRef.current = true;
    } else {
      map.panTo(position);
    }
  }, [mapReady, trip]);

  const hasLocation = trip?.latitude != null && trip?.longitude != null;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/45"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Seguimiento en vivo
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {trip ? trip.routeName : "Viaje en curso"}
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

        {trip && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Vehículo</p>
              <p className="font-semibold text-slate-800">{trip.vehiclePlate}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Conductor</p>
              <p className="font-semibold text-slate-800">{trip.driverName}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Hijo(s)</p>
              <p className="font-semibold text-slate-800">
                {trip.children.join(", ") || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Actualizado</p>
              <p className="font-semibold text-slate-800">
                {formatWhen(trip.locationUpdatedAt)}
              </p>
            </div>
          </div>
        )}

        <div
          ref={mapContainerRef}
          className="h-80 w-full rounded-xl border border-slate-200 bg-slate-100"
        />

        {!hasLocation && (
          <p className="mt-3 text-sm text-amber-600 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            Esperando la ubicación del bus… (el conductor debe tener la app activa).
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <p className="mt-2 text-xs text-slate-400">
          La ubicación se actualiza automáticamente cada 10 segundos.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { driverTripsAPI } from "@/lib/api";
import {
  Coords,
  TrackerHandle,
  startLocationTracking,
} from "./tracker";

// Intervalo mínimo entre envíos al backend (evita saturar con muchos puntos).
const MIN_INTERVAL_MS = 12000;

export type SharingStatus = "idle" | "sharing" | "error";

// Comparte la ubicación del conductor mientras un viaje esté en curso.
export function useTripLocationSharing(
  tripId: number | null,
  active: boolean,
  token: string | null,
) {
  const [status, setStatus] = useState<SharingStatus>("idle");
  const [error, setError] = useState("");
  const lastSent = useRef(0);
  const handleRef = useRef<TrackerHandle | null>(null);

  useEffect(() => {
    if (!active || !tripId || !token) {
      setStatus("idle");
      return;
    }

    let cancelled = false;

    const send = async (coords: Coords) => {
      const now = Date.now();
      if (now - lastSent.current < MIN_INTERVAL_MS) return;
      lastSent.current = now;
      try {
        await driverTripsAPI.updateLocation(tripId, coords, token);
      } catch {
        // Reintenta en el próximo punto; no interrumpimos el rastreo.
      }
    };

    void startLocationTracking(
      (coords) => {
        setStatus("sharing");
        void send(coords);
      },
      (message) => {
        setError(message);
        setStatus("error");
      },
    ).then((handle) => {
      if (cancelled) {
        void handle.stop();
      } else {
        handleRef.current = handle;
      }
    });

    return () => {
      cancelled = true;
      void handleRef.current?.stop();
      handleRef.current = null;
      lastSent.current = 0;
    };
  }, [active, tripId, token]);

  return { status, error };
}

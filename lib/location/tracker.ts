// Rastreo de ubicación independiente de plataforma.
// - App nativa (Capacitor): usa @capacitor-community/background-geolocation,
//   que sigue enviando ubicación aunque Google Maps esté en primer plano.
// - Navegador web: usa navigator.geolocation.watchPosition (solo en 1er plano).

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface TrackerHandle {
  stop: () => void | Promise<void>;
}

interface BgLocation {
  latitude: number;
  longitude: number;
}

interface BgError {
  message?: string;
}

interface BackgroundGeolocationPlugin {
  addWatcher(
    options: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    callback: (location?: BgLocation, error?: BgError) => void,
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
}

async function getCapacitor() {
  try {
    const mod = await import("@capacitor/core");
    return mod;
  } catch {
    return null;
  }
}

export async function startLocationTracking(
  onLocation: (coords: Coords) => void,
  onError?: (message: string) => void,
): Promise<TrackerHandle> {
  const capacitor = await getCapacitor();

  // ── App nativa: rastreo en segundo plano ──────────────────────────────
  if (capacitor?.Capacitor.isNativePlatform()) {
    try {
      const BackgroundGeolocation =
        capacitor.registerPlugin<BackgroundGeolocationPlugin>(
          "BackgroundGeolocation",
        );
      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: "Viaje en curso",
          backgroundMessage:
            "RutaSegura está compartiendo la ubicación del bus.",
          requestPermissions: true,
          stale: false,
          distanceFilter: 15,
        },
        (location, error) => {
          if (error) {
            onError?.(error.message ?? "No se pudo obtener la ubicación");
            return;
          }
          if (location) {
            onLocation({
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }
        },
      );
      return {
        stop: () => BackgroundGeolocation.removeWatcher({ id: watcherId }),
      };
    } catch {
      // Si el plugin no está disponible, caemos al modo web.
    }
  }

  // ── Web: rastreo en primer plano ──────────────────────────────────────
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError?.("Tu dispositivo no permite geolocalización");
    return { stop: () => {} };
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) =>
      onLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
    (error) => onError?.(error.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );

  return { stop: () => navigator.geolocation.clearWatch(watchId) };
}

import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type { GuardianChild } from "../types/portal";
import type { RouteRecord } from "../types/routes";

// Portal del conductor: solo sus rutas asignadas.
export const driverPortalAPI = {
  findMyRoutes: (token: string) =>
    apiCall("/driver/routes", { token }) as Promise<
      ApiEnvelope<RouteRecord[]>
    >,

  findRoute: (id: number, token: string) =>
    apiCall(`/driver/routes/${id}`, { token }) as Promise<
      ApiEnvelope<RouteRecord>
    >,

  getGoogleMapsUrl: (id: number, token: string) =>
    apiCall(`/driver/routes/${id}/google-maps`, { token }) as Promise<
      ApiEnvelope<{ url: string }>
    >,

  // URL en modo navegación (voz/3D) para iniciar el recorrido.
  getNavigationUrl: (id: number, token: string) =>
    apiCall(`/driver/routes/${id}/navigation`, { token }) as Promise<
      ApiEnvelope<{ url: string }>
    >,
};

// Portal del acudiente: rutas de sus hijos.
export const guardianPortalAPI = {
  findChildrenRoutes: (token: string) =>
    apiCall("/guardian/routes", { token }) as Promise<
      ApiEnvelope<GuardianChild[]>
    >,
};

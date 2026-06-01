import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type {
  ChecklistTemplateItem,
  CreateTripPayload,
  GuardianActiveTrip,
  SubmitChecklistPayload,
  TripQueryParams,
  TripRecord,
} from "../types/trips";

export const guardianTripsAPI = {
  findActive: (token: string) =>
    apiCall("/guardian/trips/active", { token }) as Promise<
      ApiEnvelope<GuardianActiveTrip[]>
    >,
};

export const checklistAPI = {
  getTemplate: (token: string) =>
    apiCall("/checklist/template", { token }) as Promise<
      ApiEnvelope<ChecklistTemplateItem[]>
    >,
};

function buildTripQuery(params: TripQueryParams = {}): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.routeId) search.set("routeId", String(params.routeId));
  if (params.driverPersonId)
    search.set("driverPersonId", String(params.driverPersonId));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// Coordinador / admin
export const tripsAPI = {
  findAll: (token: string, params?: TripQueryParams) =>
    apiCall(`/trips${buildTripQuery(params)}`, { token }) as Promise<
      ApiEnvelope<TripRecord[]>
    >,

  findOne: (id: number, token: string) =>
    apiCall(`/trips/${id}`, { token }) as Promise<ApiEnvelope<TripRecord>>,

  create: (payload: CreateTripPayload, token: string) =>
    apiCall("/trips", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<TripRecord>>,

  approve: (id: number, reviewNotes: string | undefined, token: string) =>
    apiCall(`/trips/${id}/approve`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ reviewNotes }),
    }) as Promise<ApiEnvelope<TripRecord>>,

  reject: (id: number, reviewNotes: string, token: string) =>
    apiCall(`/trips/${id}/reject`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ reviewNotes }),
    }) as Promise<ApiEnvelope<TripRecord>>,

  cancel: (id: number, reason: string | undefined, token: string) =>
    apiCall(`/trips/${id}/cancel`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ reason }),
    }) as Promise<ApiEnvelope<TripRecord>>,
};

// Conductor
export const driverTripsAPI = {
  findMine: (token: string, params?: TripQueryParams) =>
    apiCall(`/driver/trips${buildTripQuery(params)}`, { token }) as Promise<
      ApiEnvelope<TripRecord[]>
    >,

  findOne: (id: number, token: string) =>
    apiCall(`/driver/trips/${id}`, { token }) as Promise<
      ApiEnvelope<TripRecord>
    >,

  submitChecklist: (
    id: number,
    payload: SubmitChecklistPayload,
    token: string,
  ) =>
    apiCall(`/driver/trips/${id}/checklist`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<TripRecord>>,

  start: (id: number, token: string) =>
    apiCall(`/driver/trips/${id}/start`, {
      method: "PATCH",
      token,
    }) as Promise<ApiEnvelope<TripRecord>>,

  updateLocation: (
    id: number,
    coords: { latitude: number; longitude: number },
    token: string,
  ) =>
    apiCall(`/driver/trips/${id}/location`, {
      method: "PATCH",
      token,
      body: JSON.stringify(coords),
    }) as Promise<ApiEnvelope<{ latitude: number; longitude: number }>>,

  finish: (id: number, observations: string | undefined, token: string) =>
    apiCall(`/driver/trips/${id}/finish`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ observations }),
    }) as Promise<ApiEnvelope<TripRecord>>,
};

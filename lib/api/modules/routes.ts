import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type {
  CreateRouteAssignmentPayload,
  RouteAssignmentRecord,
  RouteFormOptions,
  RouteGeoJson,
  RoutePayload,
  RouteQueryParams,
  RouteRecord,
  UpdateRouteAssignmentPayload,
  UpdateRoutePayload,
} from "../types/routes";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function buildQueryString(params?: RouteQueryParams): string {
  if (!params) return "";

  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (typeof params.zoneId === "number") search.set("zoneId", String(params.zoneId));

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const routesAPI = {
  findAll: (token: string, params?: RouteQueryParams) =>
    apiCall(`/routes${buildQueryString(params)}`, {
      token,
    }) as Promise<ApiEnvelope<RouteRecord[]>>,

  findOne: (id: number, token: string) =>
    apiCall(`/routes/${id}`, {
      token,
    }) as Promise<ApiEnvelope<RouteRecord>>,

  getFormOptions: (token: string) =>
    apiCall("/routes/form-options", {
      token,
    }) as Promise<ApiEnvelope<RouteFormOptions>>,

  create: (payload: RoutePayload, token: string) =>
    apiCall("/routes", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<RouteRecord>>,

  update: (id: number, payload: UpdateRoutePayload, token: string) =>
    apiCall(`/routes/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<RouteRecord>>,

  inactivate: (id: number, token: string) =>
    apiCall(`/routes/${id}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<RouteRecord>>,

  activate: (id: number, token: string) =>
    apiCall(`/routes/${id}/activate`, {
      method: "PATCH",
      token,
    }) as Promise<ApiEnvelope<RouteRecord>>,

  listAssignments: (routeId: number, token: string) =>
    apiCall(`/routes/${routeId}/assignments`, {
      token,
    }) as Promise<ApiEnvelope<RouteAssignmentRecord[]>>,

  createAssignment: (
    routeId: number,
    payload: CreateRouteAssignmentPayload,
    token: string,
  ) =>
    apiCall(`/routes/${routeId}/assignments`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<RouteAssignmentRecord>>,

  updateAssignment: (
    routeId: number,
    assignmentId: number,
    payload: UpdateRouteAssignmentPayload,
    token: string,
  ) =>
    apiCall(`/routes/${routeId}/assignments/${assignmentId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<RouteAssignmentRecord>>,

  inactivateAssignment: (
    routeId: number,
    assignmentId: number,
    token: string,
  ) =>
    apiCall(`/routes/${routeId}/assignments/${assignmentId}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<RouteAssignmentRecord>>,

  calculate: (routeId: number, token: string) =>
    apiCall(`/routes/${routeId}/calculate`, {
      method: "POST",
      token,
    }) as Promise<ApiEnvelope<RouteRecord>>,

  getGeoJson: (routeId: number, token: string) =>
    apiCall(`/routes/${routeId}/geojson`, {
      token,
    }) as Promise<ApiEnvelope<RouteGeoJson>>,

  getGoogleMapsUrl: (routeId: number, token: string) =>
    apiCall(`/routes/${routeId}/google-maps`, {
      token,
    }) as Promise<ApiEnvelope<{ url: string }>>,

  exportGpx: async (routeId: number, token: string): Promise<Blob> => {
    const response = await fetch(`${API_URL}/routes/${routeId}/gpx`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.blob();
  },
};

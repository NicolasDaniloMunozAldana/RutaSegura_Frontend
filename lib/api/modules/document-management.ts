import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type {
  AlertListResponse,
  AlertQueryParams,
  DocumentVehicleRecord,
  DocumentAlertRecord,
  GenerateExpiryAlertsResponse,
  PersonDocumentRecord,
} from "../types/document-management";

function buildAlertQuery(params: AlertQueryParams) {
  const query = new URLSearchParams();

  if (params.daysAhead) query.set("daysAhead", String(params.daysAhead));
  if (params.personId) query.set("personId", String(params.personId));
  if (params.vehiclePlate) query.set("vehiclePlate", params.vehiclePlate);
  if (typeof params.isRead === "boolean") {
    query.set("isRead", params.isRead ? "true" : "false");
  }
  if (params.alertType) query.set("alertType", params.alertType);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.q) query.set("q", params.q);

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const documentManagementAPI = {
  findPersonDocuments: (token: string, query?: string) =>
    apiCall(`/documents/person${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      token,
    }) as Promise<ApiEnvelope<PersonDocumentRecord[]>>,

  findVehicleDocuments: (token: string, query?: string) =>
    apiCall(`/documents/vehicle${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      token,
    }) as Promise<ApiEnvelope<DocumentVehicleRecord[]>>,

  generateExpiryAlerts: (token: string, daysAhead?: number) =>
    apiCall(
      `/documents/alerts/generate-expiry${
        daysAhead ? `?daysAhead=${encodeURIComponent(String(daysAhead))}` : ""
      }`,
      {
        method: "POST",
        token,
      },
    ) as Promise<ApiEnvelope<GenerateExpiryAlertsResponse>>,

  findAlerts: (token: string, params: AlertQueryParams = {}) =>
    apiCall(`/documents/alerts${buildAlertQuery(params)}`, {
      token,
    }) as Promise<ApiEnvelope<AlertListResponse>>,

  markAlertAsRead: (id: number, token: string) =>
    apiCall(`/documents/alerts/${id}/read`, {
      method: "PATCH",
      token,
    }) as Promise<ApiEnvelope<DocumentAlertRecord>>,
};

import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type {
  DriverLicensePayload,
  DriverPayload,
  DriverRecord,
} from "../types/drivers";

export const driversAPI = {
  findAll: (token: string, query?: string) =>
    apiCall(`/drivers${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      token,
    }) as Promise<ApiEnvelope<DriverRecord[]>>,

  findOne: (id: number, token: string) =>
    apiCall(`/drivers/${id}`, {
      token,
    }) as Promise<ApiEnvelope<DriverRecord>>,

  create: (payload: DriverPayload, token: string) =>
    apiCall("/drivers", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<DriverRecord>>,

  update: (id: number, payload: Partial<DriverPayload>, token: string) =>
    apiCall(`/drivers/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<DriverRecord>>,

  inactivate: (id: number, token: string) =>
    apiCall(`/drivers/${id}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<DriverRecord>>,

  activate: (id: number, token: string) =>
    apiCall(`/drivers/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: "ACTIVE" }),
    }) as Promise<ApiEnvelope<DriverRecord>>,

  // Sube/reemplaza la licencia de un conductor (admin/coordinador).
  upsertLicense: (id: number, payload: DriverLicensePayload, token: string) =>
    apiCall(`/drivers/${id}/license`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<DriverRecord>>,
};

// Portal del conductor: su propio perfil y su licencia.
export const driverProfileAPI = {
  getMyProfile: (token: string) =>
    apiCall("/driver/profile", { token }) as Promise<
      ApiEnvelope<DriverRecord>
    >,

  upsertMyLicense: (payload: DriverLicensePayload, token: string) =>
    apiCall("/driver/profile/license", {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<DriverRecord>>,
};

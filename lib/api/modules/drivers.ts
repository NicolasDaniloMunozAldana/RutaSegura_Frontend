import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type { DriverPayload, DriverRecord } from "../types/drivers";

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
};

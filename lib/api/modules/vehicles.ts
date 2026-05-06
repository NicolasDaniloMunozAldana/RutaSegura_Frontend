import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type {
  UpdateVehiclePayload,
  VehiclePayload,
  VehicleRecord,
} from "../types/vehicles";

export const vehiclesAPI = {
  findAll: (token: string, query?: string) =>
    apiCall(`/vehicles${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      token,
    }) as Promise<ApiEnvelope<VehicleRecord[]>>,

  findOne: (plate: string, token: string) =>
    apiCall(`/vehicles/${encodeURIComponent(plate)}`, {
      token,
    }) as Promise<ApiEnvelope<VehicleRecord>>,

  create: (payload: VehiclePayload, token: string) =>
    apiCall("/vehicles", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<VehicleRecord>>,

  update: (plate: string, payload: UpdateVehiclePayload, token: string) =>
    apiCall(`/vehicles/${encodeURIComponent(plate)}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<VehicleRecord>>,

  inactivate: (plate: string, token: string) =>
    apiCall(`/vehicles/${encodeURIComponent(plate)}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<VehicleRecord>>,

  activate: (plate: string, token: string) =>
    apiCall(`/vehicles/${encodeURIComponent(plate)}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: "ACTIVE" }),
    }) as Promise<ApiEnvelope<VehicleRecord>>,
};

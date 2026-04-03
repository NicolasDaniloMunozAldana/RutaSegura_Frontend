import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type { GuardianPayload, GuardianRecord } from "../types/guardians";

export const guardiansAPI = {
  findAll: (token: string, query?: string) =>
    apiCall(`/guardians${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      token,
    }) as Promise<ApiEnvelope<GuardianRecord[]>>,

  findOne: (id: number, token: string) =>
    apiCall(`/guardians/${id}`, {
      token,
    }) as Promise<ApiEnvelope<GuardianRecord>>,

  create: (payload: GuardianPayload, token: string) =>
    apiCall("/guardians", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<GuardianRecord>>,

  update: (id: number, payload: Partial<GuardianPayload>, token: string) =>
    apiCall(`/guardians/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<GuardianRecord>>,

  inactivate: (id: number, token: string) =>
    apiCall(`/guardians/${id}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<GuardianRecord>>,

  activate: (id: number, token: string) =>
    apiCall(`/guardians/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: "ACTIVE" }),
    }) as Promise<ApiEnvelope<GuardianRecord>>,
};

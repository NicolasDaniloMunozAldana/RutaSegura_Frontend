import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type {
  UpdateUserPayload,
  UserPayload,
  UserPerson,
  UserRecord,
  UserRole,
} from "../types/users";

export const usersAPI = {
  findAll: (token: string, query?: string) =>
    apiCall(`/users${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      token,
    }) as Promise<ApiEnvelope<UserRecord[]>>,

  findOne: (id: number, token: string) =>
    apiCall(`/users/${id}`, {
      token,
    }) as Promise<ApiEnvelope<UserRecord>>,

  create: (payload: UserPayload, token: string) =>
    apiCall("/users", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<UserRecord>>,

  update: (id: number, payload: UpdateUserPayload, token: string) =>
    apiCall(`/users/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<UserRecord>>,

  inactivate: (id: number, token: string) =>
    apiCall(`/users/${id}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<UserRecord>>,

  activate: (id: number, token: string) =>
    apiCall(`/users/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: "ACTIVE" }),
    }) as Promise<ApiEnvelope<UserRecord>>,

  findRoles: (token: string) =>
    apiCall("/users/catalog/roles", {
      token,
    }) as Promise<ApiEnvelope<UserRole[]>>,

  findAvailablePersons: (token: string, query?: string) =>
    apiCall(
      `/users/catalog/persons${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      {
        token,
      },
    ) as Promise<ApiEnvelope<UserPerson[]>>,
};

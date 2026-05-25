import { apiCall } from "../core/client";
import type { ApiEnvelope } from "../core/client";
import type { StudentPayload, StudentRecord } from "../types/students";

export const studentsAPI = {
  findAll: (token: string) =>
    apiCall("/students", {
      token,
    }) as Promise<ApiEnvelope<StudentRecord[]>>,

  findOne: (id: number, token: string) =>
    apiCall(`/students/${id}`, {
      token,
    }) as Promise<ApiEnvelope<StudentRecord>>,

  findByZone: (zoneId: number, token: string) =>
    apiCall(`/students/by-zone/${zoneId}`, {
      token,
    }) as Promise<ApiEnvelope<StudentRecord[]>>,

  create: (payload: StudentPayload, token: string) =>
    apiCall("/students", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<StudentRecord>>,

  update: (id: number, payload: Partial<StudentPayload>, token: string) =>
    apiCall(`/students/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<StudentRecord>>,

  inactivate: (id: number, token: string) =>
    apiCall(`/students/${id}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<StudentRecord>>,

  activate: (id: number, token: string) =>
    apiCall(`/students/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ status: "ACTIVE" }),
    }) as Promise<ApiEnvelope<StudentRecord>>,
};

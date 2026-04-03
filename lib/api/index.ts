export { apiCall } from "./core/client";
export type { ApiEnvelope, RequestOptions } from "./core/client";

export type { AuthUser, LoginResponse, ProfileResponse } from "./types/auth";
export type {
  StudentAddress,
  StudentDocumentLink,
  StudentPayload,
  StudentRecord,
} from "./types/students";
export type { GuardianPayload, GuardianRecord } from "./types/guardians";

export { authAPI } from "./modules/auth";
export { studentsAPI } from "./modules/students";
export { guardiansAPI } from "./modules/guardians";

export { apiCall } from "./core/client";
export type { ApiEnvelope, RequestOptions } from "./core/client";

export type { AuthUser, LoginResponse, ProfileResponse } from "./types/auth";
export type {
  StudentAddress,
  StudentDocumentLink,
  StudentPayload,
  StudentRecord,
} from "./types/students";
export type { DriverPayload, DriverRecord } from "./types/drivers";
export type { GuardianPayload, GuardianRecord } from "./types/guardians";
export type {
  UpdateUserPayload,
  UserPayload,
  UserPerson,
  UserRecord,
  UserRole,
} from "./types/users";

export { authAPI } from "./modules/auth";
export { studentsAPI } from "./modules/students";
export { driversAPI } from "./modules/drivers";
export { guardiansAPI } from "./modules/guardians";
export { usersAPI } from "./modules/users";

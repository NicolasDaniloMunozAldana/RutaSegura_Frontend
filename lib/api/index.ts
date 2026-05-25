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
export type {
  AlertClassification,
  AlertListMeta,
  AlertListResponse,
  AlertQueryParams,
  AlertReadState,
  AlertType,
  DocumentTypeRecord,
  DocumentAlertRecord,
  DocumentVehicleRecord,
  GenerateExpiryAlertsResponse,
  PersonDocumentLinkRecord,
  PersonDocumentPersonRecord,
  PersonDocumentRecord,
} from "./types/document-management";
export type { GuardianPayload, GuardianRecord } from "./types/guardians";
export type {
  UpdateVehiclePayload,
  VehicleDocumentPayload,
  VehicleDocumentRecord,
  VehicleDocumentsPayload,
  VehiclePayload,
  VehicleRecord,
} from "./types/vehicles";
export type {
  UpdateUserPayload,
  UserPayload,
  UserPerson,
  UserRecord,
  UserRole,
} from "./types/users";
export type {
  CreateRouteAssignmentPayload,
  RouteAssignmentAddressRef,
  RouteAssignmentPersonRef,
  RouteAssignmentRecord,
  RouteAssignmentStopRef,
  RouteDestinationOption,
  RouteDestinationRef,
  RouteDriverOption,
  RouteDriverRef,
  RouteFormOptions,
  RouteGeoJson,
  RouteGeometry,
  RoutePayload,
  RouteQueryParams,
  RouteRecord,
  RouteStopRecord,
  RouteType,
  RouteVehicleOption,
  RouteVehicleRef,
  RouteZoneOption,
  RouteZoneRef,
  UpdateRouteAssignmentPayload,
  UpdateRoutePayload,
} from "./types/routes";

export { authAPI } from "./modules/auth";
export { documentManagementAPI } from "./modules/document-management";
export { studentsAPI } from "./modules/students";
export { driversAPI } from "./modules/drivers";
export { guardiansAPI } from "./modules/guardians";
export { vehiclesAPI } from "./modules/vehicles";
export { usersAPI } from "./modules/users";
export { routesAPI } from "./modules/routes";

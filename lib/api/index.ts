export { apiCall } from "./core/client";
export type { ApiEnvelope, RequestOptions } from "./core/client";

export type { AuthUser, LoginResponse, ProfileResponse } from "./types/auth";
export type {
  PresignDownloadResponse,
  PresignUploadResponse,
  StorageFolder,
} from "./types/files";
export type {
  ChecklistItemInput,
  ChecklistItemRecord,
  ChecklistRecord,
  ChecklistTemplateItem,
  CreateTripPayload,
  GuardianActiveTrip,
  SubmitChecklistPayload,
  TripDriverRef,
  TripQueryParams,
  TripRecord,
  TripRouteRef,
  TripStatus,
  TripVehicleRef,
} from "./types/trips";
export type {
  NotificationRecord,
  NotificationType,
} from "./types/notifications";
export type {
  StudentAddress,
  StudentDocumentLink,
  StudentPayload,
  StudentRecord,
} from "./types/students";
export type {
  DriverLicensePayload,
  DriverPayload,
  DriverRecord,
} from "./types/drivers";
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
  AvailableGuardian,
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

export type { GuardianChild, GuardianChildRoute } from "./types/portal";

export { authAPI } from "./modules/auth";
export { driverPortalAPI, guardianPortalAPI } from "./modules/portal";
export { documentManagementAPI } from "./modules/document-management";
export { filesAPI } from "./modules/files";
export {
  tripsAPI,
  driverTripsAPI,
  guardianTripsAPI,
  checklistAPI,
} from "./modules/trips";
export { notificationsAPI } from "./modules/notifications";
export { studentsAPI } from "./modules/students";
export { driversAPI, driverProfileAPI } from "./modules/drivers";
export { guardiansAPI } from "./modules/guardians";
export { vehiclesAPI } from "./modules/vehicles";
export { usersAPI } from "./modules/users";
export { routesAPI } from "./modules/routes";

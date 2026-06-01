export type TripStatus =
  | "PENDING_CHECKLIST"
  | "PENDING_REVIEW"
  | "ENABLED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface TripRouteRef {
  id: number;
  name: string;
  routeType: string;
  startTime: string;
  endTime: string | null;
  zone: { id: number; name: string } | null;
}

export interface TripVehicleRef {
  plate: string;
  brand: string | null;
  model: string | null;
}

export interface TripDriverRef {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastname: string;
  secondLastname: string | null;
}

export interface ChecklistItemRecord {
  id: number;
  checklistId: number;
  itemName: string;
  passed: boolean;
  observations: string | null;
  fileUrl: string | null;
}

export interface ChecklistRecord {
  id: number;
  tripId: number;
  vehiclePlate: string;
  reviewedByUserId: number | null;
  status: string | null;
  generalObservations: string | null;
  reviewNotes: string | null;
  vehiclePhotoKey: string | null;
  signatureKey: string | null;
  latitude: string | null;
  longitude: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  items: ChecklistItemRecord[];
  reviewedByUser: { id: number; email: string } | null;
}

export interface TripRecord {
  id: number;
  routeId: number;
  vehiclePlate: string;
  driverPersonId: number;
  tripDate: string;
  status: TripStatus | string | null;
  startedAt: string | null;
  endedAt: string | null;
  observations: string | null;
  createdByUserId: number | null;
  createdAt: string;
  route: TripRouteRef;
  vehicle: TripVehicleRef;
  driver: TripDriverRef;
  checklist: ChecklistRecord | null;
}

export interface CreateTripPayload {
  routeId: number;
  tripDate: string;
  driverPersonId?: number;
  vehiclePlate?: string;
  observations?: string;
}

export interface ChecklistItemInput {
  itemName: string;
  passed: boolean;
  observations?: string;
  fileKey?: string;
}

export interface SubmitChecklistPayload {
  items: ChecklistItemInput[];
  vehiclePhotoKey: string;
  signatureKey: string;
  latitude: number;
  longitude: number;
  generalObservations?: string;
}

export interface ChecklistTemplateItem {
  id: number;
  itemName: string;
  required: boolean;
}

export interface TripQueryParams {
  status?: string;
  from?: string;
  to?: string;
  routeId?: number;
  driverPersonId?: number;
}

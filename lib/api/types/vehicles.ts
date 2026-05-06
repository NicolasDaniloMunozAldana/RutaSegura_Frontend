export type VehicleDocumentType =
  | "SOAT"
  | "TECHNICAL_INSPECTION"
  | "INSURANCE"
  | "PROPERTY_CARD";

export interface VehicleDocumentRecord {
  id: number;
  documentType: VehicleDocumentType | string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: string | null;
}

export interface VehicleRecord {
  plate: string;
  passengerCapacity: number;
  brand: string | null;
  model: string | null;
  year: number | null;
  status: string | null;
  createdAt: string;
  soat: VehicleDocumentRecord | null;
  technicalInspection: VehicleDocumentRecord | null;
  insurance: VehicleDocumentRecord | null;
  propertyCard: VehicleDocumentRecord | null;
}

export interface VehicleDocumentPayload {
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
}

export interface VehicleDocumentsPayload {
  soat: VehicleDocumentPayload;
  technicalInspection: VehicleDocumentPayload;
  insurance: VehicleDocumentPayload;
  propertyCard: VehicleDocumentPayload;
}

export interface VehiclePayload {
  plate: string;
  passengerCapacity: number;
  brand?: string;
  model?: string;
  year?: number;
  status?: string;
  documents: VehicleDocumentsPayload;
}

export interface UpdateVehiclePayload {
  passengerCapacity?: number;
  brand?: string;
  model?: string;
  year?: number;
  status?: string;
  documents?: Partial<VehicleDocumentsPayload>;
}

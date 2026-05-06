export type AlertType = "EXPIRY_WARNING" | "EXPIRY_INFO" | "EXPIRED";

export type AlertClassification = "EXPIRED" | "EXPIRING_SOON" | "UPCOMING";

export type AlertReadState = "READ" | "UNREAD";

export interface DocumentAlertRecord {
  id: number;
  vehicleDocumentId: number | null;
  vehiclePlate: string | null;
  personDocumentId: number | null;
  personId: number | null;
  alertType: AlertType | string | null;
  message: string | null;
  documentExpiryDate: string | null;
  daysRemaining: number | null;
  isRead: boolean;
  generatedAt: string;
  readAt: string | null;
  classification?: AlertClassification;
  readState?: AlertReadState;
}

export interface AlertListMeta {
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface AlertListResponse {
  items: DocumentAlertRecord[];
  meta: AlertListMeta;
}

export interface AlertQueryParams {
  daysAhead?: number;
  personId?: number;
  vehiclePlate?: string;
  isRead?: boolean;
  alertType?: AlertType;
  page?: number;
  limit?: number;
  q?: string;
}

export interface DocumentTypeRecord {
  id: number;
  name: string;
}

export interface PersonDocumentPersonRecord {
  id: number;
  personType: string;
  firstName: string;
  firstLastname: string;
  email: string | null;
}

export interface PersonDocumentLinkRecord {
  id: number;
  documentRole: string | null;
  person: PersonDocumentPersonRecord;
}

export interface PersonDocumentRecord {
  id: number;
  documentNumber: string;
  description: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: string | null;
  createdAt: string;
  documentType: DocumentTypeRecord;
  personDocumentLinks: PersonDocumentLinkRecord[];
}

export interface DocumentVehicleRecord {
  id: number;
  documentType: string;
  documentNumber: string;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: string | null;
  createdAt: string;
}

export interface GenerateExpiryAlertsResponse {
  created: number;
  daysAhead: number;
  updated?: number;
  removed?: number;
}

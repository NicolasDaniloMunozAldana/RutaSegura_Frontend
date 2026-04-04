export interface GuardianRecord {
  id: number;
  documentId?: number;
  firstName: string;
  middleName: string | null;
  firstLastname: string;
  secondLastname: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  createdAt?: string;
  document?: {
    id: number;
    documentType: string;
    documentNumber: string;
    description: string | null;
    status: string | null;
  } | null;
}

export interface GuardianPayload {
  firstName: string;
  middleName?: string;
  firstLastname: string;
  secondLastname?: string;
  phone?: string;
  email: string;
  document: {
    documentType: string;
    documentNumber: string;
    description?: string;
  };
  status?: string;
}

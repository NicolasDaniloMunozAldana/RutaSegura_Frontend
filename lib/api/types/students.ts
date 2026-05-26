export interface StudentAddress {
  id: number;
  address: {
    id: number;
    address: string;
    latitude: number;
    longitude: number;
    status: string;
    zone?: {
      id: number;
      name: string;
    } | null;
  };
}

export interface StudentDocumentTypeRecord {
  id: number;
  name: string;
}

export interface StudentDocumentLink {
  id: number;
  documentRole: string;
  personDocument: {
    id: number;
    documentType: string | StudentDocumentTypeRecord;
    documentNumber: string;
    status: string;
  };
}

export interface StudentRecord {
  id: number;
  guardianId: number;
  firstName: string;
  middleName: string | null;
  firstLastname: string;
  secondLastname: string | null;
  phone: string | null;
  email: string;
  status: string;
  createdAt: string;
  guardian: {
    id: number;
    firstName: string;
    firstLastname: string;
    email: string;
    phone: string | null;
  } | null;
  personAddresses: StudentAddress[];
  personDocumentLinks: StudentDocumentLink[];
}

export interface StudentPayload {
  guardianId: number;
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
    createPersonDocumentLink?: boolean;
    documentRole?: string;
  };
  addresses: Array<{
    address: string;
    latitude: number;
    longitude: number;
  }>;
  status?: string;
}

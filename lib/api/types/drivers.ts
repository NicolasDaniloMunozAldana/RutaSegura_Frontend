export interface DriverDocumentTypeRecord {
  id: number;
  name: string;
}

export interface DriverDocumentLink {
  id: number;
  documentRole: string;
  personDocument: {
    id: number;
    documentType: string | DriverDocumentTypeRecord;
    documentNumber: string;
    description: string | null;
    status: string | null;
  };
}

export interface DriverUserRecord {
  id: number;
  email: string;
  status: string | null;
  role: {
    id: number;
    name: string;
  };
}

export interface DriverRecord {
  id: number;
  personType: string;
  firstName: string;
  middleName: string | null;
  firstLastname: string;
  secondLastname: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  createdAt: string;
  users: DriverUserRecord[];
  personDocumentLinks: DriverDocumentLink[];
}

export interface DriverPayload {
  firstName: string;
  middleName?: string;
  firstLastname: string;
  secondLastname?: string;
  phone?: string;
  email?: string;
  document: {
    documentType: string;
    documentNumber: string;
    description?: string;
    documentRole?: string;
  };
  status?: string;
}

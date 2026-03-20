const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RequestOptions extends RequestInit {
  token?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthUser {
  id: number;
  email: string;
  personId: number;
  fullName: string;
  role: string;
  status: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  expiresInSeconds: number;
  user: AuthUser;
}

interface ProfileResponse {
  id: number;
  email: string;
  status: string;
  role: {
    id: number;
    name: string;
  };
  person: {
    id: number;
    firstName: string;
    middleName: string | null;
    firstLastname: string;
    secondLastname: string | null;
    phone: string | null;
  };
}

export interface StudentAddress {
  id: number;
  address: {
    id: number;
    address: string;
    latitude: number;
    longitude: number;
    status: string;
  };
}

export interface StudentDocumentLink {
  id: number;
  documentRole: string;
  personDocument: {
    id: number;
    documentType: string;
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

export async function apiCall(
  endpoint: string,
  options: RequestOptions = {}
) {
  const { token, ...restOptions } = options;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export const authAPI = {
  login: (email: string, password: string) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }) as Promise<LoginResponse>,

  profile: (token: string) =>
    apiCall("/auth/profile", {
      token,
    }) as Promise<ProfileResponse>,
};

export const studentsAPI = {
  findAll: (token: string) =>
    apiCall("/students", {
      token,
    }) as Promise<ApiEnvelope<StudentRecord[]>>,

  findOne: (id: number, token: string) =>
    apiCall(`/students/${id}`, {
      token,
    }) as Promise<ApiEnvelope<StudentRecord>>,

  create: (payload: StudentPayload, token: string) =>
    apiCall("/students", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<StudentRecord>>,

  update: (id: number, payload: Partial<StudentPayload>, token: string) =>
    apiCall(`/students/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }) as Promise<ApiEnvelope<StudentRecord>>,

  inactivate: (id: number, token: string) =>
    apiCall(`/students/${id}`, {
      method: "DELETE",
      token,
    }) as Promise<ApiEnvelope<StudentRecord>>,
};


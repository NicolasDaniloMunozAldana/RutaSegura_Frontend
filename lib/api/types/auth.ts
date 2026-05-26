export interface AuthUser {
  id: number;
  email: string;
  personId: number;
  fullName: string;
  role: string;
  status: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export interface ProfileResponse {
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

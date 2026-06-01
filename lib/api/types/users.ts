export interface UserRole {
  id: number;
  name: string;
}

export interface UserPerson {
  id: number;
  personType: string;
  firstName: string;
  middleName: string | null;
  firstLastname: string;
  secondLastname: string | null;
  email: string | null;
  status: string | null;
}

export interface UserRecord {
  id: number;
  email: string;
  status: string | null;
  pickupEnabled: boolean;
  createdAt: string;
  role: UserRole;
  person: UserPerson;
}

export interface AvailableGuardian {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastname: string;
  secondLastname: string | null;
  email: string | null;
}

export interface UserPayload {
  email: string;
  password: string;
  // Para conductor/coordinador/admin.
  personId?: number;
  // Para el rol acudiente.
  guardianId?: number;
  roleId: number;
  pickupEnabled?: boolean;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  personId?: number;
  roleId?: number;
  pickupEnabled?: boolean;
  status?: string;
}

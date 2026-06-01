import type { RouteRecord, RouteStopRecord } from "./routes";

// Una ruta a la que está asignado un hijo del acudiente.
export interface GuardianChildRoute {
  assignmentId: number;
  assignmentStatus: string | null;
  stop: RouteStopRecord | null;
  route: RouteRecord;
}

// Un hijo del acudiente con sus rutas activas.
export interface GuardianChild {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastname: string;
  secondLastname: string | null;
  status: string | null;
  routes: GuardianChildRoute[];
}

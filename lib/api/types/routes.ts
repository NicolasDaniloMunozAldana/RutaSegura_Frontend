export type RouteType = "PICKUP" | "DROPOFF";

export interface RouteZoneRef {
  id: number;
  name: string;
}

export interface RouteDestinationRef {
  id: number;
  name: string;
  address: {
    id: number;
    address: string;
    zoneId: number | null;
    latitude: string | number;
    longitude: string | number;
  } | null;
}

export interface RouteVehicleRef {
  plate: string;
  brand: string | null;
  model: string | null;
  status: string | null;
}

export interface RouteDriverRef {
  id: number;
  firstName: string;
  firstLastname: string;
  personType: string;
  status: string | null;
}

export interface RouteStopRecord {
  id: number;
  stopOrder: number;
  description: string | null;
  latitude: string | number;
  longitude: string | number;
  estimatedTime: string;
}

export interface RouteGeometry {
  type: string;
  coordinates: number[][];
}

export interface RouteRecord {
  id: number;
  name: string;
  routeType: RouteType | string;
  routeGeometry: RouteGeometry | null;
  routeDistance: number | null;
  routeDuration: number | null;
  routeCalculatedAt: string | null;
  zoneId: number | null;
  originDescription: string | null;
  destinationId: number | null;
  startTime: string;
  endTime: string | null;
  status: string | null;
  vehiclePlate: string | null;
  driverPersonId: number | null;
  createdAt: string;
  zone: RouteZoneRef | null;
  destination: RouteDestinationRef | null;
  vehicle: RouteVehicleRef | null;
  driver: RouteDriverRef | null;
  stops: RouteStopRecord[];
}

export interface RoutePayload {
  name: string;
  routeType: RouteType;
  zoneId: number;
  destinationId: number;
  startTime: string;
  vehiclePlate: string;
  driverPersonId: number;
}

export interface UpdateRoutePayload {
  name?: string;
  routeType?: RouteType;
  zoneId?: number;
  destinationId?: number;
  startTime?: string;
  vehiclePlate?: string;
  driverPersonId?: number;
  status?: string;
}

export interface RouteZoneOption {
  id: number;
  name: string;
  status: string | null;
}

export interface RouteDestinationOption {
  id: number;
  name: string;
}

export interface RouteVehicleOption {
  plate: string;
  brand: string | null;
  model: string | null;
  passengerCapacity: number;
}

export interface RouteDriverOption {
  id: number;
  firstName: string;
  firstLastname: string;
}

export interface RouteFormOptions {
  zones: RouteZoneOption[];
  destinations: RouteDestinationOption[];
  vehicles: RouteVehicleOption[];
  drivers: RouteDriverOption[];
}

export interface RouteQueryParams {
  q?: string;
  status?: string;
  zoneId?: number;
}

export interface RouteAssignmentPersonRef {
  id: number;
  firstName: string;
  firstLastname: string;
  personType: string;
  status: string | null;
}

export interface RouteAssignmentStopRef {
  id: number;
  stopOrder: number;
  description: string | null;
  latitude: string | number;
  longitude: string | number;
  estimatedTime: string;
}

export interface RouteAssignmentAddressRef {
  id: number;
  addressType: string | null;
  validDays: string | null;
  address: {
    id: number;
    address: string;
    zoneId: number | null;
  } | null;
}

export interface RouteAssignmentRecord {
  id: number;
  personId: number;
  routeId: number;
  stopId: number | null;
  personAddressId: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  createdAt: string;
  person: RouteAssignmentPersonRef | null;
  stop: RouteAssignmentStopRef | null;
  personAddress: RouteAssignmentAddressRef | null;
}

export interface CreateRouteAssignmentPayload {
  personId: number;
  personAddressId: number;
}

export interface UpdateRouteAssignmentPayload {
  status?: string;
}

export interface RouteGeoJson {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  } | null;
  properties: {
    distance: number | null;
    duration: number | null;
  };
}

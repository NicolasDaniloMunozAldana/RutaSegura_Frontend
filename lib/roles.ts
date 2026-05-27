// Roles del sistema. El backend compara en minúsculas y acepta tanto el
// nombre en inglés como en español, por eso incluimos ambas variantes.
export const MANAGER_ROLES = ["admin", "coordinator", "coordinador"];
export const DRIVER_ROLES = ["driver", "conductor"];
export const GUARDIAN_ROLES = ["guardian", "acudiente"];

export function normalizeRole(role?: string | null): string {
  return role?.trim().toLowerCase() ?? "";
}

export function isManager(role?: string | null): boolean {
  return MANAGER_ROLES.includes(normalizeRole(role));
}

export function isDriver(role?: string | null): boolean {
  return DRIVER_ROLES.includes(normalizeRole(role));
}

export function isGuardian(role?: string | null): boolean {
  return GUARDIAN_ROLES.includes(normalizeRole(role));
}

// Página de inicio según el rol tras iniciar sesión.
export function homeRouteForRole(role?: string | null): string {
  if (isDriver(role)) return "/dashboard/mis-rutas";
  if (isGuardian(role)) return "/dashboard/rutas-hijo";
  return "/dashboard/estudiantes";
}

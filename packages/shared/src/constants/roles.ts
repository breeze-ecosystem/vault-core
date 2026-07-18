export const ROLES = {
  GLOBAL_ADMIN: "GLOBAL_ADMIN",
  SITE_ADMIN: "SITE_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  OPERATOR: "OPERATOR",
  VIEWER: "VIEWER",
  AUDITOR: "AUDITOR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Hierarchy: key can access everything that values can access.
 * GLOBAL_ADMIN > SUPER_ADMIN > SITE_ADMIN > ADMIN > SUPERVISOR > OPERATOR > AUDITOR > VIEWER
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  GLOBAL_ADMIN: 100,
  SUPER_ADMIN: 90,
  SITE_ADMIN: 75,
  ADMIN: 60,
  SUPERVISOR: 45,
  OPERATOR: 30,
  AUDITOR: 25,
  VIEWER: 20,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export const ROLES = {
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
 * SUPER_ADMIN > ADMIN > SUPERVISOR > OPERATOR > VIEWER
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SUPERVISOR: 60,
  OPERATOR: 40,
  AUDITOR: 25,
  VIEWER: 20,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

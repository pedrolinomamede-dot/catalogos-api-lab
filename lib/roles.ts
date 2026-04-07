import type { UserRole } from "@prisma/client";

export function isSuperAdminRole(role?: UserRole | null) {
  return role === "SUPER_ADMIN";
}

export function isTenantAdminRole(role?: UserRole | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

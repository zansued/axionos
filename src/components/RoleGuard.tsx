// RoleGuard — conditionally renders children based on user's derived role surface.
// Supports both legacy 3-tier surface names and new canonical role names.

import { ReactNode } from "react";
import { useRoleBasedExperience, RoleSurface } from "@/hooks/useRoleBasedExperience";

interface RoleGuardProps {
  /** Minimum role required to see this content */
  minRole?: RoleSurface | string;
  /** Specific roles allowed */
  allowedRoles?: Array<RoleSurface | string>;
  children: ReactNode;
  /** Optional fallback when role not allowed */
  fallback?: ReactNode;
}

// Unified hierarchy: legacy 3-tier + canonical 5-tier
const ROLE_HIERARCHY: Record<string, number> = {
  // Legacy
  default_user:      0,
  operator:          1,
  admin:             2,
  // Canonical
  end_user:          0,
  platform_reviewer: 1,
  tenant_owner:      2,
  platform_admin:    3,
};

export function RoleGuard({ minRole, allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { roleSurface, canonicalRole } = useRoleBasedExperience();

  // Use canonical role if the guard was configured with canonical names, else legacy surface
  const effectiveRole: string = allowedRoles?.some(r => r in ROLE_HIERARCHY && !["default_user","operator","admin"].includes(r))
    ? canonicalRole
    : roleSurface;

  if (allowedRoles) {
    if (!allowedRoles.includes(effectiveRole)) return <>{fallback}</>;
    return <>{children}</>;
  }

  if (minRole) {
    const myLevel  = ROLE_HIERARCHY[effectiveRole] ?? 0;
    const minLevel = ROLE_HIERARCHY[minRole as string] ?? 0;
    if (myLevel < minLevel) return <>{fallback}</>;
    return <>{children}</>;
  }

  return <>{children}</>;
}

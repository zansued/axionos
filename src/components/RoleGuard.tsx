// RoleGuard — conditionally renders children based on user's derived role surface.

import { ReactNode } from "react";
import { useRoleBasedExperience, RoleSurface } from "@/hooks/useRoleBasedExperience";

interface RoleGuardProps {
  /** Minimum role required to see this content */
  minRole?: RoleSurface;
  /** Specific roles allowed */
  allowedRoles?: RoleSurface[];
  children: ReactNode;
  /** Optional fallback when role not allowed */
  fallback?: ReactNode;
}

const ROLE_HIERARCHY: Record<RoleSurface, number> = {
  default_user: 0,
  operator: 1,
  admin: 2,
};

export function RoleGuard({ minRole, allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { roleSurface } = useRoleBasedExperience();

  if (allowedRoles) {
    if (!allowedRoles.includes(roleSurface)) return <>{fallback}</>;
    return <>{children}</>;
  }

  if (minRole) {
    if (ROLE_HIERARCHY[roleSurface] < ROLE_HIERARCHY[minRole]) return <>{fallback}</>;
    return <>{children}</>;
  }

  return <>{children}</>;
}

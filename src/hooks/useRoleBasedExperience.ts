// Hook: useRoleBasedExperience
// Derives canonical role from org membership and exposes role-aware navigation/permissions.
// Maintains backward-compatible `roleSurface` for existing RoleGuard usage.

import { useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";
import {
  CanonicalRole,
  deriveCanonicalRole,
  canAccessRoute as _canAccessRoute,
  getNavGroups,
  NavGroups,
} from "@/lib/permissions";

/** Legacy 3-tier surface for backward-compat with RoleGuard */
export type RoleSurface = "default_user" | "operator" | "admin";

function canonicalToLegacySurface(role: CanonicalRole): RoleSurface {
  switch (role) {
    case "platform_admin":    return "admin";
    case "end_user":          return "default_user";
    default:                  return "operator"; // operator, tenant_owner, platform_reviewer
  }
}

// Legacy sidebar visibility sets (kept for backward compat)
const DEFAULT_USER_SIDEBAR = new Set([
  "Dashboard", "Journey", "Onboarding", "Initiatives", "Stories", "Kanban", "Workspace", "Deployments",
]);

const OPERATOR_SIDEBAR = new Set([
  ...DEFAULT_USER_SIDEBAR,
  "Agents", "Code", "Audit", "Observability", "Connections", "Adoption", "Promotion",
]);

const OPERATOR_OBS_TABS = new Set([
  "performance", "costs", "quality", "repair", "patterns", "prevention",
  "predictive", "live", "cross-stage", "exec-policy",
]);

export function useRoleBasedExperience() {
  const { userRole } = useOrg();

  const canonicalRole = useMemo(() => deriveCanonicalRole(userRole), [userRole]);
  const roleSurface   = useMemo(() => canonicalToLegacySurface(canonicalRole), [canonicalRole]);
  const navGroups     = useMemo((): NavGroups => getNavGroups(canonicalRole), [canonicalRole]);

  /** Legacy sidebar visibility (used by older pages that check isSidebarItemVisible) */
  const isSidebarItemVisible = useMemo(() => {
    return (title: string) => {
      if (roleSurface === "admin") return true;
      if (roleSurface === "operator") return OPERATOR_SIDEBAR.has(title);
      return DEFAULT_USER_SIDEBAR.has(title);
    };
  }, [roleSurface]);

  const isObsTabVisible = useMemo(() => {
    return (tabValue: string) => {
      if (roleSurface === "admin") return true;
      if (roleSurface === "operator") return OPERATOR_OBS_TABS.has(tabValue);
      return false;
    };
  }, [roleSurface]);

  const canAccessRoute = useMemo(() => {
    return (path: string) => _canAccessRoute(canonicalRole, path);
  }, [canonicalRole]);

  return {
    // New canonical API
    canonicalRole,
    navGroups,
    canAccessRoute,
    // Backward-compat legacy API
    roleSurface,
    orgRole: userRole,
    isSidebarItemVisible,
    isObsTabVisible,
    isAdmin:       roleSurface === "admin",
    isOperator:    roleSurface === "operator",
    isDefaultUser: roleSurface === "default_user",
  };
}

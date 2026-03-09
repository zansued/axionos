// Hook: useRoleBasedExperience
// Derives user role from org membership and provides role-aware navigation/permissions.

import { useMemo } from "react";
import { useOrg } from "@/contexts/OrgContext";

export type RoleSurface = "default_user" | "operator" | "admin";

/** Maps org membership role to product surface role */
function deriveRole(orgRole: string | null): RoleSurface {
  if (!orgRole) return "default_user";
  switch (orgRole) {
    case "owner":
    case "admin":
      return "admin";
    case "editor":
      return "operator";
    case "reviewer":
    case "viewer":
    default:
      return "default_user";
  }
}

// Sidebar items visible per role
const DEFAULT_USER_SIDEBAR = new Set([
  "Dashboard", "Journey", "Onboarding", "Initiatives", "Stories", "Kanban", "Workspace", "Deployments",
]);

const OPERATOR_SIDEBAR = new Set([
  ...DEFAULT_USER_SIDEBAR,
  "Agents", "Code", "Audit", "Observability", "Connections", "Adoption", "Promotion",
]);

// Admin sees everything

// Observability tabs visible per role
const OPERATOR_OBS_TABS = new Set([
  "performance", "costs", "quality", "repair", "patterns", "prevention",
  "predictive", "live", "cross-stage", "exec-policy",
]);

export function useRoleBasedExperience() {
  const { userRole } = useOrg();

  const roleSurface = useMemo(() => deriveRole(userRole), [userRole]);

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
      return false; // default users shouldn't reach observability
    };
  }, [roleSurface]);

  return {
    roleSurface,
    orgRole: userRole,
    isSidebarItemVisible,
    isObsTabVisible,
    isAdmin: roleSurface === "admin",
    isOperator: roleSurface === "operator",
    isDefaultUser: roleSurface === "default_user",
  };
}

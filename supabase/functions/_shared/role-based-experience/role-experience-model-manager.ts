// Role Experience Model Manager
// Manages role definitions and default experience models for AxionOS surfaces.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type RoleName = "default_user" | "operator" | "admin";

export interface RoleExperienceModel {
  role_name: RoleName;
  default_surface_type: string;
  navigation_profile_name: string;
  visibility_rules: Record<string, unknown>;
  complexity_threshold: number;
  description: string;
}

/** Canonical role definitions — deterministic, no AI */
export const CANONICAL_ROLES: Record<RoleName, RoleExperienceModel> = {
  default_user: {
    role_name: "default_user",
    default_surface_type: "journey",
    navigation_profile_name: "journey_first",
    visibility_rules: { show_observability: false, show_meta: false, show_calibration: false, show_admin: false },
    complexity_threshold: 0.3,
    description: "Primary product user — sees the guided journey from idea to deployed software.",
  },
  operator: {
    role_name: "operator",
    default_surface_type: "operator",
    navigation_profile_name: "operator_surface",
    visibility_rules: { show_observability: true, show_meta: false, show_calibration: false, show_admin: false },
    complexity_threshold: 0.6,
    description: "Operator / lead — sees observability, governance, risk, and advanced execution context.",
  },
  admin: {
    role_name: "admin",
    default_surface_type: "admin",
    navigation_profile_name: "full_surface",
    visibility_rules: { show_observability: true, show_meta: true, show_calibration: true, show_admin: true },
    complexity_threshold: 1.0,
    description: "Admin / system — sees all internal surfaces, registries, diagnostics, and configuration.",
  },
};

/** Map org_role enum to surface role */
export function deriveRoleFromOrgRole(orgRole: string | null): RoleName {
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

/** Fetch or default role model */
export async function getRoleModel(
  client: SupabaseClient,
  orgId: string,
  roleName: RoleName,
): Promise<RoleExperienceModel> {
  const { data } = await client
    .from("role_experience_models")
    .select("*")
    .eq("organization_id", orgId)
    .eq("role_name", roleName)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (data) {
    return {
      role_name: data.role_name as RoleName,
      default_surface_type: data.default_surface_type,
      navigation_profile_name: data.navigation_profile_name,
      visibility_rules: (data.visibility_rules as Record<string, unknown>) ?? {},
      complexity_threshold: Number(data.complexity_threshold ?? 0.5),
      description: data.description ?? "",
    };
  }
  return CANONICAL_ROLES[roleName] ?? CANONICAL_ROLES.default_user;
}

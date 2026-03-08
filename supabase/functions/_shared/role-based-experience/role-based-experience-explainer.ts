// Role-Based Experience Explainer
// Returns structured explanations for navigation, permissions, visibility, and quality.

import { RoleName, CANONICAL_ROLES } from "./role-experience-model-manager.ts";
import { getNavigationForRole, getObservabilityTabsForRole } from "./role-navigation-orchestrator.ts";
import { getPermissionsForRole } from "./role-surface-permission-engine.ts";
import { getInformationLayers } from "./role-information-layer-manager.ts";
import { computeQualityMetrics } from "./role-experience-quality-analyzer.ts";

export interface RoleExplanation {
  role_name: RoleName;
  description: string;
  navigation_summary: { main_count: number; bottom_count: number; surfaces: string[] };
  observability_access: string;
  permissions_summary: string[];
  information_visibility: { visible: number; summarized: number; hidden: number };
  quality_metrics: Record<string, number>;
  rationale: string;
}

export function explainRole(roleName: RoleName): RoleExplanation {
  const model = CANONICAL_ROLES[roleName];
  const nav = getNavigationForRole(roleName);
  const obsTabs = getObservabilityTabsForRole(roleName);
  const perms = getPermissionsForRole(roleName);
  const infoLayers = getInformationLayers(roleName);

  const allSurfaces = [...nav.main, ...nav.bottom].map(i => i.key);
  const metrics = computeQualityMetrics(roleName, allSurfaces);

  const visible = infoLayers.filter(l => l.visibility_mode === "visible").length;
  const summarized = infoLayers.filter(l => l.visibility_mode === "summarized").length;
  const hidden = infoLayers.filter(l => l.visibility_mode === "hidden").length;

  const obsAccess = obsTabs === "all"
    ? "Full access to all observability tabs"
    : obsTabs.size > 0
      ? `Access to ${obsTabs.size} operational tabs`
      : "No observability access (redirected to Journey)";

  return {
    role_name: roleName,
    description: model.description,
    navigation_summary: {
      main_count: nav.main.length,
      bottom_count: nav.bottom.length,
      surfaces: allSurfaces,
    },
    observability_access: obsAccess,
    permissions_summary: Object.keys(perms),
    information_visibility: { visible, summarized, hidden },
    quality_metrics: metrics as unknown as Record<string, number>,
    rationale: `Role "${roleName}" is configured with complexity_threshold=${model.complexity_threshold}. ` +
      `Navigation exposes ${allSurfaces.length} items. ` +
      `${hidden} information classes are hidden to reduce complexity leakage.`,
  };
}

export function explainAllRoles(): RoleExplanation[] {
  return (["default_user", "operator", "admin"] as RoleName[]).map(explainRole);
}

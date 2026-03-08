// Role Surface Permission Engine
// Determines what actions and views each role can access.

import { RoleName } from "./role-experience-model-manager.ts";

export interface SurfacePermission {
  surface_key: string;
  can_view: boolean;
  can_act: boolean;
  can_approve: boolean;
  can_configure: boolean;
}

const PERMISSION_MATRIX: Record<RoleName, Record<string, SurfacePermission>> = {
  default_user: {
    journey: { surface_key: "journey", can_view: true, can_act: true, can_approve: true, can_configure: false },
    initiatives: { surface_key: "initiatives", can_view: true, can_act: true, can_approve: true, can_configure: false },
    stories: { surface_key: "stories", can_view: true, can_act: false, can_approve: false, can_configure: false },
    kanban: { surface_key: "kanban", can_view: true, can_act: false, can_approve: false, can_configure: false },
    deployments: { surface_key: "deployments", can_view: true, can_act: false, can_approve: false, can_configure: false },
  },
  operator: {
    journey: { surface_key: "journey", can_view: true, can_act: true, can_approve: true, can_configure: false },
    initiatives: { surface_key: "initiatives", can_view: true, can_act: true, can_approve: true, can_configure: false },
    observability: { surface_key: "observability", can_view: true, can_act: false, can_approve: false, can_configure: false },
    audit: { surface_key: "audit", can_view: true, can_act: false, can_approve: false, can_configure: false },
    agents: { surface_key: "agents", can_view: true, can_act: true, can_approve: false, can_configure: false },
    connections: { surface_key: "connections", can_view: true, can_act: true, can_approve: false, can_configure: false },
  },
  admin: {
    all: { surface_key: "all", can_view: true, can_act: true, can_approve: true, can_configure: true },
  },
};

export function getPermissionsForRole(roleName: RoleName): Record<string, SurfacePermission> {
  return PERMISSION_MATRIX[roleName] ?? PERMISSION_MATRIX.default_user;
}

export function canAccessSurface(roleName: RoleName, surfaceKey: string): boolean {
  const perms = PERMISSION_MATRIX[roleName];
  if (!perms) return false;
  if (perms.all) return true;
  return !!perms[surfaceKey]?.can_view;
}

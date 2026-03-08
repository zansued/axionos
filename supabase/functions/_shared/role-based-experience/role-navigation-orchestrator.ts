// Role Navigation Orchestrator
// Builds role-aware navigation and primary surfaces.

import { RoleName } from "./role-experience-model-manager.ts";

export interface NavItem {
  key: string;
  label: string;
  url: string;
  icon: string;
  section: "main" | "bottom";
}

const ALL_MAIN_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", url: "/", icon: "LayoutDashboard", section: "main" },
  { key: "journey", label: "Journey", url: "/journey", icon: "Map", section: "main" },
  { key: "initiatives", label: "Initiatives", url: "/initiatives", icon: "Lightbulb", section: "main" },
  { key: "agents", label: "Agents", url: "/agents", icon: "Users", section: "main" },
  { key: "stories", label: "Stories", url: "/stories", icon: "Hammer", section: "main" },
  { key: "code", label: "Code", url: "/code", icon: "Code2", section: "main" },
  { key: "workspace", label: "Workspace", url: "/workspace", icon: "GitBranch", section: "main" },
  { key: "kanban", label: "Kanban", url: "/kanban", icon: "Columns3", section: "main" },
  { key: "deployments", label: "Deployments", url: "/artifacts", icon: "Rocket", section: "main" },
];

const ALL_BOTTOM_ITEMS: NavItem[] = [
  { key: "meta-agents", label: "Meta-Agents", url: "/meta-agents", icon: "Brain", section: "bottom" },
  { key: "meta-artifacts", label: "Meta-Artifacts", url: "/meta-artifacts", icon: "FileText", section: "bottom" },
  { key: "calibration", label: "Calibration", url: "/calibration", icon: "Gauge", section: "bottom" },
  { key: "prompt-opt", label: "Prompt Opt.", url: "/prompt-optimization", icon: "FlaskConical", section: "bottom" },
  { key: "audit", label: "Audit", url: "/audit", icon: "Shield", section: "bottom" },
  { key: "observability", label: "Observability", url: "/observability", icon: "Radio", section: "bottom" },
  { key: "connections", label: "Connections", url: "/connections", icon: "Package", section: "bottom" },
  { key: "billing", label: "Billing", url: "/billing", icon: "CreditCard", section: "bottom" },
  { key: "settings", label: "Settings", url: "/org", icon: "Settings", section: "bottom" },
];

const DEFAULT_USER_KEYS = new Set([
  "dashboard", "journey", "initiatives", "stories", "kanban", "workspace", "deployments",
]);

const OPERATOR_KEYS = new Set([
  ...DEFAULT_USER_KEYS,
  "agents", "code", "audit", "observability", "connections",
]);

// Admin sees everything
const ADMIN_KEYS = new Set([
  ...ALL_MAIN_ITEMS.map(i => i.key),
  ...ALL_BOTTOM_ITEMS.map(i => i.key),
]);

export function getNavigationForRole(roleName: RoleName): { main: NavItem[]; bottom: NavItem[] } {
  const allowedKeys = roleName === "admin" ? ADMIN_KEYS : roleName === "operator" ? OPERATOR_KEYS : DEFAULT_USER_KEYS;
  return {
    main: ALL_MAIN_ITEMS.filter(i => allowedKeys.has(i.key)),
    bottom: ALL_BOTTOM_ITEMS.filter(i => allowedKeys.has(i.key)),
  };
}

/** Observability tab filtering by role */
const OPERATOR_OBS_TABS = new Set([
  "performance", "costs", "quality", "repair", "patterns", "prevention",
  "predictive", "live", "cross-stage", "exec-policy",
]);

export function getObservabilityTabsForRole(roleName: RoleName): Set<string> | "all" {
  if (roleName === "admin") return "all";
  if (roleName === "operator") return OPERATOR_OBS_TABS;
  return new Set(); // default_user shouldn't access observability at all
}

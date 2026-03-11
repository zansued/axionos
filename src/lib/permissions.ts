/**
 * permissions.ts
 * Single source of truth for role-based access control.
 * Canonical AxionOS navigation architecture.
 *
 * Product philosophy: The user journey is Idea → Deploy → Runtime.
 * Everything beyond Runtime is autonomous infrastructure (System Intelligence).
 *
 * Route namespaces:
 *   /builder/* — Builder Mode (product delivery)
 *   /owner/*   — Owner Mode (platform governance)
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, FolderKanban, Bot, GitBranch, Eye, Shield,
  Settings, HeartPulse, LineChart, Search, Brain,
  Fingerprint, Scale, Users, Activity, Cpu,
  Radio, Sparkles, Database, ShieldAlert, ShieldCheck,
} from "lucide-react";

// ─── Canonical role types ──────────────────────────────────────────────────

export type CanonicalRole =
  | "end_user"
  | "operator"
  | "tenant_owner"
  | "platform_reviewer"
  | "platform_admin";

export function deriveCanonicalRole(orgRole: string | null): CanonicalRole {
  switch (orgRole) {
    case "owner":    return "tenant_owner";
    case "admin":    return "platform_admin";
    case "editor":   return "operator";
    case "reviewer": return "platform_reviewer";
    case "viewer":
    default:         return "end_user";
  }
}

// ─── Nav item type ─────────────────────────────────────────────────────────

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

// ─── Builder Mode — User Product Layer ──────────────────────────────────────
// Visible pipeline: Idea → Discovery → Architecture → Engineering → Deploy → Runtime
// + Execution Observability + System Intelligence + Governance + Settings

export const BUILDER_NAV: NavItem[] = [
  { title: "Dashboard",                url: "/builder/dashboard",                icon: LayoutDashboard },
  { title: "Projects",                 url: "/builder/initiatives",              icon: FolderKanban },
  { title: "Agents",                   url: "/builder/agents",                   icon: Bot },
  { title: "Pipelines",               url: "/builder/delivery",                 icon: GitBranch },
  { title: "Runtime",                  url: "/builder/runtime",                  icon: Radio },
  { title: "Execution Observability",  url: "/builder/execution-observability",  icon: Eye },
  { title: "System Intelligence",      url: "/builder/system-intelligence",      icon: Sparkles },
  { title: "Governance",               url: "/builder/governance",               icon: Shield },
  { title: "Settings",                 url: "/builder/settings",                 icon: Settings },
];

export const BUILDER_ROUTES = new Set(BUILDER_NAV.map(i => i.url));

// ─── Owner Mode — Autonomous Infrastructure Layer ───────────────────────────

export const OWNER_SYSTEM_INTELLIGENCE: NavItem[] = [
  { title: "System Health",         url: "/owner/system-health",          icon: HeartPulse },
  { title: "Adoption",              url: "/owner/adoption",               icon: LineChart },
  { title: "Delivery Outcomes",     url: "/owner/delivery-outcomes",      icon: Search },
  { title: "Platform Observability", url: "/owner/platform-observability", icon: Activity },
];

export const OWNER_INSTITUTIONAL_MEMORY: NavItem[] = [
  { title: "Pattern Library",       url: "/owner/pattern-library",        icon: Brain },
  { title: "Canon Intelligence",    url: "/owner/canon-intelligence",     icon: Database },
  { title: "Security War Room",     url: "/owner/security-war-room",      icon: ShieldAlert },
  { title: "Security Intelligence", url: "/owner/security-intelligence",  icon: Shield },
  { title: "Red Team Simulation",   url: "/owner/red-team-simulation",    icon: Shield },
  { title: "Blue Team Defense",     url: "/owner/blue-team-defense",      icon: ShieldCheck },
  { title: "Purple Learning",       url: "/owner/purple-learning",        icon: Sparkles },
  { title: "Capabilities",          url: "/owner/capabilities",           icon: Fingerprint },
];

export const OWNER_GOVERNANCE: NavItem[] = [
  { title: "Autonomy Posture", url: "/owner/autonomy-posture", icon: Scale },
  { title: "Agent Swarm",      url: "/owner/agent-swarm",      icon: Users },
  { title: "Calibration",      url: "/owner/calibration",      icon: Cpu },
  { title: "Settings",         url: "/owner/settings",         icon: Settings },
];

export const OWNER_NAV: NavItem[] = [
  ...OWNER_SYSTEM_INTELLIGENCE,
  ...OWNER_INSTITUTIONAL_MEMORY,
  ...OWNER_GOVERNANCE,
];

const OWNER_ROUTES = new Set(OWNER_NAV.map(i => i.url));

// ─── Nav group builder ─────────────────────────────────────────────────────

export type NavGroups = {
  builder: NavItem[];
  owner:   NavItem[];
};

export function getNavGroups(role: CanonicalRole): NavGroups {
  switch (role) {
    case "end_user":
    case "operator":
      return { builder: BUILDER_NAV, owner: [] };
    case "tenant_owner":
    case "platform_reviewer":
    case "platform_admin":
      return { builder: BUILDER_NAV, owner: OWNER_NAV };
  }
}

// ─── Route access helpers ─────────────────────────────────────────────────

export function canAccessRoute(role: CanonicalRole, path: string): boolean {
  const normalized = path.split("?")[0].split("#")[0];
  // All builder routes accessible to all authenticated users
  if (normalized.startsWith("/builder")) return true;
  // Owner routes require tenant_owner+
  if (normalized.startsWith("/owner")) {
    switch (role) {
      case "tenant_owner":
      case "platform_reviewer":
      case "platform_admin":
        return true;
      default:
        return false;
    }
  }
  // Legacy routes — allow (redirects handle them)
  return true;
}

// ─── UI display helpers ───────────────────────────────────────────────────

export const CANONICAL_ROLE_LABELS: Record<CanonicalRole, string> = {
  end_user:          "Builder",
  operator:          "Operator",
  tenant_owner:      "Owner",
  platform_reviewer: "Reviewer",
  platform_admin:    "Admin",
};

export const CANONICAL_ROLE_BADGE_STYLES: Record<CanonicalRole, string> = {
  end_user:          "bg-primary/20 text-primary border-primary/30",
  operator:          "bg-accent/20 text-accent-foreground border-accent/30",
  tenant_owner:      "bg-secondary/50 text-secondary-foreground border-secondary",
  platform_reviewer: "bg-muted text-muted-foreground border-border",
  platform_admin:    "bg-destructive/20 text-destructive border-destructive/30",
};

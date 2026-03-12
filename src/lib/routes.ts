/**
 * routes.ts — Centralized, typed route registry for AxionOS.
 *
 * Single source of truth for:
 *   - sidebar navigation
 *   - breadcrumbs
 *   - page title & description
 *   - route-to-pageKey mapping (guidance)
 *
 * Every route entry carries enough metadata so that the sidebar,
 * breadcrumbs, Topbar, and PageGuidanceShell can all derive their
 * content from one place.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, FolderKanban, Bot, GitBranch, Radio, Eye,
  Sparkles, Shield, Settings, HeartPulse, LineChart, Search,
  Brain, Fingerprint, Scale, Users, Activity, Cpu, Database,
  ShieldAlert, ShieldCheck, Crosshair,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type AppMode = "builder" | "owner";

export interface RouteEntry {
  /** URL path (must start with /builder/ or /owner/) */
  path: string;
  /** Display title — used in sidebar, Topbar, breadcrumbs */
  title: string;
  /** Short page description — shown in Topbar subtitle */
  description: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Which mode this route belongs to */
  mode: AppMode;
  /** Sidebar nav group label (routes with same group render under same heading) */
  group: string;
  /** Order within sidebar group */
  order: number;
  /** Whether to show in sidebar (detail pages set false) */
  sidebar: boolean;
  /** Guidance pageKey (maps to copilot/mentor content) */
  pageKey?: string;
  /** Breadcrumb parent path (if nested) */
  parentPath?: string;
}

// ─── Builder Routes ────────────────────────────────────────────────────────

export const BUILDER_ROUTES: RouteEntry[] = [
  {
    path: "/builder/dashboard",
    title: "Dashboard",
    description: "Overview & delivery metrics",
    icon: LayoutDashboard,
    mode: "builder",
    group: "Core",
    order: 0,
    sidebar: true,
    pageKey: "dashboard",
  },
  {
    path: "/builder/projects",
    title: "Projects",
    description: "Manage initiatives & ideas",
    icon: FolderKanban,
    mode: "builder",
    group: "Core",
    order: 1,
    sidebar: true,
    pageKey: "initiatives",
  },
  {
    path: "/builder/agents",
    title: "Agents",
    description: "AI agent management",
    icon: Bot,
    mode: "builder",
    group: "Core",
    order: 2,
    sidebar: true,
    pageKey: "agents",
  },
  {
    path: "/builder/pipelines",
    title: "Pipelines",
    description: "Delivery pipeline orchestration",
    icon: GitBranch,
    mode: "builder",
    group: "Core",
    order: 3,
    sidebar: true,
    pageKey: "deployments",
  },
  {
    path: "/builder/runtime",
    title: "Runtime",
    description: "Live runtime monitoring",
    icon: Radio,
    mode: "builder",
    group: "Core",
    order: 4,
    sidebar: true,
    pageKey: "runtime",
  },
  {
    path: "/builder/execution-observability",
    title: "Execution Observability",
    description: "Pipeline telemetry & performance",
    icon: Eye,
    mode: "builder",
    group: "Intelligence",
    order: 5,
    sidebar: true,
    pageKey: "observability",
  },
  {
    path: "/builder/settings",
    title: "Settings",
    description: "Builder workspace settings",
    icon: Settings,
    mode: "builder",
    group: "System",
    order: 6,
    sidebar: true,
  },
];

// ─── Owner Routes ──────────────────────────────────────────────────────────

export const OWNER_ROUTES: RouteEntry[] = [
  // System Intelligence
  {
    path: "/owner/system-intelligence",
    title: "System Intelligence",
    description: "AI-powered system insights",
    icon: Sparkles,
    mode: "owner",
    group: "System Intelligence",
    order: -1,
    sidebar: true,
    pageKey: "system-intelligence",
  },
  {
    path: "/owner/system-health",
    title: "System Health",
    description: "Platform health & uptime",
    icon: HeartPulse,
    mode: "owner",
    group: "System Intelligence",
    order: 0,
    sidebar: true,
    pageKey: "observability",
  },
  {
    path: "/owner/adoption",
    title: "Adoption",
    description: "Usage analytics & friction",
    icon: LineChart,
    mode: "owner",
    group: "System Intelligence",
    order: 1,
    sidebar: true,
    pageKey: "adoption",
  },
  {
    path: "/owner/delivery-outcomes",
    title: "Delivery Outcomes",
    description: "Outcome measurement & tracking",
    icon: Search,
    mode: "owner",
    group: "System Intelligence",
    order: 2,
    sidebar: true,
    pageKey: "delivery-outcomes",
  },
  {
    path: "/owner/platform-observability",
    title: "Platform Observability",
    description: "Infrastructure telemetry",
    icon: Activity,
    mode: "owner",
    group: "System Intelligence",
    order: 3,
    sidebar: true,
    pageKey: "observability",
  },
  // Institutional Memory
  {
    path: "/owner/pattern-library",
    title: "Pattern Library",
    description: "Reusable architecture patterns",
    icon: Brain,
    mode: "owner",
    group: "Institutional Memory",
    order: 4,
    sidebar: true,
    pageKey: "pattern-library",
  },
  {
    path: "/owner/canon-intelligence",
    title: "Canon Intelligence",
    description: "Knowledge base & canon",
    icon: Database,
    mode: "owner",
    group: "Institutional Memory",
    order: 5,
    sidebar: true,
    pageKey: "canon-intelligence",
  },
  {
    path: "/owner/knowledge-health",
    title: "Knowledge Health",
    description: "Renewal, revalidation & confidence recovery",
    icon: HeartPulse,
    mode: "owner",
    group: "Institutional Memory",
    order: 5.5,
    sidebar: true,
    pageKey: "knowledge-health",
  },
  {
    path: "/owner/security-war-room",
    title: "Security War Room",
    description: "Active security operations",
    icon: ShieldAlert,
    mode: "owner",
    group: "Institutional Memory",
    order: 6,
    sidebar: true,
    pageKey: "security-war-room",
  },
  {
    path: "/owner/security-intelligence",
    title: "Security Intelligence",
    description: "Threat analysis & detection",
    icon: Shield,
    mode: "owner",
    group: "Institutional Memory",
    order: 7,
    sidebar: true,
    pageKey: "security-intelligence",
  },
  {
    path: "/owner/red-team-simulation",
    title: "Red Team Simulation",
    description: "Attack simulation exercises",
    icon: Shield,
    mode: "owner",
    group: "Institutional Memory",
    order: 8,
    sidebar: true,
  },
  {
    path: "/owner/blue-team-defense",
    title: "Blue Team Defense",
    description: "Defensive operations",
    icon: ShieldCheck,
    mode: "owner",
    group: "Institutional Memory",
    order: 9,
    sidebar: true,
  },
  {
    path: "/owner/purple-learning",
    title: "Purple Learning",
    description: "Combined red/blue learning",
    icon: Sparkles,
    mode: "owner",
    group: "Institutional Memory",
    order: 10,
    sidebar: true,
  },
  {
    path: "/owner/capabilities",
    title: "Capabilities",
    description: "Capability registry & trust",
    icon: Fingerprint,
    mode: "owner",
    group: "Institutional Memory",
    order: 11,
    sidebar: true,
  },
  // Governance
  {
    path: "/owner/delivery-governance",
    title: "Delivery Governance",
    description: "Pipeline governance & approvals",
    icon: Shield,
    mode: "owner",
    group: "Governance",
    order: 11.5,
    sidebar: true,
    pageKey: "governance",
  },
  {
    path: "/owner/autonomy-posture",
    title: "Autonomy Posture",
    description: "Autonomy governance controls",
    icon: Scale,
    mode: "owner",
    group: "Governance",
    order: 12,
    sidebar: true,
    pageKey: "autonomy-posture",
  },
  {
    path: "/owner/agent-swarm",
    title: "Agent Swarm",
    description: "Multi-agent coordination",
    icon: Users,
    mode: "owner",
    group: "Governance",
    order: 13,
    sidebar: true,
  },
  {
    path: "/owner/calibration",
    title: "Calibration",
    description: "System calibration & tuning",
    icon: Cpu,
    mode: "owner",
    group: "Governance",
    order: 14,
    sidebar: true,
  },
  {
    path: "/owner/governance-application-tracking",
    title: "Change Application Tracking",
    description: "Downstream application lifecycle for governance-approved changes",
    icon: Crosshair,
    mode: "owner",
    group: "Governance",
    order: 15,
    sidebar: true,
    pageKey: "governance-application-tracking",
  },
  {
    path: "/owner/settings",
    title: "Settings",
    description: "Platform settings",
    icon: Settings,
    mode: "owner",
    group: "Governance",
    order: 16,
    sidebar: true,
  },
];

// ─── Merged registry ───────────────────────────────────────────────────────

export const ALL_ROUTES: RouteEntry[] = [...BUILDER_ROUTES, ...OWNER_ROUTES];

// ─── Lookup helpers ────────────────────────────────────────────────────────

const routeMap = new Map<string, RouteEntry>();
ALL_ROUTES.forEach((r) => routeMap.set(r.path, r));

/** Exact match or parent match for detail pages like /builder/projects/:id */
export function getRouteEntry(pathname: string): RouteEntry | undefined {
  // Exact match
  if (routeMap.has(pathname)) return routeMap.get(pathname);

  // Try stripping last segment for detail pages
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const parentPath = "/" + segments.slice(0, -1).join("/");
    if (routeMap.has(parentPath)) return routeMap.get(parentPath);
  }
  return undefined;
}

/** Get sidebar nav items for a mode */
export function getSidebarRoutes(mode: AppMode): RouteEntry[] {
  return ALL_ROUTES.filter((r) => r.mode === mode && r.sidebar).sort(
    (a, b) => a.order - b.order
  );
}

/** Get grouped sidebar items */
export function getGroupedSidebarRoutes(
  mode: AppMode
): { group: string; items: RouteEntry[] }[] {
  const routes = getSidebarRoutes(mode);
  const groups: { group: string; items: RouteEntry[] }[] = [];
  const groupMap = new Map<string, RouteEntry[]>();

  for (const r of routes) {
    if (!groupMap.has(r.group)) {
      groupMap.set(r.group, []);
      groups.push({ group: r.group, items: groupMap.get(r.group)! });
    }
    groupMap.get(r.group)!.push(r);
  }
  return groups;
}

/** Build breadcrumb trail for a path */
export function getBreadcrumbs(
  pathname: string
): { label: string; path: string }[] {
  const entry = getRouteEntry(pathname);
  if (!entry) return [];

  const mode = entry.mode;
  const modeLabel = mode === "owner" ? "Owner" : "Builder";
  const crumbs: { label: string; path: string }[] = [
    { label: modeLabel, path: `/${mode}/${mode === "owner" ? "system-health" : "dashboard"}` },
  ];

  // If there's a parent path, add it
  if (entry.parentPath) {
    const parent = routeMap.get(entry.parentPath);
    if (parent) {
      crumbs.push({ label: parent.title, path: parent.path });
    }
  }

  crumbs.push({ label: entry.title, path: entry.path });
  return crumbs;
}

/** Derive guidance pageKey from pathname */
export function getPageKeyFromRoute(pathname: string): string | null {
  const entry = getRouteEntry(pathname);
  return entry?.pageKey ?? null;
}

// ─── Legacy redirect map ───────────────────────────────────────────────────

export const LEGACY_REDIRECTS: Record<string, string> = {
  // Builder legacy
  "/initiatives": "/builder/projects",
  "/projects": "/builder/projects",
  "/project/:id": "/builder/projects",
  "/stories": "/builder/projects",
  "/kanban": "/builder/projects",
  "/code": "/builder/projects",
  "/artifacts": "/builder/projects",
  "/agents": "/builder/agents",
  "/delivery": "/builder/pipelines",
  "/pipelines": "/builder/pipelines",
  "/runtime": "/builder/runtime",
  "/runtime-status": "/builder/runtime",
  "/system-health": "/builder/execution-observability",
  "/system-intelligence": "/owner/system-intelligence",
  "/governance": "/owner/delivery-governance",
  "/org": "/builder/settings",
  "/settings": "/builder/settings",
  "/squads": "/builder/projects",
  "/workspace": "/builder/projects",
  "/journey": "/builder/dashboard",
  "/onboarding": "/builder/dashboard",
  "/planning": "/builder/projects",

  // Owner legacy
  "/observability": "/owner/platform-observability",
  "/adoption": "/owner/adoption",
  "/delivery-outcomes": "/owner/delivery-outcomes",
  "/pattern-library": "/owner/pattern-library",
  "/canon-intelligence": "/owner/canon-intelligence",
  "/security-war-room": "/owner/security-war-room",
  "/security-intelligence": "/owner/security-intelligence",
  "/red-team-simulation": "/owner/red-team-simulation",
  "/blue-team-defense": "/owner/blue-team-defense",
  "/purple-learning": "/owner/purple-learning",
  "/capability-registry": "/owner/capabilities",
  "/autonomy-posture": "/owner/autonomy-posture",
  "/swarm-execution": "/owner/agent-swarm",
  "/calibration": "/owner/calibration",
  "/intelligence-memory": "/owner/intelligence-memory",
  "/playbooks": "/owner/playbooks",
  "/bounded-operations": "/owner/bounded-operations",
  "/decision-engine": "/owner/decision-engine",
  "/doctrine-adaptation": "/owner/doctrine-adaptation",
  "/institutional-conflicts": "/owner/institutional-conflicts",
  "/federated-boundaries": "/owner/federated-boundaries",
  "/resilience-continuity": "/owner/resilience-continuity",
  "/memory-constitution": "/owner/memory-constitution",
  "/decision-rights": "/owner/decision-rights",
  "/dependency-sovereignty": "/owner/dependency-sovereignty",
  "/strategic-succession": "/owner/strategic-succession",
  "/audit": "/owner/audit",
  "/connections": "/owner/connections",
  "/billing": "/owner/billing",
  "/improvement-ledger": "/owner/improvement-ledger",
  "/improvement-candidates": "/owner/improvement-candidates",
  "/improvement-benchmarks": "/owner/improvement-benchmarks",
  "/capability-governance": "/owner/capability-governance",
  "/extensions": "/owner/extensions",
  "/post-deploy-feedback": "/owner/post-deploy-feedback",
  "/agent-routing": "/owner/agent-routing",
  "/agent-debates": "/owner/agent-debates",
  "/working-memory": "/owner/working-memory",
  "/pilot-marketplace": "/owner/pilot-marketplace",
  "/marketplace-outcomes": "/owner/marketplace-outcomes",
  "/meta-agents": "/owner/meta-agents",
  "/meta-artifacts": "/owner/meta-artifacts",
  "/prompt-optimization": "/owner/prompt-optimization",
};

/** NavItem shape for backward compat with permissions.ts */
export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

/** Convert RouteEntry[] to NavItem[] for sidebar compat */
export function toNavItems(routes: RouteEntry[]): NavItem[] {
  return routes.map((r) => ({ title: r.title, url: r.path, icon: r.icon }));
}

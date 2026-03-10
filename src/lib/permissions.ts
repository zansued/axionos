/**
 * permissions.ts
 * Single source of truth for role-based access control.
 * Defines canonical roles, nav groups per surface, and route access helpers.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Map, Rocket, Lightbulb, Hammer, Code2, GitBranch,
  Columns3, Search, FileSearch, Sparkles, FlaskConical, GitPullRequestArrow,
  Rss, PackageCheck, ShieldCheck, Package, Shield, Settings, CreditCard, Plug,
  Users, Scale, BrainCircuit, Zap, Store, TrendingUp, Brain, FileText, Gauge,
  Radio, Server, Globe, Sliders, Beaker, Network, ClipboardCheck, Route, Compass,
  Library, Bug, PackagePlus, Activity, Fingerprint, ShieldAlert, Crown,
} from "lucide-react";

// ─── Canonical role types ──────────────────────────────────────────────────

export type CanonicalRole =
  | "end_user"
  | "operator"
  | "tenant_owner"
  | "platform_reviewer"
  | "platform_admin";

/** Maps org membership role string → CanonicalRole */
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

// ─── Product surface – all roles ──────────────────────────────────────────

export const PRODUCT_NAV: NavItem[] = [
  { title: "Dashboard",   url: "/",            icon: LayoutDashboard },
  { title: "Journey",     url: "/journey",     icon: Map },
  { title: "Onboarding",  url: "/onboarding",  icon: Rocket },
  { title: "Initiatives", url: "/initiatives", icon: Lightbulb },
  { title: "Stories",     url: "/stories",     icon: Hammer },
  { title: "Code",        url: "/code",        icon: Code2 },
  { title: "Workspace",   url: "/workspace",   icon: GitBranch },
  { title: "Kanban",      url: "/kanban",      icon: Columns3 },
  { title: "Deployments", url: "/artifacts",   icon: Rocket },
];

export const PRODUCT_ROUTES = new Set(PRODUCT_NAV.map(i => i.url));

// ─── Workspace governance ─────────────────────────────────────────────────

/** Full workspace set – tenant_owner, platform_admin */
export const WORKSPACE_FULL_NAV: NavItem[] = [
  { title: "Adoption",      url: "/adoption",                 icon: Search },
  { title: "Evidence",      url: "/improvement-ledger",       icon: FileSearch },
  { title: "Candidates",    url: "/improvement-candidates",   icon: Sparkles },
  { title: "Benchmarks",    url: "/improvement-benchmarks",   icon: FlaskConical },
  { title: "Delivery Out.", url: "/delivery-outcomes",        icon: GitPullRequestArrow },
  { title: "Post-Deploy",   url: "/post-deploy-feedback",     icon: Rss },
  { title: "Capabilities",  url: "/capability-registry",      icon: PackageCheck },
  { title: "Cap. Gov.",     url: "/capability-governance",    icon: ShieldCheck },
  { title: "Extensions",    url: "/extensions",               icon: Package },
  { title: "Horizons",     url: "/multi-horizon-alignment",  icon: Compass },
  { title: "Tradeoffs",   url: "/tradeoff-arbitration",     icon: Scale },
  { title: "Mission",     url: "/mission-integrity",        icon: ShieldCheck },
  { title: "Simulations", url: "/continuity-simulation",    icon: FlaskConical },
  { title: "Audit",         url: "/audit",                    icon: Shield },
  { title: "Settings",      url: "/org",                      icon: Settings },
  { title: "Billing",       url: "/billing",                  icon: CreditCard },
  { title: "Connections",   url: "/connections",              icon: Plug },
];

/** Operator subset – no cap gov, extensions, settings, billing, connections */
export const WORKSPACE_OPERATOR_NAV: NavItem[] = [
  { title: "Adoption",      url: "/adoption",               icon: Search },
  { title: "Evidence",      url: "/improvement-ledger",     icon: FileSearch },
  { title: "Candidates",    url: "/improvement-candidates", icon: Sparkles },
  { title: "Benchmarks",    url: "/improvement-benchmarks", icon: FlaskConical },
  { title: "Delivery Out.", url: "/delivery-outcomes",      icon: GitPullRequestArrow },
  { title: "Post-Deploy",   url: "/post-deploy-feedback",   icon: Rss },
  { title: "Capabilities",  url: "/capability-registry",    icon: PackageCheck },
  { title: "Audit",         url: "/audit",                  icon: Shield },
];

const WORKSPACE_FULL_ROUTES = new Set(WORKSPACE_FULL_NAV.map(i => i.url));
const WORKSPACE_OPERATOR_ROUTES = new Set(WORKSPACE_OPERATOR_NAV.map(i => i.url));

// ─── Platform governance ──────────────────────────────────────────────────

/** Full platform set – platform_admin */
export const PLATFORM_FULL_NAV: NavItem[] = [
  { title: "Agents",        url: "/agents",                     icon: Users },
  { title: "Routing",       url: "/agent-routing",              icon: Plug },
  { title: "Debates",       url: "/agent-debates",              icon: Scale },
  { title: "Working Mem.",  url: "/working-memory",             icon: BrainCircuit },
  { title: "Swarm",         url: "/swarm-execution",            icon: Zap },
  { title: "Pilot Mkt.",    url: "/pilot-marketplace",          icon: Store },
  { title: "Mkt. Outcomes", url: "/marketplace-outcomes",       icon: TrendingUp },
  { title: "Meta-Agents",   url: "/meta-agents",                icon: Brain },
  { title: "Meta-Artifacts",url: "/meta-artifacts",             icon: FileText },
  { title: "Calibration",   url: "/calibration",                icon: Gauge },
  { title: "Prompt Opt.",   url: "/prompt-optimization",        icon: FlaskConical },
  { title: "Observability", url: "/observability",              icon: Radio },
  { title: "Dist. Jobs",    url: "/distributed-jobs",           icon: Server },
  { title: "Regions",       url: "/cross-region-recovery",      icon: Globe },
  { title: "Tenant Runtime",url: "/tenant-runtime",             icon: Server },
  { title: "Orchestration", url: "/large-scale-orchestration",  icon: Globe },
  { title: "Rel. Tuning",   url: "/delivery-tuning",            icon: Sliders },
  { title: "Assurance 2.0", url: "/outcome-assurance",          icon: ShieldCheck },
  { title: "Hypotheses",    url: "/architecture-hypotheses",    icon: FlaskConical },
  { title: "Sim. Sandbox",  url: "/research-sandbox",           icon: Beaker },
  { title: "Res. Patterns", url: "/research-patterns",          icon: Network },
  { title: "Promotion",     url: "/architecture-promotion",     icon: ClipboardCheck },
  { title: "AI Routing",    url: "/ai-routing-policy",          icon: Route },
  { title: "Evo. Gov.",    url: "/evolution-governance",       icon: Shield },
  { title: "Mutation Ctrl",url: "/mutation-control",           icon: Shield },
  { title: "Refl. Audit", url: "/reflective-validation",     icon: ShieldCheck },
  { title: "Kernel Guard", url: "/kernel-integrity",          icon: Shield },
  { title: "Canon Gov.",  url: "/canon-governance",           icon: FileText },
  { title: "Patterns",  url: "/pattern-library",            icon: Library },
  { title: "Failure Mem.", url: "/failure-memory",           icon: Bug },
  { title: "Ext. Knowledge", url: "/external-knowledge",    icon: PackagePlus },
  { title: "Runtime Mesh", url: "/runtime-feedback",         icon: Activity },
  { title: "Tenant Doc.", url: "/tenant-doctrine",          icon: Fingerprint },
  { title: "Autonomy",  url: "/autonomy-posture",          icon: ShieldAlert },
  { title: "Advantage", url: "/compounding-advantage",     icon: Crown },
  { title: "RT Harness", url: "/runtime-harness",          icon: Activity },
];

/** Reviewer subset: Observability, Hypotheses, Sim. Sandbox, Res. Patterns, Promotion */
export const PLATFORM_REVIEWER_NAV: NavItem[] = [
  { title: "Observability", url: "/observability",           icon: Radio },
  { title: "Hypotheses",    url: "/architecture-hypotheses", icon: FlaskConical },
  { title: "Sim. Sandbox",  url: "/research-sandbox",        icon: Beaker },
  { title: "Res. Patterns", url: "/research-patterns",       icon: Network },
  { title: "Promotion",     url: "/architecture-promotion",  icon: ClipboardCheck },
];

const PLATFORM_FULL_ROUTES = new Set(PLATFORM_FULL_NAV.map(i => i.url));
const PLATFORM_REVIEWER_ROUTES = new Set(PLATFORM_REVIEWER_NAV.map(i => i.url));

// ─── Nav group builder ─────────────────────────────────────────────────────

export type NavGroups = {
  product:   NavItem[];
  workspace: NavItem[];
  platform:  NavItem[];
};

export function getNavGroups(role: CanonicalRole): NavGroups {
  switch (role) {
    case "end_user":
      return { product: PRODUCT_NAV, workspace: [], platform: [] };
    case "operator":
      return { product: PRODUCT_NAV, workspace: WORKSPACE_OPERATOR_NAV, platform: [] };
    case "tenant_owner":
      return { product: PRODUCT_NAV, workspace: WORKSPACE_FULL_NAV, platform: [] };
    case "platform_reviewer":
      return { product: PRODUCT_NAV, workspace: [], platform: PLATFORM_REVIEWER_NAV };
    case "platform_admin":
      return { product: PRODUCT_NAV, workspace: WORKSPACE_FULL_NAV, platform: PLATFORM_FULL_NAV };
  }
}

// ─── Route access helpers ─────────────────────────────────────────────────

/** Check if a role can access a specific route path */
export function canAccessRoute(role: CanonicalRole, path: string): boolean {
  const normalized = path.split("?")[0].split("#")[0];

  if (PRODUCT_ROUTES.has(normalized)) return true;

  switch (role) {
    case "end_user":         return false;
    case "operator":         return WORKSPACE_OPERATOR_ROUTES.has(normalized);
    case "tenant_owner":     return WORKSPACE_FULL_ROUTES.has(normalized);
    case "platform_reviewer":return PLATFORM_REVIEWER_ROUTES.has(normalized);
    case "platform_admin":   return WORKSPACE_FULL_ROUTES.has(normalized) || PLATFORM_FULL_ROUTES.has(normalized);
    default:                 return false;
  }
}

/** Check if a role can access a surface at all */
export function canAccessSurface(role: CanonicalRole, surface: "workspace" | "platform"): boolean {
  if (surface === "workspace") {
    return role === "operator" || role === "tenant_owner" || role === "platform_admin";
  }
  return role === "platform_reviewer" || role === "platform_admin";
}

// ─── UI display helpers ───────────────────────────────────────────────────

export const CANONICAL_ROLE_LABELS: Record<CanonicalRole, string> = {
  end_user:          "User",
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

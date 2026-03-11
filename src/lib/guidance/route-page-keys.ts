/**
 * Route-to-pageKey mapping for automatic PageGuidanceShell in AppShell.
 * Maps route pathnames to guidance contract keys.
 * Supports both /builder/* and /owner/* namespaces.
 */

const ROUTE_PAGE_KEY_MAP: Record<string, string> = {
  // Landing
  "/": "dashboard",

  // Builder Mode
  "/builder/dashboard": "dashboard",
  "/builder/journey": "journey",
  "/builder/onboarding": "onboarding",
  "/builder/initiatives": "initiatives",
  "/builder/delivery": "deployments",
  "/builder/execution-observability": "observability",
  "/builder/system-intelligence": "system-intelligence",
  "/builder/governance": "governance",

  // Owner Mode
  "/owner/system-health": "observability",
  "/owner/adoption": "adoption",
  "/owner/delivery-outcomes": "delivery-outcomes",
  "/owner/platform-observability": "observability",
  "/owner/pattern-library": "pattern-library",
  "/owner/canon-intelligence": "canon-intelligence",
  "/owner/autonomy-posture": "autonomy-posture",
  "/owner/intelligence-memory": "intelligence-memory",
  "/owner/playbooks": "playbooks",
  "/owner/bounded-operations": "bounded-operations",
  "/owner/decision-engine": "decision-engine",
  "/owner/doctrine-adaptation": "doctrine-adaptation",
  "/owner/institutional-conflicts": "institutional-conflicts",
  "/owner/federated-boundaries": "federated-boundaries",
  "/owner/resilience-continuity": "resilience-continuity",
  "/owner/memory-constitution": "memory-constitution",
  "/owner/decision-rights": "decision-rights",
  "/owner/dependency-sovereignty": "dependency-sovereignty",
  "/owner/strategic-succession": "strategic-succession",
  "/owner/improvement-ledger": "evidence",
  "/owner/improvement-candidates": "candidates",
  "/owner/improvement-benchmarks": "benchmarks",
  "/owner/extensions": "extensions",
  "/owner/capability-governance": "capability-governance",
  "/owner/agent-routing": "routing",
};

export function getPageKeyFromRoute(pathname: string): string | null {
  // Exact match first
  if (ROUTE_PAGE_KEY_MAP[pathname]) return ROUTE_PAGE_KEY_MAP[pathname];

  // Try stripping last segment for detail pages (e.g., /builder/project/123)
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const parentPath = "/" + segments.slice(0, -1).join("/");
    if (ROUTE_PAGE_KEY_MAP[parentPath]) return ROUTE_PAGE_KEY_MAP[parentPath];
  }

  return null;
}

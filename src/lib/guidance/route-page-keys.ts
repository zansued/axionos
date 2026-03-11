/**
 * Route-to-pageKey mapping for automatic PageGuidanceShell in AppShell.
 * Maps route pathnames to guidance contract keys.
 */

const ROUTE_PAGE_KEY_MAP: Record<string, string> = {
  "/": "dashboard",
  "/journey": "journey",
  "/onboarding": "onboarding",
  "/initiatives": "initiatives",
  "/delivery": "deployments",
  "/adoption": "adoption",
  "/improvement-ledger": "evidence",
  "/improvement-candidates": "candidates",
  "/improvement-benchmarks": "benchmarks",
  "/extensions": "extensions",
  "/observability": "observability",
  "/system-health": "observability",
  "/routing": "routing",
  "/ai-routing": "routing",
  "/agent-routing": "routing",
  "/audit-logs": "audit",
  "/capability-governance": "capability-governance",
  "/platform-extensions": "platform-extensions",
  "/playbooks": "playbooks",
  "/bounded-operations": "bounded-operations",
  "/decision-engine": "decision-engine",
  "/doctrine-adaptation": "doctrine-adaptation",
  "/institutional-conflicts": "institutional-conflicts",
  "/federated-boundaries": "federated-boundaries",
  "/resilience-continuity": "resilience-continuity",
  "/memory-constitution": "memory-constitution",
  "/decision-rights": "decision-rights",
  "/dependency-sovereignty": "dependency-sovereignty",
  "/strategic-succession": "strategic-succession",
  "/intelligence-memory": "intelligence-memory",
};

export function getPageKeyFromRoute(pathname: string): string | null {
  // Exact match first
  if (ROUTE_PAGE_KEY_MAP[pathname]) return ROUTE_PAGE_KEY_MAP[pathname];

  // Try base path (strip trailing segments for detail pages)
  const base = "/" + pathname.split("/").filter(Boolean)[0];
  return ROUTE_PAGE_KEY_MAP[base] ?? null;
}

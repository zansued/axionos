/**
 * Dependency Inventory Resolver
 * Resolves active external dependencies and their institutional roles.
 */
export interface DependencyEntry {
  id: string;
  dependency_code: string;
  dependency_name: string;
  dependency_type: string;
  provider_name: string;
  domain: string;
  criticality_level: string;
  lock_in_risk_level: string;
  fallback_exists: boolean;
  status: string;
}

export function categorizeDependencies(deps: DependencyEntry[]) {
  const critical = deps.filter(d => d.criticality_level === "critical");
  const noFallback = deps.filter(d => !d.fallback_exists && d.criticality_level !== "low");
  const highLockIn = deps.filter(d => d.lock_in_risk_level === "high" || d.lock_in_risk_level === "critical");
  const byDomain = deps.reduce<Record<string, DependencyEntry[]>>((acc, d) => {
    (acc[d.domain] ??= []).push(d); return acc;
  }, {});
  return { critical, noFallback, highLockIn, byDomain, total: deps.length };
}

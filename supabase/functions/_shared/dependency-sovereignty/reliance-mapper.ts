/**
 * Reliance Mapper
 * Maps which assets, services, and flows depend on each dependency.
 */
export interface RelianceLink {
  id: string;
  dependency_id: string;
  dependent_asset_type: string;
  dependent_asset_ref: string;
  reliance_type: string;
  blast_radius: string;
  autonomy_impact_score: number;
  continuity_impact_score: number;
}

export function mapRelianceConcentration(links: RelianceLink[]) {
  const byDep = links.reduce<Record<string, RelianceLink[]>>((acc, l) => {
    (acc[l.dependency_id] ??= []).push(l); return acc;
  }, {});
  const concentrated = Object.entries(byDep)
    .filter(([, v]) => v.length >= 3 || v.some(l => l.reliance_type === "critical"))
    .map(([depId, links]) => ({ dependencyId: depId, linkCount: links.length, criticalLinks: links.filter(l => l.reliance_type === "critical").length }));
  return { byDependency: byDep, concentrated };
}

/**
 * Mutation Blast Radius Estimator — Sprint 112
 * Estimates the scope of impact of an architectural mutation.
 */

export interface BlastRadiusInput {
  affected_layers: string[];
  affected_modules: string[];
  affected_stages: string[];
  affected_tables: string[];
  affected_edge_functions: string[];
  affects_tenant_isolation: boolean;
  affects_review_surfaces: boolean;
  affects_runtime_flows: boolean;
}

export interface BlastRadiusResult {
  score: number;          // 0-100
  level: string;          // contained, moderate, wide, critical
  impact_zones: string[];
  recommendation: string;
}

export function estimateBlastRadius(input: BlastRadiusInput): BlastRadiusResult {
  let score = 0;
  const zones: string[] = [];

  const layerCount = input.affected_layers.length;
  score += Math.min(layerCount * 12, 36);
  if (layerCount > 0) zones.push(`${layerCount} architectural layers`);

  const moduleCount = input.affected_modules.length;
  score += Math.min(moduleCount * 5, 20);
  if (moduleCount > 0) zones.push(`${moduleCount} modules`);

  const stageCount = input.affected_stages.length;
  score += Math.min(stageCount * 4, 12);
  if (stageCount > 0) zones.push(`${stageCount} pipeline stages`);

  score += Math.min(input.affected_tables.length * 3, 9);
  score += Math.min(input.affected_edge_functions.length * 3, 9);

  if (input.affects_tenant_isolation) { score += 15; zones.push("tenant isolation boundary"); }
  if (input.affects_review_surfaces) { score += 5; zones.push("operator review surfaces"); }
  if (input.affects_runtime_flows) { score += 8; zones.push("runtime execution flows"); }

  score = Math.min(score, 100);

  const level = score >= 75 ? "critical" : score >= 50 ? "wide" : score >= 25 ? "moderate" : "contained";
  const recommendation = level === "critical"
    ? "Mutation has system-wide impact. Requires extraordinary governance review and staged rollout."
    : level === "wide"
    ? "Significant blast radius. Decompose into smaller mutations if possible."
    : level === "moderate"
    ? "Manageable blast radius. Standard review sufficient with rollback plan."
    : "Blast radius is contained. Proceed with normal governance.";

  return { score, level, impact_zones: zones, recommendation };
}

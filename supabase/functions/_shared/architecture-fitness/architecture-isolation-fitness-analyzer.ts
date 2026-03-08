/**
 * Architecture Isolation Fitness Analyzer — Sprint 44
 */

export interface IsolationInput {
  scope_id: string;
  scope_name: string;
  tenant_isolation_stress: number;
  scope_overlap_risk: number;
  migration_pressure: number;
  retrieval_leakage_risk: number;
  tenant_divergence: number;
}

export interface IsolationFitnessResult {
  isolation_fitness_score: number;
  leakage_risk_flags: string[];
  divergence_risk_flags: string[];
  affected_scopes: string[];
  review_suggestions: string[];
}

export function analyzeIsolationFitness(inputs: IsolationInput[]): IsolationFitnessResult {
  if (!inputs.length) {
    return { isolation_fitness_score: 1, leakage_risk_flags: [], divergence_risk_flags: [], affected_scopes: [], review_suggestions: ["No scopes to analyze"] };
  }

  const scores = inputs.map(i => {
    return Math.max(0, 1 - (i.tenant_isolation_stress * 0.3 + i.scope_overlap_risk * 0.2 + i.migration_pressure * 0.15 + i.retrieval_leakage_risk * 0.2 + i.tenant_divergence * 0.15));
  });

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const leakage: string[] = [];
  const divergence: string[] = [];
  const affected: string[] = [];
  const suggestions: string[] = [];

  for (const i of inputs) {
    if (i.retrieval_leakage_risk > 0.5) { leakage.push(`retrieval_leakage_${i.scope_id}`); affected.push(i.scope_name); }
    if (i.scope_overlap_risk > 0.5) { leakage.push(`scope_overlap_${i.scope_id}`); affected.push(i.scope_name); }
    if (i.tenant_divergence > 0.5) { divergence.push(`divergence_${i.scope_id}`); affected.push(i.scope_name); }
    if (i.tenant_isolation_stress > 0.7) suggestions.push(`Review tenant isolation for ${i.scope_name}`);
    if (i.migration_pressure > 0.6) suggestions.push(`Reduce migration pressure in ${i.scope_name}`);
  }

  return { isolation_fitness_score: Math.round(avg * 10000) / 10000, leakage_risk_flags: leakage, divergence_risk_flags: divergence, affected_scopes: [...new Set(affected)], review_suggestions: suggestions };
}

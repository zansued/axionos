/**
 * Ecosystem Safety Prerequisite Engine — Sprint 56
 * Tracks required safety, observability, governance, and audit prerequisites.
 */

export interface PrerequisiteInput {
  capability_name: string;
  prerequisite_name: string;
  prerequisite_domain: string;
  prerequisite_type: 'governance' | 'observability' | 'audit' | 'policy' | 'isolation' | 'rollback';
  is_met: boolean;
  severity: 'required' | 'recommended' | 'optional';
}

export interface SafetyPrerequisiteResult {
  total_prerequisites: number;
  met_count: number;
  unmet_count: number;
  required_unmet: number;
  safety_prerequisite_score: number;
  unmet_prerequisites: UnmetPrerequisite[];
  domain_readiness: Record<string, number>;
}

export interface UnmetPrerequisite {
  capability_name: string;
  prerequisite_name: string;
  prerequisite_type: string;
  severity: string;
  gap_description: string;
}

export function evaluateSafetyPrerequisites(inputs: PrerequisiteInput[]): SafetyPrerequisiteResult {
  if (!inputs.length) {
    return { total_prerequisites: 0, met_count: 0, unmet_count: 0, required_unmet: 0, safety_prerequisite_score: 1, unmet_prerequisites: [], domain_readiness: {} };
  }

  const met = inputs.filter(i => i.is_met);
  const unmet = inputs.filter(i => !i.is_met);
  const reqUnmet = unmet.filter(i => i.severity === 'required');

  // Score: required unmet → heavy penalty, recommended → moderate
  const weights = { required: 1.0, recommended: 0.5, optional: 0.2 };
  const totalWeight = inputs.reduce((s, i) => s + (weights[i.severity] || 0.2), 0);
  const metWeight = met.reduce((s, i) => s + (weights[i.severity] || 0.2), 0);
  const score = totalWeight > 0 ? metWeight / totalWeight : 1;

  // Domain readiness
  const domains = new Map<string, { met: number; total: number }>();
  for (const i of inputs) {
    const d = domains.get(i.prerequisite_domain) || { met: 0, total: 0 };
    d.total++;
    if (i.is_met) d.met++;
    domains.set(i.prerequisite_domain, d);
  }
  const domainReadiness: Record<string, number> = {};
  for (const [k, v] of domains) {
    domainReadiness[k] = v.total > 0 ? Math.round((v.met / v.total) * 10000) / 10000 : 1;
  }

  return {
    total_prerequisites: inputs.length,
    met_count: met.length,
    unmet_count: unmet.length,
    required_unmet: reqUnmet.length,
    safety_prerequisite_score: Math.round(score * 10000) / 10000,
    unmet_prerequisites: unmet.map(u => ({
      capability_name: u.capability_name,
      prerequisite_name: u.prerequisite_name,
      prerequisite_type: u.prerequisite_type,
      severity: u.severity,
      gap_description: `Unmet ${u.severity} prerequisite: ${u.prerequisite_name}`,
    })),
    domain_readiness: domainReadiness,
  };
}

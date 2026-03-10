/**
 * Moat Explainer — Sprint 122
 * Generates human-readable explanations for compounding advantage profiles.
 */

export interface AdvantageProfile {
  domain_name: string;
  moat_status: string;
  compounding_score: number;
  uniqueness_score: number;
  reuse_density: number;
  failure_resilience: number;
  doctrine_stability: number;
  autonomy_maturity: number;
  recommended_productization: string;
}

export function explainAdvantage(profile: AdvantageProfile): string {
  const lines: string[] = [];
  lines.push(`## Compounding Advantage: ${profile.domain_name}`);
  lines.push(`**Moat Status:** ${profile.moat_status}`);
  lines.push("");
  lines.push("### Score Breakdown");
  lines.push(`- Compounding: ${(profile.compounding_score * 100).toFixed(0)}%`);
  lines.push(`- Uniqueness: ${(profile.uniqueness_score * 100).toFixed(0)}%`);
  lines.push(`- Reuse density: ${(profile.reuse_density * 100).toFixed(0)}%`);
  lines.push(`- Failure resilience: ${(profile.failure_resilience * 100).toFixed(0)}%`);
  lines.push(`- Doctrine stability: ${(profile.doctrine_stability * 100).toFixed(0)}%`);
  lines.push(`- Autonomy maturity: ${(profile.autonomy_maturity * 100).toFixed(0)}%`);
  lines.push("");
  lines.push("### Productization");
  lines.push(profile.recommended_productization || "No productization recommendation at this time.");
  lines.push("");
  lines.push("### Governance Note");
  lines.push("All moat assessments are evidence-based and require governance review before productization.");
  return lines.join("\n");
}

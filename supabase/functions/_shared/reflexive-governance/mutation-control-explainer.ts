/**
 * Mutation Control Explainer — Sprint 112
 * Generates human-readable explanations for mutation governance decisions.
 */

export interface MutationExplainerInput {
  mutation_type: string;
  title: string;
  approval_status: string;
  blast_radius_score: number;
  blast_radius_level: string;
  coupling_expansion_score: number;
  coupling_level: string;
  rollback_viability_score: number;
  rollback_posture: string;
  legitimacy_score: number;
  legitimacy_level: string;
  drift_risk_score: number;
  drift_risk_level: string;
  forbidden_family_flag: boolean;
  forbidden_families: string[];
  topology_change_flag: boolean;
  warnings: string[];
}

export interface MutationExplanation {
  title: string;
  summary: string;
  governance_verdict: string;
  structural_assessment: string;
  reversibility_assessment: string;
  drift_assessment: string;
  details: string[];
  recommendation: string;
  blocked: boolean;
  block_reasons: string[];
}

export function explainMutationCase(input: MutationExplainerInput): MutationExplanation {
  const details: string[] = [];
  const blockReasons: string[] = [];

  details.push(`Type: ${input.mutation_type}`);
  details.push(`Status: ${input.approval_status}`);
  details.push(`Blast radius: ${input.blast_radius_score}/100 (${input.blast_radius_level})`);
  details.push(`Coupling expansion: ${input.coupling_expansion_score}/100 (${input.coupling_level})`);
  details.push(`Rollback viability: ${input.rollback_viability_score}/100 (${input.rollback_posture})`);
  details.push(`Legitimacy: ${input.legitimacy_score}/100 (${input.legitimacy_level})`);
  details.push(`Drift risk: ${input.drift_risk_score}/100 (${input.drift_risk_level})`);

  if (input.forbidden_family_flag) {
    blockReasons.push(`Forbidden families: ${input.forbidden_families.join(", ")}`);
  }
  if (input.topology_change_flag) {
    details.push("⚠ Topology change detected");
  }

  let verdict: string;
  let summary: string;
  let recommendation: string;

  if (input.forbidden_family_flag) {
    verdict = "BLOCKED — Forbidden mutation family detected.";
    summary = `Mutation "${input.title}" touches protected system domains and cannot proceed without extraordinary override.`;
    recommendation = "Escalate to system governance authority for extraordinary review.";
  } else if (input.legitimacy_level === "illegitimate" || input.legitimacy_level === "suspect") {
    verdict = "NOT RECOMMENDED — Structural legitimacy is insufficient.";
    summary = `Mutation "${input.title}" has low structural legitimacy. Risk outweighs benefit.`;
    recommendation = "Reject or decompose into smaller, more bounded mutations.";
  } else if (input.legitimacy_level === "conditional") {
    verdict = "CONDITIONAL — Requires mitigation before approval.";
    summary = `Mutation "${input.title}" has conditional legitimacy. Additional risk mitigation needed.`;
    recommendation = "Address warnings and reduce scope before governance approval.";
  } else {
    verdict = "STRUCTURALLY SOUND — May proceed through governance.";
    summary = `Mutation "${input.title}" is structurally legitimate with acceptable risk profile.`;
    recommendation = "Proceed with standard governance review and approval workflow.";
  }

  const structural = input.blast_radius_level === "critical" || input.coupling_level === "dangerous"
    ? "Structural impact is significant. Multiple system zones affected."
    : "Structural impact is contained within acceptable boundaries.";

  const reversibility = input.rollback_posture === "theatrical" || input.rollback_posture === "impossible"
    ? "⚠ Rollback is not credible. This represents rollback theater or is effectively irreversible."
    : input.rollback_posture === "partial"
    ? "Partial rollback possible. Manual recovery steps may be needed."
    : "Rollback is realistic and feasible.";

  const drift = input.drift_risk_level === "critical" || input.drift_risk_level === "high"
    ? "High risk of architectural drift. Canon alignment check required."
    : "Drift risk is within acceptable bounds.";

  return {
    title: input.title,
    summary,
    governance_verdict: verdict,
    structural_assessment: structural,
    reversibility_assessment: reversibility,
    drift_assessment: drift,
    details,
    recommendation,
    blocked: input.forbidden_family_flag,
    block_reasons: blockReasons,
  };
}

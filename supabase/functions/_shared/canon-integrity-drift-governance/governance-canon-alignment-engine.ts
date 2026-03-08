/**
 * Governance Canon Alignment Engine — Sprint 64
 * Evaluates alignment between current governance behavior and stated governance rules.
 */

export interface GovAlignmentInput {
  stated_rules_count: number;
  enforced_rules_count: number;
  unenforced_rules: number;
  override_count: number;
}

export interface GovAlignmentResult {
  governance_canon_alignment_score: number;
  rationale: string[];
}

export function evaluateGovAlignment(input: GovAlignmentInput): GovAlignmentResult {
  const rationale: string[] = [];
  const enforcement = input.stated_rules_count > 0 ? input.enforced_rules_count / input.stated_rules_count : 0;
  let score = enforcement;

  if (input.unenforced_rules > 0) { score -= input.unenforced_rules * 0.05; rationale.push(`${input.unenforced_rules}_unenforced`); }
  if (input.override_count > 2) { score -= 0.1; rationale.push('frequent_overrides'); }

  return {
    governance_canon_alignment_score: Math.round(Math.max(0, Math.min(1, score)) * 10000) / 10000,
    rationale,
  };
}

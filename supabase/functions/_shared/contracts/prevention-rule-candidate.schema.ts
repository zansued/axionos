// Prevention Rule Candidate Contract — AxionOS Sprint 7
// Identifies preventive rules from recurring error patterns.

export type RuleType =
  | "validation_rule"
  | "scaffold_hardening"
  | "dependency_check"
  | "stage_warning"
  | "code_guardrail";

export interface PreventionRuleCandidate {
  candidate_id: string;
  pattern_id: string;
  organization_id: string;
  rule_type: RuleType;
  description: string;
  proposed_action: string;
  expected_impact: string;
  confidence_score: number;
  created_at: string;
}

const RULE_TYPES: RuleType[] = [
  "validation_rule", "scaffold_hardening", "dependency_check",
  "stage_warning", "code_guardrail",
];

export function validatePreventionCandidate(
  data: unknown,
): { success: true; data: PreventionRuleCandidate } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Prevention rule candidate must be an object" };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.candidate_id || typeof d.candidate_id !== "string") errors.push("candidate_id required");
  if (!d.pattern_id || typeof d.pattern_id !== "string") errors.push("pattern_id required");
  if (!RULE_TYPES.includes(d.rule_type as RuleType)) {
    errors.push(`rule_type must be one of: ${RULE_TYPES.join(", ")}`);
  }

  if (errors.length > 0) return { success: false, error: errors.join("; ") };
  return { success: true, data: d as unknown as PreventionRuleCandidate };
}

// Prevention Rule Contract — AxionOS Sprint 8
// Active prevention rules converted from high-confidence candidates.

export type PreventionRuleType =
  | "validation_rule"
  | "scaffold_guardrail"
  | "dependency_guardrail"
  | "generation_constraint"
  | "pipeline_warning";

export type PreventionActionType =
  | "block"
  | "warn"
  | "adjust_generation"
  | "add_validation"
  | "require_dependency";

export interface TriggerCondition {
  field: string;            // e.g. "error_category", "stage", "file_type", "dependency"
  operator: "equals" | "contains" | "matches" | "in";
  value: string | string[];
}

export interface PreventionRule {
  rule_id: string;
  pattern_id: string | null;
  organization_id: string;
  rule_type: PreventionRuleType;
  description: string;
  trigger_conditions: TriggerCondition[];
  pipeline_stage: string;
  action_type: PreventionActionType;
  action_config: Record<string, unknown>;
  confidence_score: number;
  enabled: boolean;
  times_triggered: number;
  times_prevented: number;
  created_at: string;
  updated_at: string;
}

const RULE_TYPES: PreventionRuleType[] = [
  "validation_rule", "scaffold_guardrail", "dependency_guardrail",
  "generation_constraint", "pipeline_warning",
];

const ACTION_TYPES: PreventionActionType[] = [
  "block", "warn", "adjust_generation", "add_validation", "require_dependency",
];

export function validatePreventionRule(
  data: unknown,
): { success: true; data: PreventionRule } | { success: false; error: string } {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Prevention rule must be an object" };
  }
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  if (!d.rule_id || typeof d.rule_id !== "string") errors.push("rule_id required");
  if (!RULE_TYPES.includes(d.rule_type as PreventionRuleType)) {
    errors.push(`rule_type must be one of: ${RULE_TYPES.join(", ")}`);
  }
  if (!ACTION_TYPES.includes(d.action_type as PreventionActionType)) {
    errors.push(`action_type must be one of: ${ACTION_TYPES.join(", ")}`);
  }
  if (!d.description || typeof d.description !== "string") errors.push("description required");
  if (!Array.isArray(d.trigger_conditions)) errors.push("trigger_conditions must be an array");

  if (errors.length > 0) return { success: false, error: errors.join("; ") };
  return { success: true, data: d as unknown as PreventionRule };
}

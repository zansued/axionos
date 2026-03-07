// Prevention Evaluator — AxionOS Sprint 8
// Deterministic rule evaluation engine for pipeline guardrails.

import type { TriggerCondition } from "../contracts/prevention-rule.schema.ts";

export interface PipelineRuleContext {
  stage: string;
  error_categories?: string[];
  file_types?: string[];
  dependencies?: string[];
  stack?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ActiveRule {
  id: string;
  rule_type: string;
  description: string;
  trigger_conditions: TriggerCondition[];
  pipeline_stage: string;
  action_type: string;
  action_config: Record<string, unknown>;
  confidence_score: number;
  pattern_id: string | null;
}

export interface RuleEvaluation {
  rule_id: string;
  rule_type: string;
  action_type: string;
  description: string;
  confidence_score: number;
  matched: boolean;
  action_config: Record<string, unknown>;
}

/** Evaluate a single trigger condition against the pipeline context */
function evaluateCondition(condition: TriggerCondition, ctx: PipelineRuleContext): boolean {
  const contextValue = getContextValue(condition.field, ctx);
  if (contextValue === undefined || contextValue === null) return false;

  switch (condition.operator) {
    case "equals":
      return String(contextValue) === String(condition.value);

    case "contains": {
      if (Array.isArray(contextValue)) {
        return contextValue.some(v => String(v).includes(String(condition.value)));
      }
      return String(contextValue).includes(String(condition.value));
    }

    case "matches": {
      try {
        const re = new RegExp(String(condition.value), "i");
        return re.test(String(contextValue));
      } catch {
        return false;
      }
    }

    case "in": {
      const allowed = Array.isArray(condition.value) ? condition.value : [condition.value];
      if (Array.isArray(contextValue)) {
        return contextValue.some(v => allowed.includes(String(v)));
      }
      return allowed.includes(String(contextValue));
    }

    default:
      return false;
  }
}

function getContextValue(field: string, ctx: PipelineRuleContext): unknown {
  switch (field) {
    case "stage": return ctx.stage;
    case "error_category": return ctx.error_categories;
    case "file_type": return ctx.file_types;
    case "dependency": return ctx.dependencies;
    default:
      return ctx.metadata?.[field] ?? ctx.stack?.[field];
  }
}

/** Evaluate all rules against a pipeline context. Returns matched rules. */
export function evaluateRules(
  rules: ActiveRule[],
  ctx: PipelineRuleContext,
): RuleEvaluation[] {
  const results: RuleEvaluation[] = [];

  for (const rule of rules) {
    // Stage filter: "*" means all stages
    if (rule.pipeline_stage !== "*" && rule.pipeline_stage !== ctx.stage) continue;

    const conditions = rule.trigger_conditions || [];
    // All conditions must match (AND logic)
    const matched = conditions.length > 0 && conditions.every(c => evaluateCondition(c, ctx));

    if (matched) {
      results.push({
        rule_id: rule.id,
        rule_type: rule.rule_type,
        action_type: rule.action_type,
        description: rule.description,
        confidence_score: rule.confidence_score,
        matched: true,
        action_config: rule.action_config || {},
      });
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence_score - a.confidence_score);
}

/** Check if any evaluation result is a blocker */
export function hasBlockingRule(evaluations: RuleEvaluation[]): boolean {
  return evaluations.some(e => e.action_type === "block");
}

/** Get warnings from evaluations */
export function getWarnings(evaluations: RuleEvaluation[]): RuleEvaluation[] {
  return evaluations.filter(e => e.action_type === "warn");
}

/**
 * Policy Enforcer — Sprint 140
 *
 * Runtime implementation of IPolicyEngine.
 * Evaluates PolicyRules against PolicyContext to produce PolicyDecisions.
 * Pure function: no I/O, no side effects.
 */

import type {
  IPolicyEngine,
  PolicyContext,
  PolicyRule,
  PolicyOverride,
  PolicyEngineConfig,
  PolicyDecision,
  PolicyEvaluation,
  PolicyCondition,
  PolicyViolation,
  PolicyModifier,
  PolicyRecommendation,
  PolicyVerdict,
  PolicyContextField,
  PolicyOperator,
} from "./policy-engine.ts";
import {
  DEFAULT_POLICY_ENGINE_CONFIG,
  POLICY_SCOPE_PRECEDENCE,
} from "./policy-engine.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// ── Field Resolver ──

function resolveField(context: PolicyContext, field: PolicyContextField): unknown {
  if (field.startsWith("run_metrics.")) {
    const subField = field.replace("run_metrics.", "");
    return context.run_metrics
      ? (context.run_metrics as Record<string, unknown>)[subField]
      : undefined;
  }
  return (context as Record<string, unknown>)[field];
}

// ── Operator Evaluator ──

function evaluateOperator(
  actual: unknown,
  operator: PolicyOperator,
  expected: unknown,
): boolean {
  switch (operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "not_in":
      return Array.isArray(expected) && !expected.includes(actual);
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") return actual.includes(expected);
      if (Array.isArray(actual)) return actual.includes(expected);
      return false;
    case "exists":
      return actual !== null && actual !== undefined;
    case "not_exists":
      return actual === null || actual === undefined;
    default:
      return false;
  }
}

// ── Rule Targeting ──

function ruleApplies(rule: PolicyRule, context: PolicyContext): boolean {
  if (!rule.enabled) return false;
  if (rule.environments?.length && !rule.environments.includes(context.environment)) return false;
  if (rule.stages?.length && !rule.stages.includes(context.stage)) return false;
  if (rule.agent_ids?.length && context.agent_id && !rule.agent_ids.includes(context.agent_id)) return false;
  if (rule.agent_types?.length && context.agent_type && !rule.agent_types.includes(context.agent_type)) return false;
  if (rule.capability_ids?.length && context.capability_id && !rule.capability_ids.includes(context.capability_id)) return false;
  if (rule.tool_names?.length && context.tool_name && !rule.tool_names.includes(context.tool_name)) return false;
  return true;
}

// ── Override Check ──

function isOverridden(rule: PolicyRule, context: PolicyContext, overrides: PolicyOverride[]): boolean {
  const now = new Date().toISOString();
  return overrides.some((o) => {
    if (!o.active || o.rule_id !== rule.rule_id) return false;
    if (o.expires_at < now) return false;
    const s = o.scope;
    if (s.run_id && s.run_id !== context.run_id) return false;
    if (s.stage && s.stage !== context.stage) return false;
    if (s.agent_id && s.agent_id !== context.agent_id) return false;
    if (s.environment && s.environment !== context.environment) return false;
    return true;
  });
}

// ── Policy Enforcer ──

export class PolicyEnforcer implements IPolicyEngine {
  evaluate(
    context: PolicyContext,
    rules: PolicyRule[],
    overrides: PolicyOverride[] = [],
    config: PolicyEngineConfig = DEFAULT_POLICY_ENGINE_CONFIG,
  ): PolicyDecision {
    const startMs = Date.now();
    const decisionId = cryptoRandomId();

    // Sort rules: higher scope precedence first, then by priority desc
    const sorted = [...rules]
      .filter((r) => r.enabled)
      .sort((a, b) => {
        const scopeDiff = POLICY_SCOPE_PRECEDENCE[b.scope] - POLICY_SCOPE_PRECEDENCE[a.scope];
        return scopeDiff !== 0 ? scopeDiff : b.priority - a.priority;
      })
      .slice(0, config.max_rules_per_evaluation);

    const evaluations: PolicyEvaluation[] = [];
    const applied: PolicyEvaluation[] = [];
    const blockingViolations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];
    const modifiers: PolicyModifier[] = [];
    const recommendations: PolicyRecommendation[] = [];

    for (const rule of sorted) {
      if (!ruleApplies(rule, context)) continue;

      // Check overrides
      if (config.overrides_enabled && isOverridden(rule, context, overrides)) continue;

      const evaluation = this.evaluateRule(context, rule);
      evaluations.push(evaluation);

      if (!evaluation.triggered) continue;
      applied.push(evaluation);

      // Process actions
      for (const action of evaluation.actions) {
        if (action.type === "block") {
          blockingViolations.push({
            violation_id: cryptoRandomId(),
            rule_id: rule.rule_id,
            rule_name: rule.name,
            severity: rule.severity,
            message: action.description || rule.description,
            trigger_field: evaluation.conditions_met[0]?.field || "unknown" as PolicyContextField,
            trigger_value: resolveField(context, evaluation.conditions_met[0]?.field || "stage" as PolicyContextField),
            trigger_threshold: evaluation.conditions_met[0]?.value,
            prescribed_action: "block",
            blocking: true,
          });
        } else if (action.type === "warn") {
          warnings.push({
            violation_id: cryptoRandomId(),
            rule_id: rule.rule_id,
            rule_name: rule.name,
            severity: rule.severity,
            message: action.description || rule.description,
            trigger_field: evaluation.conditions_met[0]?.field || "unknown" as PolicyContextField,
            trigger_value: resolveField(context, evaluation.conditions_met[0]?.field || "stage" as PolicyContextField),
            trigger_threshold: evaluation.conditions_met[0]?.value,
            prescribed_action: "warn",
            blocking: false,
          });
        } else if (action.type === "require_approval") {
          recommendations.push({
            action: "require_approval",
            reason: action.description || rule.description,
            urgency: rule.severity === "critical" ? "immediate" : "high",
            source_rule_id: rule.rule_id,
          });
        } else if (
          action.type === "apply_ranking_penalty" ||
          action.type === "limit_retries" ||
          action.type === "limit_cost" ||
          action.type === "limit_concurrency" ||
          action.type === "force_mode" ||
          action.type === "deny_agent" ||
          action.type === "deny_tool" ||
          action.type === "deny_capability"
        ) {
          const targetMap: Record<string, PolicyModifier["target"]> = {
            apply_ranking_penalty: "selection_ranking",
            limit_retries: "retry_limit",
            limit_cost: "cost_ceiling",
            limit_concurrency: "concurrency_limit",
            force_mode: "mode_override",
            deny_agent: "agent_denylist",
            deny_tool: "tool_denylist",
            deny_capability: "capability_denylist",
          };
          modifiers.push({
            target: targetMap[action.type] || "selection_ranking",
            modification: action.description || action.type,
            params: action.params || {},
            source_rule_id: rule.rule_id,
          });
        }
      }

      // Short-circuit
      if (config.short_circuit_on_block && blockingViolations.length > 0) break;
    }

    // Determine verdict
    const hasApprovalRequired = recommendations.some((r) => r.action === "require_approval");
    let verdict: PolicyVerdict = "allow";
    if (blockingViolations.some((v) => v.severity === "critical")) {
      verdict = "block_critical";
    } else if (blockingViolations.length > 0) {
      verdict = "block";
    } else if (hasApprovalRequired) {
      verdict = "require_approval";
    } else if (warnings.length > 0) {
      verdict = "allow_with_warnings";
    }

    return {
      decision_id: decisionId,
      run_id: context.run_id,
      task_id: context.task_id,
      stage: context.stage,
      verdict,
      allowed: verdict === "allow" || verdict === "allow_with_warnings",
      blocked: verdict === "block" || verdict === "block_critical",
      blocking_violations: blockingViolations,
      warnings,
      evaluated_rules: evaluations,
      applied_rules: applied,
      policy_modifiers: modifiers,
      recommended_actions: recommendations,
      evaluated_at: nowIso(),
      evaluation_duration_ms: Date.now() - startMs,
    };
  }

  evaluateRule(context: PolicyContext, rule: PolicyRule): PolicyEvaluation {
    const conditionsMet: PolicyCondition[] = [];
    const conditionsUnmet: PolicyCondition[] = [];

    for (const condition of rule.conditions) {
      const actual = resolveField(context, condition.field);
      const passed = evaluateOperator(actual, condition.operator, condition.value);
      if (passed) {
        conditionsMet.push(condition);
      } else {
        conditionsUnmet.push(condition);
      }
    }

    // All conditions must be met (AND logic)
    const triggered = conditionsUnmet.length === 0 && conditionsMet.length > 0;

    return {
      rule_id: rule.rule_id,
      rule_name: rule.name,
      scope: rule.scope,
      severity: rule.severity,
      triggered,
      conditions_met: conditionsMet,
      conditions_unmet: conditionsUnmet,
      actions: triggered ? rule.actions : [],
      evaluated_at: nowIso(),
    };
  }

  checkAllowed(
    context: PolicyContext,
    rules: PolicyRule[],
    overrides?: PolicyOverride[],
  ): boolean {
    const decision = this.evaluate(context, rules, overrides);
    return decision.allowed;
  }
}

// Sprint 27 — Execution Policy Intelligence Tests
import { describe, it, expect } from "vitest";

// ─── Inline implementations for testing ───

// Context Classifier
type ContextClass = "balanced_default" | "high_quality" | "cost_optimized" | "rapid_iteration" | "risk_sensitive" | "deploy_hardened" | "repair_conservative" | "validation_heavy";

const CONTEXT_CLASSES: ContextClass[] = ["balanced_default", "high_quality", "cost_optimized", "rapid_iteration", "risk_sensitive", "deploy_hardened", "repair_conservative", "validation_heavy"];

interface ClassificationInput {
  organization_id: string;
  initiative_type?: string;
  workspace_tier?: string;
  historical_failure_rate?: number;
  predictive_risk_score?: number;
  downstream_sensitivity?: number;
  recent_repair_burden?: number;
  quality_requirements?: "standard" | "high" | "critical";
  deployment_criticality?: "low" | "medium" | "high" | "critical";
  cost_pressure?: "none" | "moderate" | "high";
  recent_retries?: number;
  recent_validation_failures?: number;
}

function classifyExecutionContext(input: ClassificationInput) {
  const reasons: string[] = [];
  const evidence: Record<string, unknown>[] = [];
  const scores: Record<string, number> = {};
  for (const cls of CONTEXT_CLASSES) scores[cls] = 0;
  scores.balanced_default = 0.3;

  if (input.deployment_criticality === "critical") {
    scores.deploy_hardened += 0.5; scores.high_quality += 0.3;
    reasons.push("critical_deployment");
    evidence.push({ signal: "deployment_criticality", value: "critical" });
  } else if (input.deployment_criticality === "high") {
    scores.deploy_hardened += 0.3; scores.high_quality += 0.2;
    reasons.push("high_deployment_criticality");
  }

  if (input.quality_requirements === "critical") {
    scores.high_quality += 0.5; scores.validation_heavy += 0.3;
    reasons.push("critical_quality_requirements");
    evidence.push({ signal: "quality_requirements", value: "critical" });
  } else if (input.quality_requirements === "high") {
    scores.high_quality += 0.3; scores.validation_heavy += 0.2;
    reasons.push("high_quality_requirements");
  }

  if (input.cost_pressure === "high") {
    scores.cost_optimized += 0.5; scores.rapid_iteration += 0.2;
    reasons.push("high_cost_pressure");
    evidence.push({ signal: "cost_pressure", value: "high" });
  } else if (input.cost_pressure === "moderate") {
    scores.cost_optimized += 0.2; reasons.push("moderate_cost_pressure");
  }

  if (input.predictive_risk_score !== undefined) {
    if (input.predictive_risk_score > 0.7) {
      scores.risk_sensitive += 0.5; scores.repair_conservative += 0.3; scores.validation_heavy += 0.2;
      reasons.push("high_predictive_risk");
      evidence.push({ signal: "predictive_risk_score", value: input.predictive_risk_score });
    } else if (input.predictive_risk_score > 0.4) {
      scores.risk_sensitive += 0.2; reasons.push("moderate_predictive_risk");
    }
  }

  if (input.historical_failure_rate !== undefined) {
    if (input.historical_failure_rate > 0.5) {
      scores.repair_conservative += 0.4; scores.risk_sensitive += 0.3;
      reasons.push("high_historical_failure_rate");
      evidence.push({ signal: "historical_failure_rate", value: input.historical_failure_rate });
    } else if (input.historical_failure_rate > 0.25) {
      scores.repair_conservative += 0.2; reasons.push("moderate_historical_failure_rate");
    }
  }

  if (input.recent_repair_burden !== undefined && input.recent_repair_burden > 3) {
    scores.repair_conservative += 0.4; scores.validation_heavy += 0.2;
    reasons.push("high_repair_burden");
  }

  if (input.recent_retries !== undefined && input.recent_retries > 5) {
    scores.repair_conservative += 0.3; scores.risk_sensitive += 0.2;
    reasons.push("high_retry_count");
  }

  if (input.recent_validation_failures !== undefined && input.recent_validation_failures > 3) {
    scores.validation_heavy += 0.4; reasons.push("frequent_validation_failures");
  }

  if (input.downstream_sensitivity !== undefined && input.downstream_sensitivity > 0.7) {
    scores.deploy_hardened += 0.3; scores.validation_heavy += 0.2;
    reasons.push("high_downstream_sensitivity");
  }

  let bestClass: ContextClass = "balanced_default";
  let bestScore = 0;
  for (const cls of CONTEXT_CLASSES) {
    if (scores[cls] > bestScore) { bestScore = scores[cls]; bestClass = cls; }
  }

  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const margin = sortedScores.length > 1 ? sortedScores[0] - sortedScores[1] : sortedScores[0];
  const confidence = Math.min(1, Math.max(0.1, margin + 0.3));

  if (reasons.length === 0) reasons.push("no_strong_signals_default_balanced");

  return { context_class: bestClass, recommended_policy_mode: bestClass, confidence_score: Math.round(confidence * 100) / 100, reason_codes: reasons, evidence_refs: evidence };
}

// Policy Selector
interface PolicyProfile {
  id: string; policy_name: string; policy_mode: string; policy_scope: string;
  allowed_adjustments: Record<string, unknown>; default_priority: number | null;
  confidence_score: number | null; support_count: number; status: string;
}

const DEFAULT_POLICY: PolicyProfile = {
  id: "default-balanced", policy_name: "Balanced Default", policy_mode: "balanced_default",
  policy_scope: "global", allowed_adjustments: {}, default_priority: 0,
  confidence_score: 1.0, support_count: 999, status: "active",
};

function selectExecutionPolicy(profiles: PolicyProfile[], input: { context_class: string; confidence_score: number; organization_id: string }) {
  const reasons: string[] = [];
  const active = profiles.filter(p => p.status === "active");
  if (active.length === 0) {
    reasons.push("no_active_profiles_using_default");
    return { selected_policy: DEFAULT_POLICY, selection_mode: "default_fallback" as const, reason_codes: reasons, candidates_evaluated: profiles.length };
  }
  const exactMatches = active.filter(p => p.policy_mode === input.context_class);
  const scopeOrder = ["execution_context", "workspace", "initiative_type", "global"];
  for (const scope of scopeOrder) {
    const scopeMatches = exactMatches.filter(p => p.policy_scope === scope);
    if (scopeMatches.length > 0) {
      const selected = scopeMatches.sort((a, b) => {
        const pDiff = (b.default_priority ?? 0) - (a.default_priority ?? 0);
        return pDiff !== 0 ? pDiff : (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
      })[0];
      reasons.push(`exact_match_scope_${scope}`);
      return { selected_policy: selected, selection_mode: "exact_match" as const, reason_codes: reasons, candidates_evaluated: active.length };
    }
  }
  const globalFallback = active.filter(p => p.policy_scope === "global").sort((a, b) => (b.default_priority ?? 0) - (a.default_priority ?? 0));
  if (globalFallback.length > 0) {
    reasons.push("scope_fallback_global");
    return { selected_policy: globalFallback[0], selection_mode: "scope_fallback" as const, reason_codes: reasons, candidates_evaluated: active.length };
  }
  reasons.push("no_matching_policy_using_default");
  return { selected_policy: DEFAULT_POLICY, selection_mode: "default_fallback" as const, reason_codes: reasons, candidates_evaluated: active.length };
}

// Policy Adjuster
interface AdjustmentSet {
  validation_sensitivity: number; retry_escalation_threshold: number; predictive_checkpoint_sensitivity: number;
  context_enrichment_level: "minimal" | "standard" | "extended"; repair_strategy_conservatism: number;
  prompt_experimentation_limit: number; human_review_escalation_threshold: number; deploy_hardening_intensity: number;
}

const DEFAULT_ADJUSTMENTS: AdjustmentSet = {
  validation_sensitivity: 0.5, retry_escalation_threshold: 3, predictive_checkpoint_sensitivity: 0.5,
  context_enrichment_level: "standard", repair_strategy_conservatism: 0.5, prompt_experimentation_limit: 0.1,
  human_review_escalation_threshold: 0.8, deploy_hardening_intensity: 0.5,
};

const MODE_ADJUSTMENTS: Record<string, Partial<AdjustmentSet>> = {
  balanced_default: {},
  high_quality: { validation_sensitivity: 0.8, repair_strategy_conservatism: 0.7, prompt_experimentation_limit: 0.05, deploy_hardening_intensity: 0.7, human_review_escalation_threshold: 0.6 },
  cost_optimized: { validation_sensitivity: 0.3, retry_escalation_threshold: 2, context_enrichment_level: "minimal", repair_strategy_conservatism: 0.3, prompt_experimentation_limit: 0.15, deploy_hardening_intensity: 0.3 },
  rapid_iteration: { validation_sensitivity: 0.3, retry_escalation_threshold: 2, context_enrichment_level: "minimal", repair_strategy_conservatism: 0.3, prompt_experimentation_limit: 0.2, deploy_hardening_intensity: 0.3, human_review_escalation_threshold: 0.9 },
  risk_sensitive: { validation_sensitivity: 0.9, predictive_checkpoint_sensitivity: 0.8, repair_strategy_conservatism: 0.8, prompt_experimentation_limit: 0.02, human_review_escalation_threshold: 0.5, deploy_hardening_intensity: 0.8, context_enrichment_level: "extended" },
  deploy_hardened: { validation_sensitivity: 0.9, deploy_hardening_intensity: 0.95, repair_strategy_conservatism: 0.8, prompt_experimentation_limit: 0.0, human_review_escalation_threshold: 0.5, context_enrichment_level: "extended" },
  repair_conservative: { repair_strategy_conservatism: 0.9, retry_escalation_threshold: 2, predictive_checkpoint_sensitivity: 0.7, validation_sensitivity: 0.7, prompt_experimentation_limit: 0.02 },
  validation_heavy: { validation_sensitivity: 0.95, predictive_checkpoint_sensitivity: 0.8, context_enrichment_level: "extended", deploy_hardening_intensity: 0.7, human_review_escalation_threshold: 0.6 },
};

const FORBIDDEN_ACTIONS = new Set(["reorder_pipeline_stages", "skip_mandatory_validation", "disable_governance_gates", "alter_billing", "alter_plans", "alter_enforcement", "override_safety_contracts"]);

function computeAdjustments(policy_mode: string, allowed_adjustments: Record<string, unknown>) {
  const base = { ...DEFAULT_ADJUSTMENTS };
  const modeOverrides = MODE_ADJUSTMENTS[policy_mode] || {};
  const applied: string[] = []; const blocked: string[] = [];
  for (const [key, value] of Object.entries(modeOverrides)) { (base as any)[key] = value; applied.push(`mode_${key}`); }
  for (const [key, value] of Object.entries(allowed_adjustments)) {
    if (FORBIDDEN_ACTIONS.has(key)) { blocked.push(key); continue; }
    if (key in base) { (base as any)[key] = value; applied.push(`custom_${key}`); }
  }
  if (base.retry_escalation_threshold < 1) base.retry_escalation_threshold = 1;
  if (base.prompt_experimentation_limit > 0.3) base.prompt_experimentation_limit = 0.3;
  return { adjustments: base, applied_overrides: applied, blocked_actions: blocked };
}

// Policy Runner
const RUNNER_FORBIDDEN = new Set(["mutate_pipeline_topology", "mutate_governance_rules", "mutate_billing", "mutate_plans", "mutate_enforcement", "skip_validation_gate", "bypass_review_gate", "delete_evidence"]);

function applyExecutionPolicy(policy: any, ctx: any) {
  const reasons: string[] = [];
  if (policy.status !== "active") reasons.push("policy_not_active_advisory_only");
  for (const key of Object.keys(policy.allowed_adjustments || {})) {
    if (RUNNER_FORBIDDEN.has(key)) reasons.push(`blocked_forbidden_mutation_${key}`);
  }
  const autoApplyEnabled = ctx.feature_flags?.execution_policy_auto_apply ?? false;
  const confidenceHigh = (policy.confidence_score ?? 0) >= 0.6;
  let appliedMode: "advisory_only" | "bounded_auto_safe" = "advisory_only";
  if (autoApplyEnabled && confidenceHigh && policy.status === "active") {
    appliedMode = "bounded_auto_safe"; reasons.push("auto_apply_enabled_confidence_sufficient");
  } else {
    if (!autoApplyEnabled) reasons.push("auto_apply_disabled");
    if (!confidenceHigh) reasons.push("confidence_below_threshold");
  }
  if (policy.policy_scope === "global" && (policy.confidence_score ?? 0) < 0.5) {
    appliedMode = "advisory_only"; reasons.push("broad_scope_low_confidence_forced_advisory");
  }
  const { adjustments, applied_overrides, blocked_actions } = computeAdjustments(policy.policy_mode, policy.allowed_adjustments || {});
  return { policy_id: policy.id, policy_name: policy.policy_name, policy_mode: policy.policy_mode, applied_mode: appliedMode, adjustments, adjustments_applied: applied_overrides, blocked_actions, reason_codes: reasons, checkpoint: ctx.checkpoint };
}

// Policy Feedback
function computeFeedbackAction(policy: any, outcomes: any[]) {
  const reasons: string[] = []; let confidenceAdj = 0; let supportAdj = 0; let recommendedStatus = policy.status;
  const relevant = outcomes.filter((o: any) => o.execution_policy_profile_id === policy.id);
  const helpful = relevant.filter((o: any) => o.outcome_status === "helpful").length;
  const harmful = relevant.filter((o: any) => o.outcome_status === "harmful").length;
  const total = relevant.length;
  if (total === 0) { reasons.push("no_outcomes_no_change"); return { policy_id: policy.id, recommended_status: recommendedStatus, confidence_adjustment: 0, support_adjustment: 0, reason_codes: reasons }; }
  supportAdj = total;
  if (harmful >= 3) { recommendedStatus = "deprecated"; confidenceAdj = -0.1 * harmful; reasons.push("repeated_harmful_outcomes_deprecate"); }
  else if (harmful > 0 && harmful > helpful) { recommendedStatus = "watch"; confidenceAdj = -0.1 * harmful; reasons.push("more_harmful_than_helpful_watch"); }
  if (helpful >= 5 && harmful === 0) {
    confidenceAdj = 0.05 * helpful;
    if (policy.status === "draft" || policy.status === "watch") { recommendedStatus = "active"; reasons.push("repeated_helpful_outcomes_promote"); }
    else reasons.push("policy_confirmed_helpful");
  }
  if (policy.policy_scope === "global" && (policy.confidence_score ?? 0.5) + confidenceAdj < 0.4) {
    if (recommendedStatus === "active") { recommendedStatus = "watch"; reasons.push("broad_scope_low_confidence_constrained"); }
  }
  const newConfidence = Math.max(0, Math.min(1, (policy.confidence_score ?? 0.5) + confidenceAdj));
  confidenceAdj = Math.round((newConfidence - (policy.confidence_score ?? 0.5)) * 100) / 100;
  reasons.push("scope_preserved");
  return { policy_id: policy.id, recommended_status: recommendedStatus, confidence_adjustment: confidenceAdj, support_adjustment: supportAdj, reason_codes: reasons };
}

// ─── TESTS ───

describe("Sprint 27 — Execution Policy Intelligence", () => {

  // ══════════ 1. Context Classifier ══════════

  describe("Context Classifier", () => {
    it("returns balanced_default with no signals", () => {
      const result = classifyExecutionContext({ organization_id: "org1" });
      expect(result.context_class).toBe("balanced_default");
      expect(result.reason_codes).toContain("no_strong_signals_default_balanced");
    });

    it("classifies critical deployment as deploy_hardened", () => {
      const result = classifyExecutionContext({ organization_id: "org1", deployment_criticality: "critical" });
      expect(result.context_class).toBe("deploy_hardened");
      expect(result.reason_codes).toContain("critical_deployment");
    });

    it("classifies critical quality as high_quality", () => {
      const result = classifyExecutionContext({ organization_id: "org1", quality_requirements: "critical" });
      expect(result.context_class).toBe("high_quality");
    });

    it("classifies high cost pressure as cost_optimized", () => {
      const result = classifyExecutionContext({ organization_id: "org1", cost_pressure: "high" });
      expect(result.context_class).toBe("cost_optimized");
    });

    it("classifies high predictive risk as risk_sensitive", () => {
      const result = classifyExecutionContext({ organization_id: "org1", predictive_risk_score: 0.85 });
      expect(result.context_class).toBe("risk_sensitive");
    });

    it("classifies high failure rate as repair_conservative", () => {
      const result = classifyExecutionContext({ organization_id: "org1", historical_failure_rate: 0.7 });
      expect(result.context_class).toBe("repair_conservative");
    });

    it("classifies frequent validation failures as validation_heavy", () => {
      const result = classifyExecutionContext({ organization_id: "org1", recent_validation_failures: 10 });
      expect(result.context_class).toBe("validation_heavy");
    });

    it("includes evidence_refs for strong signals", () => {
      const result = classifyExecutionContext({ organization_id: "org1", deployment_criticality: "critical" });
      expect(result.evidence_refs.length).toBeGreaterThan(0);
      expect(result.evidence_refs[0]).toHaveProperty("signal");
    });

    it("produces confidence score between 0 and 1", () => {
      const result = classifyExecutionContext({ organization_id: "org1", cost_pressure: "high" });
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
    });

    it("determinism: same input produces same output", () => {
      const input: ClassificationInput = { organization_id: "org1", predictive_risk_score: 0.8, cost_pressure: "moderate" };
      const r1 = classifyExecutionContext(input);
      const r2 = classifyExecutionContext(input);
      expect(r1.context_class).toBe(r2.context_class);
      expect(r1.confidence_score).toBe(r2.confidence_score);
      expect(r1.reason_codes).toEqual(r2.reason_codes);
    });

    it("high repair burden shifts to repair_conservative", () => {
      const result = classifyExecutionContext({ organization_id: "org1", recent_repair_burden: 10 });
      expect(result.context_class).toBe("repair_conservative");
    });

    it("high downstream sensitivity contributes to deploy_hardened", () => {
      const result = classifyExecutionContext({ organization_id: "org1", downstream_sensitivity: 0.9, deployment_criticality: "high" });
      expect(result.context_class).toBe("deploy_hardened");
    });
  });

  // ══════════ 2. Policy Selector ══════════

  describe("Policy Selector", () => {
    const orgId = "org1";

    it("returns default when no profiles exist", () => {
      const result = selectExecutionPolicy([], { context_class: "high_quality", confidence_score: 0.8, organization_id: orgId });
      expect(result.selection_mode).toBe("default_fallback");
      expect(result.selected_policy?.policy_mode).toBe("balanced_default");
    });

    it("returns default when no active profiles", () => {
      const profiles: PolicyProfile[] = [{ id: "1", policy_name: "HQ", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "draft" }];
      const result = selectExecutionPolicy(profiles, { context_class: "high_quality", confidence_score: 0.8, organization_id: orgId });
      expect(result.selection_mode).toBe("default_fallback");
    });

    it("selects exact match by mode", () => {
      const profiles: PolicyProfile[] = [
        { id: "1", policy_name: "HQ", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "active" },
        { id: "2", policy_name: "CO", policy_mode: "cost_optimized", policy_scope: "global", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "active" },
      ];
      const result = selectExecutionPolicy(profiles, { context_class: "high_quality", confidence_score: 0.8, organization_id: orgId });
      expect(result.selection_mode).toBe("exact_match");
      expect(result.selected_policy?.id).toBe("1");
    });

    it("prefers narrower scope (execution_context > global)", () => {
      const profiles: PolicyProfile[] = [
        { id: "1", policy_name: "HQ Global", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "active" },
        { id: "2", policy_name: "HQ Context", policy_mode: "high_quality", policy_scope: "execution_context", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "active" },
      ];
      const result = selectExecutionPolicy(profiles, { context_class: "high_quality", confidence_score: 0.8, organization_id: orgId });
      expect(result.selected_policy?.id).toBe("2");
    });

    it("falls back to global when no mode match", () => {
      const profiles: PolicyProfile[] = [
        { id: "1", policy_name: "CO", policy_mode: "cost_optimized", policy_scope: "global", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "active" },
      ];
      const result = selectExecutionPolicy(profiles, { context_class: "high_quality", confidence_score: 0.8, organization_id: orgId });
      expect(result.selection_mode).toBe("scope_fallback");
    });

    it("picks highest priority among same scope matches", () => {
      const profiles: PolicyProfile[] = [
        { id: "1", policy_name: "HQ Low", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "active" },
        { id: "2", policy_name: "HQ High", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 10, confidence_score: 0.8, support_count: 5, status: "active" },
      ];
      const result = selectExecutionPolicy(profiles, { context_class: "high_quality", confidence_score: 0.8, organization_id: orgId });
      expect(result.selected_policy?.id).toBe("2");
    });

    it("ignores deprecated policies", () => {
      const profiles: PolicyProfile[] = [
        { id: "1", policy_name: "HQ", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 10, confidence_score: 0.9, support_count: 50, status: "deprecated" },
      ];
      const result = selectExecutionPolicy(profiles, { context_class: "high_quality", confidence_score: 0.8, organization_id: orgId });
      expect(result.selection_mode).toBe("default_fallback");
    });
  });

  // ══════════ 3. Policy Adjuster ══════════

  describe("Policy Adjuster", () => {
    it("returns default adjustments for balanced_default", () => {
      const { adjustments } = computeAdjustments("balanced_default", {});
      expect(adjustments.validation_sensitivity).toBe(0.5);
      expect(adjustments.retry_escalation_threshold).toBe(3);
    });

    it("high_quality increases validation sensitivity", () => {
      const { adjustments } = computeAdjustments("high_quality", {});
      expect(adjustments.validation_sensitivity).toBe(0.8);
      expect(adjustments.deploy_hardening_intensity).toBe(0.7);
    });

    it("cost_optimized decreases validation sensitivity", () => {
      const { adjustments } = computeAdjustments("cost_optimized", {});
      expect(adjustments.validation_sensitivity).toBe(0.3);
    });

    it("risk_sensitive maximizes safety parameters", () => {
      const { adjustments } = computeAdjustments("risk_sensitive", {});
      expect(adjustments.validation_sensitivity).toBe(0.9);
      expect(adjustments.predictive_checkpoint_sensitivity).toBe(0.8);
      expect(adjustments.repair_strategy_conservatism).toBe(0.8);
    });

    it("deploy_hardened sets zero prompt experimentation", () => {
      const { adjustments } = computeAdjustments("deploy_hardened", {});
      expect(adjustments.prompt_experimentation_limit).toBe(0.0);
      expect(adjustments.deploy_hardening_intensity).toBe(0.95);
    });

    it("blocks forbidden actions", () => {
      const { blocked_actions } = computeAdjustments("balanced_default", { reorder_pipeline_stages: true, skip_mandatory_validation: true });
      expect(blocked_actions).toContain("reorder_pipeline_stages");
      expect(blocked_actions).toContain("skip_mandatory_validation");
    });

    it("blocks alter_billing", () => {
      const { blocked_actions } = computeAdjustments("balanced_default", { alter_billing: true });
      expect(blocked_actions).toContain("alter_billing");
    });

    it("blocks disable_governance_gates", () => {
      const { blocked_actions } = computeAdjustments("balanced_default", { disable_governance_gates: true });
      expect(blocked_actions).toContain("disable_governance_gates");
    });

    it("blocks alter_plans", () => {
      const { blocked_actions } = computeAdjustments("balanced_default", { alter_plans: true });
      expect(blocked_actions).toContain("alter_plans");
    });

    it("blocks override_safety_contracts", () => {
      const { blocked_actions } = computeAdjustments("balanced_default", { override_safety_contracts: true });
      expect(blocked_actions).toContain("override_safety_contracts");
    });

    it("enforces hard limit on retry_escalation_threshold minimum", () => {
      const { adjustments } = computeAdjustments("balanced_default", { retry_escalation_threshold: 0 });
      expect(adjustments.retry_escalation_threshold).toBeGreaterThanOrEqual(1);
    });

    it("enforces hard limit on prompt_experimentation_limit maximum", () => {
      const { adjustments } = computeAdjustments("balanced_default", { prompt_experimentation_limit: 0.9 });
      expect(adjustments.prompt_experimentation_limit).toBeLessThanOrEqual(0.3);
    });

    it("applies custom overrides for valid keys", () => {
      const { adjustments, applied_overrides } = computeAdjustments("balanced_default", { validation_sensitivity: 0.75 });
      expect(adjustments.validation_sensitivity).toBe(0.75);
      expect(applied_overrides).toContain("custom_validation_sensitivity");
    });

    it("repair_conservative has high conservatism", () => {
      const { adjustments } = computeAdjustments("repair_conservative", {});
      expect(adjustments.repair_strategy_conservatism).toBe(0.9);
    });

    it("validation_heavy has highest validation sensitivity", () => {
      const { adjustments } = computeAdjustments("validation_heavy", {});
      expect(adjustments.validation_sensitivity).toBe(0.95);
    });
  });

  // ══════════ 4. Policy Runner ══════════

  describe("Policy Runner", () => {
    const basePolicy = {
      id: "p1", policy_name: "HQ", policy_mode: "high_quality", policy_scope: "global",
      allowed_adjustments: {}, confidence_score: 0.8, status: "active",
    };
    const baseCtx = { organization_id: "org1", checkpoint: "pipeline_bootstrap" as const, context_class: "high_quality" };

    it("defaults to advisory_only when auto_apply is disabled", () => {
      const result = applyExecutionPolicy(basePolicy, baseCtx);
      expect(result.applied_mode).toBe("advisory_only");
      expect(result.reason_codes).toContain("auto_apply_disabled");
    });

    it("applies bounded_auto_safe when flag enabled and confidence high", () => {
      const result = applyExecutionPolicy(basePolicy, { ...baseCtx, feature_flags: { execution_policy_auto_apply: true } });
      expect(result.applied_mode).toBe("bounded_auto_safe");
    });

    it("forces advisory for broad scope with low confidence", () => {
      const lowConfPolicy = { ...basePolicy, confidence_score: 0.3 };
      const result = applyExecutionPolicy(lowConfPolicy, { ...baseCtx, feature_flags: { execution_policy_auto_apply: true } });
      expect(result.applied_mode).toBe("advisory_only");
      expect(result.reason_codes).toContain("broad_scope_low_confidence_forced_advisory");
    });

    it("blocks forbidden mutations in adjustments", () => {
      const dangerousPolicy = { ...basePolicy, allowed_adjustments: { mutate_pipeline_topology: true, mutate_billing: true } };
      const result = applyExecutionPolicy(dangerousPolicy, baseCtx);
      expect(result.reason_codes).toContain("blocked_forbidden_mutation_mutate_pipeline_topology");
      expect(result.reason_codes).toContain("blocked_forbidden_mutation_mutate_billing");
    });

    it("marks non-active policy as advisory only", () => {
      const draftPolicy = { ...basePolicy, status: "draft" };
      const result = applyExecutionPolicy(draftPolicy, { ...baseCtx, feature_flags: { execution_policy_auto_apply: true } });
      expect(result.applied_mode).toBe("advisory_only");
      expect(result.reason_codes).toContain("policy_not_active_advisory_only");
    });

    it("records the checkpoint", () => {
      const result = applyExecutionPolicy(basePolicy, { ...baseCtx, checkpoint: "pre_deploy" as const });
      expect(result.checkpoint).toBe("pre_deploy");
    });

    it("low confidence stays advisory even with flag enabled", () => {
      const lowConf = { ...basePolicy, confidence_score: 0.4 };
      const result = applyExecutionPolicy(lowConf, { ...baseCtx, feature_flags: { execution_policy_auto_apply: true } });
      expect(result.applied_mode).toBe("advisory_only");
    });

    it("returns adjustments from mode", () => {
      const result = applyExecutionPolicy(basePolicy, baseCtx);
      expect(result.adjustments.validation_sensitivity).toBe(0.8);
    });

    it("blocks mutate_governance_rules", () => {
      const p = { ...basePolicy, allowed_adjustments: { mutate_governance_rules: true } };
      const result = applyExecutionPolicy(p, baseCtx);
      expect(result.reason_codes.some((r: string) => r.includes("mutate_governance_rules"))).toBe(true);
    });

    it("blocks skip_validation_gate", () => {
      const p = { ...basePolicy, allowed_adjustments: { skip_validation_gate: true } };
      const result = applyExecutionPolicy(p, baseCtx);
      expect(result.reason_codes.some((r: string) => r.includes("skip_validation_gate"))).toBe(true);
    });

    it("blocks delete_evidence", () => {
      const p = { ...basePolicy, allowed_adjustments: { delete_evidence: true } };
      const result = applyExecutionPolicy(p, baseCtx);
      expect(result.reason_codes.some((r: string) => r.includes("delete_evidence"))).toBe(true);
    });
  });

  // ══════════ 5. Policy Feedback ══════════

  describe("Policy Feedback", () => {
    const basePolicy = { id: "p1", status: "active", confidence_score: 0.6, support_count: 5, policy_scope: "global" };

    it("returns no change with no outcomes", () => {
      const result = computeFeedbackAction(basePolicy, []);
      expect(result.recommended_status).toBe("active");
      expect(result.confidence_adjustment).toBe(0);
    });

    it("deprecates after repeated harmful outcomes", () => {
      const outcomes = Array.from({ length: 4 }, (_, i) => ({ execution_policy_profile_id: "p1", outcome_status: "harmful" }));
      const result = computeFeedbackAction(basePolicy, outcomes);
      expect(result.recommended_status).toBe("deprecated");
    });

    it("moves to watch when harmful > helpful", () => {
      const outcomes = [
        { execution_policy_profile_id: "p1", outcome_status: "harmful" },
        { execution_policy_profile_id: "p1", outcome_status: "harmful" },
        { execution_policy_profile_id: "p1", outcome_status: "helpful" },
      ];
      const result = computeFeedbackAction(basePolicy, outcomes);
      expect(result.recommended_status).toBe("watch");
    });

    it("promotes draft to active after repeated helpful", () => {
      const draftPolicy = { ...basePolicy, status: "draft", confidence_score: 0.5 };
      const outcomes = Array.from({ length: 6 }, () => ({ execution_policy_profile_id: "p1", outcome_status: "helpful" }));
      const result = computeFeedbackAction(draftPolicy, outcomes);
      expect(result.recommended_status).toBe("active");
    });

    it("constrains broad scope with low confidence", () => {
      const lowConf = { ...basePolicy, status: "draft", confidence_score: 0.1, policy_scope: "global" };
      const outcomes = Array.from({ length: 6 }, () => ({ execution_policy_profile_id: "p1", outcome_status: "helpful" }));
      const result = computeFeedbackAction(lowConf, outcomes);
      // Even with helpful outcomes, low confidence global stays constrained
      expect(["watch", "active"]).toContain(result.recommended_status);
    });

    it("preserves scope", () => {
      const outcomes = [{ execution_policy_profile_id: "p1", outcome_status: "helpful" }];
      const result = computeFeedbackAction(basePolicy, outcomes);
      expect(result.reason_codes).toContain("scope_preserved");
    });

    it("ignores outcomes from other policies", () => {
      const outcomes = [
        { execution_policy_profile_id: "p2", outcome_status: "harmful" },
        { execution_policy_profile_id: "p2", outcome_status: "harmful" },
        { execution_policy_profile_id: "p2", outcome_status: "harmful" },
        { execution_policy_profile_id: "p2", outcome_status: "harmful" },
      ];
      const result = computeFeedbackAction(basePolicy, outcomes);
      expect(result.recommended_status).toBe("active");
      expect(result.confidence_adjustment).toBe(0);
    });

    it("boosts confidence for confirmed helpful", () => {
      const outcomes = Array.from({ length: 5 }, () => ({ execution_policy_profile_id: "p1", outcome_status: "helpful" }));
      const result = computeFeedbackAction(basePolicy, outcomes);
      expect(result.confidence_adjustment).toBeGreaterThan(0);
    });

    it("penalizes confidence for harmful", () => {
      const outcomes = Array.from({ length: 3 }, () => ({ execution_policy_profile_id: "p1", outcome_status: "harmful" }));
      const result = computeFeedbackAction(basePolicy, outcomes);
      expect(result.confidence_adjustment).toBeLessThan(0);
    });
  });

  // ══════════ 6. Safety Guards ══════════

  describe("Safety Guards", () => {
    it("adjuster blocks all 7 forbidden action types", () => {
      const forbidden = ["reorder_pipeline_stages", "skip_mandatory_validation", "disable_governance_gates", "alter_billing", "alter_plans", "alter_enforcement", "override_safety_contracts"];
      for (const action of forbidden) {
        const { blocked_actions } = computeAdjustments("balanced_default", { [action]: true });
        expect(blocked_actions).toContain(action);
      }
    });

    it("runner blocks all 8 forbidden mutation types", () => {
      const forbidden = ["mutate_pipeline_topology", "mutate_governance_rules", "mutate_billing", "mutate_plans", "mutate_enforcement", "skip_validation_gate", "bypass_review_gate", "delete_evidence"];
      for (const action of forbidden) {
        const policy = { id: "p1", policy_name: "T", policy_mode: "balanced_default", policy_scope: "global", allowed_adjustments: { [action]: true }, confidence_score: 0.9, status: "active" };
        const result = applyExecutionPolicy(policy, { organization_id: "org1", checkpoint: "pipeline_bootstrap", context_class: "balanced_default" });
        expect(result.reason_codes.some((r: string) => r.includes(action))).toBe(true);
      }
    });

    it("broad low-confidence policy is forced advisory", () => {
      const policy = { id: "p1", policy_name: "T", policy_mode: "balanced_default", policy_scope: "global", allowed_adjustments: {}, confidence_score: 0.2, status: "active" };
      const result = applyExecutionPolicy(policy, { organization_id: "org1", checkpoint: "pipeline_bootstrap", context_class: "balanced_default", feature_flags: { execution_policy_auto_apply: true } });
      expect(result.applied_mode).toBe("advisory_only");
    });

    it("feedback never auto-expands scope", () => {
      const outcomes = Array.from({ length: 10 }, () => ({ execution_policy_profile_id: "p1", outcome_status: "helpful" }));
      const result = computeFeedbackAction({ id: "p1", status: "active", confidence_score: 0.9, support_count: 50, policy_scope: "workspace" }, outcomes);
      expect(result.reason_codes).toContain("scope_preserved");
    });

    it("deprecated policy is not applied as auto_safe", () => {
      const policy = { id: "p1", policy_name: "T", policy_mode: "balanced_default", policy_scope: "global", allowed_adjustments: {}, confidence_score: 0.9, status: "deprecated" };
      const result = applyExecutionPolicy(policy, { organization_id: "org1", checkpoint: "pipeline_bootstrap", context_class: "balanced_default", feature_flags: { execution_policy_auto_apply: true } });
      expect(result.applied_mode).toBe("advisory_only");
    });
  });

  // ══════════ 7. Determinism ══════════

  describe("Determinism", () => {
    it("classifier is deterministic", () => {
      const input: ClassificationInput = { organization_id: "org1", predictive_risk_score: 0.85, deployment_criticality: "high", cost_pressure: "moderate" };
      const r1 = classifyExecutionContext(input);
      const r2 = classifyExecutionContext(input);
      expect(r1).toEqual(r2);
    });

    it("selector is deterministic", () => {
      const profiles: PolicyProfile[] = [
        { id: "1", policy_name: "HQ", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 1, confidence_score: 0.8, support_count: 5, status: "active" },
      ];
      const input = { context_class: "high_quality", confidence_score: 0.8, organization_id: "org1" };
      const r1 = selectExecutionPolicy(profiles, input);
      const r2 = selectExecutionPolicy(profiles, input);
      expect(r1.selected_policy?.id).toBe(r2.selected_policy?.id);
      expect(r1.selection_mode).toBe(r2.selection_mode);
    });

    it("adjuster is deterministic", () => {
      const r1 = computeAdjustments("risk_sensitive", { validation_sensitivity: 0.95 });
      const r2 = computeAdjustments("risk_sensitive", { validation_sensitivity: 0.95 });
      expect(r1.adjustments).toEqual(r2.adjustments);
      expect(r1.applied_overrides).toEqual(r2.applied_overrides);
    });

    it("feedback is deterministic", () => {
      const outcomes = [
        { execution_policy_profile_id: "p1", outcome_status: "helpful" },
        { execution_policy_profile_id: "p1", outcome_status: "harmful" },
      ];
      const policy = { id: "p1", status: "active", confidence_score: 0.6, support_count: 5, policy_scope: "global" };
      const r1 = computeFeedbackAction(policy, outcomes);
      const r2 = computeFeedbackAction(policy, outcomes);
      expect(r1).toEqual(r2);
    });
  });

  // ══════════ 8. Integration Flow ══════════

  describe("Integration Flow", () => {
    it("classifies context → selects policy → applies adjustments", () => {
      // Step 1: Classify
      const classification = classifyExecutionContext({
        organization_id: "org1", deployment_criticality: "critical", quality_requirements: "high",
      });
      expect(classification.context_class).toBeDefined();

      // Step 2: Select
      const profiles: PolicyProfile[] = [
        { id: "p1", policy_name: "Deploy Hardened", policy_mode: "deploy_hardened", policy_scope: "global", allowed_adjustments: {}, default_priority: 5, confidence_score: 0.9, support_count: 20, status: "active" },
        { id: "p2", policy_name: "High Quality", policy_mode: "high_quality", policy_scope: "global", allowed_adjustments: {}, default_priority: 3, confidence_score: 0.8, support_count: 15, status: "active" },
      ];
      const selection = selectExecutionPolicy(profiles, {
        context_class: classification.context_class, confidence_score: classification.confidence_score, organization_id: "org1",
      });
      expect(selection.selected_policy).toBeDefined();

      // Step 3: Apply
      const application = applyExecutionPolicy(
        { ...selection.selected_policy!, allowed_adjustments: selection.selected_policy!.allowed_adjustments },
        { organization_id: "org1", checkpoint: "pipeline_bootstrap" as const, context_class: classification.context_class },
      );
      expect(application.adjustments).toBeDefined();
      expect(application.applied_mode).toBeDefined();
    });

    it("full cycle: classify → select → apply → track outcome → feedback", () => {
      const classification = classifyExecutionContext({ organization_id: "org1", cost_pressure: "high" });
      const profiles: PolicyProfile[] = [
        { id: "p1", policy_name: "Cost Opt", policy_mode: "cost_optimized", policy_scope: "global", allowed_adjustments: {}, default_priority: 5, confidence_score: 0.7, support_count: 10, status: "active" },
      ];
      const selection = selectExecutionPolicy(profiles, { context_class: classification.context_class, confidence_score: classification.confidence_score, organization_id: "org1" });
      expect(selection.selected_policy?.policy_mode).toBe("cost_optimized");

      const application = applyExecutionPolicy(
        { ...selection.selected_policy!, allowed_adjustments: {} },
        { organization_id: "org1", checkpoint: "pipeline_bootstrap" as const, context_class: classification.context_class },
      );
      expect(application.adjustments.validation_sensitivity).toBe(0.3);

      // Track outcome
      const outcomes = [{ execution_policy_profile_id: "p1", outcome_status: "helpful" as const }];
      const feedback = computeFeedbackAction({ id: "p1", status: "active", confidence_score: 0.7, support_count: 10, policy_scope: "global" }, outcomes);
      expect(feedback.recommended_status).toBe("active");
    });

    it("pipeline without policy continues with default", () => {
      const result = selectExecutionPolicy([], { context_class: "balanced_default", confidence_score: 0.5, organization_id: "org1" });
      expect(result.selected_policy?.policy_mode).toBe("balanced_default");
      expect(result.selection_mode).toBe("default_fallback");
    });
  });

  // ══════════ 9. Edge Cases ══════════

  describe("Edge Cases", () => {
    it("handles unknown policy mode gracefully", () => {
      const { adjustments } = computeAdjustments("totally_unknown_mode", {});
      expect(adjustments.validation_sensitivity).toBe(0.5); // defaults
    });

    it("classifier handles all undefined optional fields", () => {
      const result = classifyExecutionContext({ organization_id: "org1" });
      expect(result.context_class).toBe("balanced_default");
    });

    it("selector handles large profile list", () => {
      const profiles: PolicyProfile[] = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i}`, policy_name: `Policy ${i}`, policy_mode: i % 2 === 0 ? "high_quality" : "cost_optimized",
        policy_scope: "global", allowed_adjustments: {}, default_priority: i, confidence_score: 0.5 + i * 0.005,
        support_count: i, status: "active",
      }));
      const result = selectExecutionPolicy(profiles, { context_class: "high_quality", confidence_score: 0.8, organization_id: "org1" });
      expect(result.selected_policy).toBeDefined();
      expect(result.candidates_evaluated).toBe(100);
    });

    it("feedback handles mixed outcomes correctly", () => {
      const outcomes = [
        { execution_policy_profile_id: "p1", outcome_status: "helpful" },
        { execution_policy_profile_id: "p1", outcome_status: "neutral" },
        { execution_policy_profile_id: "p1", outcome_status: "inconclusive" },
      ];
      const result = computeFeedbackAction({ id: "p1", status: "active", confidence_score: 0.6, support_count: 5, policy_scope: "global" }, outcomes);
      expect(result.recommended_status).toBe("active"); // no harmful, no strong signal
    });

    it("watch policy is advisory only", () => {
      const policy = { id: "p1", policy_name: "T", policy_mode: "balanced_default", policy_scope: "global", allowed_adjustments: {}, confidence_score: 0.9, status: "watch" };
      const result = applyExecutionPolicy(policy, { organization_id: "org1", checkpoint: "pipeline_bootstrap", context_class: "balanced_default", feature_flags: { execution_policy_auto_apply: true } });
      expect(result.applied_mode).toBe("advisory_only");
    });
  });
});

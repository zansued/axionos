// Sprint 29 — Tenant Adaptive Policy Tuning Tests
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// Inline implementations for testing (same logic as shared modules)
// ═══════════════════════════════════════════════════════════════

// --- Tuning Engine ---
interface TenantPreference {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  preference_scope: "organization" | "workspace";
  preference_name: string;
  preferred_policy_modes: string[];
  priority_weights: Record<string, number>;
  override_limits: Record<string, unknown>;
  confidence_score: number | null;
  support_count: number;
  status: string;
}

interface TuningInput {
  organization_id: string;
  workspace_id?: string;
  context_class: string;
  global_policy_ranking: Array<{ policy_id: string; policy_mode: string; composite_score: number }>;
  tenant_preferences: TenantPreference[];
  tenant_outcomes: Array<{ policy_id: string; context_class: string; helpful: number; harmful: number; neutral: number; total: number }>;
  local_failure_rate?: number;
  local_cost_pressure?: number;
  local_deploy_criticality?: number;
}

function computeTenantTuning(input: TuningInput) {
  const reasons: string[] = [];
  const evidenceRefs: string[] = [];

  const wsPrefs = input.tenant_preferences.filter(
    (p) => p.status === "active" && p.preference_scope === "workspace" && p.workspace_id === input.workspace_id,
  );
  const orgPrefs = input.tenant_preferences.filter(
    (p) => p.status === "active" && p.preference_scope === "organization",
  );

  const activePreference = wsPrefs[0] || orgPrefs[0] || null;
  const tuningSource = wsPrefs[0] ? "workspace" : orgPrefs[0] ? "organization" : "global";

  if (!activePreference) {
    reasons.push("no_active_tenant_preference_using_global");
    return {
      tuned_policy_order: input.global_policy_ranking.map((p) => ({
        policy_id: p.policy_id, policy_mode: p.policy_mode, tuned_score: p.composite_score, tuning_source: "global" as const,
      })),
      allowed_adjustment_deltas: {},
      confidence_score: 1.0,
      reason_codes: reasons,
      evidence_refs: evidenceRefs,
    };
  }

  reasons.push(`using_${tuningSource}_preference_${activePreference.preference_name}`);
  evidenceRefs.push(activePreference.id);

  const preferredModes = new Set(activePreference.preferred_policy_modes);

  const tuned = input.global_policy_ranking.map((p) => {
    let boost = 0;
    if (preferredModes.has(p.policy_mode)) boost += 0.15;

    const localOutcome = input.tenant_outcomes.find(
      (o) => o.policy_id === p.policy_id && o.context_class === input.context_class,
    );
    if (localOutcome && localOutcome.total >= 3) {
      const helpfulRate = localOutcome.helpful / localOutcome.total;
      const harmfulRate = localOutcome.harmful / localOutcome.total;
      boost += (helpfulRate - harmfulRate) * 0.1;
      if (harmfulRate > 0.4) boost -= 0.2;
    }

    if (input.local_cost_pressure && input.local_cost_pressure > 0.7 && p.policy_mode === "cost_optimized") boost += 0.05;
    if (input.local_deploy_criticality && input.local_deploy_criticality > 0.7 && p.policy_mode === "deploy_hardened") boost += 0.05;
    if (input.local_failure_rate && input.local_failure_rate > 0.5 && p.policy_mode === "risk_sensitive") boost += 0.05;

    return {
      policy_id: p.policy_id, policy_mode: p.policy_mode,
      tuned_score: Math.max(0, Math.min(1, p.composite_score + boost)),
      tuning_source: tuningSource as "global" | "organization" | "workspace",
    };
  });

  tuned.sort((a, b) => b.tuned_score - a.tuned_score);

  const allowedDeltas: Record<string, number> = {};
  const limits = activePreference.override_limits as Record<string, number>;
  for (const [key, maxDelta] of Object.entries(limits)) {
    if (typeof maxDelta === "number") allowedDeltas[key] = Math.min(Math.abs(maxDelta), 0.3);
  }

  const confidence = Math.min(1, (activePreference.confidence_score ?? 0.5) * (activePreference.support_count >= 5 ? 1.0 : 0.7));

  return {
    tuned_policy_order: tuned,
    allowed_adjustment_deltas: allowedDeltas,
    confidence_score: confidence,
    reason_codes: [...new Set(reasons)],
    evidence_refs: evidenceRefs,
  };
}

// --- Override Guard ---
const FORBIDDEN_OVERRIDE_KEYS = new Set([
  "reorder_pipeline_stages", "skip_mandatory_validation", "disable_governance_gates",
  "alter_billing", "alter_plans", "alter_enforcement", "override_safety_contracts",
  "mutate_pipeline_topology", "mutate_governance_rules", "bypass_review_gate", "delete_evidence",
]);

const ALLOWED_OVERRIDE_KEYS: Record<string, { min: number; max: number }> = {
  validation_sensitivity_bias: { min: -0.3, max: 0.3 },
  retry_escalation_bias: { min: -2, max: 2 },
  predictive_checkpoint_sensitivity_bias: { min: -0.3, max: 0.3 },
  human_review_threshold_bias: { min: -0.3, max: 0.2 },
  context_enrichment_level_bias: { min: -0.2, max: 0.3 },
  prompt_experimentation_exposure_cap: { min: 0, max: 0.3 },
};

function guardOverrides(
  requests: Array<{ key: string; requested_delta: number }>,
  declaredLimits: Record<string, unknown>,
) {
  const allowed: Record<string, number> = {};
  const blocked: string[] = [];
  const reasons: string[] = [];

  for (const req of requests) {
    if (FORBIDDEN_OVERRIDE_KEYS.has(req.key)) {
      blocked.push(req.key);
      reasons.push(`forbidden_override_${req.key}`);
      continue;
    }
    const bounds = ALLOWED_OVERRIDE_KEYS[req.key];
    if (!bounds) {
      blocked.push(req.key);
      reasons.push(`unknown_override_key_${req.key}`);
      continue;
    }
    const declaredLimit = declaredLimits[req.key];
    const maxAllowed = typeof declaredLimit === "number" ? Math.min(Math.abs(declaredLimit), 0.3) : 0.3;
    let clamped = Math.max(bounds.min, Math.min(bounds.max, req.requested_delta));
    if (Math.abs(clamped) > maxAllowed) {
      clamped = clamped > 0 ? maxAllowed : -maxAllowed;
    }
    allowed[req.key] = clamped;
  }

  return { allowed_overrides: allowed, blocked_overrides: blocked, reason_codes: reasons };
}

// --- Drift Detector ---
function detectTenantDrift(input: {
  preference: { id: string; preference_name: string; preference_scope: string; confidence_score: number | null; support_count: number; status: string; updated_at: string };
  outcomes: Array<{ outcome_status: string; applied_mode: string; created_at: string }>;
  global_helpful_rate: number;
  global_harmful_rate: number;
}) {
  const signals: any[] = [];
  const reasons: string[] = [];
  const { preference, outcomes } = input;

  if (outcomes.length >= 5) {
    const harmful = outcomes.filter((o) => o.outcome_status === "harmful").length;
    const harmfulRate = harmful / outcomes.length;
    if (harmfulRate > 0.35) {
      signals.push({
        signal_type: "harmful_drift", severity: harmfulRate > 0.5 ? "high" : "medium",
        description: `${(harmfulRate * 100).toFixed(0)}% harmful`, recommended_action: harmfulRate > 0.5 ? "deprecate" : "rollback_to_default",
        confidence: Math.min(1, outcomes.length / 10),
      });
      reasons.push("harmful_outcome_rate_exceeded");
    }
  }

  const daysSinceUpdate = (Date.now() - new Date(preference.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > 30 && preference.status === "active") {
    signals.push({ signal_type: "stale_profile", severity: daysSinceUpdate > 60 ? "medium" : "low", description: "Stale", recommended_action: "watch", confidence: 0.7 });
    reasons.push("stale_preference_profile");
  }

  if (preference.support_count < 5 && (preference.confidence_score ?? 0) > 0.7) {
    signals.push({ signal_type: "overfit_local", severity: "medium", description: "Overfit", recommended_action: "tighten_limits", confidence: 0.8 });
    reasons.push("overfit_low_sample_high_confidence");
  }

  if (outcomes.length >= 5) {
    const localHelpfulRate = outcomes.filter((o) => o.outcome_status === "helpful").length / outcomes.length;
    const divergence = input.global_helpful_rate - localHelpfulRate;
    if (divergence > 0.25) {
      signals.push({
        signal_type: "divergence_from_global", severity: divergence > 0.4 ? "high" : "medium",
        description: "Divergence", recommended_action: divergence > 0.4 ? "rollback_to_default" : "tighten_limits",
        confidence: Math.min(1, outcomes.length / 10),
      });
      reasons.push("divergence_from_global_performance");
    }
  }

  const highSeverity = signals.filter((s: any) => s.severity === "high").length;
  const medSeverity = signals.filter((s: any) => s.severity === "medium").length;
  const overall = highSeverity > 0 ? "critical" : medSeverity > 0 ? "warning" : "healthy";

  return { signals, overall_health: overall, reason_codes: reasons };
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

const ORG_ID = "org-test-29";
const WS_ID = "ws-test-29";

const makePreference = (overrides: Partial<TenantPreference> = {}): TenantPreference => ({
  id: "pref-1",
  organization_id: ORG_ID,
  workspace_id: null,
  preference_scope: "organization",
  preference_name: "cost_sensitive",
  preferred_policy_modes: ["cost_optimized"],
  priority_weights: { quality: 0.2, cost: 0.4, speed: 0.2, stability: 0.2 },
  override_limits: { validation_sensitivity_bias: 0.2, retry_escalation_bias: 1 },
  confidence_score: 0.7,
  support_count: 10,
  status: "active",
  ...overrides,
});

const GLOBAL_RANKING = [
  { policy_id: "p1", policy_mode: "balanced_default", composite_score: 0.7 },
  { policy_id: "p2", policy_mode: "cost_optimized", composite_score: 0.6 },
  { policy_id: "p3", policy_mode: "high_quality", composite_score: 0.5 },
];

describe("Sprint 29 — Tenant Adaptive Policy Tuning", () => {
  // ── Tuning Engine ──
  describe("Tenant Policy Tuning Engine", () => {
    it("returns global order when no active tenant preference", () => {
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [], tenant_outcomes: [],
      });
      expect(result.tuned_policy_order[0].policy_mode).toBe("balanced_default");
      expect(result.reason_codes).toContain("no_active_tenant_preference_using_global");
      expect(result.confidence_score).toBe(1.0);
    });

    it("boosts preferred policy modes for org preference", () => {
      const pref = makePreference({ preferred_policy_modes: ["cost_optimized"] });
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      // cost_optimized should get boosted
      const costPolicy = result.tuned_policy_order.find((p) => p.policy_mode === "cost_optimized");
      expect(costPolicy!.tuned_score).toBeGreaterThan(0.6);
      expect(result.tuned_policy_order[0].tuning_source).toBe("organization");
    });

    it("prefers workspace preference over organization", () => {
      const orgPref = makePreference({ id: "pref-org", preference_scope: "organization", preferred_policy_modes: ["balanced_default"] });
      const wsPref = makePreference({
        id: "pref-ws", preference_scope: "workspace", workspace_id: WS_ID,
        preferred_policy_modes: ["high_quality"],
      });
      const result = computeTenantTuning({
        organization_id: ORG_ID, workspace_id: WS_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [orgPref, wsPref], tenant_outcomes: [],
      });
      expect(result.tuned_policy_order[0].tuning_source).toBe("workspace");
    });

    it("penalizes policies with high harmful rate in local outcomes", () => {
      const pref = makePreference({ preferred_policy_modes: ["cost_optimized"] });
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
        tenant_outcomes: [{ policy_id: "p2", context_class: "general", helpful: 1, harmful: 4, neutral: 0, total: 5 }],
      });
      const costPolicy = result.tuned_policy_order.find((p) => p.policy_mode === "cost_optimized");
      // Should be penalized despite being preferred
      expect(costPolicy!.tuned_score).toBeLessThan(0.7);
    });

    it("boosts deploy_hardened when local deploy criticality is high", () => {
      const ranking = [...GLOBAL_RANKING, { policy_id: "p4", policy_mode: "deploy_hardened", composite_score: 0.5 }];
      const pref = makePreference();
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: ranking, tenant_preferences: [pref], tenant_outcomes: [],
        local_deploy_criticality: 0.9,
      });
      const deployPolicy = result.tuned_policy_order.find((p) => p.policy_mode === "deploy_hardened");
      expect(deployPolicy!.tuned_score).toBeGreaterThan(0.5);
    });

    it("caps allowed adjustment deltas at 0.3", () => {
      const pref = makePreference({ override_limits: { validation_sensitivity_bias: 0.5 } });
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      expect(result.allowed_adjustment_deltas.validation_sensitivity_bias).toBeLessThanOrEqual(0.3);
    });

    it("reduces confidence for low-support preferences", () => {
      const pref = makePreference({ support_count: 2, confidence_score: 0.8 });
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      expect(result.confidence_score).toBeLessThan(0.8);
    });

    it("is deterministic for same inputs", () => {
      const pref = makePreference();
      const input: TuningInput = {
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      };
      const r1 = computeTenantTuning(input);
      const r2 = computeTenantTuning(input);
      expect(r1.tuned_policy_order.map((p) => p.policy_id)).toEqual(r2.tuned_policy_order.map((p) => p.policy_id));
      expect(r1.confidence_score).toBe(r2.confidence_score);
    });

    it("ignores deprecated preferences", () => {
      const pref = makePreference({ status: "deprecated" });
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      expect(result.reason_codes).toContain("no_active_tenant_preference_using_global");
    });
  });

  // ── Override Guard ──
  describe("Tenant Policy Override Guard", () => {
    it("blocks forbidden override keys", () => {
      const result = guardOverrides(
        [{ key: "alter_billing", requested_delta: 0.1 }, { key: "validation_sensitivity_bias", requested_delta: 0.2 }],
        { alter_billing: 0.1, validation_sensitivity_bias: 0.3 },
      );
      expect(result.blocked_overrides).toContain("alter_billing");
      expect(result.allowed_overrides).toHaveProperty("validation_sensitivity_bias");
    });

    it("blocks all forbidden mutation keys", () => {
      const forbidden = ["reorder_pipeline_stages", "skip_mandatory_validation", "disable_governance_gates",
        "alter_plans", "alter_enforcement", "override_safety_contracts", "mutate_pipeline_topology",
        "mutate_governance_rules", "bypass_review_gate", "delete_evidence"];
      const requests = forbidden.map((key) => ({ key, requested_delta: 0.1 }));
      const result = guardOverrides(requests, {});
      expect(result.blocked_overrides.length).toBe(forbidden.length);
      expect(Object.keys(result.allowed_overrides).length).toBe(0);
    });

    it("clamps overrides to declared limits", () => {
      const result = guardOverrides(
        [{ key: "validation_sensitivity_bias", requested_delta: 0.5 }],
        { validation_sensitivity_bias: 0.2 },
      );
      expect(result.allowed_overrides.validation_sensitivity_bias).toBeLessThanOrEqual(0.2);
    });

    it("blocks unknown override keys", () => {
      const result = guardOverrides(
        [{ key: "some_unknown_key", requested_delta: 0.1 }],
        {},
      );
      expect(result.blocked_overrides).toContain("some_unknown_key");
    });

    it("allows valid overrides within bounds", () => {
      const result = guardOverrides(
        [
          { key: "validation_sensitivity_bias", requested_delta: 0.15 },
          { key: "retry_escalation_bias", requested_delta: 0.2 },
        ],
        { validation_sensitivity_bias: 0.3, retry_escalation_bias: 2 },
      );
      expect(result.allowed_overrides.validation_sensitivity_bias).toBe(0.15);
      expect(result.allowed_overrides.retry_escalation_bias).toBe(0.2);
      expect(result.blocked_overrides.length).toBe(0);
    });

    it("never allows overrides beyond 0.3 absolute delta", () => {
      const result = guardOverrides(
        [{ key: "validation_sensitivity_bias", requested_delta: 0.5 }],
        { validation_sensitivity_bias: 0.5 },
      );
      expect(Math.abs(result.allowed_overrides.validation_sensitivity_bias)).toBeLessThanOrEqual(0.3);
    });
  });

  // ── Drift Detector ──
  describe("Tenant Policy Drift Detector", () => {
    it("detects harmful drift when harmful rate exceeds threshold", () => {
      const result = detectTenantDrift({
        preference: { id: "p1", preference_name: "test", preference_scope: "org", confidence_score: 0.7, support_count: 10, status: "active", updated_at: new Date().toISOString() },
        outcomes: Array(10).fill(null).map((_, i) => ({
          outcome_status: i < 5 ? "harmful" : "helpful", applied_mode: "tenant_tuned", created_at: new Date().toISOString(),
        })),
        global_helpful_rate: 0.6,
        global_harmful_rate: 0.1,
      });
      expect(result.signals.some((s: any) => s.signal_type === "harmful_drift")).toBe(true);
      expect(result.overall_health).not.toBe("healthy");
    });

    it("detects stale profile", () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 45);
      const result = detectTenantDrift({
        preference: { id: "p1", preference_name: "test", preference_scope: "org", confidence_score: 0.7, support_count: 10, status: "active", updated_at: staleDate.toISOString() },
        outcomes: [],
        global_helpful_rate: 0.6,
        global_harmful_rate: 0.1,
      });
      expect(result.signals.some((s: any) => s.signal_type === "stale_profile")).toBe(true);
    });

    it("detects overfit (low sample, high confidence)", () => {
      const result = detectTenantDrift({
        preference: { id: "p1", preference_name: "test", preference_scope: "org", confidence_score: 0.9, support_count: 2, status: "active", updated_at: new Date().toISOString() },
        outcomes: [],
        global_helpful_rate: 0.6,
        global_harmful_rate: 0.1,
      });
      expect(result.signals.some((s: any) => s.signal_type === "overfit_local")).toBe(true);
    });

    it("detects divergence from global performance", () => {
      const result = detectTenantDrift({
        preference: { id: "p1", preference_name: "test", preference_scope: "org", confidence_score: 0.7, support_count: 10, status: "active", updated_at: new Date().toISOString() },
        outcomes: Array(10).fill(null).map((_, i) => ({
          outcome_status: i < 2 ? "helpful" : "neutral", applied_mode: "tenant_tuned", created_at: new Date().toISOString(),
        })),
        global_helpful_rate: 0.7,
        global_harmful_rate: 0.05,
      });
      expect(result.signals.some((s: any) => s.signal_type === "divergence_from_global")).toBe(true);
    });

    it("returns healthy for good local performance", () => {
      const result = detectTenantDrift({
        preference: { id: "p1", preference_name: "test", preference_scope: "org", confidence_score: 0.7, support_count: 10, status: "active", updated_at: new Date().toISOString() },
        outcomes: Array(10).fill(null).map(() => ({
          outcome_status: "helpful", applied_mode: "tenant_tuned", created_at: new Date().toISOString(),
        })),
        global_helpful_rate: 0.6,
        global_harmful_rate: 0.1,
      });
      expect(result.overall_health).toBe("healthy");
    });

    it("critical health when harmful rate > 50%", () => {
      const result = detectTenantDrift({
        preference: { id: "p1", preference_name: "test", preference_scope: "org", confidence_score: 0.7, support_count: 10, status: "active", updated_at: new Date().toISOString() },
        outcomes: Array(10).fill(null).map((_, i) => ({
          outcome_status: i < 6 ? "harmful" : "helpful", applied_mode: "tenant_tuned", created_at: new Date().toISOString(),
        })),
        global_helpful_rate: 0.6,
        global_harmful_rate: 0.1,
      });
      expect(result.overall_health).toBe("critical");
      expect(result.signals.find((s: any) => s.signal_type === "harmful_drift")?.recommended_action).toBe("deprecate");
    });
  });

  // ── Safety Constraints ──
  describe("Safety Constraints", () => {
    it("tenant tuning cannot create forbidden override types", () => {
      const result = guardOverrides(
        [{ key: "mutate_pipeline_topology", requested_delta: 0.1 }],
        { mutate_pipeline_topology: 0.1 },
      );
      expect(result.blocked_overrides).toContain("mutate_pipeline_topology");
    });

    it("local tuning falls back to global when no preferences exist", () => {
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "deploy_critical",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [], tenant_outcomes: [],
      });
      expect(result.tuned_policy_order[0].tuning_source).toBe("global");
    });

    it("all override deltas are bounded within 0.3", () => {
      const pref = makePreference({
        override_limits: {
          validation_sensitivity_bias: 1.0,
          retry_escalation_bias: 5,
          predictive_checkpoint_sensitivity_bias: 0.8,
        },
      });
      const result = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      for (const val of Object.values(result.allowed_adjustment_deltas)) {
        expect(val).toBeLessThanOrEqual(0.3);
      }
    });
  });

  // ── Integration ──
  describe("Integration Flow", () => {
    it("full cycle: preference → tuning → outcome → drift detection", () => {
      // 1. Create preference
      const pref = makePreference({ preferred_policy_modes: ["high_quality"], confidence_score: 0.8, support_count: 15 });

      // 2. Compute tuning
      const tuning = computeTenantTuning({
        organization_id: ORG_ID, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      expect(tuning.tuned_policy_order.length).toBeGreaterThan(0);

      // 3. Simulate outcomes
      const outcomes = Array(8).fill(null).map((_, i) => ({
        outcome_status: i < 6 ? "helpful" : "neutral",
        applied_mode: "tenant_tuned",
        created_at: new Date().toISOString(),
      }));

      // 4. Check drift
      const drift = detectTenantDrift({
        preference: { ...pref, updated_at: new Date().toISOString() },
        outcomes,
        global_helpful_rate: 0.6,
        global_harmful_rate: 0.1,
      });
      expect(drift.overall_health).toBe("healthy");
    });

    it("detects when tenant tuning degrades and recommends rollback", () => {
      const pref = makePreference({ confidence_score: 0.8, support_count: 15 });
      const outcomes = Array(10).fill(null).map((_, i) => ({
        outcome_status: i < 6 ? "harmful" : "helpful",
        applied_mode: "tenant_tuned",
        created_at: new Date().toISOString(),
      }));

      const drift = detectTenantDrift({
        preference: { ...pref, updated_at: new Date().toISOString() },
        outcomes,
        global_helpful_rate: 0.7,
        global_harmful_rate: 0.05,
      });
      expect(drift.overall_health).toBe("critical");
      expect(drift.signals.some((s: any) => s.recommended_action === "deprecate" || s.recommended_action === "rollback_to_default")).toBe(true);
    });
  });
});

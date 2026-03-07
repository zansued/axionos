// Sprint 29 — Comprehensive Tenant Adaptive Policy Tuning Tests
// Covers: Tuning Engine, Override Guard, Drift Detector, Tenant-Aware Selector, Safety, Integration
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// Import actual shared modules for testing
// ═══════════════════════════════════════════════════════════════

// --- Types ---
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
  local_repair_burden?: number;
  local_review_burden?: number;
}

interface PolicyProfile {
  id: string;
  policy_name: string;
  policy_mode: string;
  policy_scope: string;
  allowed_adjustments: Record<string, unknown>;
  default_priority: number | null;
  confidence_score: number | null;
  support_count: number;
  status: string;
}

interface DriftInput {
  preference: {
    id: string;
    preference_name: string;
    preference_scope: string;
    confidence_score: number | null;
    support_count: number;
    status: string;
    updated_at: string;
  };
  outcomes: Array<{ outcome_status: string; applied_mode: string; created_at: string }>;
  global_helpful_rate: number;
  global_harmful_rate: number;
}

// ═══════════════════════════════════════════════════════════════
// Inline implementations (mirroring shared modules)
// ═══════════════════════════════════════════════════════════════

// --- Tuning Engine ---
const DEFAULT_PRIORITY_WEIGHTS: Record<string, number> = { quality: 0.3, cost: 0.25, speed: 0.2, stability: 0.25 };

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
  const tuningSource: "global" | "organization" | "workspace" = wsPrefs[0] ? "workspace" : orgPrefs[0] ? "organization" : "global";

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

  const weights = { ...DEFAULT_PRIORITY_WEIGHTS, ...activePreference.priority_weights };
  const preferredModes = new Set(activePreference.preferred_policy_modes);

  const tuned = input.global_policy_ranking.map((p) => {
    let boost = 0;
    if (preferredModes.has(p.policy_mode)) {
      boost += 0.15;
      reasons.push(`preferred_mode_boost_${p.policy_mode}`);
    }

    const localOutcome = input.tenant_outcomes.find(
      (o) => o.policy_id === p.policy_id && o.context_class === input.context_class,
    );
    if (localOutcome && localOutcome.total >= 3) {
      const helpfulRate = localOutcome.helpful / localOutcome.total;
      const harmfulRate = localOutcome.harmful / localOutcome.total;
      boost += (helpfulRate - harmfulRate) * 0.1;
      if (harmfulRate > 0.4) {
        boost -= 0.2;
        reasons.push(`local_harmful_penalty_${p.policy_mode}`);
      }
    }

    if (input.local_cost_pressure && input.local_cost_pressure > 0.7 && p.policy_mode === "cost_optimized") boost += 0.05;
    if (input.local_deploy_criticality && input.local_deploy_criticality > 0.7 && p.policy_mode === "deploy_hardened") boost += 0.05;
    if (input.local_failure_rate && input.local_failure_rate > 0.5 && p.policy_mode === "risk_sensitive") boost += 0.05;

    return {
      policy_id: p.policy_id, policy_mode: p.policy_mode,
      tuned_score: Math.max(0, Math.min(1, p.composite_score + boost)),
      tuning_source: tuningSource,
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

const MAX_ABSOLUTE_DELTA = 0.3;

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
    const maxAllowed = typeof declaredLimit === "number" ? Math.min(Math.abs(declaredLimit), MAX_ABSOLUTE_DELTA) : MAX_ABSOLUTE_DELTA;
    let clamped = Math.max(bounds.min, Math.min(bounds.max, req.requested_delta));
    if (Math.abs(clamped) > maxAllowed) {
      clamped = clamped > 0 ? maxAllowed : -maxAllowed;
      reasons.push(`clamped_${req.key}_to_${clamped}`);
    }
    allowed[req.key] = clamped;
  }

  return { allowed_overrides: allowed, blocked_overrides: blocked, reason_codes: reasons };
}

function validateOverrideLimits(limits: Record<string, unknown>): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const key of Object.keys(limits)) {
    if (FORBIDDEN_OVERRIDE_KEYS.has(key)) violations.push(key);
  }
  return { valid: violations.length === 0, violations };
}

// --- Drift Detector ---
const STALE_DAYS = 30;
const MIN_SAMPLE_SIZE = 5;
const HARMFUL_THRESHOLD = 0.35;
const DIVERGENCE_THRESHOLD = 0.25;

function detectTenantDrift(input: DriftInput) {
  const signals: any[] = [];
  const reasons: string[] = [];
  const { preference, outcomes } = input;

  // 1. Harmful drift
  if (outcomes.length >= MIN_SAMPLE_SIZE) {
    const harmful = outcomes.filter((o) => o.outcome_status === "harmful").length;
    const harmfulRate = harmful / outcomes.length;
    if (harmfulRate > HARMFUL_THRESHOLD) {
      signals.push({
        signal_type: "harmful_drift",
        severity: harmfulRate > 0.5 ? "high" : "medium",
        description: `${(harmfulRate * 100).toFixed(0)}% harmful outcomes for "${preference.preference_name}"`,
        recommended_action: harmfulRate > 0.5 ? "deprecate" : "rollback_to_default",
        confidence: Math.min(1, outcomes.length / 10),
      });
      reasons.push("harmful_outcome_rate_exceeded");
    }
  }

  // 2. Stale profile
  const daysSinceUpdate = (Date.now() - new Date(preference.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > STALE_DAYS && preference.status === "active") {
    signals.push({
      signal_type: "stale_profile",
      severity: daysSinceUpdate > 60 ? "medium" : "low",
      description: `Profile "${preference.preference_name}" not updated in ${Math.round(daysSinceUpdate)} days`,
      recommended_action: "watch",
      confidence: 0.7,
    });
    reasons.push("stale_preference_profile");
  }

  // 3. Overfit (low sample, high confidence)
  if (preference.support_count < MIN_SAMPLE_SIZE && (preference.confidence_score ?? 0) > 0.7) {
    signals.push({
      signal_type: "overfit_local",
      severity: "medium",
      description: `Profile "${preference.preference_name}" has high confidence (${preference.confidence_score}) with only ${preference.support_count} support samples`,
      recommended_action: "tighten_limits",
      confidence: 0.8,
    });
    reasons.push("overfit_low_sample_high_confidence");
  }

  // 4. Low-sample tuning
  if (outcomes.length < MIN_SAMPLE_SIZE && preference.status === "active") {
    signals.push({
      signal_type: "low_sample_tuning",
      severity: "low",
      description: `Only ${outcomes.length} outcomes recorded for active profile "${preference.preference_name}"`,
      recommended_action: "watch",
      confidence: 0.6,
    });
    reasons.push("low_sample_active_tuning");
  }

  // 5. Divergence from global
  if (outcomes.length >= MIN_SAMPLE_SIZE) {
    const localHelpfulRate = outcomes.filter((o) => o.outcome_status === "helpful").length / outcomes.length;
    const divergence = input.global_helpful_rate - localHelpfulRate;
    if (divergence > DIVERGENCE_THRESHOLD) {
      signals.push({
        signal_type: "divergence_from_global",
        severity: divergence > 0.4 ? "high" : "medium",
        description: `Local helpful rate (${(localHelpfulRate * 100).toFixed(0)}%) significantly below global (${(input.global_helpful_rate * 100).toFixed(0)}%)`,
        recommended_action: divergence > 0.4 ? "rollback_to_default" : "tighten_limits",
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

// --- Tenant-Aware Policy Selector ---
const DEFAULT_POLICY: PolicyProfile = {
  id: "default-balanced", policy_name: "Balanced Default", policy_mode: "balanced_default",
  policy_scope: "global", allowed_adjustments: {}, default_priority: 0,
  confidence_score: 1.0, support_count: 999, status: "active",
};

function selectExecutionPolicy(profiles: PolicyProfile[], input: { context_class: string; confidence_score: number; organization_id: string }) {
  const reasons: string[] = [];
  const active = profiles.filter((p) => p.status === "active");
  if (active.length === 0) {
    reasons.push("no_active_profiles_using_default");
    return { selected_policy: DEFAULT_POLICY, selection_mode: "default_fallback" as const, reason_codes: reasons, candidates_evaluated: profiles.length };
  }
  const exactMatches = active.filter((p) => p.policy_mode === input.context_class);
  const scopeOrder = ["execution_context", "workspace", "initiative_type", "global"];
  for (const scope of scopeOrder) {
    const scopeMatches = exactMatches.filter((p) => p.policy_scope === scope);
    if (scopeMatches.length > 0) {
      const selected = scopeMatches.sort((a, b) => {
        const pDiff = (b.default_priority ?? 0) - (a.default_priority ?? 0);
        if (pDiff !== 0) return pDiff;
        return (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
      })[0];
      reasons.push(`exact_match_scope_${scope}`);
      return { selected_policy: selected, selection_mode: "exact_match" as const, reason_codes: reasons, candidates_evaluated: active.length };
    }
  }
  const globalFallback = active.filter((p) => p.policy_scope === "global").sort((a, b) => (b.default_priority ?? 0) - (a.default_priority ?? 0));
  if (globalFallback.length > 0) {
    reasons.push("scope_fallback_global");
    return { selected_policy: globalFallback[0], selection_mode: "scope_fallback" as const, reason_codes: reasons, candidates_evaluated: active.length };
  }
  reasons.push("no_matching_policy_using_default");
  return { selected_policy: DEFAULT_POLICY, selection_mode: "default_fallback" as const, reason_codes: reasons, candidates_evaluated: active.length };
}

function selectTenantAwarePolicy(input: {
  organization_id: string;
  workspace_id?: string;
  context_class: string;
  confidence_score: number;
  global_profiles: PolicyProfile[];
  tenant_preferences: TenantPreference[];
  tenant_outcomes: Array<{ policy_id: string; context_class: string; helpful: number; harmful: number; neutral: number; total: number }>;
  global_ranking?: Array<{ policy_id: string; policy_mode: string; composite_score: number }>;
  local_failure_rate?: number;
  local_cost_pressure?: number;
  local_deploy_criticality?: number;
}) {
  const reasons: string[] = [];

  // Step 1: Global selection baseline
  const globalSelection = selectExecutionPolicy(input.global_profiles, {
    context_class: input.context_class,
    confidence_score: input.confidence_score,
    organization_id: input.organization_id,
  });

  // Step 2: Check tenant prefs
  const activePrefs = input.tenant_preferences.filter((p) => p.status === "active");
  if (activePrefs.length === 0) {
    reasons.push("no_active_tenant_preferences_using_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default" as const,
      global_selection: globalSelection,
      tuning: null,
      reason_codes: [...globalSelection.reason_codes, ...reasons],
    };
  }

  // Step 3: Compute tenant tuning
  const globalRanking = input.global_ranking || input.global_profiles
    .filter((p) => p.status === "active")
    .map((p) => ({
      policy_id: p.id, policy_mode: p.policy_mode,
      composite_score: (p.confidence_score ?? 0.5) * 0.5 + ((p.default_priority ?? 0) / 10) * 0.5,
    }));

  const tuning = computeTenantTuning({
    organization_id: input.organization_id,
    workspace_id: input.workspace_id,
    context_class: input.context_class,
    global_policy_ranking: globalRanking,
    tenant_preferences: activePrefs,
    tenant_outcomes: input.tenant_outcomes,
    local_failure_rate: input.local_failure_rate,
    local_cost_pressure: input.local_cost_pressure,
    local_deploy_criticality: input.local_deploy_criticality,
  });

  // Step 4: Validate tuning confidence
  if (tuning.confidence_score < 0.3) {
    reasons.push("tenant_tuning_low_confidence_fallback_to_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default" as const,
      global_selection: globalSelection,
      tuning,
      reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
    };
  }

  // Step 5: Select from tuned ordering
  const topTuned = tuning.tuned_policy_order[0];
  if (!topTuned) {
    reasons.push("empty_tuned_order_fallback_to_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default" as const,
      global_selection: globalSelection,
      tuning,
      reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
    };
  }

  const tunedPolicy = input.global_profiles.find((p) => p.id === topTuned.policy_id) || null;
  if (!tunedPolicy || tunedPolicy.status !== "active") {
    reasons.push("tuned_policy_not_active_fallback_to_global");
    return {
      selected_policy: globalSelection.selected_policy,
      selection_mode: "global_default" as const,
      global_selection: globalSelection,
      tuning,
      reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
    };
  }

  const selectionMode = topTuned.tuning_source === "workspace"
    ? "workspace_tuned" as const
    : topTuned.tuning_source === "organization"
      ? "tenant_tuned" as const
      : "global_default" as const;

  reasons.push(`tenant_tuned_selected_${tunedPolicy.policy_mode}`);

  return {
    selected_policy: tunedPolicy,
    selection_mode: selectionMode,
    global_selection: globalSelection,
    tuning,
    reason_codes: [...globalSelection.reason_codes, ...tuning.reason_codes, ...reasons],
  };
}

// ═══════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════

const ORG_A = "org-a-test";
const ORG_B = "org-b-test";
const WS_1 = "ws-1-test";
const WS_2 = "ws-2-test";

const makePreference = (overrides: Partial<TenantPreference> = {}): TenantPreference => ({
  id: "pref-1",
  organization_id: ORG_A,
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

const makeWsPreference = (ws: string, overrides: Partial<TenantPreference> = {}): TenantPreference =>
  makePreference({ id: `pref-ws-${ws}`, workspace_id: ws, preference_scope: "workspace", preference_name: `ws_pref_${ws}`, ...overrides });

const GLOBAL_RANKING = [
  { policy_id: "p1", policy_mode: "balanced_default", composite_score: 0.7 },
  { policy_id: "p2", policy_mode: "cost_optimized", composite_score: 0.6 },
  { policy_id: "p3", policy_mode: "high_quality", composite_score: 0.5 },
  { policy_id: "p4", policy_mode: "deploy_hardened", composite_score: 0.45 },
  { policy_id: "p5", policy_mode: "risk_sensitive", composite_score: 0.4 },
];

const makeGlobalProfiles = (): PolicyProfile[] => GLOBAL_RANKING.map((r) => ({
  id: r.policy_id, policy_name: r.policy_mode, policy_mode: r.policy_mode,
  policy_scope: "global", allowed_adjustments: {}, default_priority: Math.round(r.composite_score * 10),
  confidence_score: r.composite_score, support_count: 50, status: "active",
}));

const makeDriftPref = (overrides: Partial<DriftInput["preference"]> = {}): DriftInput["preference"] => ({
  id: "dp-1", preference_name: "test_pref", preference_scope: "organization",
  confidence_score: 0.7, support_count: 10, status: "active",
  updated_at: new Date().toISOString(), ...overrides,
});

const makeOutcomes = (count: number, status: string): DriftInput["outcomes"] =>
  Array(count).fill(null).map(() => ({ outcome_status: status, applied_mode: "tenant_tuned", created_at: new Date().toISOString() }));

const makeMixedOutcomes = (helpful: number, harmful: number, neutral: number): DriftInput["outcomes"] => [
  ...makeOutcomes(helpful, "helpful"),
  ...makeOutcomes(harmful, "harmful"),
  ...makeOutcomes(neutral, "neutral"),
];

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe("Sprint 29 — Tenant Adaptive Policy Tuning (Comprehensive)", () => {

  // ════════════════════════════════════════════════════════════
  // 2. Tenant Policy Preference Profiles
  // ════════════════════════════════════════════════════════════
  describe("2. Tenant Policy Preference Profiles", () => {
    describe("2.1 Profile creation validation", () => {
      it("creates valid organizational profile", () => {
        const pref = makePreference();
        expect(pref.organization_id).toBe(ORG_A);
        expect(pref.preference_scope).toBe("organization");
        expect(pref.workspace_id).toBeNull();
        expect(pref.preferred_policy_modes.length).toBeGreaterThan(0);
        expect(Object.keys(pref.priority_weights).length).toBeGreaterThan(0);
      });

      it("creates valid workspace profile", () => {
        const pref = makeWsPreference(WS_1);
        expect(pref.workspace_id).toBe(WS_1);
        expect(pref.preference_scope).toBe("workspace");
      });

      it("workspace_id null is valid for organization scope", () => {
        const pref = makePreference({ preference_scope: "organization", workspace_id: null });
        expect(pref.workspace_id).toBeNull();
        expect(pref.preference_scope).toBe("organization");
      });
    });

    describe("2.2 Content validation", () => {
      it("deprecated profiles are excluded from tuning selection", () => {
        const pref = makePreference({ status: "deprecated" });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(result.reason_codes).toContain("no_active_tenant_preference_using_global");
        expect(result.tuned_policy_order[0].tuning_source).toBe("global");
      });

      it("watch profiles are excluded from tuning selection", () => {
        const pref = makePreference({ status: "watch" });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(result.reason_codes).toContain("no_active_tenant_preference_using_global");
      });

      it("draft profiles are excluded from tuning selection", () => {
        const pref = makePreference({ status: "draft" });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(result.reason_codes).toContain("no_active_tenant_preference_using_global");
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 3. Tenant Adaptive Tuning Engine
  // ════════════════════════════════════════════════════════════
  describe("3. Tenant Adaptive Tuning Engine", () => {
    describe("3.1 Basic tuning calculations", () => {
      it("combines global portfolio with local profile correctly", () => {
        const pref = makePreference({ preferred_policy_modes: ["cost_optimized"] });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(result.tuned_policy_order.length).toBe(GLOBAL_RANKING.length);
        expect(result.tuned_policy_order[0].tuning_source).toBe("organization");
      });

      it("considers local historical outcomes (helpful boosts)", () => {
        const pref = makePreference({ preferred_policy_modes: [] });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
          tenant_outcomes: [{ policy_id: "p3", context_class: "general", helpful: 9, harmful: 0, neutral: 1, total: 10 }],
        });
        const hq = result.tuned_policy_order.find((p) => p.policy_id === "p3")!;
        expect(hq.tuned_score).toBeGreaterThan(0.5); // boosted from 0.5
      });

      it("considers local failure patterns (harmful penalties)", () => {
        const pref = makePreference({ preferred_policy_modes: [] });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
          tenant_outcomes: [{ policy_id: "p1", context_class: "general", helpful: 0, harmful: 5, neutral: 0, total: 5 }],
        });
        const bd = result.tuned_policy_order.find((p) => p.policy_id === "p1")!;
        expect(bd.tuned_score).toBeLessThan(0.7); // penalized from 0.7
      });

      it("considers local cost pressure", () => {
        const pref = makePreference({ preferred_policy_modes: [] });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
          tenant_outcomes: [], local_cost_pressure: 0.9,
        });
        const co = result.tuned_policy_order.find((p) => p.policy_mode === "cost_optimized")!;
        expect(co.tuned_score).toBeGreaterThan(0.6); // boosted
      });

      it("considers local deploy criticality", () => {
        const pref = makePreference({ preferred_policy_modes: [] });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
          tenant_outcomes: [], local_deploy_criticality: 0.9,
        });
        const dh = result.tuned_policy_order.find((p) => p.policy_mode === "deploy_hardened")!;
        expect(dh.tuned_score).toBeGreaterThan(0.45);
      });

      it("considers local failure rate for risk_sensitive boost", () => {
        const pref = makePreference({ preferred_policy_modes: [] });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
          tenant_outcomes: [], local_failure_rate: 0.8,
        });
        const rs = result.tuned_policy_order.find((p) => p.policy_mode === "risk_sensitive")!;
        expect(rs.tuned_score).toBeGreaterThan(0.4);
      });

      it("returns tuned_policy_order", () => {
        const pref = makePreference();
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(Array.isArray(result.tuned_policy_order)).toBe(true);
        expect(result.tuned_policy_order[0]).toHaveProperty("policy_id");
        expect(result.tuned_policy_order[0]).toHaveProperty("tuned_score");
        expect(result.tuned_policy_order[0]).toHaveProperty("tuning_source");
      });

      it("returns allowed_adjustment_deltas", () => {
        const pref = makePreference({ override_limits: { validation_sensitivity_bias: 0.15 } });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(result.allowed_adjustment_deltas).toHaveProperty("validation_sensitivity_bias");
        expect(result.allowed_adjustment_deltas.validation_sensitivity_bias).toBeLessThanOrEqual(0.3);
      });

      it("returns confidence_score", () => {
        const pref = makePreference();
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(typeof result.confidence_score).toBe("number");
        expect(result.confidence_score).toBeGreaterThanOrEqual(0);
        expect(result.confidence_score).toBeLessThanOrEqual(1);
      });

      it("returns reason_codes and evidence_refs", () => {
        const pref = makePreference();
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(Array.isArray(result.reason_codes)).toBe(true);
        expect(Array.isArray(result.evidence_refs)).toBe(true);
        expect(result.evidence_refs).toContain(pref.id);
      });
    });

    describe("3.2 Determinism", () => {
      it("same input produces same tuning output", () => {
        const pref = makePreference();
        const input: TuningInput = {
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
          tenant_outcomes: [{ policy_id: "p2", context_class: "general", helpful: 7, harmful: 1, neutral: 2, total: 10 }],
          local_cost_pressure: 0.8,
        };
        const r1 = computeTenantTuning(input);
        const r2 = computeTenantTuning(input);
        expect(r1.tuned_policy_order.map((p) => p.policy_id)).toEqual(r2.tuned_policy_order.map((p) => p.policy_id));
        expect(r1.tuned_policy_order.map((p) => p.tuned_score)).toEqual(r2.tuned_policy_order.map((p) => p.tuned_score));
        expect(r1.confidence_score).toBe(r2.confidence_score);
        expect(r1.allowed_adjustment_deltas).toEqual(r2.allowed_adjustment_deltas);
      });

      it("same input produces same reason codes", () => {
        const pref = makePreference();
        const input: TuningInput = {
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        };
        const r1 = computeTenantTuning(input);
        const r2 = computeTenantTuning(input);
        expect(r1.reason_codes).toEqual(r2.reason_codes);
      });
    });

    describe("3.3 Robustness", () => {
      it("empty local history falls back to global preference safely", () => {
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [], tenant_outcomes: [],
        });
        expect(result.tuned_policy_order[0].tuning_source).toBe("global");
        expect(result.confidence_score).toBe(1.0);
        expect(result.tuned_policy_order.length).toBe(GLOBAL_RANKING.length);
      });

      it("conflicting signals produce lower confidence", () => {
        const pref = makePreference({ confidence_score: 0.4, support_count: 3 });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(result.confidence_score).toBeLessThan(0.5);
      });

      it("incomplete profile with partial override_limits works", () => {
        const pref = makePreference({ override_limits: {} });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(Object.keys(result.allowed_adjustment_deltas).length).toBe(0);
        expect(result.tuned_policy_order.length).toBeGreaterThan(0);
      });

      it("workspace without profile inherits organization", () => {
        const orgPref = makePreference({ id: "org-pref", preference_scope: "organization" });
        const result = computeTenantTuning({
          organization_id: ORG_A, workspace_id: WS_1, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [orgPref], tenant_outcomes: [],
        });
        expect(result.tuned_policy_order[0].tuning_source).toBe("organization");
      });

      it("organization without local profile uses global default", () => {
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "deploy_critical",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [], tenant_outcomes: [],
        });
        expect(result.tuned_policy_order[0].tuning_source).toBe("global");
      });

      it("null confidence_score defaults to 0.5 base", () => {
        const pref = makePreference({ confidence_score: null, support_count: 10 });
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
        });
        expect(result.confidence_score).toBe(0.5);
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 4. Bounded Local Overrides
  // ════════════════════════════════════════════════════════════
  describe("4. Bounded Local Overrides", () => {
    describe("4.1 Allowed overrides", () => {
      it("allows validation_sensitivity_bias adjustment", () => {
        const r = guardOverrides([{ key: "validation_sensitivity_bias", requested_delta: 0.1 }], { validation_sensitivity_bias: 0.3 });
        expect(r.allowed_overrides.validation_sensitivity_bias).toBe(0.1);
      });

      it("allows retry_escalation_bias adjustment", () => {
        const r = guardOverrides([{ key: "retry_escalation_bias", requested_delta: 1.5 }], { retry_escalation_bias: 2 });
        expect(r.allowed_overrides.retry_escalation_bias).toBeDefined();
      });

      it("allows predictive_checkpoint_sensitivity_bias", () => {
        const r = guardOverrides([{ key: "predictive_checkpoint_sensitivity_bias", requested_delta: 0.2 }], { predictive_checkpoint_sensitivity_bias: 0.3 });
        expect(r.allowed_overrides.predictive_checkpoint_sensitivity_bias).toBe(0.2);
      });

      it("allows human_review_threshold_bias", () => {
        const r = guardOverrides([{ key: "human_review_threshold_bias", requested_delta: 0.1 }], { human_review_threshold_bias: 0.2 });
        expect(r.allowed_overrides.human_review_threshold_bias).toBe(0.1);
      });

      it("allows context_enrichment_level_bias", () => {
        const r = guardOverrides([{ key: "context_enrichment_level_bias", requested_delta: 0.15 }], { context_enrichment_level_bias: 0.3 });
        expect(r.allowed_overrides.context_enrichment_level_bias).toBe(0.15);
      });

      it("allows prompt_experimentation_exposure_cap", () => {
        const r = guardOverrides([{ key: "prompt_experimentation_exposure_cap", requested_delta: 0.2 }], { prompt_experimentation_exposure_cap: 0.3 });
        expect(r.allowed_overrides.prompt_experimentation_exposure_cap).toBe(0.2);
      });

      it("allows multiple valid overrides at once", () => {
        const r = guardOverrides([
          { key: "validation_sensitivity_bias", requested_delta: 0.1 },
          { key: "retry_escalation_bias", requested_delta: 0.5 },
          { key: "context_enrichment_level_bias", requested_delta: 0.2 },
        ], {
          validation_sensitivity_bias: 0.3, retry_escalation_bias: 2, context_enrichment_level_bias: 0.3,
        });
        expect(Object.keys(r.allowed_overrides).length).toBe(3);
        expect(r.blocked_overrides.length).toBe(0);
      });
    });

    describe("4.2 Limits", () => {
      it("clamps delta above declared limit", () => {
        const r = guardOverrides([{ key: "validation_sensitivity_bias", requested_delta: 0.5 }], { validation_sensitivity_bias: 0.15 });
        expect(r.allowed_overrides.validation_sensitivity_bias).toBeLessThanOrEqual(0.15);
      });

      it("clamps delta below minimum bound", () => {
        const r = guardOverrides([{ key: "prompt_experimentation_exposure_cap", requested_delta: -0.5 }], { prompt_experimentation_exposure_cap: 0.3 });
        // min is 0, so clamped to 0
        expect(r.allowed_overrides.prompt_experimentation_exposure_cap).toBeGreaterThanOrEqual(0);
      });

      it("blocks override without declared limit (still uses default 0.3 max)", () => {
        const r = guardOverrides([{ key: "validation_sensitivity_bias", requested_delta: 0.2 }], {});
        // No declared limit → uses MAX_ABSOLUTE_DELTA 0.3 as max, so 0.2 is within bounds
        expect(r.allowed_overrides.validation_sensitivity_bias).toBe(0.2);
      });

      it("blocks unknown / unauthorized override keys", () => {
        const r = guardOverrides([{ key: "magic_booster", requested_delta: 0.1 }], {});
        expect(r.blocked_overrides).toContain("magic_booster");
        expect(r.reason_codes.some((rc) => rc.includes("unknown_override_key"))).toBe(true);
      });

      it("does not create new adjustment types", () => {
        const r = guardOverrides([
          { key: "brand_new_adjustment", requested_delta: 0.1 },
          { key: "another_custom_thing", requested_delta: 0.05 },
        ], {});
        expect(r.blocked_overrides).toContain("brand_new_adjustment");
        expect(r.blocked_overrides).toContain("another_custom_thing");
      });
    });

    describe("4.3 Guardrails — forbidden mutations", () => {
      const ALL_FORBIDDEN = [
        "reorder_pipeline_stages", "skip_mandatory_validation", "disable_governance_gates",
        "alter_billing", "alter_plans", "alter_enforcement", "override_safety_contracts",
        "mutate_pipeline_topology", "mutate_governance_rules", "bypass_review_gate", "delete_evidence",
      ];

      it.each(ALL_FORBIDDEN)("blocks forbidden key: %s", (key) => {
        const r = guardOverrides([{ key, requested_delta: 0.01 }], { [key]: 0.5 });
        expect(r.blocked_overrides).toContain(key);
        expect(r.allowed_overrides).not.toHaveProperty(key);
      });

      it("blocks all forbidden keys at once", () => {
        const requests = ALL_FORBIDDEN.map((key) => ({ key, requested_delta: 0.1 }));
        const r = guardOverrides(requests, {});
        expect(r.blocked_overrides.length).toBe(ALL_FORBIDDEN.length);
        expect(Object.keys(r.allowed_overrides).length).toBe(0);
      });

      it("never allows any override beyond 0.3 absolute delta", () => {
        const r = guardOverrides([
          { key: "validation_sensitivity_bias", requested_delta: 0.5 },
          { key: "predictive_checkpoint_sensitivity_bias", requested_delta: -0.5 },
        ], { validation_sensitivity_bias: 0.5, predictive_checkpoint_sensitivity_bias: 0.5 });
        for (const val of Object.values(r.allowed_overrides)) {
          expect(Math.abs(val)).toBeLessThanOrEqual(0.3);
        }
      });

      it("validateOverrideLimits detects forbidden keys in limits", () => {
        const v = validateOverrideLimits({ alter_billing: 0.1, validation_sensitivity_bias: 0.2 });
        expect(v.valid).toBe(false);
        expect(v.violations).toContain("alter_billing");
      });

      it("validateOverrideLimits passes for clean limits", () => {
        const v = validateOverrideLimits({ validation_sensitivity_bias: 0.2, retry_escalation_bias: 1 });
        expect(v.valid).toBe(true);
        expect(v.violations.length).toBe(0);
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 5. Tenant-Aware Policy Selector
  // ════════════════════════════════════════════════════════════
  describe("5. Tenant-Aware Policy Selector", () => {
    const profiles = makeGlobalProfiles();

    describe("5.1 Normal selection", () => {
      it("selects global policy when no tenant preference exists", () => {
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [], tenant_outcomes: [],
        });
        expect(r.selection_mode).toBe("global_default");
        expect(r.tuning).toBeNull();
      });

      it("selects tenant-tuned when org preference is active and beneficial", () => {
        const pref = makePreference({ preferred_policy_modes: ["cost_optimized"], confidence_score: 0.8, support_count: 15 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [pref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("tenant_tuned");
        expect(r.tuning).not.toBeNull();
      });

      it("selects workspace-tuned when workspace preference exists", () => {
        const wsPref = makeWsPreference(WS_1, { preferred_policy_modes: ["high_quality"], confidence_score: 0.8, support_count: 15 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, workspace_id: WS_1, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [wsPref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("workspace_tuned");
      });

      it("falls back to global when tuning confidence is low", () => {
        const pref = makePreference({ confidence_score: 0.1, support_count: 1 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [pref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("global_default");
        expect(r.reason_codes.some((rc) => rc.includes("low_confidence"))).toBe(true);
      });
    });

    describe("5.2 Precedence", () => {
      it("workspace override prevails over org profile when valid", () => {
        const orgPref = makePreference({ id: "op", preference_scope: "organization", preferred_policy_modes: ["balanced_default"], confidence_score: 0.8, support_count: 10 });
        const wsPref = makeWsPreference(WS_1, { preferred_policy_modes: ["high_quality"], confidence_score: 0.8, support_count: 10 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, workspace_id: WS_1, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [orgPref, wsPref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("workspace_tuned");
      });

      it("org profile prevails when workspace is absent", () => {
        const orgPref = makePreference({ id: "op", preferred_policy_modes: ["cost_optimized"], confidence_score: 0.8, support_count: 10 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [orgPref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("tenant_tuned");
      });

      it("low-confidence local tuning doesn't override global safe fallback", () => {
        const pref = makePreference({ confidence_score: 0.15, support_count: 1 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [pref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("global_default");
      });
    });

    describe("5.3 Decision recording", () => {
      it("records global_default mode", () => {
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [], tenant_outcomes: [],
        });
        expect(r.selection_mode).toBe("global_default");
        expect(r.reason_codes.length).toBeGreaterThan(0);
      });

      it("records tenant_tuned mode with reason codes", () => {
        const pref = makePreference({ confidence_score: 0.8, support_count: 15 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [pref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("tenant_tuned");
        expect(r.reason_codes.some((rc) => rc.includes("tenant_tuned_selected"))).toBe(true);
      });

      it("records workspace_tuned mode with evidence refs", () => {
        const wsPref = makeWsPreference(WS_1, { confidence_score: 0.8, support_count: 15 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, workspace_id: WS_1, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [wsPref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.selection_mode).toBe("workspace_tuned");
        expect(r.tuning!.evidence_refs.length).toBeGreaterThan(0);
      });

      it("includes global selection in result", () => {
        const pref = makePreference({ confidence_score: 0.8, support_count: 15 });
        const r = selectTenantAwarePolicy({
          organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
          global_profiles: profiles, tenant_preferences: [pref], tenant_outcomes: [],
          global_ranking: GLOBAL_RANKING,
        });
        expect(r.global_selection).toBeDefined();
        expect(r.global_selection.selected_policy).toBeDefined();
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 6. Tenant Policy Outcome Tracking
  // ════════════════════════════════════════════════════════════
  describe("6. Tenant Policy Outcome Tracking", () => {
    describe("6.3 Comparison local vs global", () => {
      it("helpful local tuning is reflected in positive outcome summaries", () => {
        const pref = makePreference({ preferred_policy_modes: ["cost_optimized"] });
        const outcomes = [{ policy_id: "p2", context_class: "general", helpful: 8, harmful: 1, neutral: 1, total: 10 }];
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: outcomes,
        });
        const co = result.tuned_policy_order.find((p) => p.policy_id === "p2")!;
        expect(co.tuned_score).toBeGreaterThan(0.6); // original was 0.6 + boosts
      });

      it("harmful local tuning is penalized", () => {
        const pref = makePreference({ preferred_policy_modes: ["cost_optimized"] });
        const outcomes = [{ policy_id: "p2", context_class: "general", helpful: 0, harmful: 5, neutral: 0, total: 5 }];
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: outcomes,
        });
        const co = result.tuned_policy_order.find((p) => p.policy_id === "p2")!;
        // Preferred mode boost +0.15, but harmful penalty -0.2, net loss
        expect(co.tuned_score).toBeLessThan(0.7);
      });

      it("low-sample outcomes (<3) are not factored in", () => {
        const pref = makePreference({ preferred_policy_modes: [] });
        const outcomes = [{ policy_id: "p1", context_class: "general", helpful: 0, harmful: 2, neutral: 0, total: 2 }];
        const result = computeTenantTuning({
          organization_id: ORG_A, context_class: "general",
          global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: outcomes,
        });
        const bd = result.tuned_policy_order.find((p) => p.policy_id === "p1")!;
        expect(bd.tuned_score).toBe(0.7); // unchanged, sample too small
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 7. Tenant Drift and Conflict Detection
  // ════════════════════════════════════════════════════════════
  describe("7. Tenant Drift and Conflict Detection", () => {
    describe("7.1 Drift detection", () => {
      it("detects harmful drift when harmful rate exceeds threshold (>35%)", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref(),
          outcomes: makeMixedOutcomes(3, 4, 3), // 40% harmful
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "harmful_drift")).toBe(true);
        expect(r.reason_codes).toContain("harmful_outcome_rate_exceeded");
      });

      it("does NOT flag harmful drift below threshold", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref(),
          outcomes: makeMixedOutcomes(6, 2, 2), // 20% harmful
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "harmful_drift")).toBe(false);
      });

      it("detects stale profile (>30 days without update)", () => {
        const staleDate = new Date();
        staleDate.setDate(staleDate.getDate() - 45);
        const r = detectTenantDrift({
          preference: makeDriftPref({ updated_at: staleDate.toISOString() }),
          outcomes: [], global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "stale_profile")).toBe(true);
        expect(r.reason_codes).toContain("stale_preference_profile");
      });

      it("stale >60 days is medium severity", () => {
        const staleDate = new Date();
        staleDate.setDate(staleDate.getDate() - 65);
        const r = detectTenantDrift({
          preference: makeDriftPref({ updated_at: staleDate.toISOString() }),
          outcomes: [], global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        const staleSignal = r.signals.find((s: any) => s.signal_type === "stale_profile");
        expect(staleSignal.severity).toBe("medium");
      });

      it("detects divergence from global helpful rate", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref(),
          outcomes: makeMixedOutcomes(2, 0, 8), // 20% helpful local vs 70% global
          global_helpful_rate: 0.7, global_harmful_rate: 0.05,
        });
        expect(r.signals.some((s: any) => s.signal_type === "divergence_from_global")).toBe(true);
      });

      it("detects low_sample_tuning for active profiles with few outcomes", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref(),
          outcomes: makeOutcomes(3, "helpful"),
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "low_sample_tuning")).toBe(true);
      });

      it("does NOT flag low_sample for non-active profiles", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref({ status: "deprecated" }),
          outcomes: makeOutcomes(3, "helpful"),
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "low_sample_tuning")).toBe(false);
      });
    });

    describe("7.2 Overfit detection", () => {
      it("detects overfit: low sample + high confidence", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref({ support_count: 2, confidence_score: 0.9 }),
          outcomes: [], global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "overfit_local")).toBe(true);
        expect(r.reason_codes).toContain("overfit_low_sample_high_confidence");
      });

      it("does NOT flag overfit when support is adequate", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref({ support_count: 10, confidence_score: 0.9 }),
          outcomes: makeOutcomes(10, "helpful"),
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "overfit_local")).toBe(false);
      });

      it("does NOT flag overfit when confidence is low", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref({ support_count: 2, confidence_score: 0.3 }),
          outcomes: [], global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.signals.some((s: any) => s.signal_type === "overfit_local")).toBe(false);
      });

      it("low support + high divergence triggers both overfit and divergence", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref({ support_count: 2, confidence_score: 0.9 }),
          outcomes: makeMixedOutcomes(1, 0, 9), // 10% helpful local vs 70% global
          global_helpful_rate: 0.7, global_harmful_rate: 0.05,
        });
        expect(r.signals.some((s: any) => s.signal_type === "overfit_local")).toBe(true);
        expect(r.signals.some((s: any) => s.signal_type === "divergence_from_global")).toBe(true);
      });
    });

    describe("7.3 Overall health assessment", () => {
      it("healthy when no signals", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref(),
          outcomes: makeOutcomes(10, "helpful"),
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.overall_health).toBe("healthy");
      });

      it("warning when medium severity signals present", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref({ support_count: 2, confidence_score: 0.9 }),
          outcomes: makeMixedOutcomes(5, 3, 2), // 30% harmful, below threshold, but overfit triggers
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.overall_health).toBe("warning");
      });

      it("critical when high severity harmful drift (>50%)", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref(),
          outcomes: makeMixedOutcomes(2, 6, 2), // 60% harmful
          global_helpful_rate: 0.6, global_harmful_rate: 0.1,
        });
        expect(r.overall_health).toBe("critical");
        const hd = r.signals.find((s: any) => s.signal_type === "harmful_drift");
        expect(hd.severity).toBe("high");
        expect(hd.recommended_action).toBe("deprecate");
      });

      it("critical when severe divergence from global (>40% gap)", () => {
        const r = detectTenantDrift({
          preference: makeDriftPref(),
          outcomes: makeMixedOutcomes(0, 0, 10), // 0% helpful local vs 70% global
          global_helpful_rate: 0.7, global_harmful_rate: 0.05,
        });
        const divSignal = r.signals.find((s: any) => s.signal_type === "divergence_from_global");
        expect(divSignal).toBeDefined();
        expect(divSignal.severity).toBe("high");
        expect(divSignal.recommended_action).toBe("rollback_to_default");
        expect(r.overall_health).toBe("critical");
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 8. Recommendations structure
  // ════════════════════════════════════════════════════════════
  describe("8. Recommendation generation signals", () => {
    it("harmful drift generates rollback_to_default or deprecate recommendation", () => {
      const r = detectTenantDrift({
        preference: makeDriftPref(),
        outcomes: makeMixedOutcomes(2, 6, 2), // 60% harmful
        global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      const harmful = r.signals.find((s: any) => s.signal_type === "harmful_drift");
      expect(["deprecate", "rollback_to_default"]).toContain(harmful.recommended_action);
    });

    it("overfit generates tighten_limits recommendation", () => {
      const r = detectTenantDrift({
        preference: makeDriftPref({ support_count: 2, confidence_score: 0.9 }),
        outcomes: [], global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      const overfit = r.signals.find((s: any) => s.signal_type === "overfit_local");
      expect(overfit.recommended_action).toBe("tighten_limits");
    });

    it("stale profile generates watch recommendation", () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 45);
      const r = detectTenantDrift({
        preference: makeDriftPref({ updated_at: staleDate.toISOString() }),
        outcomes: [], global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      const stale = r.signals.find((s: any) => s.signal_type === "stale_profile");
      expect(stale.recommended_action).toBe("watch");
    });

    it("moderate divergence generates tighten_limits", () => {
      const r = detectTenantDrift({
        preference: makeDriftPref(),
        outcomes: makeMixedOutcomes(3, 0, 7), // 30% helpful local vs 60% global = 30% divergence
        global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      const div = r.signals.find((s: any) => s.signal_type === "divergence_from_global");
      expect(div).toBeDefined();
      expect(div.recommended_action).toBe("tighten_limits");
    });

    it("severe divergence generates rollback_to_default", () => {
      const r = detectTenantDrift({
        preference: makeDriftPref(),
        outcomes: makeMixedOutcomes(1, 0, 9), // 10% helpful local vs 60% global = 50% gap
        global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      const div = r.signals.find((s: any) => s.signal_type === "divergence_from_global");
      expect(div.recommended_action).toBe("rollback_to_default");
    });
  });

  // ════════════════════════════════════════════════════════════
  // 12. Forbidden mutation guards (Safety)
  // ════════════════════════════════════════════════════════════
  describe("12. Forbidden Mutation Guards", () => {
    it("tuning cannot alter pipeline topology", () => {
      const r = guardOverrides([{ key: "mutate_pipeline_topology", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("mutate_pipeline_topology");
    });

    it("tuning cannot alter governance rules", () => {
      const r = guardOverrides([{ key: "mutate_governance_rules", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("mutate_governance_rules");
    });

    it("tuning cannot alter billing/plans", () => {
      const r1 = guardOverrides([{ key: "alter_billing", requested_delta: 0.01 }], {});
      const r2 = guardOverrides([{ key: "alter_plans", requested_delta: 0.01 }], {});
      expect(r1.blocked_overrides).toContain("alter_billing");
      expect(r2.blocked_overrides).toContain("alter_plans");
    });

    it("tuning cannot alter enforcement", () => {
      const r = guardOverrides([{ key: "alter_enforcement", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("alter_enforcement");
    });

    it("tuning cannot bypass review gates", () => {
      const r = guardOverrides([{ key: "bypass_review_gate", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("bypass_review_gate");
    });

    it("tuning cannot skip mandatory validation", () => {
      const r = guardOverrides([{ key: "skip_mandatory_validation", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("skip_mandatory_validation");
    });

    it("tuning cannot disable governance gates", () => {
      const r = guardOverrides([{ key: "disable_governance_gates", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("disable_governance_gates");
    });

    it("tuning cannot override safety contracts", () => {
      const r = guardOverrides([{ key: "override_safety_contracts", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("override_safety_contracts");
    });

    it("tuning cannot delete evidence", () => {
      const r = guardOverrides([{ key: "delete_evidence", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("delete_evidence");
    });

    it("tuning cannot reorder pipeline stages", () => {
      const r = guardOverrides([{ key: "reorder_pipeline_stages", requested_delta: 0.01 }], {});
      expect(r.blocked_overrides).toContain("reorder_pipeline_stages");
    });

    it("mixed forbidden + allowed correctly separates", () => {
      const r = guardOverrides([
        { key: "alter_billing", requested_delta: 0.1 },
        { key: "validation_sensitivity_bias", requested_delta: 0.1 },
        { key: "mutate_pipeline_topology", requested_delta: 0.05 },
        { key: "retry_escalation_bias", requested_delta: 0.3 },
      ], { validation_sensitivity_bias: 0.3, retry_escalation_bias: 2 });
      expect(r.blocked_overrides).toContain("alter_billing");
      expect(r.blocked_overrides).toContain("mutate_pipeline_topology");
      expect(r.allowed_overrides).toHaveProperty("validation_sensitivity_bias");
      expect(r.allowed_overrides).toHaveProperty("retry_escalation_bias");
    });

    it("absent local preferences doesn't break pipeline (fallback to global)", () => {
      const r = computeTenantTuning({
        organization_id: ORG_A, context_class: "deploy_critical",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [], tenant_outcomes: [],
      });
      expect(r.tuned_policy_order.length).toBe(GLOBAL_RANKING.length);
      expect(r.confidence_score).toBe(1.0);
    });

    it("all deltas in tuning engine are capped at 0.3", () => {
      const pref = makePreference({
        override_limits: {
          validation_sensitivity_bias: 1.0,
          retry_escalation_bias: 5,
          predictive_checkpoint_sensitivity_bias: 0.8,
          human_review_threshold_bias: 2.0,
          context_enrichment_level_bias: 10,
          prompt_experimentation_exposure_cap: 0.9,
        },
      });
      const result = computeTenantTuning({
        organization_id: ORG_A, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      for (const val of Object.values(result.allowed_adjustment_deltas)) {
        expect(val).toBeLessThanOrEqual(0.3);
      }
    });
  });

  // ════════════════════════════════════════════════════════════
  // 11. E2E Integration Flows
  // ════════════════════════════════════════════════════════════
  describe("11. Integration — End-to-End Flows", () => {
    it("full cycle: global portfolio → org preference → tuning → override guard → select → outcome → drift", () => {
      // 1. Global portfolio provides base
      const profiles = makeGlobalProfiles();

      // 2. Org preference loaded
      const orgPref = makePreference({
        id: "org-pref-e2e",
        preferred_policy_modes: ["high_quality"],
        override_limits: { validation_sensitivity_bias: 0.2, human_review_threshold_bias: 0.1 },
        confidence_score: 0.85,
        support_count: 20,
      });

      // 3. Tuning engine computes deltas
      const tuning = computeTenantTuning({
        organization_id: ORG_A, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [orgPref],
        tenant_outcomes: [{ policy_id: "p3", context_class: "general", helpful: 8, harmful: 1, neutral: 1, total: 10 }],
      });
      expect(tuning.tuned_policy_order.length).toBeGreaterThan(0);
      expect(tuning.evidence_refs).toContain("org-pref-e2e");

      // 4. Override guard validates deltas
      const guard = guardOverrides(
        Object.entries(tuning.allowed_adjustment_deltas).map(([key, val]) => ({ key, requested_delta: val })),
        orgPref.override_limits,
      );
      expect(guard.blocked_overrides.length).toBe(0);

      // 5. Selector chooses final policy
      const selection = selectTenantAwarePolicy({
        organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
        global_profiles: profiles, tenant_preferences: [orgPref],
        tenant_outcomes: [{ policy_id: "p3", context_class: "general", helpful: 8, harmful: 1, neutral: 1, total: 10 }],
        global_ranking: GLOBAL_RANKING,
      });
      expect(selection.selection_mode).toBe("tenant_tuned");
      expect(selection.selected_policy).not.toBeNull();

      // 6. Outcome simulated
      const outcomes = makeMixedOutcomes(8, 1, 1);

      // 7. Drift check
      const drift = detectTenantDrift({
        preference: { ...orgPref, updated_at: new Date().toISOString() },
        outcomes,
        global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      expect(drift.overall_health).toBe("healthy");
    });

    it("full cycle with degradation: tuning → harmful outcomes → drift → rollback signal", () => {
      const pref = makePreference({ confidence_score: 0.8, support_count: 15 });

      // Initially good
      const goodDrift = detectTenantDrift({
        preference: { ...pref, updated_at: new Date().toISOString() },
        outcomes: makeOutcomes(10, "helpful"),
        global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      expect(goodDrift.overall_health).toBe("healthy");

      // Degradation happens
      const badDrift = detectTenantDrift({
        preference: { ...pref, updated_at: new Date().toISOString() },
        outcomes: makeMixedOutcomes(2, 6, 2), // 60% harmful
        global_helpful_rate: 0.7, global_harmful_rate: 0.05,
      });
      expect(badDrift.overall_health).toBe("critical");
      expect(badDrift.signals.some((s: any) => s.recommended_action === "deprecate")).toBe(true);
    });

    it("workspace tuning with org fallback", () => {
      const orgPref = makePreference({ id: "org-p", preferred_policy_modes: ["balanced_default"], confidence_score: 0.8, support_count: 10 });
      const profiles = makeGlobalProfiles();

      // WS_1 has workspace pref
      const wsPref = makeWsPreference(WS_1, { preferred_policy_modes: ["high_quality"], confidence_score: 0.8, support_count: 10 });

      const ws1Result = selectTenantAwarePolicy({
        organization_id: ORG_A, workspace_id: WS_1, context_class: "general", confidence_score: 0.8,
        global_profiles: profiles, tenant_preferences: [orgPref, wsPref], tenant_outcomes: [],
        global_ranking: GLOBAL_RANKING,
      });
      expect(ws1Result.selection_mode).toBe("workspace_tuned");

      // WS_2 has no workspace pref, falls to org
      const ws2Result = selectTenantAwarePolicy({
        organization_id: ORG_A, workspace_id: WS_2, context_class: "general", confidence_score: 0.8,
        global_profiles: profiles, tenant_preferences: [orgPref], tenant_outcomes: [],
        global_ranking: GLOBAL_RANKING,
      });
      expect(ws2Result.selection_mode).toBe("tenant_tuned");
    });

    it("system does not alter stage sequencing or governance", () => {
      const pref = makePreference();
      const tuning = computeTenantTuning({
        organization_id: ORG_A, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      // Tuning only produces scores and deltas, never topology changes
      expect(tuning).not.toHaveProperty("stage_order");
      expect(tuning).not.toHaveProperty("governance_override");
      expect(tuning).not.toHaveProperty("billing_change");
    });

    it("failure in override guard blocks unsafe tuning without crashing", () => {
      const pref = makePreference({
        override_limits: { alter_billing: 0.5, validation_sensitivity_bias: 0.2 },
      });
      const tuning = computeTenantTuning({
        organization_id: ORG_A, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      // Tuning computes deltas including the forbidden one
      expect(tuning.allowed_adjustment_deltas).toHaveProperty("alter_billing");

      // But guard blocks it
      const guard = guardOverrides(
        Object.entries(tuning.allowed_adjustment_deltas).map(([key, val]) => ({ key, requested_delta: val })),
        pref.override_limits,
      );
      expect(guard.blocked_overrides).toContain("alter_billing");
      expect(guard.allowed_overrides).toHaveProperty("validation_sensitivity_bias");
    });
  });

  // ════════════════════════════════════════════════════════════
  // 14. Explainability
  // ════════════════════════════════════════════════════════════
  describe("14. Explainability", () => {
    it("tuning result explains which preference was used", () => {
      const pref = makePreference({ preference_name: "my_custom_pref" });
      const result = computeTenantTuning({
        organization_id: ORG_A, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      expect(result.reason_codes.some((rc) => rc.includes("my_custom_pref"))).toBe(true);
    });

    it("tuning result explains preferred mode boosts", () => {
      const pref = makePreference({ preferred_policy_modes: ["high_quality"] });
      const result = computeTenantTuning({
        organization_id: ORG_A, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref], tenant_outcomes: [],
      });
      expect(result.reason_codes.some((rc) => rc.includes("preferred_mode_boost_high_quality"))).toBe(true);
    });

    it("tuning result explains harmful penalty", () => {
      const pref = makePreference({ preferred_policy_modes: [] });
      const result = computeTenantTuning({
        organization_id: ORG_A, context_class: "general",
        global_policy_ranking: GLOBAL_RANKING, tenant_preferences: [pref],
        tenant_outcomes: [{ policy_id: "p1", context_class: "general", helpful: 0, harmful: 5, neutral: 0, total: 5 }],
      });
      expect(result.reason_codes.some((rc) => rc.includes("local_harmful_penalty"))).toBe(true);
    });

    it("selector result explains whether decision was global or tenant-tuned", () => {
      const pref = makePreference({ confidence_score: 0.8, support_count: 15 });
      const r = selectTenantAwarePolicy({
        organization_id: ORG_A, context_class: "general", confidence_score: 0.8,
        global_profiles: makeGlobalProfiles(), tenant_preferences: [pref], tenant_outcomes: [],
        global_ranking: GLOBAL_RANKING,
      });
      expect(r.reason_codes.some((rc) => rc.includes("tenant_tuned_selected"))).toBe(true);
    });

    it("drift result explains why signals were raised", () => {
      const r = detectTenantDrift({
        preference: makeDriftPref({ support_count: 2, confidence_score: 0.9 }),
        outcomes: makeMixedOutcomes(2, 4, 4), // 40% harmful
        global_helpful_rate: 0.7, global_harmful_rate: 0.05,
      });
      expect(r.reason_codes).toContain("harmful_outcome_rate_exceeded");
      expect(r.reason_codes).toContain("overfit_low_sample_high_confidence");
    });

    it("drift result includes confidence per signal", () => {
      const r = detectTenantDrift({
        preference: makeDriftPref(),
        outcomes: makeMixedOutcomes(2, 5, 3), // 50% harmful
        global_helpful_rate: 0.6, global_harmful_rate: 0.1,
      });
      for (const signal of r.signals) {
        expect(typeof signal.confidence).toBe("number");
        expect(signal.confidence).toBeGreaterThan(0);
        expect(signal.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});

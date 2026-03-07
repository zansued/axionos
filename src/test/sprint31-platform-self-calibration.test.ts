import { describe, it, expect } from "vitest";

// Import modules under test
import { interpretCalibrationSignals, type CalibrationSignalInput } from "../../supabase/functions/_shared/platform-calibration/platform-calibration-signal-interpreter";
import { generateProposals, type CalibrationParameter } from "../../supabase/functions/_shared/platform-calibration/platform-calibration-proposal-engine";
import { validateProposal, validateBatch } from "../../supabase/functions/_shared/platform-calibration/platform-calibration-guardrails";
import { buildApplication, computeParameterUpdate } from "../../supabase/functions/_shared/platform-calibration/platform-calibration-runner";
import { assessOutcome, type OutcomeMetrics } from "../../supabase/functions/_shared/platform-calibration/platform-calibration-outcome-tracker";
import { buildRollback, shouldAutoRollback } from "../../supabase/functions/_shared/platform-calibration/platform-calibration-rollback-engine";

// ─── Helpers ───

function makeSignalInput(overrides: Partial<CalibrationSignalInput> = {}): CalibrationSignalInput {
  return {
    bottleneck_false_positive_rate: 0,
    bottleneck_false_negative_rate: 0,
    insight_confidence_drift: 0,
    recommendation_acceptance_rate: 0.5,
    recommendation_rejection_rate: 0.2,
    health_metric_changes: {},
    policy_effectiveness_drift: 0,
    predictive_warning_miss_rate: 0,
    tenant_drift_instability: 0,
    recommendation_queue_size: 10,
    sample_size: 30,
    ...overrides,
  };
}

function makeParam(key: string, overrides: Partial<CalibrationParameter> = {}): CalibrationParameter {
  return {
    parameter_key: key,
    current_value: { value: 0.5 },
    default_value: { value: 0.5 },
    allowed_range: { min: 0, max: 1 },
    calibration_mode: "bounded_auto",
    status: "active",
    parameter_scope: "global",
    parameter_family: "detection_thresholds",
    ...overrides,
  };
}

// =====================================================================
// 1. SIGNAL INTERPRETER
// =====================================================================

describe("Platform Calibration Signal Interpreter", () => {
  it("returns empty opportunities for low sample size", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ sample_size: 5 }));
    expect(result).toEqual([]);
  });

  it("returns empty for all-normal signals", () => {
    const result = interpretCalibrationSignals(makeSignalInput());
    expect(result).toEqual([]);
  });

  it("detects high false positive rate → increase bottleneck threshold", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const fp = result.find((o) => o.rationale_codes.includes("high_false_positive_rate"));
    expect(fp).toBeDefined();
    expect(fp!.adjustment_direction).toBe("increase");
    expect(fp!.parameter_key).toBe("bottleneck_severity_threshold");
  });

  it("detects high false negative rate → decrease bottleneck threshold", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_negative_rate: 0.4 }));
    const fn = result.find((o) => o.rationale_codes.includes("high_false_negative_rate"));
    expect(fn).toBeDefined();
    expect(fn!.adjustment_direction).toBe("decrease");
  });

  it("detects insight confidence drift", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ insight_confidence_drift: 0.2 }));
    const cd = result.find((o) => o.rationale_codes.includes("insight_confidence_drift"));
    expect(cd).toBeDefined();
  });

  it("detects low recommendation acceptance rate", () => {
    const result = interpretCalibrationSignals(makeSignalInput({
      recommendation_acceptance_rate: 0.1,
      recommendation_rejection_rate: 0.7,
    }));
    const la = result.find((o) => o.rationale_codes.includes("low_acceptance_rate"));
    expect(la).toBeDefined();
    expect(la!.parameter_key).toBe("recommendation_priority_floor");
  });

  it("detects predictive warning misses", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ predictive_warning_miss_rate: 0.35 }));
    const pw = result.find((o) => o.rationale_codes.includes("high_prediction_miss_rate"));
    expect(pw).toBeDefined();
    expect(pw!.adjustment_direction).toBe("decrease");
  });

  it("detects policy effectiveness drift", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ policy_effectiveness_drift: -0.25 }));
    const pd = result.find((o) => o.rationale_codes.includes("policy_effectiveness_declining"));
    expect(pd).toBeDefined();
  });

  it("detects tenant drift instability", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ tenant_drift_instability: 0.5 }));
    const td = result.find((o) => o.rationale_codes.includes("tenant_drift_instability"));
    expect(td).toBeDefined();
  });

  it("detects recommendation queue overload", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ recommendation_queue_size: 80 }));
    const qo = result.find((o) => o.rationale_codes.includes("recommendation_queue_overload"));
    expect(qo).toBeDefined();
  });

  it("is deterministic — same input same output", () => {
    const input = makeSignalInput({ bottleneck_false_positive_rate: 0.4 });
    const a = interpretCalibrationSignals(input);
    const b = interpretCalibrationSignals(input);
    expect(a).toEqual(b);
  });

  it("all adjustment magnitudes stay within MAX_DELTA bounds", () => {
    const result = interpretCalibrationSignals(makeSignalInput({
      bottleneck_false_positive_rate: 0.9,
      bottleneck_false_negative_rate: 0.9,
      insight_confidence_drift: 0.5,
      predictive_warning_miss_rate: 0.9,
      recommendation_acceptance_rate: 0.01,
      recommendation_rejection_rate: 0.9,
    }));
    for (const o of result) {
      expect(o.adjustment_magnitude).toBeLessThanOrEqual(0.15);
      expect(o.adjustment_magnitude).toBeGreaterThan(0);
    }
  });

  it("all opportunities include evidence_refs and rationale_codes", () => {
    const result = interpretCalibrationSignals(makeSignalInput({
      bottleneck_false_positive_rate: 0.5,
      predictive_warning_miss_rate: 0.4,
    }));
    for (const o of result) {
      expect(o.evidence_refs.length).toBeGreaterThan(0);
      expect(o.rationale_codes.length).toBeGreaterThan(0);
      expect(o.expected_impact.length).toBeGreaterThan(0);
    }
  });

  it("confidence scales with sample size", () => {
    const small = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5, sample_size: 12 }));
    const large = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5, sample_size: 60 }));
    const s = small.find((o) => o.parameter_key === "bottleneck_severity_threshold");
    const l = large.find((o) => o.parameter_key === "bottleneck_severity_threshold");
    expect(s).toBeDefined();
    expect(l).toBeDefined();
    expect(l!.confidence).toBeGreaterThan(s!.confidence);
  });
});

// =====================================================================
// 2. PROPOSAL ENGINE
// =====================================================================

describe("Platform Calibration Proposal Engine", () => {
  it("generates proposal from opportunity", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const params = [makeParam("bottleneck_severity_threshold")];
    const proposals = generateProposals(opps, params);
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0].parameter_key).toBe("bottleneck_severity_threshold");
  });

  it("skips frozen parameters", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const params = [makeParam("bottleneck_severity_threshold", { status: "frozen" })];
    const proposals = generateProposals(opps, params);
    expect(proposals).toEqual([]);
  });

  it("skips deprecated parameters", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const params = [makeParam("bottleneck_severity_threshold", { status: "deprecated" })];
    const proposals = generateProposals(opps, params);
    expect(proposals).toEqual([]);
  });

  it("clamps proposed value to allowed range", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.9 }));
    const params = [makeParam("bottleneck_severity_threshold", { current_value: { value: 0.95 }, allowed_range: { min: 0, max: 1 } })];
    const proposals = generateProposals(opps, params);
    if (proposals.length > 0) {
      expect(proposals[0].proposed_value.value).toBeLessThanOrEqual(1);
      expect(proposals[0].proposed_value.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("sets bounded_auto_candidate for eligible parameters", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5, sample_size: 60 }));
    const params = [makeParam("bottleneck_severity_threshold", { calibration_mode: "bounded_auto" })];
    const proposals = generateProposals(opps, params);
    const auto = proposals.find((p) => p.proposal_mode === "bounded_auto_candidate");
    expect(auto).toBeDefined();
  });

  it("sets advisory for manual_only parameters", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const params = [makeParam("bottleneck_severity_threshold", { calibration_mode: "manual_only" })];
    const proposals = generateProposals(opps, params);
    for (const p of proposals) {
      expect(p.proposal_mode).toBe("advisory");
    }
  });

  it("includes rollback guard in every proposal", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const params = [makeParam("bottleneck_severity_threshold")];
    const proposals = generateProposals(opps, params);
    for (const p of proposals) {
      expect(p.rollback_guard).toBeDefined();
      expect(p.rollback_guard.max_observation_window_hours).toBeGreaterThan(0);
    }
  });

  it("does not generate proposal for unknown parameter", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const proposals = generateProposals(opps, []);
    expect(proposals).toEqual([]);
  });

  it("proposal delta never exceeds MAX_DELTA (0.2)", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.9, sample_size: 100 }));
    const params = [makeParam("bottleneck_severity_threshold", { current_value: { value: 0.5 } })];
    const proposals = generateProposals(opps, params);
    for (const p of proposals) {
      expect(Math.abs(p.proposed_value.value - p.current_value.value)).toBeLessThanOrEqual(0.201);
    }
  });
});

// =====================================================================
// 3. GUARDRAILS
// =====================================================================

describe("Platform Calibration Guardrails", () => {
  const baseProposal = {
    parameter_key: "bottleneck_severity_threshold",
    scope_ref: null,
    current_value: { value: 0.5 },
    proposed_value: { value: 0.6 },
    expected_impact: { summary: "test", direction: "increase" },
    rationale_codes: ["test"],
    evidence_refs: [],
    confidence_score: 0.7,
    proposal_mode: "advisory" as const,
    rollback_guard: { max_observation_window_hours: 72, harmful_threshold: 0.3, auto_rollback_enabled: false },
  };

  it("allows valid proposal", () => {
    const result = validateProposal(baseProposal, makeParam("bottleneck_severity_threshold"));
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("blocks proposal for missing parameter", () => {
    const result = validateProposal(baseProposal, undefined);
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain("parameter_not_in_registry");
  });

  it("blocks frozen parameter", () => {
    const result = validateProposal(baseProposal, makeParam("bottleneck_severity_threshold", { status: "frozen" }));
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain("parameter_is_frozen");
  });

  it("blocks deprecated parameter", () => {
    const result = validateProposal(baseProposal, makeParam("bottleneck_severity_threshold", { status: "deprecated" }));
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain("parameter_is_deprecated");
  });

  it("blocks forbidden parameter family", () => {
    const result = validateProposal(baseProposal, makeParam("bottleneck_severity_threshold", { parameter_family: "pipeline_topology" }));
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain("forbidden_parameter_family");
  });

  it("blocks all forbidden families", () => {
    const forbidden = ["pipeline_topology", "governance_rules", "billing_logic", "plan_enforcement", "execution_contracts", "hard_safety_constraints"];
    for (const f of forbidden) {
      const result = validateProposal(baseProposal, makeParam("test", { parameter_family: f }));
      expect(result.allowed).toBe(false);
      expect(result.violations).toContain("forbidden_parameter_family");
    }
  });

  it("blocks value outside allowed range", () => {
    const outOfRange = { ...baseProposal, proposed_value: { value: 1.5 } };
    const result = validateProposal(outOfRange, makeParam("bottleneck_severity_threshold"));
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain("proposed_value_outside_allowed_range");
  });

  it("blocks delta exceeding max", () => {
    const bigDelta = { ...baseProposal, current_value: { value: 0.1 }, proposed_value: { value: 0.5 } };
    const result = validateProposal(bigDelta, makeParam("bottleneck_severity_threshold"));
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain("delta_exceeds_max_allowed");
  });

  it("blocks bounded_auto for manual_only parameter", () => {
    const auto = { ...baseProposal, proposal_mode: "bounded_auto_candidate" as const };
    const result = validateProposal(auto, makeParam("bottleneck_severity_threshold", { calibration_mode: "manual_only" }));
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain("parameter_not_eligible_for_auto");
  });

  it("warns on low confidence", () => {
    const lowConf = { ...baseProposal, confidence_score: 0.2 };
    const result = validateProposal(lowConf, makeParam("bottleneck_severity_threshold"));
    expect(result.allowed).toBe(true);
    expect(result.warnings).toContain("low_confidence_proposal");
  });

  it("warns on watch parameter", () => {
    const result = validateProposal(baseProposal, makeParam("bottleneck_severity_threshold", { status: "watch" }));
    expect(result.allowed).toBe(true);
    expect(result.warnings).toContain("parameter_under_watch");
  });

  it("warns on broad scope + low confidence", () => {
    const low = { ...baseProposal, confidence_score: 0.4 };
    const result = validateProposal(low, makeParam("bottleneck_severity_threshold", { parameter_scope: "global" }));
    expect(result.warnings).toContain("broad_scope_low_confidence");
  });

  it("validateBatch processes multiple proposals", () => {
    const params = new Map([["bottleneck_severity_threshold", makeParam("bottleneck_severity_threshold")]]);
    const results = validateBatch([baseProposal], params);
    expect(results.size).toBe(1);
    expect(results.get("bottleneck_severity_threshold")!.allowed).toBe(true);
  });
});

// =====================================================================
// 4. RUNNER
// =====================================================================

describe("Platform Calibration Runner", () => {
  it("builds application correctly", () => {
    const proposal = {
      parameter_key: "test",
      scope_ref: null,
      current_value: { value: 0.5 },
      proposed_value: { value: 0.6 },
      expected_impact: { summary: "test", direction: "increase" },
      rationale_codes: ["test"],
      evidence_refs: [],
      confidence_score: 0.7,
      proposal_mode: "advisory" as const,
      rollback_guard: { max_observation_window_hours: 72, harmful_threshold: 0.3, auto_rollback_enabled: false },
    };

    const app = buildApplication("prop-1", proposal, "manual");
    expect(app.proposal_id).toBe("prop-1");
    expect(app.parameter_key).toBe("test");
    expect(app.previous_value.value).toBe(0.5);
    expect(app.applied_value.value).toBe(0.6);
    expect(app.applied_mode).toBe("manual");
    expect(app.outcome_status).toBe("pending");
  });

  it("computeParameterUpdate extracts correct values", () => {
    const proposal = {
      parameter_key: "threshold_x",
      scope_ref: null,
      current_value: { value: 0.3 },
      proposed_value: { value: 0.45 },
      expected_impact: { summary: "test", direction: "increase" },
      rationale_codes: ["test"],
      evidence_refs: [],
      confidence_score: 0.7,
      proposal_mode: "advisory" as const,
      rollback_guard: { max_observation_window_hours: 72, harmful_threshold: 0.3, auto_rollback_enabled: false },
    };
    const update = computeParameterUpdate(proposal);
    expect(update.parameter_key).toBe("threshold_x");
    expect(update.new_value.value).toBe(0.45);
  });
});

// =====================================================================
// 5. OUTCOME TRACKER
// =====================================================================

describe("Platform Calibration Outcome Tracker", () => {
  function makeMetrics(overrides: Partial<OutcomeMetrics> = {}): OutcomeMetrics {
    return {
      false_positive_rate_before: 0.3,
      false_positive_rate_after: 0.3,
      false_negative_rate_before: 0.2,
      false_negative_rate_after: 0.2,
      recommendation_precision_before: 0.5,
      recommendation_precision_after: 0.5,
      queue_pressure_before: 30,
      queue_pressure_after: 30,
      sample_size: 20,
      ...overrides,
    };
  }

  it("returns inconclusive for low sample", () => {
    const result = assessOutcome(makeMetrics({ sample_size: 3 }));
    expect(result.status).toBe("inconclusive");
    expect(result.should_rollback).toBe(false);
  });

  it("detects helpful calibration", () => {
    const result = assessOutcome(makeMetrics({
      false_positive_rate_after: 0.1,
      false_negative_rate_after: 0.05,
    }));
    expect(result.status).toBe("helpful");
    expect(result.improvement_score).toBeGreaterThan(0);
  });

  it("detects harmful calibration and recommends rollback", () => {
    const result = assessOutcome(makeMetrics({
      false_positive_rate_after: 0.6,
      false_negative_rate_after: 0.5,
      recommendation_precision_after: 0.2,
    }));
    expect(result.status).toBe("harmful");
    expect(result.should_rollback).toBe(true);
  });

  it("detects neutral calibration", () => {
    const result = assessOutcome(makeMetrics());
    expect(result.status).toBe("neutral");
  });

  it("includes reason codes", () => {
    const result = assessOutcome(makeMetrics({ false_positive_rate_after: 0.1 }));
    expect(result.reason_codes).toContain("false_positive_rate_improved");
  });

  it("improvement_score is bounded", () => {
    const result = assessOutcome(makeMetrics({
      false_positive_rate_after: 0,
      false_negative_rate_after: 0,
      recommendation_precision_after: 1,
      queue_pressure_after: 0,
    }));
    expect(result.improvement_score).toBeGreaterThan(0);
    expect(result.improvement_score).toBeLessThanOrEqual(1);
  });
});

// =====================================================================
// 6. ROLLBACK ENGINE
// =====================================================================

describe("Platform Calibration Rollback Engine", () => {
  it("builds rollback record correctly", () => {
    const rb = buildRollback({
      application_id: "app-1",
      parameter_key: "test_param",
      previous_value: { value: 0.5 },
      rollback_reason: { reason: "harmful" },
      rollback_mode: "manual",
    });
    expect(rb.application_id).toBe("app-1");
    expect(rb.restored_value.value).toBe(0.5);
    expect(rb.rollback_mode).toBe("manual");
  });

  it("shouldAutoRollback returns true when harmful + auto enabled", () => {
    expect(shouldAutoRollback("harmful", { auto_rollback_enabled: true })).toBe(true);
  });

  it("shouldAutoRollback returns false when harmful but auto disabled", () => {
    expect(shouldAutoRollback("harmful", { auto_rollback_enabled: false })).toBe(false);
  });

  it("shouldAutoRollback returns false when helpful", () => {
    expect(shouldAutoRollback("helpful", { auto_rollback_enabled: true })).toBe(false);
  });

  it("shouldAutoRollback returns false when neutral", () => {
    expect(shouldAutoRollback("neutral", { auto_rollback_enabled: true })).toBe(false);
  });
});

// =====================================================================
// 7. FORBIDDEN MUTATION GUARDS
// =====================================================================

describe("Forbidden Mutation Guards", () => {
  const forbidden = ["pipeline_topology", "governance_rules", "billing_logic", "plan_enforcement", "execution_contracts", "hard_safety_constraints"];

  for (const family of forbidden) {
    it(`blocks calibration for ${family}`, () => {
      const proposal = {
        parameter_key: "test",
        scope_ref: null,
        current_value: { value: 0.5 },
        proposed_value: { value: 0.6 },
        expected_impact: { summary: "test", direction: "increase" },
        rationale_codes: ["test"],
        evidence_refs: [],
        confidence_score: 0.9,
        proposal_mode: "advisory" as const,
        rollback_guard: { max_observation_window_hours: 72, harmful_threshold: 0.3, auto_rollback_enabled: false },
      };
      const result = validateProposal(proposal, makeParam("test", { parameter_family: family }));
      expect(result.allowed).toBe(false);
      expect(result.violations).toContain("forbidden_parameter_family");
    });
  }
});

// =====================================================================
// 8. CALIBRATION QUALITY RULES
// =====================================================================

describe("Calibration Quality Rules", () => {
  it("low sample size produces no opportunities", () => {
    const result = interpretCalibrationSignals(makeSignalInput({ sample_size: 3, bottleneck_false_positive_rate: 0.9 }));
    expect(result).toEqual([]);
  });

  it("broad scope + low confidence gets warning", () => {
    const proposal = {
      parameter_key: "test",
      scope_ref: null,
      current_value: { value: 0.5 },
      proposed_value: { value: 0.6 },
      expected_impact: { summary: "test", direction: "increase" },
      rationale_codes: ["test"],
      evidence_refs: [],
      confidence_score: 0.3,
      proposal_mode: "advisory" as const,
      rollback_guard: { max_observation_window_hours: 72, harmful_threshold: 0.3, auto_rollback_enabled: false },
    };
    const result = validateProposal(proposal, makeParam("test", { parameter_scope: "global" }));
    expect(result.warnings).toContain("broad_scope_low_confidence");
    expect(result.warnings).toContain("low_confidence_proposal");
  });

  it("frozen parameters cannot be changed", () => {
    const result = validateProposal(
      {
        parameter_key: "test",
        scope_ref: null,
        current_value: { value: 0.5 },
        proposed_value: { value: 0.6 },
        expected_impact: { summary: "test", direction: "increase" },
        rationale_codes: ["test"],
        evidence_refs: [],
        confidence_score: 0.9,
        proposal_mode: "advisory" as const,
        rollback_guard: { max_observation_window_hours: 72, harmful_threshold: 0.3, auto_rollback_enabled: false },
      },
      makeParam("test", { status: "frozen" }),
    );
    expect(result.allowed).toBe(false);
  });

  it("deprecated parameters cannot be reactivated", () => {
    const result = validateProposal(
      {
        parameter_key: "test",
        scope_ref: null,
        current_value: { value: 0.5 },
        proposed_value: { value: 0.6 },
        expected_impact: { summary: "test", direction: "increase" },
        rationale_codes: ["test"],
        evidence_refs: [],
        confidence_score: 0.9,
        proposal_mode: "advisory" as const,
        rollback_guard: { max_observation_window_hours: 72, harmful_threshold: 0.3, auto_rollback_enabled: false },
      },
      makeParam("test", { status: "deprecated" }),
    );
    expect(result.allowed).toBe(false);
  });
});

// =====================================================================
// 9. E2E FLOW
// =====================================================================

describe("Calibration E2E Flow", () => {
  it("signal → opportunity → proposal → guardrail → application → outcome → rollback", () => {
    // 1. Signal interpretation
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5, sample_size: 50 }));
    expect(opps.length).toBeGreaterThan(0);

    // 2. Proposal generation
    const params = [makeParam("bottleneck_severity_threshold")];
    const proposals = generateProposals(opps, params);
    expect(proposals.length).toBeGreaterThan(0);
    const proposal = proposals[0];

    // 3. Guardrail validation
    const guard = validateProposal(proposal, params[0]);
    expect(guard.allowed).toBe(true);

    // 4. Application
    const app = buildApplication("prop-1", proposal, "manual");
    expect(app.outcome_status).toBe("pending");
    expect(app.previous_value.value).toBe(0.5);

    // 5. Outcome assessment (simulate harmful)
    const outcome = assessOutcome({
      false_positive_rate_before: 0.5,
      false_positive_rate_after: 0.7,
      false_negative_rate_before: 0.2,
      false_negative_rate_after: 0.4,
      recommendation_precision_before: 0.5,
      recommendation_precision_after: 0.3,
      queue_pressure_before: 30,
      queue_pressure_after: 40,
      sample_size: 20,
    });
    expect(outcome.status).toBe("harmful");
    expect(outcome.should_rollback).toBe(true);

    // 6. Rollback
    const rb = buildRollback({
      application_id: "app-1",
      parameter_key: "bottleneck_severity_threshold",
      previous_value: app.previous_value,
      rollback_reason: { outcome: "harmful", improvement_score: outcome.improvement_score },
      rollback_mode: "manual",
    });
    expect(rb.restored_value.value).toBe(0.5);
  });

  it("advisory-first: manual_only params never get auto proposals", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({
      bottleneck_false_positive_rate: 0.5,
      predictive_warning_miss_rate: 0.4,
      sample_size: 100,
    }));
    const params = opps.map((o) => makeParam(o.parameter_key, { calibration_mode: "manual_only" }));
    const proposals = generateProposals(opps, params);
    for (const p of proposals) {
      expect(p.proposal_mode).toBe("advisory");
    }
  });
});

// =====================================================================
// 10. DETERMINISM
// =====================================================================

describe("Calibration Determinism", () => {
  it("same signals produce same opportunities", () => {
    const input = makeSignalInput({ bottleneck_false_positive_rate: 0.4, predictive_warning_miss_rate: 0.3 });
    const a = interpretCalibrationSignals(input);
    const b = interpretCalibrationSignals(input);
    expect(a).toEqual(b);
  });

  it("same opportunities + params produce same proposals", () => {
    const opps = interpretCalibrationSignals(makeSignalInput({ bottleneck_false_positive_rate: 0.5 }));
    const params = [makeParam("bottleneck_severity_threshold")];
    const a = generateProposals(opps, params);
    const b = generateProposals(opps, params);
    expect(a).toEqual(b);
  });

  it("same outcome metrics produce same assessment", () => {
    const metrics: OutcomeMetrics = {
      false_positive_rate_before: 0.3,
      false_positive_rate_after: 0.1,
      false_negative_rate_before: 0.2,
      false_negative_rate_after: 0.1,
      recommendation_precision_before: 0.5,
      recommendation_precision_after: 0.6,
      queue_pressure_before: 30,
      queue_pressure_after: 20,
      sample_size: 30,
    };
    const a = assessOutcome(metrics);
    const b = assessOutcome(metrics);
    expect(a).toEqual(b);
  });
});

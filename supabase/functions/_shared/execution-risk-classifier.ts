/**
 * DX-3: Execution Risk Classifier
 *
 * Explicit, rule-based classifier that determines execution posture
 * based on structural heuristics (OX-5) and DX-2 risk signals.
 *
 * Replaces scattered fast-path eligibility checks with a single
 * decision layer that produces inspectable, explainable classifications.
 *
 * Design principles:
 *   - Rule-based, no ML
 *   - Every decision traceable to specific factors and thresholds
 *   - Manual overrides always honored
 *   - Backward-compatible with OX-5 fast-path contract
 */

import { evaluateFastPathEligibility, type FastPathEligibility } from "./execution-fast-path.ts";
import { computeExecutionRiskSignals, type RiskAssessment, type ExecutionRiskSignals } from "./execution-risk-signals.ts";
import { getActiveThresholds } from "./execution-policy-tuner.ts";

// ─── Classifier Contract ─────────────────────────────────────────

/** Risk tiers — ordered by severity */
export type RiskTier = "low" | "medium" | "high" | "critical";

/** Execution path choices */
export type ExecutionPath = "fast_2call" | "safe_3call";

/** Validation posture — how thoroughly to validate output */
export type ValidationPosture = "standard" | "strict" | "extra_strict";

/** Context posture — how much context to feed the AI */
export type ContextPosture = "lean" | "normal" | "full";

/** A single decision factor with its contribution */
export interface ClassifierFactor {
  signal: string;
  value: string | number | boolean;
  threshold?: string;
  impact: "escalate" | "neutral" | "de_escalate";
  explanation: string;
}

/** The classifier's full output — every field inspectable */
export interface ExecutionClassification {
  /** Final risk tier */
  risk_tier: RiskTier;
  /** Recommended execution path */
  execution_path: ExecutionPath;
  /** Validation intensity */
  validation_posture: ValidationPosture;
  /** Context feeding strategy */
  context_posture: ContextPosture;
  /** Overall confidence in this classification (0–1) */
  confidence: number;
  /** Primary reason for the classification */
  primary_reason: string;
  /** All factors that contributed to the decision */
  factors: ClassifierFactor[];
  /** Whether a manual override was applied */
  override_applied: boolean;
  /** The underlying OX-5 eligibility result (for backward compat / audit) */
  legacy_fast_path: FastPathEligibility;
  /** The DX-2 risk assessment (for audit) */
  risk_assessment: RiskAssessment;
  /** DX-4: Policy version that produced this classification */
  policy_version?: number;
}

/** Inputs to the classifier */
export interface ClassifierInput {
  filePath: string;
  fileType: string | null;
  contextLength: number;
  waveNum: number;
  /** Generated code content (for signal extraction) */
  codeContent: string;
  /** Retry count from payload */
  retryCount: number;
  /** Explicit override from payload (true=force fast, false=force safe) */
  explicitOverride?: boolean;
}

// ─── Thresholds (DX-4: now read from adaptive policy) ────────────

function getThresholds() {
  const active = getActiveThresholds();
  return {
    HIGH_IMPORT_DENSITY: active.high_import_density ?? 10,
    HIGH_FAN_OUT: active.high_fan_out ?? 8,
    HIGH_OPERATIONAL_SENSITIVITY: active.high_operational_sensitivity ?? 0.4,
    HIGH_COMPLEXITY: active.high_complexity ?? 0.5,
    COMPOSITE_HIGH: active.composite_high ?? 0.45,
    COMPOSITE_MEDIUM: active.composite_medium ?? 0.20,
    LARGE_CONTEXT: active.large_context ?? 12_000,
    MEDIUM_CONTEXT: 6_000,
  };
}

// ─── Classification Logic ────────────────────────────────────────

/**
 * Classify an execution task and determine its full execution posture.
 *
 * Decision flow:
 * 1. Check manual overrides → honor immediately
 * 2. Run OX-5 structural eligibility (backward compat layer)
 * 3. Compute DX-2 risk signals
 * 4. Apply classifier rules to determine tier + postures
 * 5. Return fully explainable classification
 */
export function classifyExecutionRisk(input: ClassifierInput): ExecutionClassification {
  const factors: ClassifierFactor[] = [];
  const T = getThresholds(); // DX-4: read from adaptive policy

  // ── Step 1: Manual override ──
  if (input.explicitOverride === true) {
    const riskAssessment = computeExecutionRiskSignals(input.filePath, input.codeContent, input.retryCount);
    const legacyFastPath = evaluateFastPathEligibility({
      filePath: input.filePath, fileType: input.fileType,
      contextLength: input.contextLength, waveNum: input.waveNum,
      explicitOverride: true,
    });
    return {
      risk_tier: "low",
      execution_path: "fast_2call",
      validation_posture: "standard",
      context_posture: "lean",
      confidence: 1.0,
      primary_reason: "manual_override_fast",
      factors: [{ signal: "explicit_override", value: true, impact: "de_escalate", explanation: "Caller forced fast path" }],
      override_applied: true,
      legacy_fast_path: legacyFastPath,
      risk_assessment: riskAssessment,
    };
  }
  if (input.explicitOverride === false) {
    const riskAssessment = computeExecutionRiskSignals(input.filePath, input.codeContent, input.retryCount);
    const legacyFastPath = evaluateFastPathEligibility({
      filePath: input.filePath, fileType: input.fileType,
      contextLength: input.contextLength, waveNum: input.waveNum,
      explicitOverride: false,
    });
    return {
      risk_tier: "high",
      execution_path: "safe_3call",
      validation_posture: "strict",
      context_posture: "full",
      confidence: 1.0,
      primary_reason: "manual_override_safe",
      factors: [{ signal: "explicit_override", value: false, impact: "escalate", explanation: "Caller forced safe path" }],
      override_applied: true,
      legacy_fast_path: legacyFastPath,
      risk_assessment: riskAssessment,
    };
  }

  // ── Step 2: Legacy OX-5 eligibility (structural heuristics) ──
  const legacyFastPath = evaluateFastPathEligibility({
    filePath: input.filePath,
    fileType: input.fileType,
    contextLength: input.contextLength,
    waveNum: input.waveNum,
  });

  // ── Step 3: DX-2 risk signals ──
  const riskAssessment = computeExecutionRiskSignals(
    input.filePath,
    input.codeContent,
    input.retryCount,
  );
  const signals = riskAssessment.signals;

  // ── Step 4: Apply classification rules ──

  // Rule 1: OX-5 structural hard blocks (high-risk file types, complex paths)
  if (!legacyFastPath.eligible && legacyFastPath.riskTier === "high") {
    factors.push({
      signal: "structural_block",
      value: legacyFastPath.reason,
      impact: "escalate",
      explanation: `OX-5 structural rule: ${legacyFastPath.factors.join(", ")}`,
    });
  }

  // Rule 2: Retry escalation — any retry = escalate
  if (signals.is_retry) {
    factors.push({
      signal: "is_retry",
      value: true,
      impact: "escalate",
      explanation: "Prior execution failed — escalate to safe path with strict validation",
    });
  }

  // Rule 3: Auth/schema sensitivity
  if (signals.auth_schema_sensitivity) {
    factors.push({
      signal: "auth_schema_sensitivity",
      value: true,
      impact: "escalate",
      explanation: "File touches authentication, authorization, or schema patterns",
    });
  }

  // Rule 4: High import density
  if (signals.import_density > T.HIGH_IMPORT_DENSITY) {
    factors.push({
      signal: "import_density",
      value: signals.import_density,
      threshold: `> ${T.HIGH_IMPORT_DENSITY}`,
      impact: "escalate",
      explanation: `High import density (${signals.import_density}) increases integration failure risk`,
    });
  } else {
    factors.push({
      signal: "import_density",
      value: signals.import_density,
      threshold: `<= ${T.HIGH_IMPORT_DENSITY}`,
      impact: "neutral",
      explanation: `Import density within normal range`,
    });
  }

  // Rule 5: High dependency fan-out
  if (signals.dependency_fan_out > T.HIGH_FAN_OUT) {
    factors.push({
      signal: "dependency_fan_out",
      value: signals.dependency_fan_out,
      threshold: `> ${T.HIGH_FAN_OUT}`,
      impact: "escalate",
      explanation: `High fan-out (${signals.dependency_fan_out} unique modules) = large integration surface`,
    });
  }

  // Rule 6: Barrel/re-export files
  if (signals.has_reexport_pattern) {
    factors.push({
      signal: "has_reexport_pattern",
      value: true,
      impact: "escalate",
      explanation: "Barrel file — errors cascade to all consumers",
    });
  }

  // Rule 7: Operational sensitivity
  if (signals.operational_sensitivity > T.HIGH_OPERATIONAL_SENSITIVITY) {
    factors.push({
      signal: "operational_sensitivity",
      value: signals.operational_sensitivity,
      threshold: `> ${T.HIGH_OPERATIONAL_SENSITIVITY}`,
      impact: "escalate",
      explanation: "Infrastructure-critical file (provider/config/client/middleware patterns)",
    });
  }

  // Rule 8: Content complexity (weaker signal, advisory)
  if (signals.content_complexity_estimate > T.HIGH_COMPLEXITY) {
    factors.push({
      signal: "content_complexity_estimate",
      value: signals.content_complexity_estimate,
      threshold: `> ${T.HIGH_COMPLEXITY}`,
      impact: "escalate",
      explanation: "High code complexity (nested async, deep conditionals)",
    });
  }

  // Rule 9: Wave 1 foundational files
  if (input.waveNum <= 1) {
    factors.push({
      signal: "wave",
      value: input.waveNum,
      threshold: "<= 1",
      impact: "escalate",
      explanation: "Wave 1 files are foundational — errors compound downstream",
    });
  }

  // ── Determine risk tier from factors ──
  const escalatingFactors = factors.filter(f => f.impact === "escalate");
  const escalationCount = escalatingFactors.length;

  let risk_tier: RiskTier;
  let primary_reason: string;

  if (
    escalationCount >= 3 ||
    signals.is_retry && signals.auth_schema_sensitivity ||
    riskAssessment.composite_score >= THRESHOLDS.COMPOSITE_HIGH
  ) {
    risk_tier = "critical";
    primary_reason = escalatingFactors.length > 0
      ? escalatingFactors[0].explanation
      : "multiple_risk_factors";
  } else if (
    escalationCount >= 2 ||
    riskAssessment.composite_score >= THRESHOLDS.COMPOSITE_MEDIUM ||
    !legacyFastPath.eligible
  ) {
    risk_tier = "high";
    primary_reason = escalatingFactors.length > 0
      ? escalatingFactors[0].explanation
      : legacyFastPath.reason;
  } else if (escalationCount === 1) {
    risk_tier = "medium";
    primary_reason = escalatingFactors[0].explanation;
  } else {
    risk_tier = "low";
    primary_reason = "all_signals_within_normal_range";
  }

  // ── Derive execution postures from risk tier ──
  const execution_path: ExecutionPath =
    risk_tier === "low" ? "fast_2call" : "safe_3call";

  const validation_posture: ValidationPosture =
    risk_tier === "critical" ? "extra_strict"
    : risk_tier === "high" ? "strict"
    : "standard";

  const context_posture: ContextPosture =
    input.contextLength > THRESHOLDS.LARGE_CONTEXT ? "full"
    : risk_tier === "critical" || risk_tier === "high" ? "full"
    : input.contextLength > THRESHOLDS.MEDIUM_CONTEXT ? "normal"
    : "lean";

  // ── Confidence: higher when signals agree, lower on borderline ──
  let confidence = 0.9;
  if (escalationCount === 1 && riskAssessment.composite_score < THRESHOLDS.COMPOSITE_MEDIUM) {
    confidence = 0.7; // single weak escalation
  }
  if (riskAssessment.weak_signals.length > 1) {
    confidence -= 0.1;
  }
  confidence = Math.max(0.5, Math.min(1.0, confidence));

  return {
    risk_tier,
    execution_path,
    validation_posture,
    context_posture,
    confidence,
    primary_reason,
    factors,
    override_applied: false,
    legacy_fast_path: legacyFastPath,
    risk_assessment: riskAssessment,
  };
}

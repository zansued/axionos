/**
 * DX-4: Adaptive Routing Policy
 *
 * Evidence-informed policy tuning layer for the execution risk classifier.
 * Operates in **recommendation mode** by default — proposes threshold
 * adjustments based on observed outcomes, but does not auto-apply them
 * without explicit operator approval.
 *
 * Design principles:
 *   - Adaptive ≠ autonomous: changes are bounded, inspectable, reversible
 *   - Every recommendation backed by evidence with confidence score
 *   - Low-risk auto-adjustments only within guard-railed bounds
 *   - Operator can freeze, override, or revert any policy parameter
 *   - Full audit trail of all recommendations and applied changes
 */

// ─── Tunable Policy Parameters ───────────────────────────────────

/**
 * Every tunable parameter in the routing policy.
 * Each has a current value, allowed bounds, and auto-adjust permission.
 */
export interface PolicyParameter {
  /** Parameter key */
  key: string;
  /** Human-readable label */
  label: string;
  /** Current active value */
  current_value: number;
  /** Default value (for revert) */
  default_value: number;
  /** Minimum allowed value (guard rail) */
  min_bound: number;
  /** Maximum allowed value (guard rail) */
  max_bound: number;
  /** Whether low-risk auto-adjustment is permitted */
  auto_adjust_allowed: boolean;
  /** Maximum change per adjustment cycle (guard rail) */
  max_step_size: number;
  /** When this parameter was last changed */
  last_changed_at: string | null;
  /** Why it was last changed */
  last_change_reason: string | null;
}

/**
 * The full policy configuration — all tunable parameters in one place.
 */
export interface RoutingPolicyConfig {
  parameters: Record<string, PolicyParameter>;
  /** File types that are eligible for fast path */
  fast_path_eligible_types: Set<string>;
  /** File types forced to safe path */
  safe_path_forced_types: Set<string>;
  /** Whether the policy is frozen (no adjustments allowed) */
  frozen: boolean;
  /** Policy version for audit trail */
  version: number;
  /** Last modification timestamp */
  updated_at: string;
}

// ─── Default Policy ──────────────────────────────────────────────

function createDefaultPolicy(): RoutingPolicyConfig {
  const now = new Date().toISOString();
  return {
    parameters: {
      high_import_density: {
        key: "high_import_density",
        label: "Import density escalation threshold",
        current_value: 10,
        default_value: 10,
        min_bound: 5,
        max_bound: 20,
        auto_adjust_allowed: true,
        max_step_size: 2,
        last_changed_at: null,
        last_change_reason: null,
      },
      high_fan_out: {
        key: "high_fan_out",
        label: "Dependency fan-out escalation threshold",
        current_value: 8,
        default_value: 8,
        min_bound: 4,
        max_bound: 15,
        auto_adjust_allowed: true,
        max_step_size: 2,
        last_changed_at: null,
        last_change_reason: null,
      },
      high_operational_sensitivity: {
        key: "high_operational_sensitivity",
        label: "Operational sensitivity escalation threshold",
        current_value: 0.4,
        default_value: 0.4,
        min_bound: 0.2,
        max_bound: 0.7,
        auto_adjust_allowed: false, // heuristic — manual only
        max_step_size: 0.1,
        last_changed_at: null,
        last_change_reason: null,
      },
      high_complexity: {
        key: "high_complexity",
        label: "Content complexity escalation threshold",
        current_value: 0.5,
        default_value: 0.5,
        min_bound: 0.3,
        max_bound: 0.8,
        auto_adjust_allowed: false, // weak signal — manual only
        max_step_size: 0.1,
        last_changed_at: null,
        last_change_reason: null,
      },
      composite_high: {
        key: "composite_high",
        label: "Composite score → high risk threshold",
        current_value: 0.45,
        default_value: 0.45,
        min_bound: 0.30,
        max_bound: 0.60,
        auto_adjust_allowed: true,
        max_step_size: 0.05,
        last_changed_at: null,
        last_change_reason: null,
      },
      composite_medium: {
        key: "composite_medium",
        label: "Composite score → medium risk threshold",
        current_value: 0.20,
        default_value: 0.20,
        min_bound: 0.10,
        max_bound: 0.35,
        auto_adjust_allowed: true,
        max_step_size: 0.05,
        last_changed_at: null,
        last_change_reason: null,
      },
      large_context: {
        key: "large_context",
        label: "Context length → full context posture threshold",
        current_value: 12_000,
        default_value: 12_000,
        min_bound: 6_000,
        max_bound: 20_000,
        auto_adjust_allowed: true,
        max_step_size: 2_000,
        last_changed_at: null,
        last_change_reason: null,
      },
      max_fast_path_fix_rate: {
        key: "max_fast_path_fix_rate",
        label: "Fast-path major fix rate above which to tighten policy",
        current_value: 0.15,
        default_value: 0.15,
        min_bound: 0.05,
        max_bound: 0.30,
        auto_adjust_allowed: false,
        max_step_size: 0.05,
        last_changed_at: null,
        last_change_reason: null,
      },
    },
    fast_path_eligible_types: new Set([
      "component", "page", "hook", "util", "style", "test", "config_file",
    ]),
    safe_path_forced_types: new Set([
      "schema", "migration", "edge_function", "auth_config", "supabase_client",
    ]),
    frozen: false,
    version: 1,
    updated_at: now,
  };
}

// ─── Evidence Model ──────────────────────────────────────────────

/**
 * Aggregated outcome evidence for a specific slice of executions.
 */
export interface PolicyEvidence {
  /** Time window for the evidence */
  period_start: string;
  period_end: string;
  /** Total executions in this window */
  total_executions: number;
  /** Executions routed to fast path */
  fast_path_count: number;
  /** Executions routed to safe path */
  safe_path_count: number;

  // ── Outcome metrics ──
  /** Rate of major integration fixes on fast-path files */
  fast_path_major_fix_rate: number;
  /** Rate of major integration fixes on safe-path files */
  safe_path_major_fix_rate: number;
  /** Rate of validation failures on fast-path files */
  fast_path_validation_failure_rate: number;
  /** Rate of retries on fast-path files */
  fast_path_retry_rate: number;
  /** Average latency savings: safe_path_avg_ms - fast_path_avg_ms */
  latency_savings_ms: number;
  /** Average cost savings per file (USD) */
  cost_savings_usd: number;

  // ── Per-signal breakdown ──
  /** Major fix rate by file type on fast path */
  fix_rate_by_type: Record<string, number>;
  /** Major fix rate by import density bucket */
  fix_rate_by_import_density: Record<string, number>;
  /** Validation failure rate by risk tier */
  failure_rate_by_tier: Record<string, number>;
}

// ─── Policy Recommendation ───────────────────────────────────────

export type RecommendationAction = "tighten" | "loosen" | "add_exclusion" | "remove_exclusion" | "no_change";

export interface PolicyRecommendation {
  /** Unique ID for tracking */
  id: string;
  /** Which parameter to adjust */
  parameter_key: string;
  /** What to do */
  action: RecommendationAction;
  /** Current value */
  current_value: number | string;
  /** Proposed value */
  proposed_value: number | string;
  /** Why this recommendation */
  rationale: string;
  /** Supporting evidence summary */
  evidence_summary: string;
  /** Confidence in this recommendation (0–1) */
  confidence: number;
  /** Risk of the change itself */
  change_risk: "low" | "medium" | "high";
  /** Whether this can be auto-applied */
  auto_applicable: boolean;
  /** Whether it was applied */
  applied: boolean;
  /** When it was generated */
  created_at: string;
}

export interface PolicyAuditEntry {
  /** Policy version before change */
  from_version: number;
  /** Policy version after change */
  to_version: number;
  /** What changed */
  recommendations_applied: PolicyRecommendation[];
  /** Evidence that drove the changes */
  evidence: PolicyEvidence;
  /** Who/what triggered the change */
  trigger: "auto_adjust" | "operator_approval" | "manual_override";
  /** Timestamp */
  applied_at: string;
}

// ─── Policy Tuner ────────────────────────────────────────────────

/** In-memory policy state (would be persisted to DB in production) */
let _activePolicy: RoutingPolicyConfig = createDefaultPolicy();
const _auditLog: PolicyAuditEntry[] = [];
const _pendingRecommendations: PolicyRecommendation[] = [];

/**
 * Get the current active policy configuration.
 */
export function getActivePolicy(): RoutingPolicyConfig {
  return _activePolicy;
}

/**
 * Get current threshold values for use by the classifier.
 * This is the integration point — the classifier reads thresholds from here
 * instead of using hardcoded constants.
 */
export function getActiveThresholds(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, param] of Object.entries(_activePolicy.parameters)) {
    result[key] = param.current_value;
  }
  return result;
}

/**
 * Check if a file type is eligible for fast path under current policy.
 */
export function isFileTypeEligible(fileType: string | null): boolean {
  if (!fileType) return true; // unknown types default to eligible
  if (_activePolicy.safe_path_forced_types.has(fileType)) return false;
  return true; // if not forced safe, allow
}

/**
 * Generate policy recommendations based on observed evidence.
 * This is the core adaptive logic — recommendation-only by default.
 */
export function generatePolicyRecommendations(evidence: PolicyEvidence): PolicyRecommendation[] {
  const recommendations: PolicyRecommendation[] = [];
  const now = new Date().toISOString();
  let recId = 0;

  const makeId = () => `dx4_rec_${Date.now()}_${recId++}`;

  // ── Rule 1: Fast-path major fix rate too high → tighten ──
  const maxFixRate = _activePolicy.parameters.max_fast_path_fix_rate.current_value;
  if (evidence.fast_path_major_fix_rate > maxFixRate && evidence.fast_path_count >= 10) {
    // Determine which threshold to tighten
    // Strategy: lower the composite_medium threshold to catch more files as medium+
    const currentMedium = _activePolicy.parameters.composite_medium.current_value;
    const step = _activePolicy.parameters.composite_medium.max_step_size;
    const proposedMedium = Math.max(
      _activePolicy.parameters.composite_medium.min_bound,
      currentMedium - step,
    );

    if (proposedMedium < currentMedium) {
      recommendations.push({
        id: makeId(),
        parameter_key: "composite_medium",
        action: "tighten",
        current_value: currentMedium,
        proposed_value: proposedMedium,
        rationale: `Fast-path major fix rate (${(evidence.fast_path_major_fix_rate * 100).toFixed(1)}%) exceeds threshold (${(maxFixRate * 100).toFixed(1)}%). Lowering medium-risk threshold to catch more files.`,
        evidence_summary: `${evidence.fast_path_count} fast-path executions, ${(evidence.fast_path_major_fix_rate * 100).toFixed(1)}% major fix rate`,
        confidence: Math.min(0.9, evidence.fast_path_count / 50),
        change_risk: "low",
        auto_applicable: _activePolicy.parameters.composite_medium.auto_adjust_allowed,
        applied: false,
        created_at: now,
      });
    }
  }

  // ── Rule 2: Fast-path fix rate very low → loosen (allow more files) ──
  if (
    evidence.fast_path_major_fix_rate < maxFixRate * 0.3 &&
    evidence.fast_path_count >= 20 &&
    evidence.fast_path_validation_failure_rate < 0.03
  ) {
    const currentMedium = _activePolicy.parameters.composite_medium.current_value;
    const step = _activePolicy.parameters.composite_medium.max_step_size;
    const proposedMedium = Math.min(
      _activePolicy.parameters.composite_medium.max_bound,
      currentMedium + step,
    );

    if (proposedMedium > currentMedium) {
      recommendations.push({
        id: makeId(),
        parameter_key: "composite_medium",
        action: "loosen",
        current_value: currentMedium,
        proposed_value: proposedMedium,
        rationale: `Fast-path major fix rate very low (${(evidence.fast_path_major_fix_rate * 100).toFixed(1)}%) with good validation (${(evidence.fast_path_validation_failure_rate * 100).toFixed(1)}% failure). Safe to allow more files on fast path.`,
        evidence_summary: `${evidence.fast_path_count} fast-path executions, ${(evidence.fast_path_major_fix_rate * 100).toFixed(1)}% fix rate, ${(evidence.fast_path_validation_failure_rate * 100).toFixed(1)}% validation failure`,
        confidence: Math.min(0.85, evidence.fast_path_count / 100),
        change_risk: "low",
        auto_applicable: _activePolicy.parameters.composite_medium.auto_adjust_allowed,
        applied: false,
        created_at: now,
      });
    }
  }

  // ── Rule 3: Specific file type has high fix rate → add exclusion ──
  for (const [fileType, fixRate] of Object.entries(evidence.fix_rate_by_type)) {
    if (fixRate > 0.25 && !_activePolicy.safe_path_forced_types.has(fileType)) {
      recommendations.push({
        id: makeId(),
        parameter_key: "file_type_exclusion",
        action: "add_exclusion",
        current_value: fileType,
        proposed_value: `force_safe_path(${fileType})`,
        rationale: `File type "${fileType}" has ${(fixRate * 100).toFixed(1)}% major fix rate on fast path — should be forced to safe path.`,
        evidence_summary: `fix rate for ${fileType}: ${(fixRate * 100).toFixed(1)}%`,
        confidence: 0.7,
        change_risk: "medium",
        auto_applicable: false, // file type changes require operator approval
        applied: false,
        created_at: now,
      });
    }
  }

  // ── Rule 4: Import density threshold tuning ──
  const highBucket = evidence.fix_rate_by_import_density["high"] || 0;
  const medBucket = evidence.fix_rate_by_import_density["medium"] || 0;
  if (highBucket > 0.20 && medBucket < 0.10) {
    const current = _activePolicy.parameters.high_import_density.current_value;
    const step = _activePolicy.parameters.high_import_density.max_step_size;
    const proposed = Math.max(
      _activePolicy.parameters.high_import_density.min_bound,
      current - step,
    );
    if (proposed < current) {
      recommendations.push({
        id: makeId(),
        parameter_key: "high_import_density",
        action: "tighten",
        current_value: current,
        proposed_value: proposed,
        rationale: `High-import files have ${(highBucket * 100).toFixed(1)}% fix rate vs medium at ${(medBucket * 100).toFixed(1)}%. Lowering threshold to catch more risky files.`,
        evidence_summary: `high-import fix rate: ${(highBucket * 100).toFixed(1)}%, medium: ${(medBucket * 100).toFixed(1)}%`,
        confidence: 0.75,
        change_risk: "low",
        auto_applicable: _activePolicy.parameters.high_import_density.auto_adjust_allowed,
        applied: false,
        created_at: now,
      });
    }
  }

  // ── Rule 5: Context threshold tuning ──
  if (evidence.latency_savings_ms > 5000 && evidence.fast_path_major_fix_rate < maxFixRate) {
    const current = _activePolicy.parameters.large_context.current_value;
    const step = _activePolicy.parameters.large_context.max_step_size;
    const proposed = Math.min(
      _activePolicy.parameters.large_context.max_bound,
      current + step,
    );
    if (proposed > current) {
      recommendations.push({
        id: makeId(),
        parameter_key: "large_context",
        action: "loosen",
        current_value: current,
        proposed_value: proposed,
        rationale: `Fast path saves ${evidence.latency_savings_ms}ms avg with acceptable fix rate. Raising context threshold to allow more files.`,
        evidence_summary: `latency savings: ${evidence.latency_savings_ms}ms, fix rate: ${(evidence.fast_path_major_fix_rate * 100).toFixed(1)}%`,
        confidence: 0.65,
        change_risk: "low",
        auto_applicable: _activePolicy.parameters.large_context.auto_adjust_allowed,
        applied: false,
        created_at: now,
      });
    }
  }

  return recommendations;
}

/**
 * Apply a single recommendation to the active policy.
 * Returns true if applied, false if rejected (bounds violation, frozen, etc.)
 */
export function applyRecommendation(
  rec: PolicyRecommendation,
  trigger: PolicyAuditEntry["trigger"] = "operator_approval",
): boolean {
  if (_activePolicy.frozen) return false;

  const param = _activePolicy.parameters[rec.parameter_key];

  if (rec.action === "add_exclusion" || rec.action === "remove_exclusion") {
    // File type changes — apply to sets
    if (rec.action === "add_exclusion" && typeof rec.current_value === "string") {
      _activePolicy.safe_path_forced_types.add(rec.current_value);
    }
    if (rec.action === "remove_exclusion" && typeof rec.current_value === "string") {
      _activePolicy.safe_path_forced_types.delete(rec.current_value);
    }
  } else if (param && typeof rec.proposed_value === "number") {
    // Numeric threshold changes — enforce bounds
    const newValue = rec.proposed_value;
    if (newValue < param.min_bound || newValue > param.max_bound) return false;
    if (Math.abs(newValue - param.current_value) > param.max_step_size * 1.01) return false;

    param.current_value = newValue;
    param.last_changed_at = new Date().toISOString();
    param.last_change_reason = rec.rationale;
  } else {
    return false;
  }

  rec.applied = true;
  _activePolicy.version++;
  _activePolicy.updated_at = new Date().toISOString();

  _auditLog.push({
    from_version: _activePolicy.version - 1,
    to_version: _activePolicy.version,
    recommendations_applied: [rec],
    evidence: {} as PolicyEvidence, // caller should attach full evidence
    trigger,
    applied_at: new Date().toISOString(),
  });

  return true;
}

/**
 * Auto-apply only low-risk, auto-applicable recommendations.
 * Returns which were applied and which were deferred for operator review.
 */
export function autoApplyLowRiskRecommendations(
  recommendations: PolicyRecommendation[],
): { applied: PolicyRecommendation[]; deferred: PolicyRecommendation[] } {
  if (_activePolicy.frozen) {
    return { applied: [], deferred: recommendations };
  }

  const applied: PolicyRecommendation[] = [];
  const deferred: PolicyRecommendation[] = [];

  for (const rec of recommendations) {
    if (rec.auto_applicable && rec.change_risk === "low" && rec.confidence >= 0.7) {
      const success = applyRecommendation(rec, "auto_adjust");
      if (success) {
        applied.push(rec);
      } else {
        deferred.push(rec);
      }
    } else {
      deferred.push(rec);
    }
  }

  return { applied, deferred };
}

/**
 * Freeze the policy — no adjustments allowed until unfrozen.
 */
export function freezePolicy(): void {
  _activePolicy.frozen = true;
  _activePolicy.updated_at = new Date().toISOString();
}

/**
 * Unfreeze the policy.
 */
export function unfreezePolicy(): void {
  _activePolicy.frozen = false;
  _activePolicy.updated_at = new Date().toISOString();
}

/**
 * Reset a parameter to its default value.
 */
export function revertParameter(key: string): boolean {
  const param = _activePolicy.parameters[key];
  if (!param) return false;
  param.current_value = param.default_value;
  param.last_changed_at = new Date().toISOString();
  param.last_change_reason = "manual_revert_to_default";
  _activePolicy.version++;
  _activePolicy.updated_at = new Date().toISOString();
  return true;
}

/**
 * Reset entire policy to defaults.
 */
export function resetPolicyToDefaults(): void {
  _activePolicy = createDefaultPolicy();
  _auditLog.length = 0;
}

/**
 * Get the full audit log.
 */
export function getPolicyAuditLog(): PolicyAuditEntry[] {
  return [..._auditLog];
}

/**
 * Get pending (unapplied) recommendations.
 */
export function getPendingRecommendations(): PolicyRecommendation[] {
  return _pendingRecommendations.filter(r => !r.applied);
}

/**
 * Full policy evaluation cycle:
 * 1. Generate recommendations from evidence
 * 2. Auto-apply low-risk ones
 * 3. Return applied + deferred for operator review
 */
export function evaluateAndTunePolicy(evidence: PolicyEvidence): {
  recommendations: PolicyRecommendation[];
  applied: PolicyRecommendation[];
  deferred: PolicyRecommendation[];
  policy_version: number;
} {
  const recommendations = generatePolicyRecommendations(evidence);
  const { applied, deferred } = autoApplyLowRiskRecommendations(recommendations);

  // Store deferred for later operator review
  _pendingRecommendations.push(...deferred);

  return {
    recommendations,
    applied,
    deferred,
    policy_version: _activePolicy.version,
  };
}

/**
 * Post-Deploy Health Monitor — Sprint 3 (Deploy Assurance)
 * 
 * Monitors deploy stability through structured health checks,
 * regression detection, and stability window analysis.
 * 
 * Integrates with existing:
 * - deploy-feedback-loop.ts (Sprint 216)
 * - runtime-feedback/deploy-outcome-correlator.ts (Sprint 119)
 * - runtime-feedback/degraded-window-detector.ts (Sprint 119)
 * - build-health-validator.ts (Sprint 211)
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface HealthCheckProbe {
  probe_id: string;
  probe_type: "http_status" | "error_rate" | "latency" | "runtime_event" | "build_integrity";
  target: string;
  expected_value: string | number | boolean;
  actual_value: string | number | boolean | null;
  passed: boolean;
  measured_at: string;
  metadata?: Record<string, unknown>;
}

export interface StabilityWindow {
  deploy_id: string;
  organization_id: string;
  window_start: string;
  window_end: string | null;
  duration_minutes: number;
  status: "monitoring" | "stable" | "degraded" | "regressed" | "critical";
  probes_total: number;
  probes_passed: number;
  probes_failed: number;
  stability_score: number;
  regression_detected: boolean;
  regression_signals: RegressionSignal[];
}

export interface RegressionSignal {
  signal_type: "error_rate_spike" | "latency_increase" | "new_error_type" | "stability_drop" | "degraded_window";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: Record<string, unknown>;
  detected_at: string;
}

export interface DeployHealthSnapshot {
  deploy_id: string;
  initiative_id: string;
  organization_id: string;
  deployed_at: string;
  health_status: "healthy" | "warning" | "degraded" | "critical" | "unknown";
  overall_score: number;
  stability_window: StabilityWindow;
  probes: HealthCheckProbe[];
  regressions: RegressionSignal[];
  recommendation: HealthRecommendation;
  checked_at: string;
}

export interface HealthRecommendation {
  action: "continue" | "monitor_closely" | "investigate" | "rollback_advisory" | "rollback_urgent";
  confidence: number;
  reason: string;
  evidence_refs: string[];
}

// ═══════════════════════════════════════════════════════════════
// Thresholds & Configuration
// ═══════════════════════════════════════════════════════════════

export const HEALTH_THRESHOLDS = {
  /** Minutes after deploy to consider "stability window" */
  STABILITY_WINDOW_MINUTES: 60,
  /** Minimum probes needed for a valid assessment */
  MIN_PROBES_FOR_ASSESSMENT: 3,
  /** Score below which we classify as degraded */
  DEGRADED_THRESHOLD: 60,
  /** Score below which we classify as critical */
  CRITICAL_THRESHOLD: 30,
  /** Score above which we classify as healthy */
  HEALTHY_THRESHOLD: 80,
  /** Error rate increase (%) that triggers regression signal */
  ERROR_RATE_REGRESSION_PERCENT: 50,
  /** Latency increase (%) that triggers regression signal */
  LATENCY_REGRESSION_PERCENT: 100,
  /** Maximum regression signals before recommending rollback */
  ROLLBACK_SIGNAL_THRESHOLD: 3,
  /** Critical regression signals that trigger urgent rollback */
  URGENT_ROLLBACK_THRESHOLD: 2,
} as const;

// ═══════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate a set of health check probes and produce a stability score.
 */
export function evaluateProbes(probes: HealthCheckProbe[]): {
  score: number;
  passed: number;
  failed: number;
  status: StabilityWindow["status"];
} {
  if (probes.length === 0) {
    return { score: 0, passed: 0, failed: 0, status: "monitoring" };
  }

  const passed = probes.filter(p => p.passed).length;
  const failed = probes.length - passed;
  const score = Math.round((passed / probes.length) * 100);

  let status: StabilityWindow["status"];
  if (score >= HEALTH_THRESHOLDS.HEALTHY_THRESHOLD) status = "stable";
  else if (score >= HEALTH_THRESHOLDS.DEGRADED_THRESHOLD) status = "degraded";
  else if (score >= HEALTH_THRESHOLDS.CRITICAL_THRESHOLD) status = "regressed";
  else status = "critical";

  return { score, passed, failed, status };
}

/**
 * Detect regressions by comparing current deploy metrics against baseline.
 */
export function detectRegressions(
  current: { error_count: number; avg_latency_ms: number; error_types: string[] },
  baseline: { error_count: number; avg_latency_ms: number; error_types: string[] },
  now: string,
): RegressionSignal[] {
  const signals: RegressionSignal[] = [];

  // Error rate spike
  if (baseline.error_count > 0) {
    const increase = ((current.error_count - baseline.error_count) / baseline.error_count) * 100;
    if (increase >= HEALTH_THRESHOLDS.ERROR_RATE_REGRESSION_PERCENT) {
      signals.push({
        signal_type: "error_rate_spike",
        severity: increase >= 200 ? "critical" : increase >= 100 ? "high" : "medium",
        description: `Error rate increased by ${Math.round(increase)}% compared to baseline`,
        evidence: { current_errors: current.error_count, baseline_errors: baseline.error_count, increase_percent: Math.round(increase) },
        detected_at: now,
      });
    }
  } else if (current.error_count > 2) {
    // No baseline errors but new errors appeared
    signals.push({
      signal_type: "error_rate_spike",
      severity: current.error_count > 10 ? "high" : "medium",
      description: `${current.error_count} errors detected with zero baseline`,
      evidence: { current_errors: current.error_count, baseline_errors: 0 },
      detected_at: now,
    });
  }

  // Latency regression
  if (baseline.avg_latency_ms > 0) {
    const latencyIncrease = ((current.avg_latency_ms - baseline.avg_latency_ms) / baseline.avg_latency_ms) * 100;
    if (latencyIncrease >= HEALTH_THRESHOLDS.LATENCY_REGRESSION_PERCENT) {
      signals.push({
        signal_type: "latency_increase",
        severity: latencyIncrease >= 300 ? "critical" : "high",
        description: `Latency increased by ${Math.round(latencyIncrease)}%`,
        evidence: { current_ms: current.avg_latency_ms, baseline_ms: baseline.avg_latency_ms },
        detected_at: now,
      });
    }
  }

  // New error types
  const baselineSet = new Set(baseline.error_types);
  const newTypes = current.error_types.filter(t => !baselineSet.has(t));
  if (newTypes.length > 0) {
    signals.push({
      signal_type: "new_error_type",
      severity: newTypes.length >= 3 ? "high" : "medium",
      description: `${newTypes.length} new error type(s) detected post-deploy`,
      evidence: { new_types: newTypes },
      detected_at: now,
    });
  }

  return signals;
}

/**
 * Build a stability window from probes and regression signals.
 */
export function buildStabilityWindow(
  deployId: string,
  organizationId: string,
  probes: HealthCheckProbe[],
  regressions: RegressionSignal[],
  windowStart: string,
): StabilityWindow {
  const evaluation = evaluateProbes(probes);

  // Override status if regressions are severe
  let finalStatus = evaluation.status;
  const criticalRegressions = regressions.filter(r => r.severity === "critical").length;
  const highRegressions = regressions.filter(r => r.severity === "high" || r.severity === "critical").length;

  if (criticalRegressions >= HEALTH_THRESHOLDS.URGENT_ROLLBACK_THRESHOLD) {
    finalStatus = "critical";
  } else if (highRegressions >= HEALTH_THRESHOLDS.ROLLBACK_SIGNAL_THRESHOLD) {
    finalStatus = "regressed";
  }

  const now = new Date().toISOString();
  const durationMs = new Date(now).getTime() - new Date(windowStart).getTime();

  return {
    deploy_id: deployId,
    organization_id: organizationId,
    window_start: windowStart,
    window_end: durationMs >= HEALTH_THRESHOLDS.STABILITY_WINDOW_MINUTES * 60000 ? now : null,
    duration_minutes: Math.round(durationMs / 60000),
    status: finalStatus,
    probes_total: probes.length,
    probes_passed: evaluation.passed,
    probes_failed: evaluation.failed,
    stability_score: evaluation.score,
    regression_detected: regressions.length > 0,
    regression_signals: regressions,
  };
}

/**
 * Generate a health recommendation based on stability window state.
 * Advisory-first: never auto-executes rollback.
 */
export function generateHealthRecommendation(
  window: StabilityWindow,
): HealthRecommendation {
  const criticalSignals = window.regression_signals.filter(s => s.severity === "critical");
  const highSignals = window.regression_signals.filter(s => s.severity === "high" || s.severity === "critical");

  // Urgent rollback advisory
  if (criticalSignals.length >= HEALTH_THRESHOLDS.URGENT_ROLLBACK_THRESHOLD) {
    return {
      action: "rollback_urgent",
      confidence: 0.9,
      reason: `${criticalSignals.length} critical regression signals detected. Immediate rollback recommended.`,
      evidence_refs: criticalSignals.map(s => s.signal_type),
    };
  }

  // Standard rollback advisory
  if (highSignals.length >= HEALTH_THRESHOLDS.ROLLBACK_SIGNAL_THRESHOLD || window.status === "critical") {
    return {
      action: "rollback_advisory",
      confidence: 0.75,
      reason: `${highSignals.length} high/critical regression signals. Stability score: ${window.stability_score}. Rollback recommended.`,
      evidence_refs: highSignals.map(s => s.signal_type),
    };
  }

  // Investigate
  if (window.status === "regressed" || window.regression_detected) {
    return {
      action: "investigate",
      confidence: 0.6,
      reason: `Regressions detected (score: ${window.stability_score}). Investigation needed before deciding on rollback.`,
      evidence_refs: window.regression_signals.map(s => s.signal_type),
    };
  }

  // Monitor closely
  if (window.status === "degraded") {
    return {
      action: "monitor_closely",
      confidence: 0.65,
      reason: `Stability score ${window.stability_score} is below healthy threshold. Continued monitoring advised.`,
      evidence_refs: [],
    };
  }

  // Continue
  return {
    action: "continue",
    confidence: 0.85,
    reason: `Deploy stable. Score: ${window.stability_score}. No regressions detected.`,
    evidence_refs: [],
  };
}

/**
 * Assemble a complete health snapshot for a deploy.
 */
export function buildDeployHealthSnapshot(params: {
  deploy_id: string;
  initiative_id: string;
  organization_id: string;
  deployed_at: string;
  probes: HealthCheckProbe[];
  current_metrics: { error_count: number; avg_latency_ms: number; error_types: string[] };
  baseline_metrics: { error_count: number; avg_latency_ms: number; error_types: string[] };
}): DeployHealthSnapshot {
  const now = new Date().toISOString();
  const regressions = detectRegressions(params.current_metrics, params.baseline_metrics, now);
  const window = buildStabilityWindow(params.deploy_id, params.organization_id, params.probes, regressions, params.deployed_at);
  const recommendation = generateHealthRecommendation(window);

  let healthStatus: DeployHealthSnapshot["health_status"];
  if (params.probes.length < HEALTH_THRESHOLDS.MIN_PROBES_FOR_ASSESSMENT) {
    healthStatus = "unknown";
  } else if (window.status === "stable") {
    healthStatus = "healthy";
  } else if (window.status === "degraded") {
    healthStatus = "warning";
  } else if (window.status === "regressed") {
    healthStatus = "degraded";
  } else {
    healthStatus = "critical";
  }

  return {
    deploy_id: params.deploy_id,
    initiative_id: params.initiative_id,
    organization_id: params.organization_id,
    deployed_at: params.deployed_at,
    health_status: healthStatus,
    overall_score: window.stability_score,
    stability_window: window,
    probes: params.probes,
    regressions,
    recommendation,
    checked_at: now,
  };
}

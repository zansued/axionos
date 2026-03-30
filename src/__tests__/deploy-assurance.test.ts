/**
 * Sprint 3 — Deploy Assurance Tests
 * Tests for post-deploy health monitoring, rollback engine, and audit trail.
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// Inline implementations (edge function modules can't be imported directly)
// ═══════════════════════════════════════════════════════════════

// --- Post-Deploy Health Monitor ---

const HEALTH_THRESHOLDS = {
  STABILITY_WINDOW_MINUTES: 60,
  MIN_PROBES_FOR_ASSESSMENT: 3,
  DEGRADED_THRESHOLD: 60,
  CRITICAL_THRESHOLD: 30,
  HEALTHY_THRESHOLD: 80,
  ERROR_RATE_REGRESSION_PERCENT: 50,
  LATENCY_REGRESSION_PERCENT: 100,
  ROLLBACK_SIGNAL_THRESHOLD: 3,
  URGENT_ROLLBACK_THRESHOLD: 2,
} as const;

interface HealthCheckProbe {
  probe_id: string;
  probe_type: string;
  target: string;
  expected_value: string | number | boolean;
  actual_value: string | number | boolean | null;
  passed: boolean;
  measured_at: string;
}

interface RegressionSignal {
  signal_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: Record<string, unknown>;
  detected_at: string;
}

function evaluateProbes(probes: HealthCheckProbe[]) {
  if (probes.length === 0) return { score: 0, passed: 0, failed: 0, status: "monitoring" };
  const passed = probes.filter(p => p.passed).length;
  const failed = probes.length - passed;
  const score = Math.round((passed / probes.length) * 100);
  let status: string;
  if (score >= HEALTH_THRESHOLDS.HEALTHY_THRESHOLD) status = "stable";
  else if (score >= HEALTH_THRESHOLDS.DEGRADED_THRESHOLD) status = "degraded";
  else if (score >= HEALTH_THRESHOLDS.CRITICAL_THRESHOLD) status = "regressed";
  else status = "critical";
  return { score, passed, failed, status };
}

function detectRegressions(
  current: { error_count: number; avg_latency_ms: number; error_types: string[] },
  baseline: { error_count: number; avg_latency_ms: number; error_types: string[] },
  now: string,
): RegressionSignal[] {
  const signals: RegressionSignal[] = [];
  if (baseline.error_count > 0) {
    const increase = ((current.error_count - baseline.error_count) / baseline.error_count) * 100;
    if (increase >= HEALTH_THRESHOLDS.ERROR_RATE_REGRESSION_PERCENT) {
      signals.push({
        signal_type: "error_rate_spike",
        severity: increase >= 200 ? "critical" : increase >= 100 ? "high" : "medium",
        description: `Error rate increased by ${Math.round(increase)}%`,
        evidence: { current_errors: current.error_count, baseline_errors: baseline.error_count },
        detected_at: now,
      });
    }
  } else if (current.error_count > 2) {
    signals.push({
      signal_type: "error_rate_spike",
      severity: current.error_count > 10 ? "high" : "medium",
      description: `${current.error_count} errors with zero baseline`,
      evidence: { current_errors: current.error_count },
      detected_at: now,
    });
  }
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
  const baselineSet = new Set(baseline.error_types);
  const newTypes = current.error_types.filter(t => !baselineSet.has(t));
  if (newTypes.length > 0) {
    signals.push({
      signal_type: "new_error_type",
      severity: newTypes.length >= 3 ? "high" : "medium",
      description: `${newTypes.length} new error type(s)`,
      evidence: { new_types: newTypes },
      detected_at: now,
    });
  }
  return signals;
}

// --- Rollback Engine ---

const ROLLBACK_POLICY = {
  SCORE_THRESHOLD: 30,
  AUTO_ROLLBACK_CRITICAL_SIGNALS: 3,
  MIN_ROLLBACK_CONFIDENCE: 0.5,
} as const;

function buildRollbackEvidence(window: any, healthAction: string) {
  return {
    regression_count: window.regression_signals.length,
    critical_signal_count: window.regression_signals.filter((s: any) => s.severity === "critical").length,
    stability_score: window.stability_score,
    stability_status: window.status,
    health_action: healthAction,
    signals: window.regression_signals,
    baseline_comparison: window.stability_score >= 80 ? "within_baseline" : window.stability_score >= 50 ? "below_baseline" : "far_below_baseline",
  };
}

// --- Audit Trail ---

type DeployAuditEventType = "deploy_initiated" | "deploy_succeeded" | "deploy_failed" | "regression_detected" | "rollback_recommended" | "rollback_executed" | "health_check_passed" | "health_check_failed" | "stability_confirmed";

function deriveSeverity(eventType: string): string {
  switch (eventType) {
    case "deploy_failed": case "rollback_failed": return "error";
    case "regression_detected": case "rollback_recommended": case "health_check_failed": return "warning";
    case "rollback_executed": case "rollback_approved": return "critical";
    default: return "info";
  }
}

function buildLifecycleView(deployId: string, initiativeId: string, orgId: string, events: any[]) {
  const sorted = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const durationMs = first && last ? new Date(last.created_at).getTime() - new Date(first.created_at).getTime() : 0;
  return {
    deploy_id: deployId,
    events: sorted,
    current_status: last?.event_type || "unknown",
    total_duration_minutes: Math.round(durationMs / 60000),
    rollback_count: sorted.filter(e => e.event_type === "rollback_executed").length,
    health_check_count: sorted.filter(e => e.event_type === "health_check_passed" || e.event_type === "health_check_failed").length,
    regression_count: sorted.filter(e => e.event_type === "regression_detected").length,
  };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe("Post-Deploy Health Monitor", () => {
  describe("evaluateProbes", () => {
    it("returns monitoring for empty probes", () => {
      const result = evaluateProbes([]);
      expect(result.status).toBe("monitoring");
      expect(result.score).toBe(0);
    });

    it("returns stable for all passing probes", () => {
      const probes: HealthCheckProbe[] = Array.from({ length: 5 }, (_, i) => ({
        probe_id: `p${i}`, probe_type: "http_status", target: "/",
        expected_value: 200, actual_value: 200, passed: true, measured_at: new Date().toISOString(),
      }));
      const result = evaluateProbes(probes);
      expect(result.status).toBe("stable");
      expect(result.score).toBe(100);
      expect(result.passed).toBe(5);
    });

    it("returns degraded for mixed results", () => {
      const probes: HealthCheckProbe[] = [
        { probe_id: "p1", probe_type: "http_status", target: "/", expected_value: 200, actual_value: 200, passed: true, measured_at: new Date().toISOString() },
        { probe_id: "p2", probe_type: "http_status", target: "/api", expected_value: 200, actual_value: 200, passed: true, measured_at: new Date().toISOString() },
        { probe_id: "p3", probe_type: "http_status", target: "/health", expected_value: 200, actual_value: 500, passed: false, measured_at: new Date().toISOString() },
      ];
      const result = evaluateProbes(probes);
      expect(result.score).toBe(67);
      expect(result.status).toBe("degraded");
    });

    it("returns critical for mostly failing probes", () => {
      const probes: HealthCheckProbe[] = Array.from({ length: 5 }, (_, i) => ({
        probe_id: `p${i}`, probe_type: "http_status", target: "/",
        expected_value: 200, actual_value: 500, passed: i === 0, measured_at: new Date().toISOString(),
      }));
      const result = evaluateProbes(probes);
      expect(result.score).toBe(20);
      expect(result.status).toBe("critical");
    });
  });

  describe("detectRegressions", () => {
    const now = new Date().toISOString();

    it("returns empty for no regressions", () => {
      const signals = detectRegressions(
        { error_count: 2, avg_latency_ms: 100, error_types: ["timeout"] },
        { error_count: 2, avg_latency_ms: 100, error_types: ["timeout"] },
        now,
      );
      expect(signals).toHaveLength(0);
    });

    it("detects error rate spike", () => {
      const signals = detectRegressions(
        { error_count: 10, avg_latency_ms: 100, error_types: [] },
        { error_count: 3, avg_latency_ms: 100, error_types: [] },
        now,
      );
      expect(signals).toHaveLength(1);
      expect(signals[0].signal_type).toBe("error_rate_spike");
      expect(signals[0].severity).toBe("high");
    });

    it("detects critical error spike (>200%)", () => {
      const signals = detectRegressions(
        { error_count: 30, avg_latency_ms: 100, error_types: [] },
        { error_count: 5, avg_latency_ms: 100, error_types: [] },
        now,
      );
      expect(signals[0].severity).toBe("critical");
    });

    it("detects latency regression", () => {
      const signals = detectRegressions(
        { error_count: 0, avg_latency_ms: 500, error_types: [] },
        { error_count: 0, avg_latency_ms: 200, error_types: [] },
        now,
      );
      expect(signals).toHaveLength(1);
      expect(signals[0].signal_type).toBe("latency_increase");
    });

    it("detects new error types", () => {
      const signals = detectRegressions(
        { error_count: 2, avg_latency_ms: 100, error_types: ["timeout", "cors", "auth"] },
        { error_count: 2, avg_latency_ms: 100, error_types: ["timeout"] },
        now,
      );
      const newTypeSignal = signals.find(s => s.signal_type === "new_error_type");
      expect(newTypeSignal).toBeDefined();
      expect(newTypeSignal!.description).toContain("2 new error type(s)");
    });

    it("detects errors from zero baseline", () => {
      const signals = detectRegressions(
        { error_count: 5, avg_latency_ms: 100, error_types: [] },
        { error_count: 0, avg_latency_ms: 100, error_types: [] },
        now,
      );
      expect(signals).toHaveLength(1);
      expect(signals[0].signal_type).toBe("error_rate_spike");
    });
  });
});

describe("Rollback Engine", () => {
  it("builds evidence with correct baseline comparison", () => {
    const window = { stability_score: 40, status: "degraded", regression_signals: [
      { severity: "high", signal_type: "error_rate_spike" },
    ]};
    const evidence = buildRollbackEvidence(window, "rollback_advisory");
    expect(evidence.baseline_comparison).toBe("far_below_baseline");
    expect(evidence.regression_count).toBe(1);
    expect(evidence.critical_signal_count).toBe(0);
  });

  it("classifies within_baseline for healthy score", () => {
    const window = { stability_score: 90, status: "stable", regression_signals: [] };
    const evidence = buildRollbackEvidence(window, "continue");
    expect(evidence.baseline_comparison).toBe("within_baseline");
  });
});

describe("Deploy Audit Trail", () => {
  it("derives correct severity for event types", () => {
    expect(deriveSeverity("deploy_failed")).toBe("error");
    expect(deriveSeverity("regression_detected")).toBe("warning");
    expect(deriveSeverity("rollback_executed")).toBe("critical");
    expect(deriveSeverity("deploy_initiated")).toBe("info");
    expect(deriveSeverity("stability_confirmed")).toBe("info");
  });

  it("builds lifecycle view with correct counts", () => {
    const base = new Date("2026-03-30T10:00:00Z");
    const events = [
      { event_type: "deploy_initiated", created_at: new Date(base.getTime()).toISOString() },
      { event_type: "deploy_succeeded", created_at: new Date(base.getTime() + 60000).toISOString() },
      { event_type: "health_check_passed", created_at: new Date(base.getTime() + 120000).toISOString() },
      { event_type: "health_check_failed", created_at: new Date(base.getTime() + 180000).toISOString() },
      { event_type: "regression_detected", created_at: new Date(base.getTime() + 240000).toISOString() },
      { event_type: "rollback_executed", created_at: new Date(base.getTime() + 300000).toISOString() },
    ];

    const view = buildLifecycleView("d1", "i1", "org1", events);
    expect(view.rollback_count).toBe(1);
    expect(view.health_check_count).toBe(2);
    expect(view.regression_count).toBe(1);
    expect(view.current_status).toBe("rollback_executed");
    expect(view.total_duration_minutes).toBe(5);
  });

  it("handles empty events", () => {
    const view = buildLifecycleView("d1", "i1", "org1", []);
    expect(view.current_status).toBe("unknown");
    expect(view.rollback_count).toBe(0);
  });
});

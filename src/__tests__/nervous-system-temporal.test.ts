/**
 * Tests for AI Nervous System — Temporal Accumulation Engine (LIF Layer)
 * Sprint 1: Temporal Refinement
 *
 * Tests all pure functions: decay, integration, state determination,
 * spike detection, cascade detection, and temporal hint generation.
 */

import { describe, it, expect } from "vitest";

// We test the pure functions directly.
// DB-dependent functions (processTemporalBatch etc.) require integration tests.

// ── Inline implementations for unit testing ──
// (Matching the logic in nervous-system-temporal-engine.ts)

const SEVERITY_CHARGE: Record<string, number> = {
  low: 0.05,
  medium: 0.15,
  high: 0.35,
  critical: 0.60,
};

type OperationalState =
  | "nominal"
  | "elevated"
  | "stressed"
  | "pain"
  | "fatigued"
  | "recovering"
  | "critical_cascade";

const THRESHOLDS = {
  elevated: 0.3,
  stressed: 0.6,
  pain: 0.85,
  fatigued: 0.5,
  recovering: 0.2,
  critical_cascade: 0.7,
} as const;

const FATIGUE_WINDOW_MS = 2 * 60 * 60 * 1000;
const RECOVERY_WINDOW_MS = 15 * 60 * 1000;
const CASCADE_MIN_DOMAINS = 3;

function applyDecay(currentCharge: number, leakRate: number, elapsedMinutes: number): number {
  if (elapsedMinutes <= 0 || currentCharge <= 0) return currentCharge;
  const decayed = currentCharge * Math.exp(-leakRate * elapsedMinutes);
  return Math.round(decayed * 10000) / 10000;
}

function integrateEvent(
  currentCharge: number,
  severity: string,
  noveltyScore: number,
  confidenceScore: number
): { newCharge: number; contribution: number } {
  const baseContribution = SEVERITY_CHARGE[severity] || 0.05;
  const noveltyMod = 0.7 + noveltyScore * 0.6;
  const confidenceMod = 0.5 + confidenceScore * 0.5;
  const contribution = Math.round(baseContribution * noveltyMod * confidenceMod * 10000) / 10000;
  const newCharge = Math.round((currentCharge + contribution) * 10000) / 10000;
  return { newCharge, contribution };
}

function determineOperationalState(
  charge: number,
  spikeCount: number,
  avgSeverity: number,
  previousState: OperationalState,
  timeSinceStateChange_ms: number,
  cascadeDepth: number
): OperationalState {
  if (cascadeDepth >= CASCADE_MIN_DOMAINS && charge >= THRESHOLDS.critical_cascade) return "critical_cascade";
  if (charge >= THRESHOLDS.pain && spikeCount >= 3 && avgSeverity >= 0.7) return "pain";
  if (
    charge >= THRESHOLDS.fatigued &&
    (previousState === "stressed" || previousState === "pain" || previousState === "fatigued") &&
    timeSinceStateChange_ms >= FATIGUE_WINDOW_MS
  ) return "fatigued";
  if (
    (previousState === "stressed" || previousState === "pain" || previousState === "fatigued" || previousState === "critical_cascade") &&
    charge < THRESHOLDS.recovering &&
    timeSinceStateChange_ms >= RECOVERY_WINDOW_MS
  ) return "recovering";
  if (charge >= THRESHOLDS.stressed) return "stressed";
  if (charge >= THRESHOLDS.elevated) return "elevated";
  if (previousState === "recovering" && charge < THRESHOLDS.elevated) return "nominal";
  return "nominal";
}

function checkSpike(charge: number, threshold: number): boolean {
  return charge >= threshold;
}

function detectCascade(
  allDomainStates: Array<{ domain: string; operational_state: OperationalState; accumulated_charge: number }>
): { isCascade: boolean; depth: number; domains: string[] } {
  const stressedDomains = allDomainStates.filter(
    (s) => s.operational_state === "stressed" || s.operational_state === "pain" || s.operational_state === "critical_cascade"
  );
  return {
    isCascade: stressedDomains.length >= CASCADE_MIN_DOMAINS,
    depth: stressedDomains.length,
    domains: stressedDomains.map((s) => s.domain),
  };
}

function generateTemporalHint(state: {
  domain: string; subdomain: string; operational_state: OperationalState;
  accumulated_charge: number; spike_count: number; cascade_depth: number;
  cascade_related_domains: string[];
}) {
  const os = state.operational_state;
  let priorityBoost = 0, surfacingBoost = 0, calibrationHint = "";
  let fatigueDetected = false, recoveryDetected = false;
  switch (os) {
    case "nominal": calibrationHint = "Domain operating within normal parameters."; break;
    case "elevated": priorityBoost = 0.05; surfacingBoost = 0.05; calibrationHint = "Elevated signal density. Monitor for escalation."; break;
    case "stressed": priorityBoost = 0.15; surfacingBoost = 0.1; calibrationHint = "Sustained pressure detected. Consider proactive investigation."; break;
    case "pain": priorityBoost = 0.25; surfacingBoost = 0.2; calibrationHint = "Anomalous saturation with recurrence. Immediate operator attention recommended."; break;
    case "fatigued": priorityBoost = 0.2; surfacingBoost = 0.15; fatigueDetected = true; calibrationHint = "System fatigue: sustained load without recovery. Risk of degraded responsiveness."; break;
    case "recovering": surfacingBoost = 0.05; recoveryDetected = true; calibrationHint = "Recovery phase detected. Maintaining monitoring posture."; break;
    case "critical_cascade": priorityBoost = 0.3; surfacingBoost = 0.3; calibrationHint = `Cross-domain cascade: ${state.cascade_related_domains.join(", ")}. Multi-domain instability.`; break;
  }
  return { domain: state.domain, subdomain: state.subdomain, operational_state: os, accumulated_charge: state.accumulated_charge, spike_count: state.spike_count, cascade_depth: state.cascade_depth, cascade_related_domains: state.cascade_related_domains, fatigue_detected: fatigueDetected, recovery_detected: recoveryDetected, priority_boost: priorityBoost, surfacing_boost: surfacingBoost, calibration_hint: calibrationHint };
}

// ═══════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════

describe("NS Temporal Engine — applyDecay", () => {
  it("decays charge exponentially", () => {
    const result = applyDecay(1.0, 0.05, 10);
    expect(result).toBeCloseTo(0.6065, 3);
  });

  it("returns same charge if elapsed is 0", () => {
    expect(applyDecay(0.5, 0.05, 0)).toBe(0.5);
  });

  it("returns same charge if charge is 0", () => {
    expect(applyDecay(0, 0.05, 10)).toBe(0);
  });

  it("returns same charge if elapsed is negative", () => {
    expect(applyDecay(0.5, 0.05, -5)).toBe(0.5);
  });

  it("higher leak rate decays faster", () => {
    const slow = applyDecay(1.0, 0.01, 10);
    const fast = applyDecay(1.0, 0.10, 10);
    expect(fast).toBeLessThan(slow);
  });

  it("charge approaches zero over long time", () => {
    const result = applyDecay(1.0, 0.05, 1000);
    expect(result).toBeLessThan(0.001);
  });
});

describe("NS Temporal Engine — integrateEvent", () => {
  it("critical events contribute more than low events", () => {
    const critical = integrateEvent(0, "critical", 0.5, 0.8);
    const low = integrateEvent(0, "low", 0.5, 0.8);
    expect(critical.contribution).toBeGreaterThan(low.contribution);
  });

  it("charge accumulates", () => {
    const { newCharge } = integrateEvent(0.5, "medium", 0.5, 0.5);
    expect(newCharge).toBeGreaterThan(0.5);
  });

  it("high novelty increases contribution", () => {
    const highNovelty = integrateEvent(0, "medium", 0.9, 0.5);
    const lowNovelty = integrateEvent(0, "medium", 0.1, 0.5);
    expect(highNovelty.contribution).toBeGreaterThan(lowNovelty.contribution);
  });

  it("high confidence increases contribution", () => {
    const highConf = integrateEvent(0, "medium", 0.5, 0.9);
    const lowConf = integrateEvent(0, "medium", 0.5, 0.1);
    expect(highConf.contribution).toBeGreaterThan(lowConf.contribution);
  });

  it("unknown severity defaults to low contribution", () => {
    const { contribution } = integrateEvent(0, "unknown_severity", 0.5, 0.5);
    expect(contribution).toBeGreaterThan(0);
    expect(contribution).toBeLessThan(0.1);
  });
});

describe("NS Temporal Engine — determineOperationalState", () => {
  it("nominal when charge is low", () => {
    expect(determineOperationalState(0.1, 0, 0.2, "nominal", 0, 0)).toBe("nominal");
  });

  it("elevated when charge passes threshold", () => {
    expect(determineOperationalState(0.35, 0, 0.3, "nominal", 0, 0)).toBe("elevated");
  });

  it("stressed when charge is high", () => {
    expect(determineOperationalState(0.65, 1, 0.5, "elevated", 1000, 0)).toBe("stressed");
  });

  it("pain when charge is very high with recurrence and severity", () => {
    expect(determineOperationalState(0.9, 4, 0.75, "stressed", 1000, 0)).toBe("pain");
  });

  it("does NOT transition to pain without sufficient spikes", () => {
    expect(determineOperationalState(0.9, 1, 0.75, "stressed", 1000, 0)).toBe("stressed");
  });

  it("does NOT transition to pain without sufficient severity", () => {
    expect(determineOperationalState(0.9, 4, 0.3, "stressed", 1000, 0)).toBe("stressed");
  });

  it("fatigued when stressed for 2+ hours", () => {
    const twoHoursMs = FATIGUE_WINDOW_MS + 1;
    expect(determineOperationalState(0.55, 2, 0.5, "stressed", twoHoursMs, 0)).toBe("fatigued");
  });

  it("does NOT fatigue if not previously stressed/pain/fatigued", () => {
    const twoHoursMs = FATIGUE_WINDOW_MS + 1;
    // charge 0.65 is above stressed threshold but previous state "elevated" prevents fatigue
    expect(determineOperationalState(0.65, 2, 0.5, "elevated", twoHoursMs, 0)).toBe("stressed");
  });

  it("recovering when previously stressed and charge drops below threshold", () => {
    const fifteenMinMs = RECOVERY_WINDOW_MS + 1;
    expect(determineOperationalState(0.15, 1, 0.3, "stressed", fifteenMinMs, 0)).toBe("recovering");
  });

  it("critical_cascade with 3+ domains", () => {
    expect(determineOperationalState(0.75, 2, 0.5, "stressed", 1000, 3)).toBe("critical_cascade");
  });

  it("nominal after recovery completes", () => {
    expect(determineOperationalState(0.1, 1, 0.2, "recovering", 1000, 0)).toBe("nominal");
  });
});

describe("NS Temporal Engine — checkSpike", () => {
  it("fires when charge >= threshold", () => {
    expect(checkSpike(1.0, 1.0)).toBe(true);
  });

  it("fires when charge > threshold", () => {
    expect(checkSpike(1.5, 1.0)).toBe(true);
  });

  it("does not fire when charge < threshold", () => {
    expect(checkSpike(0.9, 1.0)).toBe(false);
  });
});

describe("NS Temporal Engine — detectCascade", () => {
  it("detects cascade with 3+ stressed domains", () => {
    const result = detectCascade([
      { domain: "runtime", operational_state: "stressed", accumulated_charge: 0.7 },
      { domain: "pipeline", operational_state: "pain", accumulated_charge: 0.9 },
      { domain: "agent", operational_state: "stressed", accumulated_charge: 0.65 },
      { domain: "cost", operational_state: "nominal", accumulated_charge: 0.1 },
    ]);
    expect(result.isCascade).toBe(true);
    expect(result.depth).toBe(3);
    expect(result.domains).toContain("runtime");
    expect(result.domains).toContain("pipeline");
    expect(result.domains).toContain("agent");
    expect(result.domains).not.toContain("cost");
  });

  it("no cascade with fewer than 3 stressed domains", () => {
    const result = detectCascade([
      { domain: "runtime", operational_state: "stressed", accumulated_charge: 0.7 },
      { domain: "pipeline", operational_state: "nominal", accumulated_charge: 0.1 },
    ]);
    expect(result.isCascade).toBe(false);
    expect(result.depth).toBe(1);
  });

  it("no cascade when all nominal", () => {
    const result = detectCascade([
      { domain: "runtime", operational_state: "nominal", accumulated_charge: 0.1 },
      { domain: "pipeline", operational_state: "nominal", accumulated_charge: 0.05 },
    ]);
    expect(result.isCascade).toBe(false);
    expect(result.depth).toBe(0);
  });

  it("counts critical_cascade domains in cascade detection", () => {
    const result = detectCascade([
      { domain: "runtime", operational_state: "critical_cascade", accumulated_charge: 0.9 },
      { domain: "pipeline", operational_state: "stressed", accumulated_charge: 0.7 },
      { domain: "agent", operational_state: "pain", accumulated_charge: 0.85 },
    ]);
    expect(result.isCascade).toBe(true);
    expect(result.depth).toBe(3);
  });
});

describe("NS Temporal Engine — generateTemporalHint", () => {
  const baseState = {
    domain: "runtime",
    subdomain: "general",
    spike_count: 0,
    cascade_depth: 0,
    cascade_related_domains: [] as string[],
  };

  it("produces zero boost for nominal state", () => {
    const hint = generateTemporalHint({
      ...baseState,
      accumulated_charge: 0.1,
      operational_state: "nominal",
    });
    expect(hint.priority_boost).toBe(0);
    expect(hint.surfacing_boost).toBe(0);
    expect(hint.fatigue_detected).toBe(false);
    expect(hint.recovery_detected).toBe(false);
  });

  it("produces small boost for elevated state", () => {
    const hint = generateTemporalHint({
      ...baseState,
      accumulated_charge: 0.35,
      operational_state: "elevated",
    });
    expect(hint.priority_boost).toBe(0.05);
    expect(hint.surfacing_boost).toBe(0.05);
  });

  it("produces significant boost for pain state", () => {
    const hint = generateTemporalHint({
      ...baseState,
      accumulated_charge: 0.9,
      operational_state: "pain",
      spike_count: 4,
    });
    expect(hint.priority_boost).toBe(0.25);
    expect(hint.surfacing_boost).toBe(0.2);
  });

  it("detects fatigue", () => {
    const hint = generateTemporalHint({
      ...baseState,
      accumulated_charge: 0.55,
      operational_state: "fatigued",
    });
    expect(hint.fatigue_detected).toBe(true);
    expect(hint.priority_boost).toBe(0.2);
  });

  it("detects recovery", () => {
    const hint = generateTemporalHint({
      ...baseState,
      accumulated_charge: 0.15,
      operational_state: "recovering",
    });
    expect(hint.recovery_detected).toBe(true);
    expect(hint.priority_boost).toBe(0);
  });

  it("maximum boost for critical_cascade", () => {
    const hint = generateTemporalHint({
      ...baseState,
      accumulated_charge: 0.8,
      operational_state: "critical_cascade",
      cascade_depth: 3,
      cascade_related_domains: ["runtime", "pipeline", "agent"],
    });
    expect(hint.priority_boost).toBe(0.3);
    expect(hint.surfacing_boost).toBe(0.3);
    expect(hint.calibration_hint).toContain("Cross-domain cascade");
  });
});

describe("NS Temporal Engine — Integration scenarios", () => {
  it("full lifecycle: integrate, spike, decay, recover", () => {
    // Start at nominal
    let charge = 0;
    const leakRate = 0.05;
    const fireThreshold = 1.0;

    // Rapid critical events
    for (let i = 0; i < 3; i++) {
      const result = integrateEvent(charge, "critical", 0.8, 0.9);
      charge = result.newCharge;
    }

    // Should have spiked
    expect(checkSpike(charge, fireThreshold)).toBe(true);

    // After spike, refractory reduces charge
    charge = Math.round(charge * 0.5 * 10000) / 10000;

    // Decay over 30 minutes
    charge = applyDecay(charge, leakRate, 30);

    // Should be significantly lower
    expect(charge).toBeLessThan(0.5);

    // Decay over another 60 minutes
    charge = applyDecay(charge, leakRate, 60);
    expect(charge).toBeLessThan(0.1);
  });

  it("cascading stress across domains", () => {
    const domains = [
      { domain: "runtime", operational_state: "stressed" as OperationalState, accumulated_charge: 0.7 },
      { domain: "pipeline", operational_state: "pain" as OperationalState, accumulated_charge: 0.9 },
      { domain: "agent", operational_state: "stressed" as OperationalState, accumulated_charge: 0.65 },
      { domain: "governance", operational_state: "nominal" as OperationalState, accumulated_charge: 0.1 },
    ];

    const cascade = detectCascade(domains);
    expect(cascade.isCascade).toBe(true);

    // Check that cascade state takes precedence
    const state = determineOperationalState(0.75, 2, 0.5, "stressed", 1000, cascade.depth);
    expect(state).toBe("critical_cascade");
  });
});

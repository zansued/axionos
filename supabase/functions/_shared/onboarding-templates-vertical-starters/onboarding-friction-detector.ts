// Sprint 69 — Onboarding Friction Detector
// Detects hesitation, confusion, abandonment patterns, and unclear entry points.

export interface FrictionSignal {
  signalType: "hesitation" | "abandonment" | "confusion" | "backtrack" | "empty_input";
  stepKey: string;
  severity: "low" | "moderate" | "high";
  description: string;
}

export interface FrictionAnalysis {
  firstRunFrictionScore: number;
  abandonmentRiskScore: number;
  signals: FrictionSignal[];
  reasoning: string;
}

export function detectOnboardingFriction(params: {
  totalSteps: number;
  currentStep: number;
  timeOnCurrentStepMs: number;
  backtrackCount: number;
  emptySubmissions: number;
  sessionDurationMs: number;
}): FrictionAnalysis {
  const signals: FrictionSignal[] = [];
  const { totalSteps, currentStep, timeOnCurrentStepMs, backtrackCount, emptySubmissions, sessionDurationMs } = params;

  if (timeOnCurrentStepMs > 60000) {
    signals.push({ signalType: "hesitation", stepKey: `step_${currentStep}`, severity: "moderate", description: "User spent over 60s on this step — possible confusion." });
  }
  if (backtrackCount > 2) {
    signals.push({ signalType: "backtrack", stepKey: `step_${currentStep}`, severity: "moderate", description: `User backtracked ${backtrackCount} times — unclear progression.` });
  }
  if (emptySubmissions > 0) {
    signals.push({ signalType: "empty_input", stepKey: `step_${currentStep}`, severity: "low", description: "User submitted empty input — unclear what to enter." });
  }
  if (currentStep < totalSteps * 0.5 && sessionDurationMs > 180000) {
    signals.push({ signalType: "abandonment", stepKey: `step_${currentStep}`, severity: "high", description: "Session is long but progress is under 50% — high abandonment risk." });
  }

  const frictionScore = Math.min(1, signals.reduce((a, s) => a + (s.severity === "high" ? 0.4 : s.severity === "moderate" ? 0.2 : 0.1), 0));
  const abandonmentRisk = Math.min(1, (currentStep < totalSteps * 0.3 && sessionDurationMs > 120000) ? 0.7 : frictionScore * 0.6);

  return {
    firstRunFrictionScore: frictionScore,
    abandonmentRiskScore: abandonmentRisk,
    signals,
    reasoning: signals.length === 0
      ? "No friction signals detected."
      : `Detected ${signals.length} friction signal(s). Primary: ${signals[0].description}`,
  };
}

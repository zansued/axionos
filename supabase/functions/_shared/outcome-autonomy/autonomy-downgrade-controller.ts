/**
 * Autonomy Downgrade Controller — Sprint 121
 * Manages safe autonomy level downgrade logic.
 */

export interface DowngradeInput {
  current_level: number;
  regression_severity: "low" | "medium" | "high" | "critical";
  has_active_review: boolean;
}

export interface DowngradeResult {
  should_downgrade: boolean;
  new_level: number;
  steps_down: number;
  reason: string;
  requires_review: boolean;
}

export function computeDowngrade(input: DowngradeInput): DowngradeResult {
  if (input.current_level <= 0) {
    return { should_downgrade: false, new_level: 0, steps_down: 0, reason: "Already at minimum autonomy.", requires_review: false };
  }

  if (input.has_active_review) {
    return { should_downgrade: false, new_level: input.current_level, steps_down: 0, reason: "Active review in progress — downgrade deferred.", requires_review: true };
  }

  let stepsDown = 0;
  switch (input.regression_severity) {
    case "critical": stepsDown = 2; break;
    case "high": stepsDown = 1; break;
    case "medium": stepsDown = 1; break;
    default: stepsDown = 0;
  }

  const newLevel = Math.max(0, input.current_level - stepsDown);

  if (stepsDown === 0) {
    return { should_downgrade: false, new_level: input.current_level, steps_down: 0, reason: "Regression severity too low for automatic downgrade.", requires_review: false };
  }

  return {
    should_downgrade: true,
    new_level: newLevel,
    steps_down: stepsDown,
    reason: `Regression severity '${input.regression_severity}' triggers ${stepsDown}-step downgrade from level ${input.current_level} to ${newLevel}.`,
    requires_review: input.regression_severity !== "critical",
  };
}

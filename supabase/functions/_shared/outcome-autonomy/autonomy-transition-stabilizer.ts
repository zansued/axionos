/**
 * Autonomy Transition Stabilizer — Sprint 124
 * Enforces temporal discipline on autonomy level transitions to prevent oscillation.
 * Downgrades for critical breaches remain immediate.
 */

export interface TransitionRule {
  id?: string;
  level_from: number;
  level_to: number;
  minimum_time_at_level_hours: number;
  minimum_execution_count: number;
  confidence_threshold: number;
  tenant_override_allowed: boolean;
}

export interface TransitionContext {
  current_level: number;
  proposed_level: number;
  level_entered_at: string; // ISO timestamp
  executions_at_current_level: number;
  current_confidence: number;
  is_critical_breach: boolean;
}

export interface TransitionVerdict {
  allowed: boolean;
  direction: "upgrade" | "downgrade" | "stable";
  rejection_reasons: string[];
  time_at_level_hours: number;
  time_remaining_hours: number;
  executions_remaining: number;
  confidence_gap: number;
  rule_applied: TransitionRule | null;
}

/** Default rules when no DB rules are available */
export const DEFAULT_TRANSITION_RULES: TransitionRule[] = [
  { level_from: 0, level_to: 1, minimum_time_at_level_hours: 12, minimum_execution_count: 5, confidence_threshold: 0.3, tenant_override_allowed: false },
  { level_from: 1, level_to: 2, minimum_time_at_level_hours: 24, minimum_execution_count: 10, confidence_threshold: 0.5, tenant_override_allowed: false },
  { level_from: 2, level_to: 3, minimum_time_at_level_hours: 48, minimum_execution_count: 15, confidence_threshold: 0.7, tenant_override_allowed: false },
  { level_from: 3, level_to: 4, minimum_time_at_level_hours: 72, minimum_execution_count: 25, confidence_threshold: 0.85, tenant_override_allowed: false },
  { level_from: 4, level_to: 5, minimum_time_at_level_hours: 168, minimum_execution_count: 50, confidence_threshold: 0.95, tenant_override_allowed: false },
];

export function findTransitionRule(
  levelFrom: number,
  levelTo: number,
  rules: TransitionRule[],
): TransitionRule | null {
  return rules.find(
    (r) => r.level_from === levelFrom && r.level_to === levelTo,
  ) || null;
}

export function evaluateTransition(
  ctx: TransitionContext,
  rules: TransitionRule[] = DEFAULT_TRANSITION_RULES,
): TransitionVerdict {
  const { current_level, proposed_level } = ctx;

  // No change
  if (proposed_level === current_level) {
    return {
      allowed: false,
      direction: "stable",
      rejection_reasons: ["No level change requested."],
      time_at_level_hours: 0,
      time_remaining_hours: 0,
      executions_remaining: 0,
      confidence_gap: 0,
      rule_applied: null,
    };
  }

  const direction = proposed_level > current_level ? "upgrade" : "downgrade";

  // Critical breach downgrades are always immediate
  if (direction === "downgrade" && ctx.is_critical_breach) {
    return {
      allowed: true,
      direction: "downgrade",
      rejection_reasons: [],
      time_at_level_hours: 0,
      time_remaining_hours: 0,
      executions_remaining: 0,
      confidence_gap: 0,
      rule_applied: null,
    };
  }

  // Non-critical downgrades: allowed but logged
  if (direction === "downgrade") {
    return {
      allowed: true,
      direction: "downgrade",
      rejection_reasons: [],
      time_at_level_hours: 0,
      time_remaining_hours: 0,
      executions_remaining: 0,
      confidence_gap: 0,
      rule_applied: null,
    };
  }

  // Upgrade path — find and enforce rule
  const rule = findTransitionRule(current_level, proposed_level, rules);

  if (!rule) {
    return {
      allowed: false,
      direction: "upgrade",
      rejection_reasons: [`No transition rule defined for L${current_level} → L${proposed_level}.`],
      time_at_level_hours: 0,
      time_remaining_hours: 0,
      executions_remaining: 0,
      confidence_gap: 0,
      rule_applied: null,
    };
  }

  const reasons: string[] = [];

  // Time check
  const enteredMs = new Date(ctx.level_entered_at).getTime();
  const nowMs = Date.now();
  const hoursAtLevel = (nowMs - enteredMs) / (1000 * 60 * 60);
  const timeRemaining = Math.max(0, rule.minimum_time_at_level_hours - hoursAtLevel);

  if (hoursAtLevel < rule.minimum_time_at_level_hours) {
    reasons.push(
      `Time at level: ${hoursAtLevel.toFixed(1)}h / ${rule.minimum_time_at_level_hours}h required (${timeRemaining.toFixed(1)}h remaining).`,
    );
  }

  // Execution count check
  const execRemaining = Math.max(0, rule.minimum_execution_count - ctx.executions_at_current_level);
  if (ctx.executions_at_current_level < rule.minimum_execution_count) {
    reasons.push(
      `Executions: ${ctx.executions_at_current_level} / ${rule.minimum_execution_count} required (${execRemaining} remaining).`,
    );
  }

  // Confidence check
  const confidenceGap = Math.max(0, rule.confidence_threshold - ctx.current_confidence);
  if (ctx.current_confidence < rule.confidence_threshold) {
    reasons.push(
      `Confidence: ${ctx.current_confidence.toFixed(3)} / ${rule.confidence_threshold} required (gap: ${confidenceGap.toFixed(3)}).`,
    );
  }

  return {
    allowed: reasons.length === 0,
    direction: "upgrade",
    rejection_reasons: reasons,
    time_at_level_hours: parseFloat(hoursAtLevel.toFixed(2)),
    time_remaining_hours: parseFloat(timeRemaining.toFixed(2)),
    executions_remaining: execRemaining,
    confidence_gap: parseFloat(confidenceGap.toFixed(3)),
    rule_applied: rule,
  };
}

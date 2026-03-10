/**
 * Operating Profile Adjuster
 * Applies bounded adjustments to operating profiles based on signals.
 */

const MAX_DELTA = 0.15;
const MIN_SCORE = 0;
const MAX_SCORE = 1;

export interface AdjustmentResult {
  dimension: string;
  previous_value: number;
  new_value: number;
  delta: number;
  reason: string;
  applied: boolean;
}

export function computeAdjustment(
  currentValue: number,
  signalStrength: number,
  signalDirection: 'increase' | 'decrease',
  reason: string
): AdjustmentResult {
  const rawDelta = signalStrength * MAX_DELTA;
  const delta = signalDirection === 'increase' ? rawDelta : -rawDelta;
  const newValue = Math.max(MIN_SCORE, Math.min(MAX_SCORE, currentValue + delta));
  const clampedDelta = Math.round((newValue - currentValue) * 100) / 100;

  return {
    dimension: '',
    previous_value: currentValue,
    new_value: Math.round(newValue * 100) / 100,
    delta: clampedDelta,
    reason,
    applied: Math.abs(clampedDelta) > 0.01,
  };
}

export function applyAdjustments(
  profile: Record<string, number>,
  adjustments: Array<{ dimension: string; strength: number; direction: 'increase' | 'decrease'; reason: string }>
): AdjustmentResult[] {
  return adjustments.map(adj => {
    const current = profile[adj.dimension] ?? 0.5;
    const result = computeAdjustment(current, adj.strength, adj.direction, adj.reason);
    result.dimension = adj.dimension;
    if (result.applied) {
      profile[adj.dimension] = result.new_value;
    }
    return result;
  });
}

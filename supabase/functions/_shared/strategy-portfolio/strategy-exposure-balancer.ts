/**
 * Strategy Exposure Balancer — Sprint 33
 * Controls strategy selection frequency with bounded exposure rules.
 * Pure functions. No DB access.
 */

export interface ExposureInput {
  strategy_family_id: string;
  family_key: string;
  lifecycle_status: string;
  current_weight: number;
  execution_count: number;
  total_executions: number;
}

export interface ExposureAdjustment {
  strategy_family_id: string;
  current_weight: number;
  adjusted_weight: number;
  reason: string;
}

export interface ExposureConfig {
  max_exposure_share: number; // default 0.8
  min_exposure_share: number; // default 0.05
  max_weight_delta: number;   // default 0.2
}

const DEFAULT_EXPOSURE_CONFIG: ExposureConfig = {
  max_exposure_share: 0.8,
  min_exposure_share: 0.05,
  max_weight_delta: 0.2,
};

export function computeExposureAdjustments(
  inputs: ExposureInput[],
  config: ExposureConfig = DEFAULT_EXPOSURE_CONFIG,
): ExposureAdjustment[] {
  const adjustments: ExposureAdjustment[] = [];
  const activeInputs = inputs.filter(i => i.lifecycle_status === "active" || i.lifecycle_status === "experimental");

  if (activeInputs.length <= 1) return adjustments;

  const totalExecs = activeInputs.reduce((a, i) => a + i.execution_count, 0);
  if (totalExecs === 0) return adjustments;

  for (const input of activeInputs) {
    const currentShare = input.execution_count / totalExecs;
    let adjustedWeight = input.current_weight;
    let reason = "";

    // Cap dominant strategies
    if (currentShare > config.max_exposure_share) {
      const reduction = Math.min(config.max_weight_delta, input.current_weight * 0.3);
      adjustedWeight = Math.max(0.1, input.current_weight - reduction);
      reason = `Exposure share ${(currentShare * 100).toFixed(0)}% exceeds ${(config.max_exposure_share * 100).toFixed(0)}% cap`;
    }

    // Boost underexposed strategies
    if (currentShare < config.min_exposure_share && input.lifecycle_status === "active") {
      const boost = Math.min(config.max_weight_delta, 0.2);
      adjustedWeight = input.current_weight + boost;
      reason = `Exposure share ${(currentShare * 100).toFixed(0)}% below ${(config.min_exposure_share * 100).toFixed(0)}% minimum`;
    }

    if (adjustedWeight !== input.current_weight) {
      adjustments.push({
        strategy_family_id: input.strategy_family_id,
        current_weight: input.current_weight,
        adjusted_weight: round(adjustedWeight),
        reason,
      });
    }
  }

  return adjustments;
}

export function detectMonoculture(inputs: ExposureInput[]): boolean {
  const activeInputs = inputs.filter(i => i.lifecycle_status === "active");
  if (activeInputs.length <= 1) return activeInputs.length === 1 && inputs.length > 1;

  const totalExecs = activeInputs.reduce((a, i) => a + i.execution_count, 0);
  if (totalExecs === 0) return false;

  const maxShare = Math.max(...activeInputs.map(i => i.execution_count / totalExecs));
  return maxShare > 0.8;
}

function round(n: number, d: number = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

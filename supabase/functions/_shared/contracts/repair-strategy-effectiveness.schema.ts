// Repair Strategy Effectiveness Contract — AxionOS Sprint 7
// Tracks which strategies work best for each error category.

export interface StrategyEffectiveness {
  id: string;
  organization_id: string;
  error_category: string;
  repair_strategy: string;
  attempts_total: number;
  successes_total: number;
  failures_total: number;
  success_rate: number;
  average_duration_ms: number;
  last_used_at: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export function computeSuccessRate(successes: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((successes / total) * 10000) / 100; // two decimal %
}

export function computeConfidence(total: number, successRate: number): number {
  // Higher sample size + higher success = higher confidence
  const sampleFactor = Math.min(total / 20, 1); // max at 20 samples
  return Math.round(sampleFactor * (successRate / 100) * 100) / 100;
}

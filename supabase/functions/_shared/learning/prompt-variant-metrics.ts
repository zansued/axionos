/**
 * Prompt Variant Metrics Aggregator — Sprint 21
 *
 * Aggregates execution data into deterministic metrics per variant.
 */

export interface ExecutionRecord {
  id: string;
  prompt_variant_id: string;
  success: boolean | null;
  retry_count: number;
  repair_triggered: boolean;
  cost_usd: number;
  duration_ms: number;
  quality_score: number | null;
  created_at: string;
}

export interface AggregatedMetrics {
  prompt_variant_id: string;
  executions: number;
  success_rate: number | null;
  repair_rate: number | null;
  avg_cost_usd: number | null;
  avg_duration_ms: number | null;
  avg_quality_score: number | null;
  promotion_score: number | null;
  confidence_level: number | null;
}

/**
 * Aggregate execution records into metrics for a single variant.
 * All calculations are deterministic and rule-based.
 */
export function aggregateVariantMetrics(
  variantId: string,
  executions: ExecutionRecord[],
): AggregatedMetrics {
  const n = executions.length;

  if (n === 0) {
    return {
      prompt_variant_id: variantId,
      executions: 0,
      success_rate: null,
      repair_rate: null,
      avg_cost_usd: null,
      avg_duration_ms: null,
      avg_quality_score: null,
      promotion_score: null,
      confidence_level: null,
    };
  }

  const successCount = executions.filter((e) => e.success === true).length;
  const repairCount = executions.filter((e) => e.repair_triggered).length;
  const totalCost = executions.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const totalDuration = executions.reduce((s, e) => s + (e.duration_ms || 0), 0);

  const qualityScores = executions
    .map((e) => e.quality_score)
    .filter((q): q is number => q !== null && q !== undefined);

  const successRate = round(successCount / n, 4);
  const repairRate = round(repairCount / n, 4);
  const avgCost = round(totalCost / n, 6);
  const avgDuration = round(totalDuration / n, 2);
  const avgQuality = qualityScores.length > 0
    ? round(qualityScores.reduce((s, q) => s + q, 0) / qualityScores.length, 4)
    : null;

  const confidence = computeConfidence(n);
  const promotionScore = computePromotionScore(successRate, repairRate, avgQuality, avgCost, confidence);

  return {
    prompt_variant_id: variantId,
    executions: n,
    success_rate: successRate,
    repair_rate: repairRate,
    avg_cost_usd: avgCost,
    avg_duration_ms: avgDuration,
    avg_quality_score: avgQuality,
    promotion_score: promotionScore,
    confidence_level: confidence,
  };
}

/**
 * Confidence level based on sample size.
 * Uses a simple bounded logarithmic curve.
 */
function computeConfidence(sampleSize: number): number {
  if (sampleSize === 0) return 0;
  if (sampleSize >= 100) return 1;
  // log-based: confidence grows quickly at first, then plateaus
  return round(Math.min(1, Math.log10(sampleSize + 1) / 2), 4);
}

/**
 * Promotion score: composite metric [0, 1] indicating readiness for promotion.
 *
 * Formula:
 *   0.40 * successRate
 * + 0.25 * (1 - repairRate)
 * + 0.20 * normalizedQuality
 * + 0.10 * (1 - normalizedCost)
 * + 0.05 * confidence
 */
function computePromotionScore(
  successRate: number,
  repairRate: number,
  avgQuality: number | null,
  avgCost: number,
  confidence: number,
): number {
  const normalizedQuality = avgQuality !== null ? Math.min(1, avgQuality / 100) : 0.5;
  // Normalize cost: assume $0.10 is high, clamp to [0,1]
  const normalizedCost = Math.min(1, avgCost / 0.1);

  const score =
    0.40 * successRate +
    0.25 * (1 - repairRate) +
    0.20 * normalizedQuality +
    0.10 * (1 - normalizedCost) +
    0.05 * confidence;

  return round(Math.max(0, Math.min(1, score)), 4);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Compare two variants' metrics to determine relative performance.
 */
export interface VariantComparison {
  experimentVariantId: string;
  controlVariantId: string;
  successRateDelta: number | null;
  repairRateDelta: number | null;
  costDelta: number | null;
  qualityDelta: number | null;
  promotionScoreDelta: number | null;
  verdict: "experiment_better" | "control_better" | "inconclusive";
}

export function compareVariants(
  control: AggregatedMetrics,
  experiment: AggregatedMetrics,
): VariantComparison {
  const successDelta = safeDelta(experiment.success_rate, control.success_rate);
  const repairDelta = safeDelta(experiment.repair_rate, control.repair_rate);
  const costDelta = safeDelta(experiment.avg_cost_usd, control.avg_cost_usd);
  const qualityDelta = safeDelta(experiment.avg_quality_score, control.avg_quality_score);
  const promoDelta = safeDelta(experiment.promotion_score, control.promotion_score);

  let verdict: VariantComparison["verdict"] = "inconclusive";

  const minExecs = 10;
  if (experiment.executions >= minExecs && control.executions >= minExecs) {
    if (promoDelta !== null && promoDelta > 0.05) {
      verdict = "experiment_better";
    } else if (promoDelta !== null && promoDelta < -0.05) {
      verdict = "control_better";
    }
  }

  return {
    experimentVariantId: experiment.prompt_variant_id,
    controlVariantId: control.prompt_variant_id,
    successRateDelta: successDelta,
    repairRateDelta: repairDelta,
    costDelta: costDelta,
    qualityDelta: qualityDelta,
    promotionScoreDelta: promoDelta,
    verdict,
  };
}

function safeDelta(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return round(a - b, 6);
}

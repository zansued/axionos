/**
 * Architectural Bloat Analyzer — Sprint 114
 * Detects complexity growth without proportional capability gain.
 */

export interface BloatInput {
  total_modules: number;
  active_modules: number;
  duplicate_control_surfaces: number;
  redundant_orchestration_layers: number;
  unused_tables: number;
  complexity_growth_rate: number;
  capability_growth_rate: number;
}

export interface BloatResult {
  bloat_score: number;
  net_value_score: number;
  indicators: Array<{ type: string; score: number; description: string }>;
  recommendation: string;
}

export function analyzeBloat(input: BloatInput): BloatResult {
  const indicators: BloatResult["indicators"] = [];
  let bloat = 0;

  // Unused module ratio
  if (input.total_modules > 0) {
    const unusedRatio = 1 - (input.active_modules / input.total_modules);
    if (unusedRatio > 0.2) {
      bloat += unusedRatio * 0.3;
      indicators.push({ type: "inactive_modules", score: unusedRatio, description: `${Math.round(unusedRatio * 100)}% of modules are inactive` });
    }
  }

  if (input.duplicate_control_surfaces > 0) {
    const w = Math.min(0.25, input.duplicate_control_surfaces * 0.08);
    bloat += w;
    indicators.push({ type: "duplicate_surfaces", score: w, description: `${input.duplicate_control_surfaces} duplicate control surfaces` });
  }

  if (input.redundant_orchestration_layers > 0) {
    const w = Math.min(0.2, input.redundant_orchestration_layers * 0.1);
    bloat += w;
    indicators.push({ type: "redundant_orchestration", score: w, description: `${input.redundant_orchestration_layers} redundant orchestration layers` });
  }

  if (input.unused_tables > 3) {
    const w = Math.min(0.15, input.unused_tables * 0.02);
    bloat += w;
    indicators.push({ type: "unused_tables", score: w, description: `${input.unused_tables} unused database tables` });
  }

  // Complexity vs capability growth
  const complexityGap = input.complexity_growth_rate - input.capability_growth_rate;
  if (complexityGap > 0.1) {
    bloat += Math.min(0.2, complexityGap);
    indicators.push({ type: "complexity_exceeds_capability", score: complexityGap, description: "Complexity growing faster than capability" });
  }

  bloat = Math.min(1, bloat);
  const netValue = Math.max(0, 1 - bloat);

  let recommendation = "Architecture is lean and proportional";
  if (bloat > 0.7) recommendation = "CRITICAL: Consolidation required. Complexity far exceeds capability gain.";
  else if (bloat > 0.5) recommendation = "Simplification recommended. Consider deprecating unused modules and merging duplicate surfaces.";
  else if (bloat > 0.3) recommendation = "Monitor bloat trend. Some areas could benefit from consolidation.";

  return {
    bloat_score: Math.round(bloat * 10000) / 10000,
    net_value_score: Math.round(netValue * 10000) / 10000,
    indicators,
    recommendation,
  };
}

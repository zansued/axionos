/**
 * Resilience Scorer — Sprint 102
 * Calculates resilience scores by domain.
 */

import { AssetDependencyMap } from "./critical-asset-mapper.ts";
import { FragilityFinding } from "./fragility-detector.ts";

export interface ResilienceScores {
  resilience_score: number;
  continuity_score: number;
  fallback_readiness_score: number;
  coordination_fragility_score: number;
  memory_recovery_score: number;
  summary: string;
}

export function computeResilienceScores(
  maps: AssetDependencyMap[],
  findings: FragilityFinding[]
): ResilienceScores {
  if (maps.length === 0) {
    return { resilience_score: 1, continuity_score: 1, fallback_readiness_score: 1, coordination_fragility_score: 0, memory_recovery_score: 1, summary: "No assets to assess." };
  }

  const sevWeights: Record<string, number> = { low: 0.05, moderate: 0.15, high: 0.3, critical: 0.5 };
  const totalPenalty = findings.reduce((s, f) => s + (sevWeights[f.severity] || 0.1), 0);
  const resilience = Math.max(0, Math.min(1, 1 - totalPenalty / Math.max(maps.length, 1)));

  const allDeps = maps.flatMap((m) => m.dependencies.map((d) => d.dependency));
  const withFallback = allDeps.filter((d) => d.fallback_exists).length;
  const fallbackReadiness = allDeps.length > 0 ? withFallback / allDeps.length : 1;

  const spofs = maps.filter((m) => m.is_single_point_of_failure).length;
  const coordFragility = Math.min(1, spofs * 0.2);

  const memoryAssets = maps.filter((m) => m.asset.asset_type === "memory");
  const memoryRecovery = memoryAssets.length > 0
    ? memoryAssets.filter((m) => m.dependencies.some((d) => d.dependency.fallback_exists)).length / memoryAssets.length
    : 1;

  const continuity = (resilience + fallbackReadiness + (1 - coordFragility) + memoryRecovery) / 4;

  return {
    resilience_score: Math.round(resilience * 1000) / 1000,
    continuity_score: Math.round(continuity * 1000) / 1000,
    fallback_readiness_score: Math.round(fallbackReadiness * 1000) / 1000,
    coordination_fragility_score: Math.round(coordFragility * 1000) / 1000,
    memory_recovery_score: Math.round(memoryRecovery * 1000) / 1000,
    summary: `Resilience: ${(resilience * 100).toFixed(0)}%, Fallback readiness: ${(fallbackReadiness * 100).toFixed(0)}%, SPOFs: ${spofs}, Findings: ${findings.length}.`,
  };
}

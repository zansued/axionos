/**
 * Sovereignty Scorer
 * Computes domain-level sovereignty and external reliance posture.
 */
export interface SovereigntyInput {
  totalAssets: number;
  externallyDependentAssets: number;
  criticalDependenciesWithoutFallback: number;
  avgLockInScore: number;
  avgFallbackReadiness: number;
}

export interface SovereigntyResult {
  sovereigntyScore: number;
  externalRelianceScore: number;
  level: string;
  summary: string;
}

export function computeSovereignty(input: SovereigntyInput): SovereigntyResult {
  if (input.totalAssets === 0) {
    return { sovereigntyScore: 100, externalRelianceScore: 0, level: "sovereign", summary: "No assets tracked." };
  }
  const relianceRatio = input.externallyDependentAssets / input.totalAssets;
  const externalRelianceScore = Math.round(relianceRatio * 60 + input.avgLockInScore * 0.4);
  const sovereigntyScore = Math.max(0, 100 - externalRelianceScore - input.criticalDependenciesWithoutFallback * 10);
  const level = sovereigntyScore >= 75 ? "sovereign" : sovereigntyScore >= 50 ? "partially_dependent" : sovereigntyScore >= 25 ? "dependent" : "captive";
  return {
    sovereigntyScore: Math.max(0, Math.min(100, sovereigntyScore)),
    externalRelianceScore: Math.min(100, externalRelianceScore),
    level,
    summary: `Sovereignty ${level} (${sovereigntyScore}/100). ${input.criticalDependenciesWithoutFallback} critical deps without fallback.`,
  };
}

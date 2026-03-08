/**
 * Product Benchmark Engine — Sprint 54
 * Builds normalized cross-tenant / cross-workspace product benchmarks.
 * Advisory-only. No mutations.
 */

export interface BenchmarkInput {
  scopeId: string;
  scopeType: string;
  productArea?: string;
  adoptionScore: number;
  retentionScore: number;
  frictionScore: number;
  valueScore: number;
  signalQualityScore: number;
  architectureAlignmentScore: number;
  profileAlignmentScore: number;
}

export interface BenchmarkResult {
  scopeId: string;
  scopeType: string;
  productArea?: string;
  adoptionScore: number;
  retentionScore: number;
  frictionScore: number;
  valueScore: number;
  compositeScore: number;
  benchmarkRank: number;
  priorityScore: number;
  confidenceScore: number;
  noisepenaltyScore: number;
}

export function buildBenchmarks(inputs: BenchmarkInput[]): BenchmarkResult[] {
  if (inputs.length === 0) return [];

  const scored = inputs.map(input => {
    const composite = (
      input.adoptionScore * 0.25 +
      input.retentionScore * 0.2 +
      (1 - input.frictionScore) * 0.2 +
      input.valueScore * 0.2 +
      input.signalQualityScore * 0.15
    );

    const noisePenalty = input.signalQualityScore < 0.3
      ? 0.3 - input.signalQualityScore
      : 0;

    const priority = Math.max(0, composite - noisePenalty) *
      (0.5 + input.architectureAlignmentScore * 0.25 + input.profileAlignmentScore * 0.25);

    const confidence = Math.min(1, input.signalQualityScore * 0.6 + (1 - noisePenalty) * 0.4);

    return {
      scopeId: input.scopeId,
      scopeType: input.scopeType,
      productArea: input.productArea,
      adoptionScore: input.adoptionScore,
      retentionScore: input.retentionScore,
      frictionScore: input.frictionScore,
      valueScore: input.valueScore,
      compositeScore: round(composite),
      benchmarkRank: 0,
      priorityScore: round(priority),
      confidenceScore: round(confidence),
      noisepenaltyScore: round(noisePenalty),
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  scored.forEach((s, i) => { s.benchmarkRank = i + 1; });

  return scored;
}

function round(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
}

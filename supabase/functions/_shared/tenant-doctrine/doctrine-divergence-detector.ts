/**
 * Doctrine Divergence Detector
 * Detects conflicts between declared and observed operating postures.
 */

export interface DivergenceResult {
  divergence_score: number;
  conflicts: DivergenceConflict[];
}

export interface DivergenceConflict {
  dimension: string;
  declared_value: number;
  observed_value: number;
  delta: number;
  severity: string;
  description: string;
}

export function detectDivergence(
  declared: Record<string, number>,
  observed: Record<string, number>
): DivergenceResult {
  const conflicts: DivergenceConflict[] = [];
  const dimensions = new Set([...Object.keys(declared), ...Object.keys(observed)]);

  for (const dim of dimensions) {
    const dv = declared[dim] ?? 0.5;
    const ov = observed[dim] ?? 0.5;
    const delta = Math.abs(dv - ov);

    if (delta >= 0.15) {
      conflicts.push({
        dimension: dim,
        declared_value: dv,
        observed_value: ov,
        delta: Math.round(delta * 100) / 100,
        severity: delta >= 0.4 ? 'high' : delta >= 0.25 ? 'medium' : 'low',
        description: `${dim}: declared ${dv.toFixed(2)} vs observed ${ov.toFixed(2)} (Δ ${delta.toFixed(2)})`,
      });
    }
  }

  const avgDelta = conflicts.length > 0
    ? conflicts.reduce((s, c) => s + c.delta, 0) / conflicts.length
    : 0;

  return {
    divergence_score: Math.round(avgDelta * 100) / 100,
    conflicts: conflicts.sort((a, b) => b.delta - a.delta),
  };
}

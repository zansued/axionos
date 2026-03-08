/**
 * Open Surface Detector — Sprint 65
 * Identifies intentionally open vs unintentionally incomplete areas.
 */

export interface OpenSurfaceInput {
  total_gaps: number;
  intentional_count: number;
  unresolved_count: number;
  blocked_count: number;
}

export interface OpenSurfaceResult {
  open_surface_score: number;
  intentional_ratio: number;
  accidental_incompleteness_count: number;
  rationale: string[];
}

export function detectOpenSurfaces(input: OpenSurfaceInput): OpenSurfaceResult {
  const rationale: string[] = [];
  const accidental = input.unresolved_count + input.blocked_count;
  const total = input.total_gaps || 1;
  const intentionalRatio = input.intentional_count / total;

  let surfaceScore = accidental / Math.max(1, total);
  if (accidental > 3) { surfaceScore = Math.min(1, surfaceScore * 1.3); rationale.push('significant_accidental_incompleteness'); }
  if (intentionalRatio > 0.5) rationale.push('majority_intentional_opens');
  if (input.blocked_count > 0) rationale.push(`${input.blocked_count}_blocked_gaps`);

  return {
    open_surface_score: Math.round(Math.min(1, surfaceScore) * 10000) / 10000,
    intentional_ratio: Math.round(intentionalRatio * 10000) / 10000,
    accidental_incompleteness_count: accidental,
    rationale,
  };
}

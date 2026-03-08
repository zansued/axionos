/**
 * Architecture Migration Slice Selector — Sprint 42
 *
 * Selects safe rollout slices for migration phases.
 */

export interface MigrationSliceCandidate {
  slice_id: string;
  slice_type: string;
  risk_score: number; // 0-1
  stability_score: number; // 0-1
  observability_coverage: number; // 0-1
  under_stabilization: boolean;
  active_migration_overlap: boolean;
}

export interface SliceSelectionResult {
  selected_slices: MigrationSliceCandidate[];
  excluded_slices: Array<{ slice_id: string; reason: string }>;
  total_risk_score: number;
}

export function selectMigrationSlices(
  candidates: MigrationSliceCandidate[],
  maxRisk: number = 0.4,
  minStability: number = 0.6,
): SliceSelectionResult {
  const excluded: Array<{ slice_id: string; reason: string }> = [];
  const eligible: MigrationSliceCandidate[] = [];

  for (const c of candidates) {
    if (c.under_stabilization) {
      excluded.push({ slice_id: c.slice_id, reason: "Under active stabilization" });
    } else if (c.active_migration_overlap) {
      excluded.push({ slice_id: c.slice_id, reason: "Overlaps with active migration" });
    } else if (c.risk_score > maxRisk) {
      excluded.push({ slice_id: c.slice_id, reason: `Risk ${c.risk_score} exceeds max ${maxRisk}` });
    } else if (c.stability_score < minStability) {
      excluded.push({ slice_id: c.slice_id, reason: `Stability ${c.stability_score} below min ${minStability}` });
    } else {
      eligible.push(c);
    }
  }

  // Sort by risk ascending (safest first)
  eligible.sort((a, b) => a.risk_score - b.risk_score);

  const totalRisk = eligible.length > 0
    ? eligible.reduce((sum, s) => sum + s.risk_score, 0) / eligible.length
    : 0;

  return { selected_slices: eligible, excluded_slices: excluded, total_risk_score: totalRisk };
}

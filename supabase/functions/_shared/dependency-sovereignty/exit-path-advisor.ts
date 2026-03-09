/**
 * Exit Path Advisor
 * Proposes migration or substitution pathways.
 */
export interface ExitPath {
  id: string;
  dependency_id: string;
  exit_type: string;
  substitute_options: unknown[];
  migration_steps: unknown[];
  feasibility_score: number;
  estimated_switch_cost: string;
  timeline_estimate: string;
}

export interface ExitAdvisory {
  hasViablePath: boolean;
  bestPath: ExitPath | null;
  recommendation: string;
}

export function adviseExitPath(paths: ExitPath[]): ExitAdvisory {
  if (paths.length === 0) {
    return { hasViablePath: false, bestPath: null, recommendation: "No exit path defined. Consider modeling substitution options." };
  }
  const sorted = [...paths].sort((a, b) => b.feasibility_score - a.feasibility_score);
  const best = sorted[0];
  const viable = best.feasibility_score >= 0.4;
  return {
    hasViablePath: viable,
    bestPath: best,
    recommendation: viable
      ? `Best exit path: ${best.exit_type} (feasibility ${Math.round(best.feasibility_score * 100)}%). Timeline: ${best.timeline_estimate}.`
      : "Exit paths exist but feasibility is low. Prioritize alternatives research.",
  };
}

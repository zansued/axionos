/**
 * Mutation Boundary Integrity Analyzer — Sprint 64
 * Checks whether bounded adaptation and structural-mutation rules are respected.
 */

export interface BoundaryCheck {
  boundary_name: string;
  violations_count: number;
  total_checks: number;
}

export interface BoundaryResult {
  mutation_boundary_integrity_score: number;
  violated_boundaries: string[];
  rationale: string[];
}

export function analyzeBoundaryIntegrity(checks: BoundaryCheck[]): BoundaryResult {
  if (checks.length === 0) return { mutation_boundary_integrity_score: 1, violated_boundaries: [], rationale: ['no_boundaries_checked'] };

  const rationale: string[] = [];
  const violated: string[] = [];
  let totalIntegrity = 0;

  for (const c of checks) {
    const integrity = c.total_checks > 0 ? 1 - (c.violations_count / c.total_checks) : 1;
    totalIntegrity += integrity;
    if (c.violations_count > 0) { violated.push(c.boundary_name); rationale.push(`violated_${c.boundary_name}`); }
  }

  return {
    mutation_boundary_integrity_score: Math.round((totalIntegrity / checks.length) * 10000) / 10000,
    violated_boundaries: violated,
    rationale,
  };
}

/**
 * Principle Conformance Checker — Sprint 64
 * Evaluates whether current behavior aligns with core platform principles.
 */

export interface PrincipleCheck {
  principle_name: string;
  conformance_score: number;
  evidence_count: number;
}

export interface PrincipleConformanceResult {
  principle_alignment_score: number;
  weakest_principle: string;
  rationale: string[];
}

export function checkPrincipleConformance(checks: PrincipleCheck[]): PrincipleConformanceResult {
  if (checks.length === 0) return { principle_alignment_score: 0, weakest_principle: 'none', rationale: ['no_principles_checked'] };

  const rationale: string[] = [];
  let total = 0;
  let weakest = checks[0];

  for (const c of checks) {
    total += c.conformance_score;
    if (c.conformance_score < weakest.conformance_score) weakest = c;
    if (c.conformance_score < 0.5) rationale.push(`weak_${c.principle_name}`);
  }

  return {
    principle_alignment_score: Math.round((total / checks.length) * 10000) / 10000,
    weakest_principle: weakest.principle_name,
    rationale,
  };
}

/**
 * Cross-Doc Consistency Analyzer — Sprint 64
 * Detects inconsistency across canonical documents.
 */

export interface DocPairInput {
  doc_a: string;
  doc_b: string;
  shared_claims_count: number;
  conflicting_claims_count: number;
}

export interface ConsistencyResult {
  cross_doc_consistency_score: number;
  inconsistency_score: number;
  rationale: string[];
}

export function analyzeDocConsistency(pairs: DocPairInput[]): ConsistencyResult {
  if (pairs.length === 0) return { cross_doc_consistency_score: 1, inconsistency_score: 0, rationale: ['no_pairs'] };

  const rationale: string[] = [];
  let totalConsistency = 0;

  for (const p of pairs) {
    const total = p.shared_claims_count + p.conflicting_claims_count || 1;
    const consistency = p.shared_claims_count / total;
    totalConsistency += consistency;
    if (p.conflicting_claims_count > 0) rationale.push(`conflict_${p.doc_a}_vs_${p.doc_b}`);
  }

  const avg = totalConsistency / pairs.length;

  return {
    cross_doc_consistency_score: Math.round(avg * 10000) / 10000,
    inconsistency_score: Math.round((1 - avg) * 10000) / 10000,
    rationale,
  };
}

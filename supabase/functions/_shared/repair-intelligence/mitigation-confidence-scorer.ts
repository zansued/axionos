/**
 * mitigation-confidence-scorer.ts
 * Scores confidence in failure memory entries based on evidence quality.
 */

export interface ConfidenceFactors {
  sampleSize: number;
  successRate: number;
  recurrenceScore: number;
  falsFixCount: number;
  reviewCount: number;
  provenCauseCount: number;
  ageInDays: number;
}

export interface ConfidenceResult {
  overallConfidence: number;
  factors: ConfidenceFactors;
  breakdown: Record<string, number>;
  cautions: string[];
}

export function scoreFailureMemoryConfidence(factors: ConfidenceFactors): ConfidenceResult {
  const cautions: string[] = [];
  const breakdown: Record<string, number> = {};

  // Sample size factor (0-1): more data = higher confidence
  breakdown.sample_quality = Math.min(factors.sampleSize / 10, 1.0) * 0.2;

  // Success rate of repairs (0-1)
  breakdown.repair_effectiveness = factors.successRate * 0.25;

  // Proven cause confidence
  breakdown.root_cause_clarity = Math.min(factors.provenCauseCount / 3, 1.0) * 0.2;

  // Penalty for false fixes
  const falsFixPenalty = Math.min(factors.falsFixCount * 0.1, 0.3);
  breakdown.false_fix_penalty = -falsFixPenalty;
  if (factors.falsFixCount > 0) cautions.push(`${factors.falsFixCount} false fix(es) detected`);

  // Review bonus
  breakdown.review_quality = Math.min(factors.reviewCount / 2, 1.0) * 0.15;

  // Recurrence awareness (high recurrence = well-understood but dangerous)
  if (factors.recurrenceScore > 0.7) {
    breakdown.recurrence_awareness = 0.1;
    cautions.push('High recurrence — pattern is well-documented but persistent');
  } else {
    breakdown.recurrence_awareness = factors.recurrenceScore * 0.1;
  }

  // Staleness penalty
  if (factors.ageInDays > 90) {
    breakdown.staleness_penalty = -0.1;
    cautions.push('Entry older than 90 days — may need re-validation');
  } else {
    breakdown.staleness_penalty = 0;
  }

  const overall = Math.max(0, Math.min(1,
    Object.values(breakdown).reduce((sum, v) => sum + v, 0)
  ));

  return {
    overallConfidence: Math.round(overall * 100) / 100,
    factors,
    breakdown,
    cautions,
  };
}

export async function computeConfidenceForEntry(
  supabase: any,
  organizationId: string,
  failureMemoryId: string
): Promise<ConfidenceResult> {
  const [attemptsRes, falseFixesRes, reviewsRes, entryRes] = await Promise.all([
    supabase.from('repair_attempt_records').select('outcome').eq('failure_memory_id', failureMemoryId),
    supabase.from('false_fix_records').select('id').eq('failure_memory_id', failureMemoryId),
    supabase.from('repair_intelligence_reviews').select('id').eq('failure_memory_id', failureMemoryId),
    supabase.from('failure_memory_entries').select('recurrence_score, proven_causes, created_at').eq('id', failureMemoryId).single(),
  ]);

  const attempts = attemptsRes.data || [];
  const successCount = attempts.filter((a: any) => a.outcome === 'success').length;
  const provenCauses = Array.isArray(entryRes.data?.proven_causes) ? entryRes.data.proven_causes : [];
  const ageMs = entryRes.data?.created_at ? Date.now() - new Date(entryRes.data.created_at).getTime() : 0;

  return scoreFailureMemoryConfidence({
    sampleSize: attempts.length,
    successRate: attempts.length > 0 ? successCount / attempts.length : 0,
    recurrenceScore: entryRes.data?.recurrence_score || 0,
    falsFixCount: falseFixesRes.data?.length || 0,
    reviewCount: reviewsRes.data?.length || 0,
    provenCauseCount: provenCauses.length,
    ageInDays: Math.floor(ageMs / (1000 * 60 * 60 * 24)),
  });
}

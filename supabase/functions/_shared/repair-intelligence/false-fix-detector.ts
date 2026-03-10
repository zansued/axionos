/**
 * false-fix-detector.ts
 * Detects repairs that appeared to work but the failure recurred,
 * or repairs that masked the real problem without addressing root cause.
 */

export interface FalseFixSignal {
  failureMemoryId: string;
  repairAttemptId: string;
  falsFixType: 'coincidental_recovery' | 'symptom_masking' | 'temporary_fix' | 'regression_inducing';
  description: string;
  detectionMethod: string;
  dangerLevel: 'low' | 'medium' | 'high' | 'critical';
  recurrenceAfterFix: boolean;
  evidenceRefs: Record<string, unknown>[];
}

export async function detectFalseFixes(
  supabase: any,
  organizationId: string,
  failureMemoryId: string
): Promise<FalseFixSignal[]> {
  const signals: FalseFixSignal[] = [];

  // Get repair attempts
  const { data: attempts } = await supabase
    .from('repair_attempt_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('failure_memory_id', failureMemoryId)
    .order('created_at', { ascending: true });

  if (!attempts || attempts.length < 2) return signals;

  // Pattern 1: Success followed by same failure recurring
  for (let i = 0; i < attempts.length - 1; i++) {
    if (attempts[i].outcome === 'success' && attempts[i + 1].outcome === 'failure') {
      signals.push({
        failureMemoryId,
        repairAttemptId: attempts[i].id,
        falsFixType: 'temporary_fix',
        description: `Repair "${attempts[i].repair_strategy}" succeeded but failure recurred in attempt ${attempts[i + 1].attempt_number}`,
        detectionMethod: 'recurrence_after_success',
        dangerLevel: 'medium',
        recurrenceAfterFix: true,
        evidenceRefs: [{ attempt_id: attempts[i].id }, { attempt_id: attempts[i + 1].id }],
      });
    }
  }

  // Pattern 2: Same strategy keeps failing
  const strategyFailCounts: Record<string, number> = {};
  for (const a of attempts) {
    if (a.outcome === 'failure') {
      strategyFailCounts[a.repair_strategy] = (strategyFailCounts[a.repair_strategy] || 0) + 1;
    }
  }
  for (const [strategy, count] of Object.entries(strategyFailCounts)) {
    if (count >= 3) {
      const lastFail = attempts.filter(a => a.repair_strategy === strategy && a.outcome === 'failure').pop();
      signals.push({
        failureMemoryId,
        repairAttemptId: lastFail?.id || '',
        falsFixType: 'symptom_masking',
        description: `Strategy "${strategy}" failed ${count} times — likely not addressing root cause`,
        detectionMethod: 'repeated_strategy_failure',
        dangerLevel: 'high',
        recurrenceAfterFix: false,
        evidenceRefs: [{ strategy, fail_count: count }],
      });
    }
  }

  return signals;
}

export async function recordFalseFix(
  supabase: any,
  organizationId: string,
  signal: FalseFixSignal
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('false_fix_records')
    .insert({
      organization_id: organizationId,
      failure_memory_id: signal.failureMemoryId,
      repair_attempt_id: signal.repairAttemptId || null,
      false_fix_type: signal.falsFixType,
      description: signal.description,
      detection_method: signal.detectionMethod,
      danger_level: signal.dangerLevel,
      recurrence_after_fix: signal.recurrenceAfterFix,
      evidence_refs: signal.evidenceRefs,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to record false fix:', error.message);
    return null;
  }
  return data;
}

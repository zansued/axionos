/**
 * repair-pattern-extractor.ts
 * Extracts mitigation patterns from successful repair attempt records.
 */

export interface RepairAttemptInput {
  failureMemoryId: string;
  repairStrategy: string;
  repairPayload: Record<string, unknown>;
  attemptNumber: number;
  outcome: string;
  durationMs?: number;
  costEstimate?: number;
  agentType?: string;
  pipelineStage?: string;
  notes?: string;
}

export async function registerRepairAttempt(
  supabase: any,
  organizationId: string,
  attempt: RepairAttemptInput
): Promise<{ attemptId: string }> {
  const { data, error } = await supabase
    .from('repair_attempt_records')
    .insert({
      organization_id: organizationId,
      failure_memory_id: attempt.failureMemoryId,
      repair_strategy: attempt.repairStrategy,
      repair_payload: attempt.repairPayload,
      attempt_number: attempt.attemptNumber,
      outcome: attempt.outcome,
      duration_ms: attempt.durationMs,
      cost_estimate: attempt.costEstimate,
      agent_type: attempt.agentType,
      pipeline_stage: attempt.pipelineStage,
      notes: attempt.notes,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to register repair attempt: ${error.message}`);

  // Update failure memory with repair outcome
  if (attempt.outcome === 'success') {
    await supabase.rpc('jsonb_array_append_if_not_exists', {
      // Fallback: direct update
    }).catch(() => {});
    
    const { data: entry } = await supabase
      .from('failure_memory_entries')
      .select('successful_repairs')
      .eq('id', attempt.failureMemoryId)
      .single();

    if (entry) {
      const repairs = Array.isArray(entry.successful_repairs) ? entry.successful_repairs : [];
      repairs.push({ strategy: attempt.repairStrategy, attempt_id: data.id, timestamp: new Date().toISOString() });
      await supabase
        .from('failure_memory_entries')
        .update({ successful_repairs: repairs, updated_at: new Date().toISOString() })
        .eq('id', attempt.failureMemoryId);
    }
  } else if (attempt.outcome === 'failure') {
    const { data: entry } = await supabase
      .from('failure_memory_entries')
      .select('failed_repairs')
      .eq('id', attempt.failureMemoryId)
      .single();

    if (entry) {
      const repairs = Array.isArray(entry.failed_repairs) ? entry.failed_repairs : [];
      repairs.push({ strategy: attempt.repairStrategy, attempt_id: data.id, timestamp: new Date().toISOString() });
      await supabase
        .from('failure_memory_entries')
        .update({ failed_repairs: repairs, updated_at: new Date().toISOString() })
        .eq('id', attempt.failureMemoryId);
    }
  }

  return { attemptId: data.id };
}

export async function extractMitigationPattern(
  supabase: any,
  organizationId: string,
  failureMemoryId: string
): Promise<{ patternId: string | null }> {
  // Get all successful attempts for this failure
  const { data: attempts } = await supabase
    .from('repair_attempt_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('failure_memory_id', failureMemoryId)
    .eq('outcome', 'success');

  if (!attempts || attempts.length < 2) return { patternId: null };

  // Group by strategy
  const strategyGroups: Record<string, any[]> = {};
  for (const a of attempts) {
    if (!strategyGroups[a.repair_strategy]) strategyGroups[a.repair_strategy] = [];
    strategyGroups[a.repair_strategy].push(a);
  }

  // Find dominant strategy
  const best = Object.entries(strategyGroups).sort((a, b) => b[1].length - a[1].length)[0];
  if (!best) return { patternId: null };

  const [strategyType, successfulAttempts] = best;
  const totalAttempts = attempts.length;
  const successRate = successfulAttempts.length / Math.max(totalAttempts, 1);

  const { data, error } = await supabase
    .from('mitigation_patterns')
    .insert({
      organization_id: organizationId,
      failure_memory_id: failureMemoryId,
      pattern_name: `${strategyType} for ${failureMemoryId.substring(0, 8)}`,
      pattern_description: `Strategy "${strategyType}" succeeded ${successfulAttempts.length} times`,
      strategy_type: strategyType,
      success_rate: successRate,
      sample_size: totalAttempts,
      confidence_score: Math.min(successRate * (Math.min(totalAttempts, 10) / 10), 1.0),
    })
    .select('id')
    .single();

  if (error) return { patternId: null };
  return { patternId: data.id };
}

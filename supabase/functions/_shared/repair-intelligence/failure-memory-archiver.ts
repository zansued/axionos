/**
 * failure-memory-archiver.ts
 * Archives failure events into governed failure memory entries.
 */

export interface FailureRegistration {
  organizationId: string;
  signature: string;
  failureType: string;
  stackScope: string;
  triggerConditions: Record<string, unknown>;
  affectedLayers: string[];
  symptomSummary: string;
  rootCauseHypothesis?: string;
  pipelineStage?: string;
  initiativeId?: string;
  agentType?: string;
  errorPayload?: Record<string, unknown>;
}

export async function registerFailure(
  supabase: any,
  reg: FailureRegistration
): Promise<{ failureMemoryId: string; isNew: boolean }> {
  // Check for existing entry with same signature
  const { data: existing } = await supabase
    .from('failure_memory_entries')
    .select('id, recurrence_score')
    .eq('organization_id', reg.organizationId)
    .eq('signature', reg.signature)
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (existing) {
    // Update recurrence
    await supabase
      .from('failure_memory_entries')
      .update({
        recurrence_score: Math.min((existing.recurrence_score || 0) + 0.1, 1.0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    // Add context snapshot
    await supabase.from('failure_context_snapshots').insert({
      organization_id: reg.organizationId,
      failure_memory_id: existing.id,
      pipeline_stage: reg.pipelineStage,
      initiative_id: reg.initiativeId,
      agent_type: reg.agentType,
      error_payload: reg.errorPayload || {},
    });

    return { failureMemoryId: existing.id, isNew: false };
  }

  // Create new entry
  const { data, error } = await supabase
    .from('failure_memory_entries')
    .insert({
      organization_id: reg.organizationId,
      signature: reg.signature,
      failure_type: reg.failureType,
      stack_scope: reg.stackScope,
      trigger_conditions: reg.triggerConditions,
      affected_layers: reg.affectedLayers,
      symptom_summary: reg.symptomSummary,
      root_cause_hypothesis: reg.rootCauseHypothesis,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to register failure: ${error.message}`);

  // Add context snapshot
  await supabase.from('failure_context_snapshots').insert({
    organization_id: reg.organizationId,
    failure_memory_id: data.id,
    pipeline_stage: reg.pipelineStage,
    initiative_id: reg.initiativeId,
    agent_type: reg.agentType,
    error_payload: reg.errorPayload || {},
  });

  return { failureMemoryId: data.id, isNew: true };
}

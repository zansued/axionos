/**
 * canon-usage-recorder.ts
 * Records when and where canon entries are retrieved and applied.
 */

export interface UsageEvent {
  organizationId: string;
  canonEntryId: string;
  usageContext: string;
  pipelineStage?: string;
  initiativeId?: string;
  agentType?: string;
  retrievalScore: number;
  wasApplied: boolean;
  feedbackSignal?: string;
}

export async function recordUsageEvent(
  supabaseClient: any,
  event: UsageEvent
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseClient
    .from('canon_usage_events')
    .insert({
      organization_id: event.organizationId,
      canon_entry_id: event.canonEntryId,
      usage_context: event.usageContext,
      pipeline_stage: event.pipelineStage,
      initiative_id: event.initiativeId,
      agent_type: event.agentType,
      retrieval_score: event.retrievalScore,
      was_applied: event.wasApplied,
      feedback_signal: event.feedbackSignal,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to record usage event:', error.message);
    return null;
  }
  return data;
}

export async function recordPatternApplication(
  supabaseClient: any,
  application: {
    organizationId: string;
    canonEntryId: string;
    applicationContext: Record<string, unknown>;
    outcomeStatus: string;
    outcomeNotes?: string;
    qualityImpactScore?: number;
    costImpactScore?: number;
    appliedBy: string;
    pipelineStage?: string;
    initiativeId?: string;
  }
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseClient
    .from('canon_pattern_applications')
    .insert({
      organization_id: application.organizationId,
      canon_entry_id: application.canonEntryId,
      application_context: application.applicationContext,
      outcome_status: application.outcomeStatus,
      outcome_notes: application.outcomeNotes,
      quality_impact_score: application.qualityImpactScore,
      cost_impact_score: application.costImpactScore,
      applied_by: application.appliedBy,
      pipeline_stage: application.pipelineStage,
      initiative_id: application.initiativeId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to record pattern application:', error.message);
    return null;
  }
  return data;
}

export async function submitRetrievalFeedback(
  supabaseClient: any,
  feedback: {
    organizationId: string;
    canonEntryId: string;
    usageEventId?: string;
    feedbackType: string;
    feedbackReason?: string;
    reviewerId?: string;
  }
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseClient
    .from('canon_retrieval_feedback')
    .insert({
      organization_id: feedback.organizationId,
      canon_entry_id: feedback.canonEntryId,
      usage_event_id: feedback.usageEventId,
      feedback_type: feedback.feedbackType,
      feedback_reason: feedback.feedbackReason,
      reviewer_id: feedback.reviewerId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to submit retrieval feedback:', error.message);
    return null;
  }
  return data;
}

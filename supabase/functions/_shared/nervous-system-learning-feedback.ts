/**
 * AI Nervous System — NS-06: Learning Feedback Engine
 *
 * Persists feedback from execution outcomes, dismissals, and approval rejections.
 * Produces calibration hints for future confidence/threshold tuning.
 *
 * No LLM. No autonomous recalibration. Feedback records only.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const FEEDBACK_ENGINE_VERSION = "1.0";

export type FeedbackType =
  | "execution_success"
  | "execution_failure"
  | "approval_rejected"
  | "dismissal_signal"
  | "false_positive"
  | "threshold_too_aggressive"
  | "threshold_too_conservative"
  | "learning_candidate_confirmed";

// ═══════════════════════════════════════════════════
// Create Feedback from Execution
// ═══════════════════════════════════════════════════

export async function createLearningFeedbackFromExecution(
  sc: SupabaseClient,
  orgId: string,
  action: Record<string, unknown>,
  executionResult: Record<string, unknown>
): Promise<{ id: string | null; error?: string }> {
  const wasSuccessful = executionResult.execution_status === "succeeded";
  const expectedMet = (executionResult.expected_outcome_met as boolean) || false;

  const feedbackType: FeedbackType = wasSuccessful ? "execution_success" : "execution_failure";

  const { data, error } = await sc
    .from("nervous_system_learning_feedback")
    .insert({
      organization_id: orgId,
      action_id: action.id,
      surfaced_item_id: action.surfaced_item_id,
      decision_id: action.decision_id,
      event_id: action.event_id,
      signal_group_id: action.signal_group_id || null,
      feedback_type: feedbackType,
      feedback_score: wasSuccessful ? 1.0 : 0.0,
      was_successful: wasSuccessful,
      expected_outcome_met: expectedMet,
      feedback_reason: `Action '${action.action_type}' ${wasSuccessful ? "succeeded" : "failed"}. Mode: ${action.execution_mode}.`,
      measured_metrics: executionResult.metrics_delta || {},
      feedback_metadata: {
        engine_version: FEEDBACK_ENGINE_VERSION,
        action_type: action.action_type,
        execution_mode: action.execution_mode,
        outcome_type: executionResult.outcome_type,
        follow_up_required: executionResult.follow_up_required,
      },
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data?.id || null };
}

// ═══════════════════════════════════════════════════
// Create Feedback from Dismissal
// ═══════════════════════════════════════════════════

export async function createLearningFeedbackFromDismissal(
  sc: SupabaseClient,
  orgId: string,
  surfacedItem: Record<string, unknown>,
  operatorSignal?: string
): Promise<{ id: string | null; error?: string }> {
  // Dismissal may indicate a false positive or overly aggressive threshold
  const feedbackType: FeedbackType = operatorSignal === "false_positive"
    ? "false_positive"
    : "dismissal_signal";

  const { data, error } = await sc
    .from("nervous_system_learning_feedback")
    .insert({
      organization_id: orgId,
      action_id: surfacedItem.action_id || surfacedItem.id, // use item id as fallback
      surfaced_item_id: surfacedItem.id,
      decision_id: surfacedItem.decision_id,
      event_id: surfacedItem.event_id,
      signal_group_id: surfacedItem.signal_group_id || null,
      feedback_type: feedbackType,
      feedback_score: 0.0,
      was_successful: false,
      expected_outcome_met: false,
      operator_signal: operatorSignal || null,
      feedback_reason: `Surfaced item dismissed. Reason: ${surfacedItem.status_reason || "not provided"}.`,
      feedback_metadata: {
        engine_version: FEEDBACK_ENGINE_VERSION,
        surface_type: surfacedItem.surface_type,
        decision_type: (surfacedItem.surface_metadata as any)?.decision_type || null,
        dismissed_by: surfacedItem.dismissed_by,
      },
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data?.id || null };
}

// ═══════════════════════════════════════════════════
// Create Feedback from Approval Rejection
// ═══════════════════════════════════════════════════

export async function createLearningFeedbackFromApprovalRejection(
  sc: SupabaseClient,
  orgId: string,
  surfacedItem: Record<string, unknown>,
  rejectionReason: string
): Promise<{ id: string | null; error?: string }> {
  const { data, error } = await sc
    .from("nervous_system_learning_feedback")
    .insert({
      organization_id: orgId,
      action_id: surfacedItem.action_id || surfacedItem.id,
      surfaced_item_id: surfacedItem.id,
      decision_id: surfacedItem.decision_id,
      event_id: surfacedItem.event_id,
      signal_group_id: surfacedItem.signal_group_id || null,
      feedback_type: "approval_rejected",
      feedback_score: 0.0,
      was_successful: false,
      expected_outcome_met: false,
      operator_signal: rejectionReason,
      feedback_reason: `Approval rejected. ${rejectionReason}`,
      feedback_metadata: {
        engine_version: FEEDBACK_ENGINE_VERSION,
        surface_type: surfacedItem.surface_type,
        decision_type: (surfacedItem.surface_metadata as any)?.decision_type || null,
      },
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data?.id || null };
}

// ═══════════════════════════════════════════════════
// Calibration Hints
// ═══════════════════════════════════════════════════

export async function updateConfidenceCalibrationHints(
  sc: SupabaseClient,
  orgId: string
): Promise<Record<string, unknown>> {
  const { data: feedbacks } = await sc
    .from("nervous_system_learning_feedback")
    .select("feedback_type, feedback_score, was_successful, expected_outcome_met")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = feedbacks || [];
  const byType: Record<string, number> = {};
  let successCount = 0;
  let failureCount = 0;
  let falsePositiveCount = 0;
  let expectedMetCount = 0;

  for (const f of rows) {
    byType[f.feedback_type] = (byType[f.feedback_type] || 0) + 1;
    if (f.was_successful) successCount++;
    else failureCount++;
    if (f.feedback_type === "false_positive") falsePositiveCount++;
    if (f.expected_outcome_met) expectedMetCount++;
  }

  const total = rows.length;
  const hints = {
    total_feedback_signals: total,
    success_rate: total > 0 ? successCount / total : 0,
    failure_rate: total > 0 ? failureCount / total : 0,
    false_positive_rate: total > 0 ? falsePositiveCount / total : 0,
    expected_outcome_accuracy: total > 0 ? expectedMetCount / total : 0,
    by_type: byType,
    calibration_advice: [] as string[],
    last_updated: new Date().toISOString(),
  };

  // Generate calibration advice
  if (hints.false_positive_rate > 0.3) {
    hints.calibration_advice.push("High false positive rate — consider raising surfacing thresholds.");
  }
  if (hints.failure_rate > 0.5 && total >= 5) {
    hints.calibration_advice.push("High action failure rate — review action type eligibility and execution policies.");
  }
  if (hints.expected_outcome_accuracy < 0.3 && total >= 5) {
    hints.calibration_advice.push("Low expected outcome accuracy — decision confidence may be miscalibrated.");
  }

  // Persist as live state
  await sc.from("nervous_system_live_state")
    .upsert({
      organization_id: orgId,
      state_key: "feedback_summary",
      state_value: hints,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,state_key" });

  return hints;
}

// ═══════════════════════════════════════════════════
// Process Feedback Signals (batch)
// ═══════════════════════════════════════════════════

export async function processFeedbackSignals(
  sc: SupabaseClient,
  orgId: string
): Promise<Record<string, unknown>> {
  // 1. Find completed actions without feedback
  const { data: completedActions } = await sc
    .from("autonomic_actions")
    .select("*")
    .eq("organization_id", orgId)
    .in("execution_status", ["succeeded", "failed"])
    .order("completed_at", { ascending: false })
    .limit(50);

  let feedbackCreated = 0;

  for (const action of (completedActions || [])) {
    // Check if feedback already exists
    const { data: existing } = await sc
      .from("nervous_system_learning_feedback")
      .select("id")
      .eq("action_id", action.id)
      .eq("organization_id", orgId)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const result = await createLearningFeedbackFromExecution(
      sc, orgId, action, action.execution_result || {}
    );
    if (result.id) feedbackCreated++;
  }

  // 2. Find dismissed surfaced items without feedback
  const { data: dismissedItems } = await sc
    .from("nervous_system_surfaced_items")
    .select("*")
    .eq("organization_id", orgId)
    .eq("surface_status", "dismissed")
    .order("dismissed_at", { ascending: false })
    .limit(50);

  for (const item of (dismissedItems || [])) {
    const { data: existing } = await sc
      .from("nervous_system_learning_feedback")
      .select("id")
      .eq("surfaced_item_id", item.id)
      .eq("organization_id", orgId)
      .eq("feedback_type", "dismissal_signal")
      .limit(1);

    if (existing && existing.length > 0) continue;

    const result = await createLearningFeedbackFromDismissal(sc, orgId, item);
    if (result.id) feedbackCreated++;
  }

  // 3. Update calibration hints
  const hints = await updateConfidenceCalibrationHints(sc, orgId);

  return {
    feedback_created: feedbackCreated,
    calibration_hints: hints,
  };
}

/**
 * AI Nervous System — NS-04: Decision Engine
 *
 * ARCHITECTURE NOTES:
 * - Converts contextualized events into explicit, typed, auditable decisions.
 * - All logic is deterministic and rule-based. No LLM.
 * - Decisions recommend but do NOT execute actions (execution is NS-05+).
 * - Every decision is traceable: event → context → decision → reason.
 * - Backend-only, service-role client.
 *
 * LIFECYCLE:
 *   contextualized → decided (this module)
 *
 * EVOLUTION PATH:
 * - NS-05: Surfacing & execution split — acts on decisions.
 * - NS-06: Learning feedback refines decision confidence.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const DECISION_ENGINE_VERSION = "1.0";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export type DecisionType =
  | "observe"
  | "surface"
  | "recommend_action"
  | "escalate"
  | "queue_for_action"
  | "mark_for_learning";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export interface DecisionResult {
  decision_type: DecisionType;
  decision_reason: string;
  decision_confidence: number;
  risk_level: RiskLevel;
  priority_level: PriorityLevel;
  recommended_action_type: string | null;
  recommended_action_payload: Record<string, unknown>;
  expected_outcome: Record<string, unknown>;
  decision_metadata: Record<string, unknown>;
}

export interface DecisionProcessingResult {
  processed: number;
  decided: number;
  by_type: Record<string, number>;
  errors: number;
}

// ═══════════════════════════════════════════════════
// Recommended Action Types
// ═══════════════════════════════════════════════════

const ACTION_TYPES: Record<string, { description: string; default_payload: Record<string, unknown> }> = {
  investigate_service_health: {
    description: "Inspect the health and recent behavior of the affected service.",
    default_payload: { scope: "service", depth: "recent" },
  },
  inspect_agent_fallback_chain: {
    description: "Review agent fallback routing and recovery paths.",
    default_payload: { scope: "agent", check: "fallback_chain" },
  },
  review_pipeline_dependencies: {
    description: "Audit pipeline dependency graph for failure propagation.",
    default_payload: { scope: "pipeline", check: "dependencies" },
  },
  increase_observability: {
    description: "Temporarily increase logging/tracing for the affected area.",
    default_payload: { scope: "observability", duration_minutes: 30 },
  },
  validate_retry_policy: {
    description: "Verify retry and backoff policies for the failing component.",
    default_payload: { scope: "resilience", check: "retry_policy" },
  },
  review_cost_routing: {
    description: "Audit cost allocation and routing efficiency.",
    default_payload: { scope: "cost", check: "routing" },
  },
  mark_pattern_for_review: {
    description: "Flag the detected pattern for human review and potential canon entry.",
    default_payload: { scope: "learning", action: "flag_for_review" },
  },
};

// ═══════════════════════════════════════════════════
// Core: Decide on a contextualized event
// ═══════════════════════════════════════════════════

export function decideEvent(event: Record<string, unknown>): DecisionResult {
  const contextSummary = event.context_summary as Record<string, unknown> | null;
  const contextType = (contextSummary?.context_type as string) || "isolated_signal";
  const contextConfidence = (event.context_confidence as number) || 0.3;
  const recommendedAttention = (contextSummary?.recommended_attention as string) || "none";
  const recurrenceLevel = (contextSummary?.recurrence_level as string) || "none";
  const detectedSequence = contextSummary?.detected_sequence as string | null;
  const possibleCause = contextSummary?.possible_cause as string | null;
  const operationalScope = (contextSummary?.operational_scope as string) || "";

  const severity = (event.severity as string) || "low";
  const severityScore = (event.severity_score as number) || 0.25;
  const noveltyScore = (event.novelty_score as number) || 0.5;
  const confidenceScore = (event.confidence_score as number) || 0.5;
  const categoryHints = ((event.classification_metadata as any)?.category_hints as string[]) || [];

  // Get recurrence score from signal group if available
  const relatedEntities = contextSummary?.related_entities as Record<string, string[]> | null;
  const signalGroupCount = relatedEntities?.signal_groups?.length || 0;

  // ── Determine decision type ──
  const decisionType = determineDecisionType(
    contextType, severity, severityScore, recurrenceLevel,
    recommendedAttention, categoryHints, detectedSequence, contextConfidence
  );

  // ── Risk level ──
  const riskLevel = determineRiskLevel(severity, severityScore, contextType, contextConfidence);

  // ── Priority level ──
  const priorityLevel = determinePriorityLevel(
    decisionType, riskLevel, severityScore, recurrenceLevel, contextConfidence
  );

  // ── Recommended action ──
  const { actionType, actionPayload } = buildRecommendedAction(
    decisionType, contextType, severity, categoryHints, operationalScope, event
  );

  // ── Decision confidence ──
  const decisionConfidence = calculateDecisionConfidence(
    confidenceScore, contextConfidence, recurrenceLevel, decisionType
  );

  // ── Decision reason ──
  const reason = buildDecisionReason(
    decisionType, contextType, severity, recurrenceLevel,
    detectedSequence, possibleCause, riskLevel
  );

  // ── Expected outcome ──
  const expectedOutcome = buildExpectedOutcome(decisionType, actionType);

  return {
    decision_type: decisionType,
    decision_reason: reason,
    decision_confidence: decisionConfidence,
    risk_level: riskLevel,
    priority_level: priorityLevel,
    recommended_action_type: actionType,
    recommended_action_payload: actionPayload,
    expected_outcome: expectedOutcome,
    decision_metadata: {
      engine_version: DECISION_ENGINE_VERSION,
      context_type: contextType,
      recommended_attention: recommendedAttention,
      recurrence_level: recurrenceLevel,
      detected_sequence: detectedSequence,
      severity_score: severityScore,
      novelty_score: noveltyScore,
      signal_group_count: signalGroupCount,
      rule_matched: `${contextType}/${severity}/${recurrenceLevel}`,
    },
  };
}

// ═══════════════════════════════════════════════════
// Decision Type Rules
// ═══════════════════════════════════════════════════

function determineDecisionType(
  contextType: string,
  severity: string,
  severityScore: number,
  recurrenceLevel: string,
  recommendedAttention: string,
  categoryHints: string[],
  detectedSequence: string | null,
  contextConfidence: number
): DecisionType {
  // Rule 1: Recovery sequence → mark_for_learning
  if (contextType === "recovery_sequence") {
    return "mark_for_learning";
  }

  // Rule 2: Escalating incident + high/critical severity → escalate
  if (contextType === "escalating_incident" && (severity === "high" || severity === "critical")) {
    return "escalate";
  }

  // Rule 3: Pipeline disruption with strong context → queue_for_action or escalate
  if (contextType === "pipeline_disruption") {
    if (severity === "critical" || (severityScore >= 0.75 && contextConfidence >= 0.5)) {
      return "escalate";
    }
    return "queue_for_action";
  }

  // Rule 4: Agent instability with repeated pattern → recommend_action
  if (contextType === "agent_instability") {
    if (recurrenceLevel === "high" || recurrenceLevel === "moderate") {
      return "recommend_action";
    }
    return "surface";
  }

  // Rule 5: Recurring issue + medium+ severity → surface
  if (contextType === "recurring_issue") {
    if (severity === "high" || severity === "critical") {
      return "escalate";
    }
    if (recurrenceLevel === "high") {
      return "recommend_action";
    }
    return "surface";
  }

  // Rule 6: Escalate recommendation from context engine
  if (recommendedAttention === "escalate" && severityScore >= 0.5) {
    return "escalate";
  }

  // Rule 7: Governance concern → surface at minimum
  if (categoryHints.includes("governance_concern")) {
    return severity === "critical" ? "escalate" : "surface";
  }

  // Rule 8: Rollback detected → surface
  if (categoryHints.includes("rollback")) {
    return "surface";
  }

  // Rule 9: Learning signal → mark_for_learning
  if (categoryHints.includes("learning_signal")) {
    return "mark_for_learning";
  }

  // Rule 10: Isolated + low severity → observe
  if (contextType === "isolated_signal" && (severity === "low" || severity === "medium")) {
    return "observe";
  }

  // Default: surface if medium+, observe otherwise
  return severityScore >= 0.5 ? "surface" : "observe";
}

// ═══════════════════════════════════════════════════
// Risk Level
// ═══════════════════════════════════════════════════

function determineRiskLevel(
  severity: string,
  severityScore: number,
  contextType: string,
  contextConfidence: number
): RiskLevel {
  // Critical severity always = critical risk
  if (severity === "critical") return "critical";

  // Escalating or disruption with high severity = high risk
  if ((contextType === "escalating_incident" || contextType === "pipeline_disruption") &&
      severityScore >= 0.75) {
    return "critical";
  }

  if (severity === "high") return "high";

  if ((contextType === "agent_instability" || contextType === "recurring_issue") &&
      contextConfidence >= 0.5) {
    return "medium";
  }

  if (severity === "medium") return "medium";

  return "low";
}

// ═══════════════════════════════════════════════════
// Priority Level
// ═══════════════════════════════════════════════════

function determinePriorityLevel(
  decisionType: DecisionType,
  riskLevel: RiskLevel,
  severityScore: number,
  recurrenceLevel: string,
  contextConfidence: number
): PriorityLevel {
  // Escalations are always urgent
  if (decisionType === "escalate") return "urgent";

  // Queue for action with critical risk = urgent
  if (decisionType === "queue_for_action" && riskLevel === "critical") return "urgent";

  // High risk + high recurrence = high priority
  if (riskLevel === "high" || riskLevel === "critical") return "high";

  // Recommend action = at least medium
  if (decisionType === "recommend_action") return "medium";

  // Surface with moderate recurrence = medium
  if (decisionType === "surface" && (recurrenceLevel === "moderate" || recurrenceLevel === "high")) {
    return "medium";
  }

  // Learning marks = low
  if (decisionType === "mark_for_learning") return "low";

  // Observe = low
  if (decisionType === "observe") return "low";

  return severityScore >= 0.5 ? "medium" : "low";
}

// ═══════════════════════════════════════════════════
// Recommended Action Builder
// ═══════════════════════════════════════════════════

function buildRecommendedAction(
  decisionType: DecisionType,
  contextType: string,
  severity: string,
  categoryHints: string[],
  operationalScope: string,
  event: Record<string, unknown>
): { actionType: string | null; actionPayload: Record<string, unknown> } {
  if (decisionType === "observe" || decisionType === "mark_for_learning") {
    return { actionType: null, actionPayload: {} };
  }

  let actionType: string;

  if (contextType === "agent_instability") {
    actionType = "inspect_agent_fallback_chain";
  } else if (contextType === "pipeline_disruption") {
    actionType = "review_pipeline_dependencies";
  } else if (categoryHints.includes("cost_impact")) {
    actionType = "review_cost_routing";
  } else if (categoryHints.includes("failure")) {
    actionType = "validate_retry_policy";
  } else if (contextType === "recurring_issue" && decisionType === "recommend_action") {
    actionType = "mark_pattern_for_review";
  } else if (severity === "critical" || severity === "high") {
    actionType = "investigate_service_health";
  } else {
    actionType = "increase_observability";
  }

  const actionDef = ACTION_TYPES[actionType];
  const payload = {
    ...actionDef?.default_payload,
    target_domain: operationalScope,
    source_event_id: event.id,
    source_service: event.service_name || null,
    source_agent: event.agent_id || null,
  };

  return { actionType, actionPayload: payload };
}

// ═══════════════════════════════════════════════════
// Decision Confidence
// ═══════════════════════════════════════════════════

function calculateDecisionConfidence(
  classificationConfidence: number,
  contextConfidence: number,
  recurrenceLevel: string,
  decisionType: DecisionType
): number {
  // Base: average of classification and context confidence
  let confidence = (classificationConfidence + contextConfidence) / 2;

  // Recurrence adds confidence
  if (recurrenceLevel === "high") confidence += 0.15;
  else if (recurrenceLevel === "moderate") confidence += 0.08;
  else if (recurrenceLevel === "low") confidence += 0.03;

  // Observe/learning are inherently lower confidence decisions
  if (decisionType === "observe") confidence *= 0.9;
  if (decisionType === "mark_for_learning") confidence *= 0.95;

  // Escalate should only happen with decent confidence
  if (decisionType === "escalate" && confidence < 0.4) confidence = 0.4;

  return Math.min(1.0, Math.round(confidence * 10000) / 10000);
}

// ═══════════════════════════════════════════════════
// Decision Reason Builder
// ═══════════════════════════════════════════════════

function buildDecisionReason(
  decisionType: DecisionType,
  contextType: string,
  severity: string,
  recurrenceLevel: string,
  detectedSequence: string | null,
  possibleCause: string | null,
  riskLevel: RiskLevel
): string {
  const parts: string[] = [];

  switch (decisionType) {
    case "observe":
      parts.push(`Low-impact ${contextType} signal (${severity} severity).`);
      parts.push("No immediate action required; monitoring is sufficient.");
      break;
    case "surface":
      parts.push(`${contextType} with ${severity} severity requires operator visibility.`);
      if (recurrenceLevel !== "none") parts.push(`Recurrence level: ${recurrenceLevel}.`);
      break;
    case "recommend_action":
      parts.push(`${contextType} warrants a recommended action.`);
      if (recurrenceLevel === "high") parts.push("High recurrence increases action urgency.");
      break;
    case "escalate":
      parts.push(`${contextType} with ${severity} severity and ${riskLevel} risk requires escalation.`);
      if (detectedSequence) parts.push(`Detected sequence: ${detectedSequence}.`);
      break;
    case "queue_for_action":
      parts.push(`${contextType} queued for structured action processing.`);
      parts.push(`Risk: ${riskLevel}, severity: ${severity}.`);
      break;
    case "mark_for_learning":
      parts.push(`Signal marked for learning feedback loop.`);
      if (contextType === "recovery_sequence") parts.push("Recovery sequence detected — useful for pattern refinement.");
      break;
  }

  if (possibleCause && decisionType !== "observe") {
    parts.push(`Possible cause: ${possibleCause}`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════
// Expected Outcome Builder
// ═══════════════════════════════════════════════════

function buildExpectedOutcome(
  decisionType: DecisionType,
  actionType: string | null
): Record<string, unknown> {
  switch (decisionType) {
    case "observe":
      return { outcome: "monitored", requires_followup: false };
    case "surface":
      return { outcome: "operator_visibility", requires_followup: true, followup_type: "review" };
    case "recommend_action":
      return { outcome: "action_recommended", requires_followup: true, followup_type: "action_execution", action: actionType };
    case "escalate":
      return { outcome: "escalated", requires_followup: true, followup_type: "immediate_attention", action: actionType };
    case "queue_for_action":
      return { outcome: "queued", requires_followup: true, followup_type: "scheduled_action", action: actionType };
    case "mark_for_learning":
      return { outcome: "learning_queued", requires_followup: false, followup_type: "feedback_loop" };
    default:
      return { outcome: "unknown" };
  }
}

// ═══════════════════════════════════════════════════
// Batch Processing Pipeline
// ═══════════════════════════════════════════════════

export async function processDecisionBatch(
  sc: SupabaseClient,
  orgId: string,
  batchSize = 50
): Promise<DecisionProcessingResult> {
  const result: DecisionProcessingResult = {
    processed: 0,
    decided: 0,
    by_type: {},
    errors: 0,
  };

  // Fetch contextualized events
  const { data: events, error } = await sc
    .from("nervous_system_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "contextualized")
    .order("created_at", { ascending: true })
    .limit(Math.min(batchSize, 100));

  if (error || !events || events.length === 0) return result;

  for (const event of events) {
    try {
      result.processed++;

      const decision = decideEvent(event);

      // Persist decision record
      const { data: decisionRow, error: insertErr } = await sc
        .from("nervous_system_decisions")
        .insert({
          organization_id: orgId,
          event_id: event.id,
          signal_group_id: event.signal_group_id || null,
          decision_type: decision.decision_type,
          decision_reason: decision.decision_reason,
          decision_confidence: decision.decision_confidence,
          risk_level: decision.risk_level,
          priority_level: decision.priority_level,
          recommended_action_type: decision.recommended_action_type,
          recommended_action_payload: decision.recommended_action_payload,
          expected_outcome: decision.expected_outcome,
          decision_metadata: decision.decision_metadata,
          status: "active",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error(`[NS-04] Failed to insert decision for ${event.id}:`, insertErr.message);
        result.errors++;
        continue;
      }

      // Update event lifecycle
      const { error: updateErr } = await sc
        .from("nervous_system_events")
        .update({
          status: "decided",
          decided_at: new Date().toISOString(),
          decision_id: decisionRow?.id || null,
          classification_metadata: {
            ...(event.classification_metadata || {}),
            decision_engine_version: DECISION_ENGINE_VERSION,
          },
        })
        .eq("id", event.id)
        .eq("organization_id", orgId);

      if (updateErr) {
        console.error(`[NS-04] Failed to update event ${event.id}:`, updateErr.message);
        result.errors++;
        continue;
      }

      result.decided++;
      result.by_type[decision.decision_type] = (result.by_type[decision.decision_type] || 0) + 1;
    } catch (e) {
      console.error(`[NS-04] Error deciding event:`, e);
      result.errors++;
    }
  }

  // Update live state
  await updateDecisionLiveState(sc, orgId).catch((e) => {
    console.warn("[NS-04] Live state update failed (non-blocking):", e);
  });

  return result;
}

// ═══════════════════════════════════════════════════
// Live State Update
// ═══════════════════════════════════════════════════

async function updateDecisionLiveState(
  sc: SupabaseClient,
  orgId: string
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentDecisions } = await sc
    .from("nervous_system_decisions")
    .select("decision_type, risk_level, priority_level, status")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .gte("created_at", oneHourAgo)
    .limit(200);

  const typeCounts: Record<string, number> = {};
  const riskCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  let escalations = 0;
  let recommendations = 0;
  let learningMarks = 0;

  for (const d of recentDecisions || []) {
    typeCounts[d.decision_type] = (typeCounts[d.decision_type] || 0) + 1;
    riskCounts[d.risk_level] = (riskCounts[d.risk_level] || 0) + 1;
    priorityCounts[d.priority_level] = (priorityCounts[d.priority_level] || 0) + 1;
    if (d.decision_type === "escalate") escalations++;
    if (d.decision_type === "recommend_action" || d.decision_type === "queue_for_action") recommendations++;
    if (d.decision_type === "mark_for_learning") learningMarks++;
  }

  await sc
    .from("nervous_system_live_state")
    .upsert(
      {
        state_key: "decision_summary",
        organization_id: orgId,
        updated_at: new Date().toISOString(),
        state_value: {
          active_decisions_last_hour: recentDecisions?.length || 0,
          by_type: typeCounts,
          by_risk: riskCounts,
          by_priority: priorityCounts,
          escalations_count: escalations,
          recommendations_count: recommendations,
          learning_marks_count: learningMarks,
          last_updated: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,state_key" }
    );
}

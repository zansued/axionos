/**
 * AI Nervous System — NS-03: Context Engine
 *
 * ARCHITECTURE NOTES:
 * - Transforms classified signals into contextualized operational events.
 * - Context is derived from: recent history, signal groups, operational entities, patterns.
 * - All reasoning is deterministic and rule-based. No LLM.
 * - Every context assertion is traceable to real signals.
 * - Operates backend-only via service-role client.
 *
 * LIFECYCLE:
 *   classified → contextualized (this module)
 *
 * EVOLUTION PATH:
 * - NS-04: Decision Layer will consume contextualized events.
 * - NS-05: Surfacing will select high-attention contextualized events.
 * - NS-06: Learning feedback will refine context confidence.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════

const CONTEXT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const MAX_RELATED_EVENTS = 50;
const CONTEXT_ENGINE_VERSION = "1.0";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

export type ContextType =
  | "isolated_signal"
  | "recurring_issue"
  | "escalating_incident"
  | "recovery_sequence"
  | "agent_instability"
  | "pipeline_disruption";

export interface ContextSummary {
  context_type: ContextType;
  sequence_length: number;
  recurrence_level: "none" | "low" | "moderate" | "high";
  related_entities: {
    agents: string[];
    services: string[];
    initiatives: string[];
    signal_groups: string[];
  };
  operational_scope: string;
  recommended_attention: "none" | "monitor" | "investigate" | "escalate";
  detected_sequence: string | null;
  possible_cause: string | null;
}

interface ContextRelation {
  related_event_id: string;
  relation_type: string;
  relation_strength: number;
}

interface ContextResult {
  context_summary: ContextSummary;
  context_confidence: number;
  related_event_ids: string[];
  related_signal_group_ids: string[];
  relations: ContextRelation[];
}

// ═══════════════════════════════════════════════════
// Sequence Detection Rules
// ═══════════════════════════════════════════════════

interface SequenceRule {
  name: string;
  context_type: ContextType;
  /** event_type patterns in chronological order */
  pattern: string[];
  recommended_attention: "monitor" | "investigate" | "escalate";
}

const SEQUENCE_RULES: SequenceRule[] = [
  {
    name: "error_escalation",
    context_type: "escalating_incident",
    pattern: ["error_pattern_detected", "pipeline_stage_failed"],
    recommended_attention: "escalate",
  },
  {
    name: "agent_failure_chain",
    context_type: "agent_instability",
    pattern: ["agent_execution_failed", "agent_routing_anomaly"],
    recommended_attention: "investigate",
  },
  {
    name: "agent_failure_fallback",
    context_type: "agent_instability",
    pattern: ["agent_execution_failed", "agent_execution_recovered"],
    recommended_attention: "monitor",
  },
  {
    name: "pipeline_disruption",
    context_type: "pipeline_disruption",
    pattern: ["pipeline_stage_failed", "deployment_rollback_triggered"],
    recommended_attention: "escalate",
  },
  {
    name: "recovery_sequence",
    context_type: "recovery_sequence",
    pattern: ["pipeline_stage_failed", "pipeline_stage_recovered"],
    recommended_attention: "monitor",
  },
  {
    name: "degradation_to_incident",
    context_type: "escalating_incident",
    pattern: ["latency_spike", "resource_exhaustion"],
    recommended_attention: "escalate",
  },
  {
    name: "governance_incident",
    context_type: "escalating_incident",
    pattern: ["governance_violation_detected", "autonomic_action_failed"],
    recommended_attention: "escalate",
  },
];

// ═══════════════════════════════════════════════════
// Core: Contextualize a single event
// ═══════════════════════════════════════════════════

export async function contextualizeEvent(
  sc: SupabaseClient,
  event: Record<string, unknown>
): Promise<ContextResult> {
  const orgId = event.organization_id as string;
  const eventId = event.id as string;
  const fingerprint = event.fingerprint as string | null;
  const agentId = event.agent_id as string | null;
  const serviceName = event.service_name as string | null;
  const initiativeId = event.initiative_id as string | null;
  const signalGroupId = event.signal_group_id as string | null;
  const eventCreatedAt = event.created_at as string;

  const windowStart = new Date(
    new Date(eventCreatedAt).getTime() - CONTEXT_WINDOW_MS
  ).toISOString();

  const relations: ContextRelation[] = [];
  const relatedEventIds = new Set<string>();
  const relatedGroupIds = new Set<string>();
  const relatedAgents = new Set<string>();
  const relatedServices = new Set<string>();
  const relatedInitiatives = new Set<string>();

  if (agentId) relatedAgents.add(agentId);
  if (serviceName) relatedServices.add(serviceName);
  if (initiativeId) relatedInitiatives.add(initiativeId);
  if (signalGroupId) relatedGroupIds.add(signalGroupId);

  // ─── 1. Same fingerprint (recent) ───
  const fingerprintEvents = fingerprint
    ? await fetchRelatedEvents(sc, orgId, eventId, windowStart, {
        column: "fingerprint",
        value: fingerprint,
      })
    : [];

  for (const e of fingerprintEvents) {
    addRelation(relations, relatedEventIds, e.id, "same_signal_group", 0.8);
    collectEntities(e, relatedAgents, relatedServices, relatedInitiatives, relatedGroupIds);
  }

  // ─── 2. Same agent ───
  const agentEvents = agentId
    ? await fetchRelatedEvents(sc, orgId, eventId, windowStart, {
        column: "agent_id",
        value: agentId,
      })
    : [];

  for (const e of agentEvents) {
    if (!relatedEventIds.has(e.id)) {
      addRelation(relations, relatedEventIds, e.id, "same_agent", 0.7);
      collectEntities(e, relatedAgents, relatedServices, relatedInitiatives, relatedGroupIds);
    }
  }

  // ─── 3. Same service ───
  const serviceEvents = serviceName
    ? await fetchRelatedEvents(sc, orgId, eventId, windowStart, {
        column: "service_name",
        value: serviceName,
      })
    : [];

  for (const e of serviceEvents) {
    if (!relatedEventIds.has(e.id)) {
      addRelation(relations, relatedEventIds, e.id, "same_service", 0.6);
      collectEntities(e, relatedAgents, relatedServices, relatedInitiatives, relatedGroupIds);
    }
  }

  // ─── 4. Same initiative ───
  const initiativeEvents = initiativeId
    ? await fetchRelatedEvents(sc, orgId, eventId, windowStart, {
        column: "initiative_id",
        value: initiativeId,
      })
    : [];

  for (const e of initiativeEvents) {
    if (!relatedEventIds.has(e.id)) {
      addRelation(relations, relatedEventIds, e.id, "same_initiative", 0.65);
      collectEntities(e, relatedAgents, relatedServices, relatedInitiatives, relatedGroupIds);
    }
  }

  // ─── 5. Temporal proximity (same domain, different fingerprint) ───
  const temporalEvents = await fetchTemporalNeighbors(
    sc, orgId, eventId, windowStart,
    event.event_domain as string,
    fingerprint
  );

  for (const e of temporalEvents) {
    if (!relatedEventIds.has(e.id)) {
      addRelation(relations, relatedEventIds, e.id, "temporal_proximity", 0.4);
      collectEntities(e, relatedAgents, relatedServices, relatedInitiatives, relatedGroupIds);
    }
  }

  // ─── 6. Signal group metrics ───
  let groupRecurrenceScore = 0;
  if (signalGroupId) {
    const { data: group } = await sc
      .from("nervous_system_signal_groups")
      .select("event_count, recurrence_score")
      .eq("id", signalGroupId)
      .eq("organization_id", orgId)
      .single();
    if (group) {
      groupRecurrenceScore = group.recurrence_score || 0;
    }
  }

  // ─── 7. Collect all event types for sequence detection ───
  const allRelatedEvents = [
    ...fingerprintEvents,
    ...agentEvents,
    ...serviceEvents,
    ...initiativeEvents,
    ...temporalEvents,
  ];
  // Deduplicate
  const uniqueRelated = new Map<string, Record<string, unknown>>();
  for (const e of allRelatedEvents) {
    if (!uniqueRelated.has(e.id as string)) {
      uniqueRelated.set(e.id as string, e);
    }
  }

  // Build chronological event_type sequence
  const chronological = [
    ...Array.from(uniqueRelated.values()),
    event,
  ].sort(
    (a, b) =>
      new Date(a.created_at as string).getTime() -
      new Date(b.created_at as string).getTime()
  );
  const eventTypeSequence = chronological.map((e) => e.event_type as string);

  // ─── 8. Sequence detection ───
  const detectedSequence = detectSequence(eventTypeSequence);

  // ─── 9. Compute context type ───
  const contextType = determineContextType(
    relatedEventIds.size,
    groupRecurrenceScore,
    detectedSequence,
    event
  );

  // ─── 10. Compute recurrence level ───
  const recurrenceLevel = groupRecurrenceScore >= 0.6
    ? "high"
    : groupRecurrenceScore >= 0.3
      ? "moderate"
      : groupRecurrenceScore > 0
        ? "low"
        : "none";

  // ─── 11. Recommended attention ───
  const recommendedAttention = detectedSequence
    ? detectedSequence.recommended_attention
    : contextType === "escalating_incident"
      ? "escalate"
      : contextType === "agent_instability" || contextType === "pipeline_disruption"
        ? "investigate"
        : contextType === "recurring_issue" || contextType === "recovery_sequence"
          ? "monitor"
          : "none";

  // ─── 12. Possible cause (deterministic, not speculative) ───
  const possibleCause = derivePossibleCause(contextType, detectedSequence, event);

  // ─── 13. Operational scope ───
  const scope = [
    event.event_domain as string,
    event.event_subdomain as string | null,
  ]
    .filter(Boolean)
    .join("/");

  // ─── 14. Confidence ───
  const contextConfidence = computeContextConfidence(
    relatedEventIds.size,
    detectedSequence !== null,
    groupRecurrenceScore,
    relations.length
  );

  const contextSummary: ContextSummary = {
    context_type: contextType,
    sequence_length: relatedEventIds.size + 1,
    recurrence_level: recurrenceLevel,
    related_entities: {
      agents: Array.from(relatedAgents),
      services: Array.from(relatedServices),
      initiatives: Array.from(relatedInitiatives),
      signal_groups: Array.from(relatedGroupIds),
    },
    operational_scope: scope,
    recommended_attention: recommendedAttention,
    detected_sequence: detectedSequence?.name || null,
    possible_cause: possibleCause,
  };

  return {
    context_summary: contextSummary,
    context_confidence: contextConfidence,
    related_event_ids: Array.from(relatedEventIds),
    related_signal_group_ids: Array.from(relatedGroupIds),
    relations,
  };
}

// ═══════════════════════════════════════════════════
// Processing Pipeline
// ═══════════════════════════════════════════════════

export interface ContextProcessingResult {
  processed: number;
  contextualized: number;
  relations_created: number;
  errors: number;
}

/**
 * Process classified events → contextualized.
 * Batch processor for the contextualization pipeline.
 */
export async function processContextualization(
  sc: SupabaseClient,
  orgId: string,
  batchSize = 50
): Promise<ContextProcessingResult> {
  const result: ContextProcessingResult = {
    processed: 0,
    contextualized: 0,
    relations_created: 0,
    errors: 0,
  };

  // Fetch classified events
  const { data: events, error } = await sc
    .from("nervous_system_events")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "classified")
    .order("created_at", { ascending: true })
    .limit(Math.min(batchSize, 100));

  if (error || !events || events.length === 0) return result;

  for (const event of events) {
    try {
      result.processed++;

      const ctx = await contextualizeEvent(sc, event);

      // Persist context fields
      const { error: updateError } = await sc
        .from("nervous_system_events")
        .update({
          status: "contextualized",
          contextualized_at: new Date().toISOString(),
          context_summary: ctx.context_summary,
          context_confidence: ctx.context_confidence,
          related_event_ids: ctx.related_event_ids,
          related_signal_group_ids: ctx.related_signal_group_ids,
          // Extend classification_metadata with context engine ref
          classification_metadata: {
            ...(event.classification_metadata || {}),
            context_engine_version: CONTEXT_ENGINE_VERSION,
            canon_refs_count: 0, // Placeholder for future Canon Graph correlation
          },
        })
        .eq("id", event.id)
        .eq("organization_id", orgId);

      if (updateError) {
        console.error(`[NS-03] Failed to update event ${event.id}:`, updateError.message);
        result.errors++;
        continue;
      }

      result.contextualized++;

      // Create relation records for traceability
      if (ctx.relations.length > 0) {
        const relationRows = ctx.relations.map((r) => ({
          organization_id: orgId,
          source_event_id: event.id,
          related_event_id: r.related_event_id,
          relation_type: r.relation_type,
          relation_strength: r.relation_strength,
        }));

        const { error: relError } = await sc
          .from("nervous_system_event_context_links")
          .insert(relationRows);

        if (relError) {
          console.warn(`[NS-03] Failed to insert relations for ${event.id}:`, relError.message);
        } else {
          result.relations_created += relationRows.length;
        }
      }
    } catch (e) {
      console.error(`[NS-03] Error contextualizing event:`, e);
      result.errors++;
    }
  }

  // Update live state with contextualized summary
  await updateContextualizedLiveState(sc, orgId).catch((e) => {
    console.warn("[NS-03] Live state update failed (non-blocking):", e);
  });

  return result;
}

// ═══════════════════════════════════════════════════
// Helper: Fetch related events
// ═══════════════════════════════════════════════════

async function fetchRelatedEvents(
  sc: SupabaseClient,
  orgId: string,
  excludeEventId: string,
  windowStart: string,
  filter: { column: string; value: string }
): Promise<Record<string, unknown>[]> {
  const { data } = await sc
    .from("nervous_system_events")
    .select("id, event_type, event_domain, severity, agent_id, service_name, initiative_id, signal_group_id, created_at, fingerprint")
    .eq("organization_id", orgId)
    .eq(filter.column, filter.value)
    .neq("id", excludeEventId)
    .gte("created_at", windowStart)
    .in("status", ["classified", "contextualized"])
    .order("created_at", { ascending: false })
    .limit(MAX_RELATED_EVENTS);

  return (data || []) as Record<string, unknown>[];
}

async function fetchTemporalNeighbors(
  sc: SupabaseClient,
  orgId: string,
  excludeEventId: string,
  windowStart: string,
  eventDomain: string,
  excludeFingerprint: string | null
): Promise<Record<string, unknown>[]> {
  let query = sc
    .from("nervous_system_events")
    .select("id, event_type, event_domain, severity, agent_id, service_name, initiative_id, signal_group_id, created_at, fingerprint")
    .eq("organization_id", orgId)
    .eq("event_domain", eventDomain)
    .neq("id", excludeEventId)
    .gte("created_at", windowStart)
    .in("status", ["classified", "contextualized"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (excludeFingerprint) {
    query = query.neq("fingerprint", excludeFingerprint);
  }

  const { data } = await query;
  return (data || []) as Record<string, unknown>[];
}

// ═══════════════════════════════════════════════════
// Helper: Relation building
// ═══════════════════════════════════════════════════

function addRelation(
  relations: ContextRelation[],
  relatedIds: Set<string>,
  eventId: string,
  type: string,
  strength: number
): void {
  if (relatedIds.size >= MAX_RELATED_EVENTS) return;
  relatedIds.add(eventId);
  relations.push({
    related_event_id: eventId,
    relation_type: type,
    relation_strength: strength,
  });
}

function collectEntities(
  event: Record<string, unknown>,
  agents: Set<string>,
  services: Set<string>,
  initiatives: Set<string>,
  groups: Set<string>
): void {
  if (event.agent_id) agents.add(event.agent_id as string);
  if (event.service_name) services.add(event.service_name as string);
  if (event.initiative_id) initiatives.add(event.initiative_id as string);
  if (event.signal_group_id) groups.add(event.signal_group_id as string);
}

// ═══════════════════════════════════════════════════
// Sequence Detection
// ═══════════════════════════════════════════════════

function detectSequence(
  eventTypes: string[]
): SequenceRule | null {
  if (eventTypes.length < 2) return null;

  for (const rule of SEQUENCE_RULES) {
    if (containsSubsequence(eventTypes, rule.pattern)) {
      return rule;
    }
  }
  return null;
}

/** Check if `sequence` contains `pattern` as an ordered (not necessarily contiguous) subsequence */
function containsSubsequence(sequence: string[], pattern: string[]): boolean {
  let pi = 0;
  for (let si = 0; si < sequence.length && pi < pattern.length; si++) {
    if (sequence[si] === pattern[pi]) pi++;
  }
  return pi === pattern.length;
}

// ═══════════════════════════════════════════════════
// Context Type Determination
// ═══════════════════════════════════════════════════

function determineContextType(
  relatedCount: number,
  groupRecurrence: number,
  detectedSequence: SequenceRule | null,
  event: Record<string, unknown>
): ContextType {
  // Sequence detection takes priority
  if (detectedSequence) return detectedSequence.context_type;

  const eventType = event.event_type as string;

  // Agent instability (multiple agent-related events)
  if (
    relatedCount >= 2 &&
    (eventType.startsWith("agent_") || (event.agent_id && relatedCount >= 3))
  ) {
    return "agent_instability";
  }

  // Pipeline disruption
  if (
    relatedCount >= 2 &&
    (eventType.startsWith("pipeline_") || eventType.startsWith("deployment_"))
  ) {
    return "pipeline_disruption";
  }

  // Recurring issue (group has meaningful recurrence)
  if (groupRecurrence >= 0.3 || relatedCount >= 3) {
    return "recurring_issue";
  }

  // Isolated signal
  return "isolated_signal";
}

// ═══════════════════════════════════════════════════
// Possible Cause (deterministic, not speculative)
// ═══════════════════════════════════════════════════

function derivePossibleCause(
  contextType: ContextType,
  sequence: SequenceRule | null,
  event: Record<string, unknown>
): string | null {
  if (sequence) {
    return `Detected sequence: ${sequence.name}. Pattern matched in recent event history.`;
  }

  switch (contextType) {
    case "recurring_issue":
      return `Recurring signal: same fingerprint observed multiple times in context window.`;
    case "agent_instability":
      return `Agent instability: multiple agent-related events for ${event.agent_id || "unknown agent"}.`;
    case "pipeline_disruption":
      return `Pipeline disruption: correlated pipeline/deployment events in context window.`;
    case "escalating_incident":
      return `Escalating severity: signal density increasing in context window.`;
    case "recovery_sequence":
      return `Recovery detected: failure followed by recovery signal.`;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════
// Context Confidence
// ═══════════════════════════════════════════════════

function computeContextConfidence(
  relatedCount: number,
  hasSequence: boolean,
  groupRecurrence: number,
  relationCount: number
): number {
  // Base confidence from signal density
  let confidence = 0.3;

  // More related events → higher confidence
  if (relatedCount >= 1) confidence += 0.1;
  if (relatedCount >= 3) confidence += 0.1;
  if (relatedCount >= 5) confidence += 0.1;

  // Sequence detection adds strong signal
  if (hasSequence) confidence += 0.2;

  // Group recurrence is a solid confidence contributor
  confidence += groupRecurrence * 0.15;

  // Relation diversity adds modest confidence
  if (relationCount >= 3) confidence += 0.05;

  return Math.min(1.0, Math.round(confidence * 10000) / 10000);
}

// ═══════════════════════════════════════════════════
// Live State Update (curated for UI)
// ═══════════════════════════════════════════════════

async function updateContextualizedLiveState(
  sc: SupabaseClient,
  orgId: string
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Count contextualized events by attention level
  const { data: ctxEvents } = await sc
    .from("nervous_system_events")
    .select("context_summary, context_confidence, severity")
    .eq("organization_id", orgId)
    .eq("status", "contextualized")
    .gte("contextualized_at", oneHourAgo)
    .limit(200);

  const attentionCounts: Record<string, number> = {
    none: 0, monitor: 0, investigate: 0, escalate: 0,
  };
  const contextTypeCounts: Record<string, number> = {};

  for (const e of ctxEvents || []) {
    const summary = e.context_summary as ContextSummary | null;
    if (summary) {
      const attention = summary.recommended_attention || "none";
      attentionCounts[attention] = (attentionCounts[attention] || 0) + 1;
      contextTypeCounts[summary.context_type] =
        (contextTypeCounts[summary.context_type] || 0) + 1;
    }
  }

  await sc
    .from("nervous_system_live_state")
    .upsert(
      {
        state_key: "contextualized_summary",
        organization_id: orgId,
        updated_at: new Date().toISOString(),
        state_value: {
          contextualized_last_hour: ctxEvents?.length || 0,
          by_attention: attentionCounts,
          by_context_type: contextTypeCounts,
          last_updated: new Date().toISOString(),
        },
      },
      { onConflict: "organization_id,state_key" }
    );
}

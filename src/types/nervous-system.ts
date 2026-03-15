/**
 * AI Nervous System — Sprint NS-01 + NS-02 + NS-03 Domain Types
 *
 * ARCHITECTURE NOTES:
 * - These types define the read-only contract between backend and frontend.
 * - The frontend NEVER writes to nervous system tables.
 * - Classification, enrichment, grouping, and contextualization happen exclusively on the backend.
 * - Realtime subscriptions are tenant-scoped and read-only.
 *
 * EVOLUTION PATH:
 * - NS-04: Decision types (recommendations, action proposals)
 * - NS-05: Live stream types (SSE payloads, pulse metrics)
 * - NS-06: Learning feedback types (outcome scoring, confidence evolution)
 */

// ═══════════════════════════════════════════════════
// Event Domain Taxonomy
// ═══════════════════════════════════════════════════

export const NS_EVENT_DOMAINS = [
  "runtime", "pipeline", "agent", "governance",
  "cost", "adoption", "deployment", "security", "learning",
] as const;
export type NsEventDomain = (typeof NS_EVENT_DOMAINS)[number];

// ═══════════════════════════════════════════════════
// Event Type Taxonomy
// ═══════════════════════════════════════════════════

export const NS_EVENT_TYPES = [
  "latency_spike", "error_pattern_detected", "resource_exhaustion",
  "pipeline_state_changed", "pipeline_stage_failed", "pipeline_stage_recovered",
  "agent_execution_failed", "agent_execution_recovered", "agent_routing_anomaly",
  "governance_violation_detected", "policy_enforcement_triggered",
  "cost_anomaly_detected", "budget_threshold_reached",
  "deployment_state_changed", "deployment_rollback_triggered",
  "pattern_learned", "pattern_confidence_changed",
  "optimization_opportunity_detected",
  "autonomic_action_executed", "autonomic_action_failed",
] as const;
export type NsEventType = (typeof NS_EVENT_TYPES)[number];

// ═══════════════════════════════════════════════════
// Severity
// ═══════════════════════════════════════════════════

export const NS_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type NsSeverity = (typeof NS_SEVERITIES)[number];

// ═══════════════════════════════════════════════════
// Event Status Lifecycle
//
// LIFECYCLE SEMANTICS (canonical, updated NS-03):
//
//   new             → Event emitted, not yet processed.
//   classified      → Classifier assigned domain, severity, scores.
//   contextualized  → Context Engine has correlated with recent signals,
//                     detected sequences, and attached operational context.
//                     context_summary, context_confidence, related_event_ids,
//                     and related_signal_group_ids are populated.
//   decided         → (NS-04) Decision Layer has produced a recommendation.
//   surfaced        → (NS-05) Formally selected for prominent display.
//   resolved        → Signal has been addressed.
//   archived        → Retained for history, no longer active.
//
// Transitions (backend-only):
//   new → classified          (NS-02: classifier)
//   classified → contextualized (NS-03: context engine)
//   contextualized → decided    (NS-04: decision layer)
//   decided → surfaced          (NS-05: formal escalation)
//   surfaced → resolved         (manual or autonomic)
//   any → archived              (TTL or manual)
// ═══════════════════════════════════════════════════

export const NS_EVENT_STATUSES = [
  "new", "classified", "contextualized", "decided",
  "surfaced", "resolved", "archived",
] as const;
export type NsEventStatus = (typeof NS_EVENT_STATUSES)[number];

// ═══════════════════════════════════════════════════
// Source Types
// ═══════════════════════════════════════════════════

export const NS_SOURCE_TYPES = [
  "edge_function", "pipeline_worker", "agent",
  "governance_engine", "canon_system", "api_gateway",
  "scheduler", "manual",
] as const;
export type NsSourceType = (typeof NS_SOURCE_TYPES)[number];

// ═══════════════════════════════════════════════════
// NS-03: Context Types
// ═══════════════════════════════════════════════════

export const NS_CONTEXT_TYPES = [
  "isolated_signal",
  "recurring_issue",
  "escalating_incident",
  "recovery_sequence",
  "agent_instability",
  "pipeline_disruption",
] as const;
export type NsContextType = (typeof NS_CONTEXT_TYPES)[number];

export const NS_ATTENTION_LEVELS = [
  "none", "monitor", "investigate", "escalate",
] as const;
export type NsAttentionLevel = (typeof NS_ATTENTION_LEVELS)[number];

export const NS_RECURRENCE_LEVELS = [
  "none", "low", "moderate", "high",
] as const;
export type NsRecurrenceLevel = (typeof NS_RECURRENCE_LEVELS)[number];

export const NS_CONTEXT_RELATION_TYPES = [
  "temporal_proximity",
  "same_signal_group",
  "same_agent",
  "same_service",
  "same_initiative",
  "causal_candidate",
] as const;
export type NsContextRelationType = (typeof NS_CONTEXT_RELATION_TYPES)[number];

// ═══════════════════════════════════════════════════
// Core Event Interface (read-only from frontend)
// ═══════════════════════════════════════════════════

export interface NervousSystemEvent {
  id: string;
  created_at: string;
  occurred_at: string;

  source_type: NsSourceType;
  source_id: string | null;
  event_type: string;
  event_domain: NsEventDomain;
  event_subdomain: string | null;

  initiative_id: string | null;
  pipeline_id: string | null;
  agent_id: string | null;
  service_name: string | null;

  severity: NsSeverity;
  severity_score: number | null;
  novelty_score: number | null;
  confidence_score: number | null;

  fingerprint: string | null;
  dedup_group: string | null;
  signal_group_id: string | null;

  summary: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  classification_metadata: NsClassificationMetadata;

  status: NsEventStatus;
  classified_at: string | null;
  contextualized_at: string | null;
  surfaced_at: string | null;

  // NS-03: Context fields
  context_summary: NsContextSummary | null;
  context_confidence: number | null;
  related_event_ids: string[] | null;
  related_signal_group_ids: string[] | null;
}

// ═══════════════════════════════════════════════════
// NS-02: Classification Metadata — FROZEN CONTRACT v1.0
// (see v1.0 spec in NS-02 for full documentation)
//
// VERSION HISTORY:
//   v1.0 (NS-02): Initial contract.
//   v1.1 (NS-03): Added context_engine_version, canon_refs_count.
// ═══════════════════════════════════════════════════

export interface NsClassificationMetadata {
  // === REQUIRED (always present after classification) ===
  classified_by: string;
  rule_version: string;
  type_matched: boolean;

  // === OPTIONAL (present when applicable) ===
  severity_overridden?: boolean;
  fingerprint_count_1h?: number;
  enriched_by?: string;
  enrichment_version?: string;
  normalized_source?: string;
  category_hints?: string[];

  // === NS-03 (populated after contextualization) ===
  context_engine_version?: string;
  canon_refs_count?: number;
}

/** Validates that classification_metadata conforms to the v1.0+ contract */
export function isValidClassificationMetadata(meta: unknown): meta is NsClassificationMetadata {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Record<string, unknown>;
  return (
    typeof m.classified_by === "string" &&
    typeof m.rule_version === "string" &&
    typeof m.type_matched === "boolean"
  );
}

// ═══════════════════════════════════════════════════
// NS-03: Context Summary
// ═══════════════════════════════════════════════════

export interface NsContextSummary {
  context_type: NsContextType;
  sequence_length: number;
  recurrence_level: NsRecurrenceLevel;
  related_entities: {
    agents: string[];
    services: string[];
    initiatives: string[];
    signal_groups: string[];
  };
  operational_scope: string;
  recommended_attention: NsAttentionLevel;
  detected_sequence: string | null;
  possible_cause: string | null;
}

// ═══════════════════════════════════════════════════
// NS-03: Context Link (traceability record)
// ═══════════════════════════════════════════════════

export interface NsEventContextLink {
  id: string;
  organization_id: string;
  source_event_id: string;
  related_event_id: string;
  relation_type: NsContextRelationType;
  relation_strength: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════
// NS-02: Signal Group
// ═══════════════════════════════════════════════════

export interface NsSignalGroup {
  id: string;
  created_at: string;
  updated_at: string;

  fingerprint: string;
  group_key: string;
  title: string;

  event_domain: NsEventDomain;
  event_subdomain: string | null;
  event_type: string;
  severity: NsSeverity;
  severity_score: number | null;

  event_count: number;
  first_seen_at: string;
  last_seen_at: string;
  representative_event_id: string | null;

  novelty_score: number | null;
  confidence_score: number | null;
  recurrence_score: number;

  status: "active" | "resolved" | "archived";

  source_type: string | null;
  service_name: string | null;
  summary: string;
  aggregated_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════
// Pattern Interface
// ═══════════════════════════════════════════════════

export interface NervousSystemEventPattern {
  id: string;
  created_at: string;
  updated_at: string;
  pattern_key: string;
  title: string;
  domain: NsEventDomain;
  subdomain: string | null;
  description: string | null;
  known_causes: unknown[];
  known_resolutions: unknown[];
  occurrence_count: number;
  successful_resolution_count: number;
  confidence_score: number | null;
  canon_reference_id: string | null;
}

// ═══════════════════════════════════════════════════
// Live State Interfaces
// ═══════════════════════════════════════════════════

export interface NervousSystemLiveState {
  state_key: string;
  updated_at: string;
  state_value: Record<string, unknown>;
}

export interface NsSystemPulse {
  events_last_hour: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    new_count: number;
  };
  health_status: "healthy" | "degraded" | "critical";
  last_updated: string;
}

export interface NsClassifiedSummary {
  classified_last_hour: number;
  pending_count: number;
  by_domain: Record<string, number>;
  by_severity: Record<string, number>;
  top_signal_groups: NsSignalGroupSummary[];
  last_updated: string;
}

/** NS-03: Contextualized summary for live state */
export interface NsContextualizedSummary {
  contextualized_last_hour: number;
  by_attention: Record<string, number>;
  by_context_type: Record<string, number>;
  last_updated: string;
}

export interface NsSignalGroupSummary {
  id: string;
  title: string;
  event_domain: string;
  event_type: string;
  severity: string;
  event_count: number;
  last_seen_at: string;
  recurrence_score: number;
}

// ═══════════════════════════════════════════════════
// Processing Results
// ═══════════════════════════════════════════════════

export interface NsProcessingResult {
  processed: number;
  classified: number;
  grouped: number;
  patterns_promoted: number;
  errors: number;
}

/** NS-03: Context processing result */
export interface NsContextProcessingResult {
  processed: number;
  contextualized: number;
  relations_created: number;
  errors: number;
}

// ═══════════════════════════════════════════════════
// Known Limitations Registry
//
// NS-02 limitations (carried forward):
// 1. Novelty scoring: structural rarity, not operational novelty.
// 2. Grouping: exact fingerprint match only, no fuzzy/semantic.
// 3. Classification: rule-based only, no adaptive learning.
// 4. Pattern promotion: threshold-based (≥5), no statistical significance.
//
// NS-03 limitations:
// 5. Context window: fixed 30 minutes, not adaptive.
// 6. Sequence detection: ordered subsequence matching, not statistical.
// 7. No Canon Graph Memory correlation yet (placeholder only).
// 8. Possible cause is pattern-derived, not root-cause analysis.
// 9. Context confidence is heuristic, not calibrated.
// 10. No cross-tenant context (by design, security invariant).
//
// Improvement targets:
//   NS-04: Decision layer will consume context for recommendations.
//   NS-06: Learning feedback will calibrate context confidence.
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════════════════

export interface NsListEventsResponse {
  events: NervousSystemEvent[];
  count: number;
}

export interface NsGetPulseResponse {
  pulse: NsSystemPulse | null;
  classified_summary: NsClassifiedSummary | null;
  contextualized_summary: NsContextualizedSummary | null;
  updated_at: string | null;
}

export interface NsListPatternsResponse {
  patterns: NervousSystemEventPattern[];
}

export interface NsEmitEventResponse {
  success: boolean;
  event_id: string;
  fingerprint: string;
  deduplicated: boolean;
}

export interface NsListSignalGroupsResponse {
  groups: NsSignalGroup[];
  count: number;
}

export interface NsGetClassifiedFeedResponse {
  feed: NervousSystemEvent[];
  count: number;
}

/** NS-03: Contextual feed response */
export interface NsGetContextualFeedResponse {
  feed: NervousSystemEvent[];
  count: number;
}

export interface NsProcessEventsResponse {
  success: boolean;
  result: NsProcessingResult;
}

/** NS-03: Context processing response */
export interface NsProcessContextResponse {
  success: boolean;
  result: NsContextProcessingResult;
}

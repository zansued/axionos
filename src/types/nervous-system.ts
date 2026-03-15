/**
 * AI Nervous System — Sprint NS-01 through NS-05 Domain Types
 *
 * ARCHITECTURE NOTES:
 * - Read-only contract between backend and frontend.
 * - Frontend NEVER writes to nervous system tables.
 * - All processing (classification, context, decisions, surfacing) is backend-only.
 *
 * EVOLUTION PATH:
 * - NS-06: Learning feedback types
 * - NS-07: Execution layer
 */

// ═══════════════════════════════════════════════════
// Event Domain Taxonomy
// ═══════════════════════════════════════════════════

export const NS_EVENT_DOMAINS = [
  "runtime", "pipeline", "agent", "governance",
  "cost", "adoption", "deployment", "security", "learning",
] as const;
export type NsEventDomain = (typeof NS_EVENT_DOMAINS)[number];

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

export const NS_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type NsSeverity = (typeof NS_SEVERITIES)[number];

// ═══════════════════════════════════════════════════
// Event Status Lifecycle (updated NS-04)
//
//   new → classified → contextualized → decided → surfaced → resolved → archived
//
// Transitions (backend-only):
//   new → classified          (NS-02)
//   classified → contextualized (NS-03)
//   contextualized → decided    (NS-04: decision engine)
//   decided → surfaced          (NS-05)
//   surfaced → resolved         (manual or autonomic)
//   any → archived              (TTL or manual)
// ═══════════════════════════════════════════════════

export const NS_EVENT_STATUSES = [
  "new", "classified", "contextualized", "decided",
  "surfaced", "resolved", "archived",
] as const;
export type NsEventStatus = (typeof NS_EVENT_STATUSES)[number];

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
  "isolated_signal", "recurring_issue", "escalating_incident",
  "recovery_sequence", "agent_instability", "pipeline_disruption",
] as const;
export type NsContextType = (typeof NS_CONTEXT_TYPES)[number];

export const NS_ATTENTION_LEVELS = ["none", "monitor", "investigate", "escalate"] as const;
export type NsAttentionLevel = (typeof NS_ATTENTION_LEVELS)[number];

export const NS_RECURRENCE_LEVELS = ["none", "low", "moderate", "high"] as const;
export type NsRecurrenceLevel = (typeof NS_RECURRENCE_LEVELS)[number];

export const NS_CONTEXT_RELATION_TYPES = [
  "temporal_proximity", "same_signal_group", "same_agent",
  "same_service", "same_initiative", "causal_candidate",
] as const;
export type NsContextRelationType = (typeof NS_CONTEXT_RELATION_TYPES)[number];

// ═══════════════════════════════════════════════════
// NS-04: Decision Types
// ═══════════════════════════════════════════════════

export const NS_DECISION_TYPES = [
  "observe", "surface", "recommend_action",
  "escalate", "queue_for_action", "mark_for_learning",
] as const;
export type NsDecisionType = (typeof NS_DECISION_TYPES)[number];

export const NS_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type NsRiskLevel = (typeof NS_RISK_LEVELS)[number];

export const NS_PRIORITY_LEVELS = ["low", "medium", "high", "urgent"] as const;
export type NsPriorityLevel = (typeof NS_PRIORITY_LEVELS)[number];

export const NS_RECOMMENDED_ACTIONS = [
  "investigate_service_health",
  "inspect_agent_fallback_chain",
  "review_pipeline_dependencies",
  "increase_observability",
  "validate_retry_policy",
  "review_cost_routing",
  "mark_pattern_for_review",
] as const;
export type NsRecommendedAction = (typeof NS_RECOMMENDED_ACTIONS)[number];

// ═══════════════════════════════════════════════════
// Core Event Interface
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
  decided_at: string | null;
  decision_id: string | null;
  context_summary: NsContextSummary | null;
  context_confidence: number | null;
  related_event_ids: string[] | null;
  related_signal_group_ids: string[] | null;
}

// ═══════════════════════════════════════════════════
// Classification Metadata — Contract v1.1
// ═══════════════════════════════════════════════════

export interface NsClassificationMetadata {
  classified_by: string;
  rule_version: string;
  type_matched: boolean;
  severity_overridden?: boolean;
  fingerprint_count_1h?: number;
  enriched_by?: string;
  enrichment_version?: string;
  normalized_source?: string;
  category_hints?: string[];
  context_engine_version?: string;
  canon_refs_count?: number;
  decision_engine_version?: string;
}

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
// NS-04: Decision
// ═══════════════════════════════════════════════════

export interface NsDecision {
  id: string;
  organization_id: string;
  event_id: string;
  signal_group_id: string | null;
  decision_type: NsDecisionType;
  decision_reason: string;
  decision_confidence: number;
  risk_level: NsRiskLevel;
  priority_level: NsPriorityLevel;
  recommended_action_type: string | null;
  recommended_action_payload: Record<string, unknown>;
  expected_outcome: Record<string, unknown>;
  decision_metadata: Record<string, unknown>;
  created_at: string;
  decided_at: string;
  status: "active" | "superseded" | "resolved" | "archived";
}

// ═══════════════════════════════════════════════════
// Signal Group
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

export interface NsContextualizedSummary {
  contextualized_last_hour: number;
  by_attention: Record<string, number>;
  by_context_type: Record<string, number>;
  last_updated: string;
}

/** NS-04: Decision summary for live state */
export interface NsDecisionSummary {
  active_decisions_last_hour: number;
  by_type: Record<string, number>;
  by_risk: Record<string, number>;
  by_priority: Record<string, number>;
  escalations_count: number;
  recommendations_count: number;
  learning_marks_count: number;
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

export interface NsContextProcessingResult {
  processed: number;
  contextualized: number;
  relations_created: number;
  errors: number;
}

/** NS-04: Decision processing result */
export interface NsDecisionProcessingResult {
  processed: number;
  decided: number;
  by_type: Record<string, number>;
  errors: number;
}

// ═══════════════════════════════════════════════════
// NS-05: Surfacing Types
// ═══════════════════════════════════════════════════

export const NS_SURFACE_TYPES = [
  "decision_surface", "escalation_surface", "recommendation_surface",
  "learning_surface", "queue_surface",
] as const;
export type NsSurfaceType = (typeof NS_SURFACE_TYPES)[number];

export const NS_SURFACE_STATUSES = [
  "active", "acknowledged", "approved", "dismissed", "resolved", "expired",
] as const;
export type NsSurfaceStatus = (typeof NS_SURFACE_STATUSES)[number];

export const NS_SURFACE_ATTENTION_LEVELS = ["low", "medium", "high", "urgent"] as const;
export type NsSurfaceAttentionLevel = (typeof NS_SURFACE_ATTENTION_LEVELS)[number];

export interface NsSurfacedItem {
  id: string;
  organization_id: string;
  event_id: string;
  decision_id: string;
  signal_group_id: string | null;
  surface_type: NsSurfaceType;
  surface_status: NsSurfaceStatus;
  priority_level: NsPriorityLevel;
  risk_level: NsRiskLevel;
  title: string;
  summary: string;
  recommended_action_type: string | null;
  recommended_action_payload: Record<string, unknown>;
  expected_outcome: Record<string, unknown>;
  attention_level: NsSurfaceAttentionLevel;
  operator_notes: Record<string, unknown>;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  dismissed_by: string | null;
  dismissed_at: string | null;
  created_at: string;
  surfaced_at: string;
  status_reason: string | null;
  surface_metadata: Record<string, unknown>;
}

/** NS-05: Surfaced summary for live state */
export interface NsSurfacedSummary {
  active_surfaced_count: number;
  active_escalations: number;
  active_recommendations: number;
  pending_approvals: number;
  learning_candidates: number;
  by_type: Record<string, number>;
  by_attention: Record<string, number>;
  recent_surfaced_feed: {
    title: string;
    type: string;
    status: string;
    attention: string;
    at: string;
  }[];
  last_updated: string;
}

/** NS-05: Surfacing processing result */
export interface NsSurfacingProcessingResult {
  processed: number;
  surfaced: number;
  skipped: number;
  by_type: Record<string, number>;
  errors: number;
}

// ═══════════════════════════════════════════════════
// Known Limitations Registry
//
// NS-02: Novelty=structural rarity; grouping=exact fingerprint;
//         classification=rule-based; pattern promotion=threshold.
// NS-03: Fixed 30min window; subsequence matching; no Canon Graph;
//         possible_cause=pattern-derived; confidence=heuristic.
// NS-04: Decision rules are static (no adaptive thresholds);
//         no execution yet (recommend only); no cross-event
//         decision aggregation; confidence is heuristic average.
// NS-05: Surfacing thresholds are static; no operator preference
//         learning; dismiss/approve do not yet feed back into
//         decision engine; no expiration TTL enforcement.
//
// Improvement targets:
//   NS-06: Learning feedback calibrates decision confidence.
//   NS-07: Execution layer acts on approved surfaced items.
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
  decision_summary: NsDecisionSummary | null;
  surfaced_summary: NsSurfacedSummary | null;
  pending_approvals_count: number;
  active_escalations_count: number;
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

export interface NsGetContextualFeedResponse {
  feed: NervousSystemEvent[];
  count: number;
}

/** NS-04: Decision feed response */
export interface NsGetDecisionFeedResponse {
  decisions: NsDecision[];
  count: number;
}

/** NS-04: Decision list response */
export interface NsListDecisionsResponse {
  decisions: NsDecision[];
  count: number;
}

/** NS-05: Surfaced feed response */
export interface NsGetSurfacedFeedResponse {
  items: NsSurfacedItem[];
  count: number;
}

/** NS-05: Surfaced items list response */
export interface NsListSurfacedItemsResponse {
  items: NsSurfacedItem[];
  count: number;
}

export interface NsProcessEventsResponse {
  success: boolean;
  result: NsProcessingResult;
}

export interface NsProcessContextResponse {
  success: boolean;
  result: NsContextProcessingResult;
}

/** NS-04: Decision batch response */
export interface NsProcessDecisionResponse {
  success: boolean;
  result: NsDecisionProcessingResult;
}

/** NS-05: Surfacing batch response */
export interface NsProcessSurfacingResponse {
  success: boolean;
  result: NsSurfacingProcessingResult;
}

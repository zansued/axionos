/**
 * AI Nervous System — Sprint NS-01 + NS-02 Domain Types
 *
 * ARCHITECTURE NOTES:
 * - These types define the read-only contract between backend and frontend.
 * - The frontend NEVER writes to nervous system tables.
 * - Classification, enrichment, and grouping happen exclusively on the backend.
 * - Realtime subscriptions are tenant-scoped and read-only.
 *
 * EVOLUTION PATH:
 * - NS-03: Context link types (canon correlation, precedents)
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
// Transitions (backend-only, never frontend):
//   new → classified          (NS-02: classifier)
//   classified → contextualized (NS-03: context engine)
//   contextualized → decided    (NS-04: decision layer)
//   decided → surfaced          (NS-05: UI stream)
//   surfaced → resolved         (manual or autonomic)
//   any → archived              (TTL or manual)
//
// NS-01 uses: new
// NS-02 uses: new → classified
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
}

// ═══════════════════════════════════════════════════
// NS-02: Classification Metadata
// ═══════════════════════════════════════════════════

export interface NsClassificationMetadata {
  classified_by?: string;
  rule_version?: string;
  type_matched?: boolean;
  severity_overridden?: boolean;
  fingerprint_count_1h?: number;
  enriched_by?: string;
  enrichment_version?: string;
  normalized_source?: string;
  category_hints?: string[];
}

// ═══════════════════════════════════════════════════
// NS-02: Signal Group (cluster of correlated events)
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
// Pattern Interface (populated by backend, read-only on frontend)
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

/** NS-02: Classified summary live state shape */
export interface NsClassifiedSummary {
  classified_last_hour: number;
  pending_count: number;
  by_domain: Record<string, number>;
  by_severity: Record<string, number>;
  top_signal_groups: NsSignalGroupSummary[];
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
// NS-02: Processing Result
// ═══════════════════════════════════════════════════

export interface NsProcessingResult {
  processed: number;
  classified: number;
  grouped: number;
  patterns_promoted: number;
  errors: number;
}

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

export interface NsProcessEventsResponse {
  success: boolean;
  result: NsProcessingResult;
}

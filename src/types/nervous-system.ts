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
// LIFECYCLE SEMANTICS (canonical, frozen after NS-02 review):
//
//   new             → Event emitted, not yet processed.
//   classified      → Classifier assigned domain, severity, scores.
//                     Event is usable for backend queries and curated feeds.
//                     The "classified feed" (get_classified_feed) returns
//                     events in this status for OPERATIONAL VISIBILITY.
//                     This is NOT formal "surfacing" — it is a technical
//                     feed for operators, not an executive alert channel.
//   contextualized  → (NS-03) Context Engine has attached canon/precedent refs.
//   decided         → (NS-04) Decision Layer has produced a recommendation.
//   surfaced        → (NS-05) Event has been FORMALLY selected for prominent
//                     display, notification, or escalation. This status means
//                     "this signal was deemed important enough to push to
//                     attention." It is NOT the same as "classified and visible
//                     in a feed." Surfacing requires explicit criteria:
//                     severity >= high, or decision layer recommendation,
//                     or operator escalation.
//   resolved        → Signal has been addressed (manual or autonomic).
//   archived        → Retained for history, no longer active.
//
// KEY DISTINCTION:
//   classified feed  = operational visibility for monitoring (NS-02)
//   surfaced status  = formal attention escalation (NS-05)
//   These are NOT the same. The frontend must treat them differently.
//
// Transitions (backend-only, never frontend):
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
// NS-02: Classification Metadata — FROZEN CONTRACT v1.0
//
// This interface defines the ONLY accepted keys in
// classification_metadata. Any new key MUST be added here
// with a version bump. Do NOT dump arbitrary data into this
// field. If you need unstructured storage, use event.metadata.
//
// VERSION HISTORY:
//   v1.0 (NS-02): Initial contract — classifier + enricher fields.
//
// REQUIRED fields (always present after classification):
//   - classified_by:      Identifier of the classifier module
//   - rule_version:       Version of the classification ruleset
//   - type_matched:       Whether event_type had a known classification rule
//
// OPTIONAL fields (present when applicable):
//   - severity_overridden: Whether severity was escalated by a rule
//   - fingerprint_count_1h: Number of same-fingerprint events in last hour
//   - enriched_by:        Identifier of the enrichment module
//   - enrichment_version: Version of the enrichment logic
//   - normalized_source:  Normalized source label (source_type/service_name)
//   - category_hints:     Lightweight categorical tags for future context engine
//
// FUTURE (reserved, not yet populated):
//   - context_engine_version: (NS-03) Context engine identifier
//   - canon_refs_count:       (NS-03) Number of canon correlations found
//   - decision_engine_version:(NS-04) Decision engine identifier
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

  // === RESERVED (NS-03+, not yet populated) ===
  // context_engine_version?: string;
  // canon_refs_count?: number;
  // decision_engine_version?: string;
}

/** Validates that classification_metadata conforms to the v1.0 contract */
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
// NS-02: Signal Group (cluster of correlated events)
//
// TRACEABILITY CONTRACT:
// - Every group has a representative_event_id pointing to the
//   most recent event in the cluster.
// - Every event in a group has signal_group_id set, enabling
//   reverse lookup: SELECT * FROM nervous_system_events
//   WHERE signal_group_id = <group_id> ORDER BY created_at.
// - group_key explains WHY events are grouped:
//   format is "domain::event_type::fingerprint".
// - Membership is explainable: an event belongs to a group
//   if and only if it shares the same group_key AND was
//   processed within the grouping window.
//
// KNOWN LIMITATIONS (NS-02):
// - group_key uses exact fingerprint match. Events with
//   slightly different payloads (different fingerprints)
//   will form separate groups, even if operationally
//   they represent the same phenomenon.
// - No semantic similarity or fuzzy matching.
// - No cross-domain grouping (e.g., a pipeline failure
//   and a related agent failure are separate groups).
// - Groups do not merge retroactively if fingerprints
//   converge after initial divergence.
// - NS-03 Context Engine may introduce correlation links
//   between groups without merging them.
// ═══════════════════════════════════════════════════

export interface NsSignalGroup {
  id: string;
  created_at: string;
  updated_at: string;

  fingerprint: string;
  /** Format: "domain::event_type::fingerprint" — explains grouping rationale */
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
  /** Points to the most recent event in this group */
  representative_event_id: string | null;

  /**
   * KNOWN LIMITATION: novelty_score measures structural rarity
   * (inverse of fingerprint frequency), NOT operational novelty.
   * A rare fingerprint may represent a banal variant of a known
   * problem. A common fingerprint may mask a genuinely new issue
   * with different root cause. Treat as heuristic, not truth.
   */
  novelty_score: number | null;
  confidence_score: number | null;
  /** Saturates at 1.0 (20+ events). Measures recurrence intensity. */
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

/**
 * NS-02: Classified summary live state shape.
 *
 * NOTE: This summary provides OPERATIONAL VISIBILITY into
 * classification results. It is NOT the same as formal
 * "surfacing" (NS-05). The UI should display this as
 * "recent classified signals" or "processing status",
 * not as "alerts" or "escalations".
 */
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
// NS-02: Known Limitations Registry
//
// This section documents known limitations that are
// ACCEPTED for NS-02 and must be addressed in future sprints.
// Do NOT claim these capabilities exist.
//
// 1. NOVELTY SCORING
//    - Measures fingerprint frequency (structural rarity),
//      not operational novelty.
//    - Cannot detect "same problem, different fingerprint" cases.
//    - Cannot detect "different problem, same fingerprint" cases.
//    - Improvement target: NS-03 (context-aware novelty).
//
// 2. GROUPING
//    - Exact fingerprint match only. No fuzzy/semantic grouping.
//    - No cross-domain correlation (pipeline + agent = separate groups).
//    - No retroactive group merging.
//    - group_key is rigid: domain::event_type::fingerprint.
//    - Improvement target: NS-03 (context-linked groups).
//
// 3. CLASSIFICATION
//    - Rule-based only. No adaptive learning.
//    - Unknown event types get pass-through domain from emitter.
//    - Severity overrides are static (no contextual escalation).
//    - Confidence measures signal completeness, not accuracy.
//    - Improvement target: NS-06 (learning feedback loop).
//
// 4. PATTERN PROMOTION
//    - Threshold-based only (≥5 events). No statistical significance.
//    - Pattern confidence mirrors group confidence (no independent calc).
//    - patterns_promoted counter overcounts (increments per group check).
//    - Improvement target: NS-03/NS-06.
//
// 5. LIFECYCLE
//    - Only new → classified transition is implemented.
//    - get_classified_feed provides operational visibility, not
//      formal surfacing.
//    - No transition back from classified to new (no reclassification).
//    - Improvement target: NS-03 (contextualized), NS-05 (surfaced).
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

/**
 * Response for get_classified_feed.
 *
 * SEMANTIC NOTE: This feed returns classified events for
 * OPERATIONAL MONITORING. It does NOT imply formal surfacing.
 * The UI should label this as "Classified Signals" or
 * "Processing Feed", not as "Alerts" or "Escalations".
 */
export interface NsGetClassifiedFeedResponse {
  feed: NervousSystemEvent[];
  count: number;
}

export interface NsProcessEventsResponse {
  success: boolean;
  result: NsProcessingResult;
}
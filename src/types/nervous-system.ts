/**
 * AI Nervous System — Sprint NS-01: Signal Foundation
 *
 * Domain types and taxonomy for the nervous system event layer.
 *
 * ARCHITECTURE NOTES:
 * - These types define the contract between backend and frontend.
 * - The frontend consumes events and live state read-only.
 * - The frontend NEVER writes to nervous system tables directly.
 * - Realtime subscriptions are tenant-scoped and read-only.
 * - These types are intentionally generic to support all signal domains
 *   (runtime, pipeline, agent, governance, cost, deployment, security, learning).
 *
 * EVOLUTION PATH:
 * - NS-02: Classification types (classified events, dedup groups)
 * - NS-03: Context link types (canon correlation, precedents)
 * - NS-04: Decision types (recommendations, actions)
 * - NS-05: Live stream types (SSE payloads, pulse metrics)
 * - NS-06: Learning feedback types (outcome scoring)
 */

// ═══════════════════════════════════════════════════
// Event Domain Taxonomy
// ═══════════════════════════════════════════════════

export const NS_EVENT_DOMAINS = [
  "runtime",
  "pipeline",
  "agent",
  "governance",
  "cost",
  "adoption",
  "deployment",
  "security",
  "learning",
] as const;

export type NsEventDomain = (typeof NS_EVENT_DOMAINS)[number];

// ═══════════════════════════════════════════════════
// Event Type Taxonomy
// These are semantic signal types, not UI labels.
// New types can be added without schema changes.
// ═══════════════════════════════════════════════════

export const NS_EVENT_TYPES = [
  // Runtime
  "latency_spike",
  "error_pattern_detected",
  "resource_exhaustion",
  // Pipeline
  "pipeline_state_changed",
  "pipeline_stage_failed",
  "pipeline_stage_recovered",
  // Agent
  "agent_execution_failed",
  "agent_execution_recovered",
  "agent_routing_anomaly",
  // Governance
  "governance_violation_detected",
  "policy_enforcement_triggered",
  // Cost
  "cost_anomaly_detected",
  "budget_threshold_reached",
  // Deployment
  "deployment_state_changed",
  "deployment_rollback_triggered",
  // Learning
  "pattern_learned",
  "pattern_confidence_changed",
  // Optimization
  "optimization_opportunity_detected",
  // Autonomic
  "autonomic_action_executed",
  "autonomic_action_failed",
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
// Status transitions (enforced by backend workers, not frontend):
//   new → classified (NS-02: classifier worker)
//   classified → contextualized (NS-03: context engine)
//   contextualized → decided (NS-04: decision layer)
//   decided → surfaced (NS-05: UI stream)
//   surfaced → resolved (manual or autonomic)
//   any → archived (TTL or manual)
//
// NS-01 only uses: new
// ═══════════════════════════════════════════════════

export const NS_EVENT_STATUSES = [
  "new",
  "classified",
  "contextualized",
  "decided",
  "surfaced",
  "resolved",
  "archived",
] as const;

export type NsEventStatus = (typeof NS_EVENT_STATUSES)[number];

// ═══════════════════════════════════════════════════
// Source Types
// Identifies what system component emitted the signal.
// ═══════════════════════════════════════════════════

export const NS_SOURCE_TYPES = [
  "edge_function",
  "pipeline_worker",
  "agent",
  "governance_engine",
  "canon_system",
  "api_gateway",
  "scheduler",
  "manual",
] as const;

export type NsSourceType = (typeof NS_SOURCE_TYPES)[number];

// ═══════════════════════════════════════════════════
// Core Event Interface (read-only from frontend perspective)
// ═══════════════════════════════════════════════════

export interface NervousSystemEvent {
  id: string;
  created_at: string;
  occurred_at: string;

  source_type: NsSourceType;
  source_id: string | null;
  event_type: string; // Deliberately string, not NsEventType — extensible
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

  summary: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;

  status: NsEventStatus;
}

// ═══════════════════════════════════════════════════
// Pattern Interface (populated by backend workers, read-only on frontend)
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
// Live State Interface (materialized cache for UI)
// ═══════════════════════════════════════════════════

export interface NervousSystemLiveState {
  state_key: string;
  updated_at: string;
  state_value: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════
// System Pulse (typed shape of the system_pulse live state value)
// ═══════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════
// API Response Types (from nervous-system-engine)
// ═══════════════════════════════════════════════════

export interface NsListEventsResponse {
  events: NervousSystemEvent[];
  count: number;
}

export interface NsGetPulseResponse {
  pulse: NsSystemPulse | null;
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

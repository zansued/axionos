/**
 * AI Nervous System — Sprint NS-01: Signal Foundation
 * Core types and taxonomy for the nervous system event layer.
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
// ═══════════════════════════════════════════════════

export const NS_EVENT_TYPES = [
  "latency_spike",
  "error_pattern_detected",
  "pipeline_state_changed",
  "agent_execution_failed",
  "agent_execution_recovered",
  "cost_anomaly_detected",
  "pattern_learned",
  "governance_violation_detected",
  "optimization_opportunity_detected",
  "autonomic_action_executed",
] as const;

export type NsEventType = (typeof NS_EVENT_TYPES)[number];

// ═══════════════════════════════════════════════════
// Severity
// ═══════════════════════════════════════════════════

export const NS_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type NsSeverity = (typeof NS_SEVERITIES)[number];

// ═══════════════════════════════════════════════════
// Event Status Lifecycle
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
// Core Interfaces
// ═══════════════════════════════════════════════════

export interface NervousSystemEvent {
  id: string;
  organization_id: string;
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

  summary: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;

  status: NsEventStatus;
}

export interface NervousSystemEventPattern {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;

  pattern_key: string;
  title: string;
  domain: string;
  subdomain: string | null;

  description: string | null;
  known_causes: unknown[];
  known_resolutions: unknown[];

  occurrence_count: number;
  successful_resolution_count: number;
  confidence_score: number | null;

  canon_reference_id: string | null;
  metadata: Record<string, unknown>;
}

export interface NervousSystemLiveState {
  state_key: string;
  organization_id: string;
  updated_at: string;
  state_value: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════
// Emit Payload (used by frontend and edge functions)
// ═══════════════════════════════════════════════════

export interface EmitNsEventPayload {
  source_type: NsSourceType;
  source_id?: string;
  event_type: string;
  event_domain: NsEventDomain;
  event_subdomain?: string;

  initiative_id?: string;
  pipeline_id?: string;
  agent_id?: string;
  service_name?: string;

  severity?: NsSeverity;
  summary: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

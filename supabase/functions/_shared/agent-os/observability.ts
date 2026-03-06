// Agent OS — Observability & Telemetry Layer (v0.3)
// Pure telemetry contracts for full runtime visibility.
// Infrastructure-agnostic; adapters provide persistence/export.
//
// Consumes ProtocolRuntimeEvent from the EventBus and produces
// structured telemetry: traces, metrics, cost records, error tracking.

import type { StageName } from "./types.ts";

// ─────────────────────────────────────────────
// §1  Telemetry Event
// ─────────────────────────────────────────────

/** Canonical telemetry event produced by the Observability Layer. */
export interface TelemetryEvent {
  /** Unique event id. */
  event_id: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Category discriminator. */
  category: TelemetryCategory;
  /** Associated run, if any. */
  run_id?: string;
  /** Associated stage, if any. */
  stage?: StageName;
  /** Structured payload. */
  payload: Record<string, unknown>;
  /** Key-value labels for filtering and grouping. */
  labels?: Record<string, string>;
}

export type TelemetryCategory =
  | "trace"
  | "metric"
  | "cost"
  | "error"
  | "lifecycle"
  | "policy"
  | "artifact";

// ─────────────────────────────────────────────
// §2  Execution Tracing
// ─────────────────────────────────────────────

/** Full execution trace for a single run. */
export interface ExecutionTrace {
  trace_id: string;
  run_id: string;
  started_at: string;
  completed_at?: string;
  status: TraceStatus;
  entries: TraceEntry[];
  /** Total wall-clock duration in ms. */
  duration_ms?: number;
  /** Summary metrics computed from entries. */
  summary?: TraceSummary;
}

export type TraceStatus =
  | "active"
  | "completed"
  | "failed"
  | "timeout";

/** Single entry in an execution trace. Causally ordered by sequence. */
export interface TraceEntry {
  entry_id: string;
  /** Monotonic sequence number within the trace. */
  sequence: number;
  timestamp: string;
  /** Discriminator for the entry kind. */
  kind: TraceEntryKind;
  /** Duration of the traced operation in ms. */
  duration_ms?: number;
  /** Parent entry for hierarchical traces. */
  parent_entry_id?: string;
  /** Structured detail. */
  detail: Record<string, unknown>;
}

export type TraceEntryKind =
  | "run_start"
  | "run_end"
  | "stage_start"
  | "stage_end"
  | "agent_start"
  | "agent_end"
  | "agent_error"
  | "tool_start"
  | "tool_end"
  | "tool_error"
  | "validation_start"
  | "validation_end"
  | "validation_failed"
  | "policy_evaluated"
  | "policy_blocked"
  | "artifact_created"
  | "artifact_version_created"
  | "selection_executed"
  | "retry_triggered"
  | "fallback_triggered"
  | "rollback_triggered";

/** Aggregated summary derived from trace entries. */
export interface TraceSummary {
  total_stages: number;
  total_agents_invoked: number;
  total_tools_invoked: number;
  total_artifacts_created: number;
  total_retries: number;
  total_fallbacks: number;
  total_policy_blocks: number;
  total_validation_failures: number;
}

// ─────────────────────────────────────────────
// §3  Metric Primitives
// ─────────────────────────────────────────────

/** A single metric observation. */
export interface MetricSample {
  metric_id: string;
  name: string;
  value: number;
  unit: MetricUnit;
  timestamp: string;
  dimensions: MetricDimension[];
  labels?: Record<string, string>;
}

export type MetricUnit =
  | "ms"
  | "count"
  | "ratio"
  | "usd"
  | "tokens"
  | "bytes"
  | "percent";

/** A dimension for metric slicing and grouping. */
export interface MetricDimension {
  key: string;
  value: string;
}

/** Aggregated metric over a time window. */
export interface MetricAggregate {
  name: string;
  unit: MetricUnit;
  window: MetricWindow;
  dimensions: MetricDimension[];
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

/** Time window for metric aggregation. */
export interface MetricWindow {
  start: string;
  end: string;
  /** Duration of the window in seconds. */
  duration_seconds: number;
}

// ─────────────────────────────────────────────
// §4  Run / Stage / Agent / Capability Metrics
// ─────────────────────────────────────────────

/** Metrics for a single run. */
export interface RunMetrics {
  run_id: string;
  started_at: string;
  completed_at?: string;
  duration_ms: number;
  status: TraceStatus;
  stages_executed: number;
  agents_invoked: number;
  artifacts_created: number;
  total_tokens: number;
  total_cost_usd: number;
  retries: number;
  fallbacks: number;
  validation_score_avg?: number;
  error_count: number;
}

/** Metrics for a single stage execution. */
export interface StageMetrics {
  run_id: string;
  stage: StageName;
  started_at: string;
  completed_at?: string;
  duration_ms: number;
  agents_invoked: number;
  artifacts_created: number;
  tokens_used: number;
  cost_usd: number;
  retries: number;
  success: boolean;
  validation_score?: number;
}

/** Metrics for a single agent invocation. */
export interface AgentMetrics {
  agent_id: string;
  agent_name?: string;
  run_id: string;
  stage: StageName;
  started_at: string;
  completed_at?: string;
  duration_ms: number;
  tokens_used: number;
  cost_usd: number;
  artifacts_produced: number;
  tools_invoked: number;
  status: "completed" | "failed" | "blocked";
  error_message?: string;
  validation_score?: number;
}

/** Metrics for a capability across multiple invocations. */
export interface CapabilityMetrics {
  capability_id: string;
  total_invocations: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_duration_ms: number;
  avg_cost_usd: number;
  avg_validation_score: number;
  total_tokens: number;
  total_cost_usd: number;
  /** Confidence trend: positive = improving. */
  confidence_trend: number;
}

/** Metrics for tool usage. */
export interface ToolMetrics {
  tool_id: string;
  tool_name?: string;
  total_invocations: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_duration_ms: number;
  total_cost_usd: number;
  timeout_count: number;
  permission_denied_count: number;
}

// ─────────────────────────────────────────────
// §5  Cost Tracking
// ─────────────────────────────────────────────

/** Cost record for a single billable operation. */
export interface CostRecord {
  record_id: string;
  run_id: string;
  stage?: StageName;
  agent_id?: string;
  tool_id?: string;
  /** Cost category. */
  category: CostCategory;
  /** Amount in USD. */
  amount_usd: number;
  /** Token counts if applicable. */
  tokens?: TokenUsage;
  /** Model used if applicable. */
  model?: string;
  timestamp: string;
}

export type CostCategory =
  | "llm_inference"
  | "tool_execution"
  | "embedding"
  | "storage"
  | "compute"
  | "external_api";

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** Aggregated cost metrics. */
export interface CostMetrics {
  run_id?: string;
  period?: MetricWindow;
  total_cost_usd: number;
  cost_by_category: Record<CostCategory, number>;
  cost_by_stage: Record<string, number>;
  cost_by_agent: Record<string, number>;
  cost_by_model: Record<string, number>;
  total_tokens: number;
  tokens_by_model: Record<string, TokenUsage>;
}

// ─────────────────────────────────────────────
// §6  Error & Failure Tracking
// ─────────────────────────────────────────────

/** Structured execution error. */
export interface ExecutionError {
  error_id: string;
  run_id: string;
  stage?: StageName;
  agent_id?: string;
  tool_id?: string;
  error_type: ErrorType;
  message: string;
  stack?: string;
  timestamp: string;
  /** Was the error recovered from? */
  recovered: boolean;
  recovery_action?: string;
}

export type ErrorType =
  | "agent_failure"
  | "tool_failure"
  | "validation_failure"
  | "policy_violation"
  | "timeout"
  | "rate_limit"
  | "cost_limit"
  | "infrastructure"
  | "unknown";

/** Metrics about failures and recovery. */
export interface FailureMetrics {
  total_errors: number;
  errors_by_type: Record<string, number>;
  recovery_rate: number;
  mean_time_to_recovery_ms: number;
  /** Most error-prone agents. */
  top_failing_agents: Array<{ agent_id: string; count: number }>;
  /** Most error-prone capabilities. */
  top_failing_capabilities: Array<{ capability_id: string; count: number }>;
}

/** Retry-specific metrics. */
export interface RetryMetrics {
  total_retries: number;
  retries_by_stage: Record<string, number>;
  retries_by_agent: Record<string, number>;
  retry_success_rate: number;
  avg_retries_per_run: number;
  max_retries_in_run: number;
}

/** Fallback-specific metrics. */
export interface FallbackMetrics {
  total_fallbacks: number;
  fallbacks_by_capability: Record<string, number>;
  fallback_success_rate: number;
  avg_fallback_depth: number;
  /** How often primary agent was bypassed. */
  primary_bypass_rate: number;
}

// ─────────────────────────────────────────────
// §7  Telemetry Sink Adapter (Extension Point)
// ─────────────────────────────────────────────

/** Result of exporting telemetry to an external sink. */
export interface TelemetryExportResult {
  sink_id: string;
  events_exported: number;
  errors: number;
  duration_ms: number;
  timestamp: string;
}

/**
 * Adapter interface for exporting telemetry to external systems.
 * Implementations: OpenTelemetry, Prometheus, Datadog, etc.
 */
export interface ITelemetrySink {
  readonly sink_id: string;
  readonly sink_type: string;

  /** Export a batch of telemetry events. */
  exportEvents(events: TelemetryEvent[]): Promise<TelemetryExportResult>;

  /** Export metric aggregates. */
  exportMetrics(metrics: MetricAggregate[]): Promise<TelemetryExportResult>;

  /** Export execution traces. */
  exportTraces(traces: ExecutionTrace[]): Promise<TelemetryExportResult>;

  /** Flush any buffered data. */
  flush(): Promise<void>;

  /** Check sink health. */
  healthy(): Promise<boolean>;
}

// ─────────────────────────────────────────────
// §8  Observability Layer Interface
// ─────────────────────────────────────────────

/** Configuration for the Observability Layer. */
export interface ObservabilityConfig {
  /** Enable/disable tracing. */
  tracing_enabled: boolean;
  /** Enable/disable metrics collection. */
  metrics_enabled: boolean;
  /** Enable/disable cost tracking. */
  cost_tracking_enabled: boolean;
  /** Max trace entries per run before truncation. */
  max_trace_entries: number;
  /** Metric aggregation window in seconds. */
  default_window_seconds: number;
  /** Registered telemetry sinks. */
  sinks: ITelemetrySink[];
  /** Sampling rate 0.0 – 1.0 for high-volume events. */
  sampling_rate: number;
}

export const DEFAULT_OBSERVABILITY_CONFIG: ObservabilityConfig = {
  tracing_enabled: true,
  metrics_enabled: true,
  cost_tracking_enabled: true,
  max_trace_entries: 10_000,
  default_window_seconds: 3600,
  sinks: [],
  sampling_rate: 1.0,
};

/**
 * Core interface for the Observability Layer.
 * Implementations consume EventBus events and produce telemetry.
 */
export interface IObservabilityLayer {
  // ── Tracing ──
  startTrace(run_id: string): ExecutionTrace;
  addTraceEntry(trace_id: string, entry: Omit<TraceEntry, "entry_id" | "sequence">): TraceEntry;
  completeTrace(trace_id: string, status: TraceStatus): ExecutionTrace;
  getTrace(trace_id: string): ExecutionTrace | undefined;
  getTraceByRun(run_id: string): ExecutionTrace | undefined;

  // ── Metrics ──
  recordSample(sample: Omit<MetricSample, "metric_id">): void;
  getRunMetrics(run_id: string): RunMetrics | undefined;
  getStageMetrics(run_id: string, stage: StageName): StageMetrics | undefined;
  getAgentMetrics(run_id: string, agent_id: string): AgentMetrics | undefined;
  aggregateMetrics(name: string, window: MetricWindow, dimensions?: MetricDimension[]): MetricAggregate | undefined;

  // ── Cost ──
  recordCost(record: Omit<CostRecord, "record_id">): void;
  getRunCost(run_id: string): CostMetrics;
  getCostByPeriod(window: MetricWindow): CostMetrics;

  // ── Errors ──
  recordError(error: Omit<ExecutionError, "error_id">): void;
  getFailureMetrics(run_id?: string): FailureMetrics;
  getRetryMetrics(run_id?: string): RetryMetrics;
  getFallbackMetrics(run_id?: string): FallbackMetrics;

  // ── Export ──
  exportAll(): Promise<TelemetryExportResult[]>;
  flush(): Promise<void>;
}

// ─────────────────────────────────────────────
// §9  Observability Event Types (EventBus)
// ─────────────────────────────────────────────

export type ObservabilityEventType =
  | "telemetry.event_recorded"
  | "telemetry.trace_started"
  | "telemetry.trace_completed"
  | "telemetry.metric_recorded"
  | "telemetry.cost_recorded"
  | "telemetry.error_recorded"
  | "telemetry.export_completed"
  | "telemetry.export_failed"
  | "telemetry.sink_unhealthy";

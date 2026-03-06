// Agent OS — Tool Adapter Layer (v0.5)
// Provider-agnostic abstraction for external tool interactions.
// Agents never call external services directly; all invocations
// flow through this layer for policy enforcement, observability,
// permission control, and error normalization.

import type { StageName } from "./types.ts";

// ─────────────────────────────────────────────
// §1  Tool Capability & Descriptor
// ─────────────────────────────────────────────

/** Describes a single capability offered by a tool. */
export interface ToolCapability {
  /** Unique capability key within the tool. */
  capability_key: string;
  /** Human-readable description. */
  description: string;
  /** JSON Schema for the input payload. */
  input_schema: Record<string, unknown>;
  /** JSON Schema for the output payload. */
  output_schema: Record<string, unknown>;
}

/** Full descriptor of a registered tool. */
export interface ToolDescriptor {
  /** Unique tool identifier. */
  tool_id: string;
  /** Human-readable tool name. */
  name: string;
  /** Tool description. */
  description: string;
  /** Tool version. */
  version: string;
  /** Provider or category. */
  provider: string;
  /** Capabilities exposed by this tool. */
  capabilities: ToolCapability[];
  /** Permissions required to use this tool. */
  required_permissions: ToolPermissionKind[];
  /** Execution mode. */
  execution_mode: ToolExecutionMode;
  /** Maximum timeout allowed in ms. */
  max_timeout_ms: number;
  /** Whether the tool supports retries. */
  retryable: boolean;
  /** Quality/reliability tags. */
  tags?: string[];
}

/** How the tool executes externally. */
export type ToolExecutionMode =
  | "stateless"     // Pure function, no side effects
  | "stateful"      // Maintains state across calls
  | "sandboxed"     // Runs in an isolated sandbox
  | "external_api"  // Calls an external HTTP API
  | "database"      // Queries a database
  | "filesystem";   // Reads/writes files

// ─────────────────────────────────────────────
// §2  Tool Invocation
// ─────────────────────────────────────────────

/** Normalized request to invoke a tool. */
export interface ToolInvocationRequest {
  /** Unique invocation id. */
  invocation_id: string;
  /** Target tool id. */
  tool_id: string;
  /** Specific capability key (optional if tool has one capability). */
  capability_key?: string;
  /** Input payload matching the tool's input_schema. */
  input_payload: Record<string, unknown>;
  /** Requested timeout in ms. */
  timeout_ms?: number;
  /** Trace metadata for observability. */
  trace: ToolTraceMetadata;
}

/** Trace context attached to each tool invocation. */
export interface ToolTraceMetadata {
  run_id: string;
  stage?: StageName;
  agent_id?: string;
  capability_id?: string;
  /** Caller-defined label. */
  label?: string;
}

// ─────────────────────────────────────────────
// §3  Tool Execution Context
// ─────────────────────────────────────────────

/** Runtime context injected into tool execution. */
export interface ToolExecutionContext {
  /** Agent requesting the tool. */
  agent_id: string;
  /** Capability that triggered the invocation. */
  capability_id?: string;
  /** Current environment. */
  environment: ToolEnvironment;
  /** Resource limits for this execution. */
  resource_limits: ToolResourceLimits;
  /** Granted permissions (pre-evaluated). */
  granted_permissions: ToolPermissionKind[];
}

export type ToolEnvironment = "development" | "staging" | "production";

/** Resource constraints for tool execution. */
export interface ToolResourceLimits {
  /** Maximum execution time in ms. */
  max_duration_ms: number;
  /** Maximum payload size in bytes. */
  max_payload_bytes: number;
  /** Maximum number of retries. */
  max_retries: number;
  /** Maximum cost in USD for this invocation. */
  max_cost_usd?: number;
}

// ─────────────────────────────────────────────
// §4  Tool Execution Result
// ─────────────────────────────────────────────

/** Normalized result from a tool execution. */
export interface ToolExecutionResult {
  /** Echoed invocation id. */
  invocation_id: string;
  /** Tool that was invoked. */
  tool_id: string;
  /** Execution status. */
  status: ToolExecutionStatus;
  /** Output payload from the tool. */
  output_payload?: Record<string, unknown>;
  /** Wall-clock execution time in ms. */
  latency_ms: number;
  /** Tool-specific metadata. */
  tool_metadata?: Record<string, unknown>;
  /** Non-fatal warnings. */
  warnings?: string[];
  /** Error details if status is error. */
  error?: ToolExecutionError;
  /** Cost incurred by this invocation. */
  cost_usd?: number;
  /** Timestamp of completion. */
  completed_at: string;
}

export type ToolExecutionStatus =
  | "success"
  | "partial_success"
  | "error"
  | "timeout"
  | "permission_denied"
  | "not_found";

// ─────────────────────────────────────────────
// §5  Error Model
// ─────────────────────────────────────────────

/** Structured tool execution error. */
export interface ToolExecutionError {
  error_id: string;
  error_type: ToolErrorType;
  message: string;
  /** Underlying provider error code. */
  provider_code?: string;
  /** HTTP status if applicable. */
  http_status?: number;
  /** Is this error retryable? */
  retryable: boolean;
  /** Recommended retry delay in ms. */
  retry_after_ms?: number;
  /** Maximum recommended retries. */
  max_retries?: number;
  /** Timestamp of the error. */
  timestamp: string;
}

export type ToolErrorType =
  | "tool_timeout"
  | "tool_permission_denied"
  | "tool_not_found"
  | "tool_execution_error"
  | "tool_validation_error"
  | "tool_rate_limited"
  | "tool_network_error"
  | "tool_sandbox_error"
  | "tool_cost_exceeded"
  | "tool_unknown_error";

// ─────────────────────────────────────────────
// §6  Permission Model
// ─────────────────────────────────────────────

/** Kinds of permissions that tools may require. */
export type ToolPermissionKind =
  | "read_external_api"
  | "write_external_api"
  | "read_database"
  | "write_database"
  | "execute_code"
  | "access_filesystem"
  | "internet_access"
  | "send_email"
  | "send_notification"
  | "access_secrets"
  | "browser_automation";

/** Permission grant or denial result. */
export interface ToolPermissionResult {
  tool_id: string;
  granted: boolean;
  required_permissions: ToolPermissionKind[];
  missing_permissions: ToolPermissionKind[];
  /** Reason for denial, if any. */
  denial_reason?: string;
  /** Policy rule that caused the denial. */
  policy_rule_id?: string;
}

/**
 * Evaluates whether a tool invocation is permitted.
 * Integrates with the Policy Engine.
 */
export interface IToolPermissionEvaluator {
  evaluate(
    tool: ToolDescriptor,
    context: ToolExecutionContext,
  ): ToolPermissionResult;
}

// ─────────────────────────────────────────────
// §7  Tool Adapter Interface
// ─────────────────────────────────────────────

/**
 * Provider-specific tool adapter.
 * Each external tool/service implements this contract.
 */
export interface IToolAdapter {
  /** Unique adapter identifier. */
  readonly adapter_id: string;
  /** Provider name. */
  readonly provider: string;
  /** Tools supported by this adapter. */
  readonly supported_tools: string[];

  /** Execute a tool invocation. */
  execute(
    invocation: ToolInvocationRequest,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult>;

  /** Get descriptor for a specific tool. */
  getToolDescriptor(tool_id: string): ToolDescriptor | undefined;

  /** List all tool descriptors provided by this adapter. */
  listTools(): ToolDescriptor[];

  /** Check adapter health / connectivity. */
  healthy(): Promise<boolean>;
}

// ─────────────────────────────────────────────
// §8  Tool Adapter Registry
// ─────────────────────────────────────────────

/**
 * Registry that manages tool adapters and resolves tools.
 */
export interface IToolAdapterRegistry {
  /** Register an adapter. */
  register(adapter: IToolAdapter): void;

  /** Remove an adapter by id. */
  unregister(adapter_id: string): void;

  /** Find the adapter for a given tool. */
  resolveAdapter(tool_id: string): IToolAdapter | undefined;

  /** Find adapter by provider name. */
  getByProvider(provider: string): IToolAdapter | undefined;

  /** List all registered adapters. */
  listAdapters(): IToolAdapter[];

  /** List all available tool descriptors across all adapters. */
  listTools(): ToolDescriptor[];

  /** Find tools by permission kind. */
  findByPermission(permission: ToolPermissionKind): ToolDescriptor[];

  /** Find tools by execution mode. */
  findByMode(mode: ToolExecutionMode): ToolDescriptor[];
}

// ─────────────────────────────────────────────
// §9  Execution Metrics
// ─────────────────────────────────────────────

/** Metrics for a single tool invocation. */
export interface ToolExecutionMetrics {
  invocation_id: string;
  tool_id: string;
  run_id: string;
  stage?: StageName;
  agent_id?: string;
  status: ToolExecutionStatus;
  latency_ms: number;
  cost_usd: number;
  retries: number;
  timestamp: string;
}

/** Aggregate metrics for a tool across multiple invocations. */
export interface ToolAggregateMetrics {
  tool_id: string;
  total_invocations: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  timeout_count: number;
  permission_denied_count: number;
  avg_latency_ms: number;
  total_cost_usd: number;
  p95_latency_ms?: number;
}

// ─────────────────────────────────────────────
// §10  Configuration
// ─────────────────────────────────────────────

/** Configuration for the Tool Adapter Layer. */
export interface ToolAdapterConfig {
  /** Default timeout for tool executions in ms. */
  default_timeout_ms: number;
  /** Default max retries. */
  default_max_retries: number;
  /** Base delay for exponential backoff in ms. */
  retry_base_delay_ms: number;
  /** Maximum payload size in bytes. */
  max_payload_bytes: number;
  /** Enable permission checks. */
  permissions_enabled: boolean;
  /** Enable cost tracking. */
  cost_tracking_enabled: boolean;
  /** Default resource limits. */
  default_resource_limits: ToolResourceLimits;
}

export const DEFAULT_TOOL_ADAPTER_CONFIG: ToolAdapterConfig = {
  default_timeout_ms: 30_000,
  default_max_retries: 2,
  retry_base_delay_ms: 500,
  max_payload_bytes: 10 * 1024 * 1024, // 10MB
  permissions_enabled: true,
  cost_tracking_enabled: true,
  default_resource_limits: {
    max_duration_ms: 30_000,
    max_payload_bytes: 10 * 1024 * 1024,
    max_retries: 2,
    max_cost_usd: 1.0,
  },
};

// ─────────────────────────────────────────────
// §11  Event Types (EventBus integration)
// ─────────────────────────────────────────────

export type ToolAdapterEventType =
  | "tool.invocation_started"
  | "tool.invocation_completed"
  | "tool.invocation_failed"
  | "tool.timeout"
  | "tool.permission_denied"
  | "tool.permission_granted"
  | "tool.retry_triggered"
  | "tool.adapter_registered"
  | "tool.adapter_unregistered"
  | "tool.adapter_unhealthy"
  | "tool.cost_recorded"
  | "tool.rate_limited";

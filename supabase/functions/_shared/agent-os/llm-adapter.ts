// Agent OS — LLM Adapter Layer (v0.4)
// Provider-agnostic abstraction for large language model interactions.
// Infrastructure-free; provider adapters implement the ILLMAdapter interface.

import type { StageName } from "./types.ts";

// ─────────────────────────────────────────────
// §1  Message & Prompt Types
// ─────────────────────────────────────────────

/** Role in a chat message sequence. */
export type LLMMessageRole = "system" | "user" | "assistant" | "tool";

/** Single message in a chat-style invocation. */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
  /** Tool call id when role is "tool". */
  tool_call_id?: string;
  /** Name of the function for tool responses. */
  name?: string;
}

/** Tool/function definition for structured output. */
export interface LLMToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Tool choice specification. */
export type LLMToolChoice =
  | "auto"
  | "none"
  | { type: "function"; function: { name: string } };

// ─────────────────────────────────────────────
// §2  LLM Invocation
// ─────────────────────────────────────────────

/** Normalized request to any LLM provider. */
export interface LLMInvocation {
  /** Target model identifier (provider/model format). */
  model: string;
  /** Chat messages (preferred over raw prompt). */
  messages?: LLMMessage[];
  /** Raw text prompt (fallback for completion-only models). */
  prompt?: string;
  /** Sampling temperature 0.0–2.0. */
  temperature?: number;
  /** Max tokens to generate. */
  max_tokens?: number;
  /** Nucleus sampling parameter. */
  top_p?: number;
  /** Stop sequences. */
  stop_sequences?: string[];
  /** Requested timeout in milliseconds. */
  timeout_ms?: number;
  /** Tool definitions for structured output / function calling. */
  tools?: LLMToolDefinition[];
  /** Tool choice control. */
  tool_choice?: LLMToolChoice;
  /** Response format hint. */
  response_format?: LLMResponseFormat;
  /** Trace metadata for observability. */
  trace?: LLMTraceMetadata;
}

export interface LLMResponseFormat {
  type: "text" | "json_object";
}

/** Trace context attached to each invocation for observability. */
export interface LLMTraceMetadata {
  run_id?: string;
  stage?: StageName;
  agent_id?: string;
  capability_id?: string;
  /** Caller-defined label. */
  label?: string;
}

// ─────────────────────────────────────────────
// §3  LLM Response
// ─────────────────────────────────────────────

/** Normalized response from any LLM provider. */
export interface LLMResponse {
  /** Generated text output. */
  output_text: string;
  /** Structured output from tool calls, if any. */
  structured_output?: Record<string, unknown>;
  /** Tool calls returned by the model. */
  tool_calls?: LLMToolCall[];
  /** Token usage and cost. */
  usage: LLMUsage;
  /** Provider-specific metadata. */
  provider_metadata: LLMProviderMetadata;
  /** Why the model stopped generating. */
  finish_reason: LLMFinishReason;
  /** Wall-clock latency in milliseconds. */
  latency_ms: number;
  /** Model actually used (may differ from requested). */
  model_used: string;
}

export interface LLMToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type LLMFinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "error"
  | "unknown";

// ─────────────────────────────────────────────
// §4  Usage & Cost Tracking
// ─────────────────────────────────────────────

/** Token accounting for a single invocation. */
export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** Estimated cost in USD based on model pricing. */
  estimated_cost_usd: number;
}

/** Pricing info for cost estimation. */
export interface LLMPricing {
  /** Cost per 1M prompt tokens in USD. */
  prompt_cost_per_million: number;
  /** Cost per 1M completion tokens in USD. */
  completion_cost_per_million: number;
  /** Currency (always USD). */
  currency: "USD";
}

// ─────────────────────────────────────────────
// §5  Provider Metadata
// ─────────────────────────────────────────────

/** Provider-specific metadata returned alongside the response. */
export interface LLMProviderMetadata {
  /** Provider identifier. */
  provider: string;
  /** Provider's internal request id. */
  request_id?: string;
  /** Provider-specific model version. */
  model_version?: string;
  /** Region or endpoint used. */
  endpoint?: string;
  /** Raw provider response headers of interest. */
  headers?: Record<string, string>;
}

// ─────────────────────────────────────────────
// §6  Model Descriptor
// ─────────────────────────────────────────────

/** Describes a model's capabilities and constraints. */
export interface LLMModelDescriptor {
  /** Model identifier (provider/model). */
  model_id: string;
  /** Human-readable name. */
  display_name: string;
  /** Provider identifier. */
  provider: string;
  /** Maximum context window in tokens. */
  max_context_tokens: number;
  /** Maximum output tokens. */
  max_output_tokens: number;
  /** Supported modalities. */
  modalities: LLMModality[];
  /** Supports function/tool calling. */
  supports_tool_calls: boolean;
  /** Supports streaming responses. */
  supports_streaming: boolean;
  /** Supports structured JSON output. */
  supports_json_mode: boolean;
  /** Model pricing. */
  pricing: LLMPricing;
  /** Quality tier for routing decisions. */
  quality_tier: LLMQualityTier;
  /** Latency class. */
  latency_class: LLMLatencyClass;
  /** Additional model capabilities. */
  tags?: string[];
}

export type LLMModality =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "code"
  | "embedding";

export type LLMQualityTier =
  | "flagship"
  | "balanced"
  | "fast"
  | "economy";

export type LLMLatencyClass =
  | "realtime"   // < 500ms TTFT
  | "fast"       // < 2s TTFT
  | "standard"   // < 5s TTFT
  | "slow";      // > 5s TTFT

// ─────────────────────────────────────────────
// §7  Error Model
// ─────────────────────────────────────────────

/** Structured LLM error. */
export interface LLMError {
  error_id: string;
  error_type: LLMErrorType;
  message: string;
  /** Provider-specific error code. */
  provider_code?: string;
  /** HTTP status code from provider. */
  http_status?: number;
  /** Should the caller retry? */
  retryable: boolean;
  /** Recommended retry delay in ms. */
  retry_after_ms?: number;
  /** Maximum recommended retries. */
  max_retries?: number;
  /** Provider identifier. */
  provider?: string;
  /** Model that triggered the error. */
  model?: string;
  /** Timestamp of the error. */
  timestamp: string;
}

export type LLMErrorType =
  | "provider_error"
  | "timeout_error"
  | "rate_limit_error"
  | "quota_exceeded_error"
  | "invalid_request_error"
  | "authentication_error"
  | "content_filter_error"
  | "context_length_error"
  | "adapter_error"
  | "network_error"
  | "unknown_error";

// ─────────────────────────────────────────────
// §8  Routing Hints
// ─────────────────────────────────────────────

/** Hints for the RouterAdapter to select the best model. */
export interface LLMRoutingHints {
  /** Preferred quality tier. */
  quality?: LLMQualityTier;
  /** Maximum acceptable latency in ms. */
  max_latency_ms?: number;
  /** Maximum acceptable cost in USD. */
  max_cost_usd?: number;
  /** Required modalities. */
  required_modalities?: LLMModality[];
  /** Must support tool calls. */
  require_tool_calls?: boolean;
  /** Must support streaming. */
  require_streaming?: boolean;
  /** Preferred providers (ordered). */
  preferred_providers?: string[];
  /** Excluded providers. */
  excluded_providers?: string[];
  /** Excluded models. */
  excluded_models?: string[];
  /** Task domain for domain-aware routing. */
  task_domain?: string;
}

// ─────────────────────────────────────────────
// §9  Adapter Interface
// ─────────────────────────────────────────────

/**
 * Provider-specific adapter interface.
 * Each LLM provider implements this contract.
 */
export interface ILLMAdapter {
  /** Unique adapter identifier. */
  readonly adapter_id: string;
  /** Provider name (openai, anthropic, google, local, etc.). */
  readonly provider: string;
  /** Models supported by this adapter. */
  readonly supported_models: string[];

  /** Invoke the model synchronously. */
  invoke(invocation: LLMInvocation): Promise<LLMResponse>;

  /**
   * Stream the model response (future support).
   * Returns an async iterable of partial responses.
   */
  stream?(invocation: LLMInvocation): AsyncIterable<LLMStreamChunk>;

  /** Get descriptor for a specific model. */
  getModelDescriptor(model_id: string): LLMModelDescriptor | undefined;

  /** Check adapter health / connectivity. */
  healthy(): Promise<boolean>;
}

/** Chunk emitted during streaming. */
export interface LLMStreamChunk {
  /** Incremental text delta. */
  delta: string;
  /** Tool call deltas, if any. */
  tool_call_deltas?: Partial<LLMToolCall>[];
  /** Finish reason (only on last chunk). */
  finish_reason?: LLMFinishReason;
  /** Accumulated usage (only on last chunk). */
  usage?: LLMUsage;
}

// ─────────────────────────────────────────────
// §10  Adapter Registry
// ─────────────────────────────────────────────

/**
 * Registry that manages LLM adapters and resolves models to adapters.
 */
export interface ILLMAdapterRegistry {
  /** Register an adapter. */
  register(adapter: ILLMAdapter): void;

  /** Remove an adapter by id. */
  unregister(adapter_id: string): void;

  /** Find the adapter for a given model. */
  resolveAdapter(model_id: string): ILLMAdapter | undefined;

  /** Find adapter by provider name. */
  getByProvider(provider: string): ILLMAdapter | undefined;

  /** List all registered adapters. */
  listAdapters(): ILLMAdapter[];

  /** List all available model descriptors across all adapters. */
  listModels(): LLMModelDescriptor[];

  /** Select best model given routing hints. */
  selectModel(hints: LLMRoutingHints): LLMModelDescriptor | undefined;
}

// ─────────────────────────────────────────────
// §11  Configuration
// ─────────────────────────────────────────────

/** Configuration for the LLM Adapter Layer. */
export interface LLMAdapterConfig {
  /** Default model to use when none specified. */
  default_model: string;
  /** Default temperature. */
  default_temperature: number;
  /** Default max tokens. */
  default_max_tokens: number;
  /** Global timeout in ms. */
  default_timeout_ms: number;
  /** Maximum retries on retryable errors. */
  max_retries: number;
  /** Base delay for exponential backoff in ms. */
  retry_base_delay_ms: number;
  /** Enable cost tracking. */
  cost_tracking_enabled: boolean;
  /** Enable automatic model fallback. */
  fallback_enabled: boolean;
  /** Fallback chain: ordered list of model ids. */
  fallback_chain: string[];
}

export const DEFAULT_LLM_ADAPTER_CONFIG: LLMAdapterConfig = {
  default_model: "deepseek-chat",
  default_temperature: 0.7,
  default_max_tokens: 4096,
  default_timeout_ms: 30_000,
  max_retries: 3,
  retry_base_delay_ms: 1000,
  cost_tracking_enabled: true,
  fallback_enabled: true,
  fallback_chain: [
    "deepseek-chat",
    "gpt-5-mini",
  ],
};

// ─────────────────────────────────────────────
// §12  Event Types (EventBus integration)
// ─────────────────────────────────────────────

export type LLMAdapterEventType =
  | "llm.invocation_started"
  | "llm.invocation_completed"
  | "llm.invocation_failed"
  | "llm.stream_started"
  | "llm.stream_chunk"
  | "llm.stream_completed"
  | "llm.stream_failed"
  | "llm.fallback_triggered"
  | "llm.retry_triggered"
  | "llm.model_selected"
  | "llm.adapter_registered"
  | "llm.adapter_unhealthy";

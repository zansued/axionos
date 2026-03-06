# Agent OS — LLM Adapter Layer (v0.4)

> Normative specification for provider-agnostic LLM interactions in Agent OS.

## 1. Design Rationale

The LLM Adapter Layer ensures Agent OS **never depends on any specific AI provider**. All LLM interactions flow through a standardized interface (`ILLMAdapter`), with provider-specific adapters translating between the Agent OS contract and provider APIs.

### Principles

1. **Provider-agnostic** — Swap models without changing agent code.
2. **Normalized contracts** — `LLMInvocation` in, `LLMResponse` out, always.
3. **Cost-aware** — First-class token accounting and cost estimation via `LLMUsage`.
4. **Observable** — Every invocation emits events to the EventBus for the Observability Layer.
5. **Resilient** — Built-in retry logic with exponential backoff and provider fallback chains.
6. **Extensible** — New providers added by implementing `ILLMAdapter`.

## 2. Module Structure

```
agent-os/
├── llm-adapter.ts    ← Contracts (this spec)
├── index.ts          ← Re-exports
└── (future)
    ├── llm-openai.ts        ← OpenAI adapter
    ├── llm-anthropic.ts     ← Anthropic adapter
    ├── llm-google.ts        ← Google adapter
    ├── llm-local.ts         ← Local model adapter
    └── llm-router.ts        ← Intelligent router
```

## 3. Architecture

```
Agent / Orchestrator
       │
       ▼
  LLMInvocation
       │
       ▼
 ILLMAdapterRegistry
       │
       ├─ selectModel(hints)
       │
       ▼
   ILLMAdapter
       │
       ├─ OpenAIAdapter
       ├─ AnthropicAdapter
       ├─ GoogleAdapter
       ├─ LocalModelAdapter
       └─ RouterAdapter
              │
              ▼
        Provider API
              │
              ▼
       LLMResponse (normalized)
              │
              ▼
      Observability Layer
```

## 4. Core Contracts

### 4.1 LLMInvocation

Standardized request sent to any adapter:
- `model`: target model in `provider/model` format
- `messages`: chat-style messages (preferred)
- `prompt`: raw text fallback
- `temperature`, `max_tokens`, `top_p`, `stop_sequences`
- `timeout_ms`: requested timeout
- `tools`: function/tool definitions for structured output
- `tool_choice`: control tool usage
- `trace`: metadata for observability (`run_id`, `stage`, `agent_id`)

### 4.2 LLMResponse

Normalized response:
- `output_text`: generated content
- `structured_output`: parsed tool call results
- `tool_calls`: raw tool calls from the model
- `usage`: token counts and estimated cost
- `provider_metadata`: provider-specific details
- `finish_reason`: stop | length | tool_calls | content_filter | error
- `latency_ms`: wall-clock time
- `model_used`: actual model (may differ from requested)

### 4.3 LLMUsage

Token accounting per invocation:
- `prompt_tokens`, `completion_tokens`, `total_tokens`
- `estimated_cost_usd`: computed from `LLMPricing`

### 4.4 LLMError

Structured error with retry guidance:
- Types: `provider_error`, `timeout_error`, `rate_limit_error`, `quota_exceeded_error`, `invalid_request_error`, `authentication_error`, `content_filter_error`, `context_length_error`, `adapter_error`, `network_error`
- `retryable`: boolean flag
- `retry_after_ms`: recommended delay
- `max_retries`: maximum attempts

## 5. Model Descriptor

`LLMModelDescriptor` enables intelligent routing:
- Context window and output limits
- Supported modalities (text, image, audio, video, code, embedding)
- Feature support (tool calls, streaming, JSON mode)
- Pricing for cost estimation
- Quality tier: flagship | balanced | fast | economy
- Latency class: realtime | fast | standard | slow

## 6. Routing Hints

`LLMRoutingHints` guide model selection:
- Quality preference
- Latency and cost constraints
- Required capabilities (modalities, tool calls, streaming)
- Provider preferences and exclusions
- Task domain for specialized routing

## 7. Adapter Registry

`ILLMAdapterRegistry` manages adapters:
- Register/unregister adapters
- Resolve adapter by model id
- List all models across providers
- Select best model given routing hints

## 8. Invocation Flow

```
1. Agent creates LLMInvocation with trace metadata
2. Registry resolves adapter for requested model
3. EventBus emits llm.invocation_started
4. Adapter transforms to provider format
5. Provider API called with timeout
6. Response normalized to LLMResponse
7. Usage/cost computed from LLMPricing
8. EventBus emits llm.invocation_completed
9. Observability records CostRecord + MetricSample
10. Response returned to agent
```

### On Error:
```
1. LLMError created with retry guidance
2. If retryable → exponential backoff → retry
3. If max_retries exceeded and fallback_enabled → next model in fallback_chain
4. EventBus emits llm.retry_triggered / llm.fallback_triggered
5. If all exhausted → llm.invocation_failed emitted
```

## 9. Integration Points

| Module | Integration |
|---|---|
| **Orchestrator** | Passes LLMInvocation, receives LLMResponse |
| **Policy Engine** | Enforces cost limits, model restrictions, provider rules |
| **Selection Engine** | Uses model descriptors for capability matching |
| **Observability** | Records CostRecord, MetricSample, ExecutionError per invocation |
| **Artifact Store** | LLM outputs may become artifacts |
| **EventBus** | 12 event types for full lifecycle visibility |

## 10. Default Configuration

```typescript
{
  default_model: "google/gemini-2.5-flash",
  default_temperature: 0.7,
  default_max_tokens: 4096,
  default_timeout_ms: 30_000,
  max_retries: 3,
  retry_base_delay_ms: 1000,
  cost_tracking_enabled: true,
  fallback_enabled: true,
  fallback_chain: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
}
```

## 11. Event Taxonomy

| Event | When |
|---|---|
| `llm.invocation_started` | Invocation begins |
| `llm.invocation_completed` | Successful response |
| `llm.invocation_failed` | All retries/fallbacks exhausted |
| `llm.stream_started` | Streaming begins |
| `llm.stream_chunk` | Streaming chunk received |
| `llm.stream_completed` | Stream finished |
| `llm.stream_failed` | Stream error |
| `llm.fallback_triggered` | Falling back to next model |
| `llm.retry_triggered` | Retrying after error |
| `llm.model_selected` | Router selected a model |
| `llm.adapter_registered` | New adapter registered |
| `llm.adapter_unhealthy` | Adapter health check failed |

## 12. Roadmap Alignment

Completes **Phase 0.4** of the Agent OS Evolution Roadmap.

Kernel status:
- ✅ Runtime Protocol (v0.1)
- ✅ Capability Model (v0.2)
- ✅ Selection Engine (v0.2)
- ✅ Policy Engine (v0.1)
- ✅ Artifact Store (v0.2)
- ✅ Observability Layer (v0.3)
- ✅ LLM Adapter Layer (v0.4)

Next phase: **v0.5 — Tool Adapter Layer**.

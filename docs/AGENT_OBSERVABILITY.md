# Agent OS — Observability & Telemetry Layer (v0.3)

> Normative specification for runtime observability in Agent OS.

## 1. Design Rationale

The Observability Layer provides **full visibility** into every execution path of the Agent OS runtime. It answers critical operational questions:

| Question | Data Source |
|---|---|
| Which agent fails most? | `FailureMetrics.top_failing_agents` |
| Which capability costs most? | `CostMetrics.cost_by_agent` |
| Which stage is a bottleneck? | `StageMetrics.duration_ms` |
| Which run was most expensive? | `RunMetrics.total_cost_usd` |
| Which agent has the best real score? | `AgentMetrics.validation_score` |

### Principles

1. **Infrastructure-agnostic** — No vendor lock-in; adapters (`ITelemetrySink`) plug in later.
2. **Pure telemetry interface** — Contracts only; no database or HTTP dependencies.
3. **EventBus-native** — Consumes `ProtocolRuntimeEvent` and emits `ObservabilityEventType`.
4. **Causally ordered** — Trace entries carry monotonic sequence numbers.
5. **Cost-aware** — First-class cost tracking per run, stage, agent, model.

## 2. Module Structure

```
agent-os/
├── observability.ts   ← Contracts (this spec)
├── index.ts           ← Re-exports
└── (future)
    └── observability-impl.ts  ← In-memory reference implementation
```

## 3. Core Components

```
EventBus
  │
  ▼
TelemetryCollector ──► ExecutionTracer
  │                       │
  ├──► MetricsAggregator  │
  ├──► CostTracker        │
  ├──► ErrorTracker        │
  │                       │
  ▼                       ▼
ITelemetrySink[]     ExecutionTrace
```

### 3.1 TelemetryEvent

Canonical event emitted by the layer. Every observation is wrapped as a `TelemetryEvent` with:
- `category`: trace | metric | cost | error | lifecycle | policy | artifact
- `labels`: key-value pairs for filtering
- `dimensions`: run_id, stage, agent_id for slicing

### 3.2 ExecutionTrace

Full causal record of a run. Each `TraceEntry` has:
- `sequence`: monotonic counter for ordering
- `kind`: 20 discriminated entry types (run/stage/agent/tool/validation/policy/artifact/selection/retry/fallback/rollback)
- `parent_entry_id`: hierarchical nesting (stage contains agents, agents contain tools)
- `duration_ms`: wall-clock time

### 3.3 Metrics

Four-level metric model:
1. **MetricSample** — single observation (value + unit + dimensions)
2. **MetricAggregate** — statistical summary over a `MetricWindow`
3. **Domain metrics** — `RunMetrics`, `StageMetrics`, `AgentMetrics`, `CapabilityMetrics`, `ToolMetrics`
4. **MetricDimension** — slicing keys (run_id, stage, agent_id, capability_id, model)

Supported units: `ms`, `count`, `ratio`, `usd`, `tokens`, `bytes`, `percent`.

Aggregates include: count, sum, min, max, avg, p50, p95, p99.

### 3.4 Cost Tracking

`CostRecord` captures each billable operation:
- Categories: `llm_inference`, `tool_execution`, `embedding`, `storage`, `compute`, `external_api`
- Token breakdown: `prompt_tokens`, `completion_tokens`, `total_tokens`
- Model attribution

`CostMetrics` aggregates cost by category, stage, agent, and model.

### 3.5 Error & Failure Tracking

- `ExecutionError` — structured error with type, recovery status
- `FailureMetrics` — top failing agents/capabilities, recovery rate, MTTR
- `RetryMetrics` — retry counts by stage/agent, success rate
- `FallbackMetrics` — fallback depth, primary bypass rate

## 4. Telemetry Flow

```
1. ProtocolRuntimeEvent emitted via EventBus
2. TelemetryCollector receives event
3. ExecutionTracer appends TraceEntry (causally ordered)
4. MetricsAggregator updates MetricSample / MetricAggregate
5. CostTracker records CostRecord (if billable)
6. ErrorTracker records ExecutionError (if failure)
7. TelemetryEvent emitted to EventBus (telemetry.*)
8. ITelemetrySink[] exports to external systems
```

## 5. Integration Points

| Module | Integration |
|---|---|
| **EventBus** | Source of `ProtocolRuntimeEvent`; target for `ObservabilityEventType` |
| **Orchestrator** | Run lifecycle (start/end), stage transitions |
| **Selection Engine** | Routing decisions, fallback triggers |
| **Policy Engine** | Policy evaluations, blocks, overrides |
| **Artifact Store** | Artifact creation, versioning events |
| **Tool Adapter** | Tool invocation start/end/error |

## 6. IObservabilityLayer Interface

The core interface provides:

- **Tracing**: `startTrace()`, `addTraceEntry()`, `completeTrace()`, `getTrace()`
- **Metrics**: `recordSample()`, `getRunMetrics()`, `getStageMetrics()`, `aggregateMetrics()`
- **Cost**: `recordCost()`, `getRunCost()`, `getCostByPeriod()`
- **Errors**: `recordError()`, `getFailureMetrics()`, `getRetryMetrics()`, `getFallbackMetrics()`
- **Export**: `exportAll()`, `flush()`

## 7. Extension Points

| Extension | Mechanism |
|---|---|
| External exporters | `ITelemetrySink` adapter |
| Real-time dashboards | Stream `TelemetryEvent` via sink |
| Anomaly detection | Analyze `MetricAggregate` trends |
| Agent reliability scoring | Derive from `FailureMetrics` + `AgentMetrics` |
| Adaptive routing feedback | Feed `CapabilityMetrics` to Selection Engine |
| Cost optimization | Route based on `CostMetrics.cost_by_model` |

## 8. ObservabilityEventType Taxonomy

| Event | When |
|---|---|
| `telemetry.event_recorded` | Any telemetry observation stored |
| `telemetry.trace_started` | New run trace begins |
| `telemetry.trace_completed` | Run trace finishes |
| `telemetry.metric_recorded` | Metric sample recorded |
| `telemetry.cost_recorded` | Cost record added |
| `telemetry.error_recorded` | Error captured |
| `telemetry.export_completed` | Sink export succeeded |
| `telemetry.export_failed` | Sink export failed |
| `telemetry.sink_unhealthy` | Sink health check failed |

## 9. Default Configuration

```typescript
{
  tracing_enabled: true,
  metrics_enabled: true,
  cost_tracking_enabled: true,
  max_trace_entries: 10_000,
  default_window_seconds: 3600,
  sinks: [],
  sampling_rate: 1.0,
}
```

## 10. Roadmap Alignment

This module completes **Phase 0.3** of the Agent OS Evolution Roadmap.

The kernel now has:
- ✅ Runtime Protocol (v0.1)
- ✅ Capability Model (v0.2)
- ✅ Selection Engine (v0.2)
- ✅ Policy Engine (v0.1)
- ✅ Artifact Store (v0.2)
- ✅ Observability Layer (v0.3)

Next phase: **v0.4 — LLM Adapter Layer**.

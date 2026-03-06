# Agent Runtime Protocol — Design Document

> **Status:** Designed  
> **Author:** Design Agent (mode: architect)  
> **Scope:** Contract layer between Orchestrator ↔ Agents ↔ Tools ↔ Storage  
> **Implementation:** `supabase/functions/_shared/agent-os/protocol.ts`

---

## 1. Protocol Principles

### P1 — Contracts Are Data, Not Behavior
Every protocol entity is a pure TypeScript interface. No classes, no side effects, no imports beyond sibling types. This allows contracts to be serialized, validated, and transmitted across process boundaries (edge functions, workers, external services).

### P2 — Envelope Pattern
All inputs and outputs are wrapped in typed envelopes (`TaskEnvelope`, `ArtifactEnvelope`, `AgentResponse`). Envelopes carry metadata (trace, lineage, timestamps) alongside content. This separates transport concerns from domain logic.

### P3 — Append-Only Events
Every state transition emits a `ProtocolEvent`. Events are immutable and causally ordered via `causedBy`. This forms a complete audit trail and enables replay, debugging, and future learning.

### P4 — Explicit Failure Semantics
Failures are not exceptions — they are typed data. Every failure produces a `FailureReport` with a classified `FailureErrorType` and a deterministic `FailureAction`. The orchestrator never guesses what to do on failure.

### P5 — Lineage Everywhere
Every artifact carries `ArtifactLineage` (who produced it, in which stage, from which task, in which run). This enables dependency tracking, cache invalidation, and incremental re-execution.

### P6 — Adapter-Ready
The protocol defines *what* data flows, not *how* it's produced. LLM calls, tool invocations, and storage operations are behind adapter boundaries. Swapping providers requires zero protocol changes.

### P7 — Observability by Default
Every agent response includes `TraceMetadata` (model, tokens, cost, latency, cache hit). Every stage produces `StageTrace`. Every run produces `RunTrace`. Cost and performance tracking are structural, not optional.

---

## 2. Entity Map

```
RunContract              ← Initiates a pipeline run
 ├─ RunConfig            ← Policies, limits, feature flags
 │
 ├─ StageContract[]      ← One per stage executed
 │   ├─ AgentAssignment  ← Which agent, in which mode
 │   ├─ TaskEnvelope     ← Input sent to agent
 │   │   ├─ ArtifactEnvelope[]  ← Artifacts as input
 │   │   ├─ ToolDeclaration[]   ← Available tools
 │   │   └─ TraceContext        ← Correlation IDs
 │   │
 │   ├─ AgentResponse    ← Output from agent
 │   │   ├─ AgentDecision[]     ← Structured decisions
 │   │   ├─ ArtifactEnvelope[]  ← Produced artifacts
 │   │   ├─ ToolResult[]        ← Tool calls made
 │   │   ├─ AgentMetrics        ← Performance data
 │   │   └─ TraceMetadata       ← Cost/latency trace
 │   │
 │   ├─ ValidationReport ← Scoring + findings (validation stage only)
 │   └─ StageTrace       ← Aggregated stage metrics
 │
 ├─ ProtocolEvent[]      ← Append-only event log (24 event types)
 ├─ FailureReport[]      ← Classified failures with actions taken
 │
 └─ RunResult            ← Final output with RunTrace
```

---

## 3. Interfaces Summary

### Execution Contracts

| Interface | Purpose |
|-----------|---------|
| `RunContract` | Top-level run definition: goal, constraints, config |
| `RunConfig` | maxRollbacks, maxRetries, timeoutMs, policies, flags |
| `RunResult` | Final status, all artifacts, score, trace |
| `RunTrace` | Aggregated metrics: duration, tokens, cost, invocation counts |

### Stage Contracts

| Interface | Purpose |
|-----------|---------|
| `StageContract` | Stage input: assigned agents, input artifacts, attempt number |
| `StageResult` | Stage output: agent results, produced artifacts, validation |
| `StageTrace` | Per-stage metrics |
| `AgentAssignment` | Agent identity + mode for this stage |

### Agent IO Contracts

| Interface | Purpose |
|-----------|---------|
| `TaskEnvelope` | What the orchestrator sends to an agent |
| `AgentResponse` | What the agent returns: status, decisions, artifacts, confidence |
| `AgentDecision` | Structured decision with category, impact, reversibility |
| `AgentMetrics` | Duration, tokens (in/out), cost, retry count |

### Artifact Contracts

| Interface | Purpose |
|-----------|---------|
| `ArtifactEnvelope` | Content + kind + version + lineage + content hash |
| `ArtifactKind` | 14 artifact types (brief, plan, architecture, code, test, etc.) |
| `ArtifactLineage` | Provenance: who produced, in which stage/run/task |

### Tool Contracts

| Interface | Purpose |
|-----------|---------|
| `ToolDeclaration` | Available tool: name, description, input/output schemas |
| `ToolInvocation` | Tool call request from agent |
| `ToolResult` | Tool response: success/error/timeout + output + duration |

### Validation Contracts

| Interface | Purpose |
|-----------|---------|
| `ValidationReport` | Score, threshold, pass/fail, findings, suggestions |
| `ValidationFinding` | Per-dimension issue with severity and artifact reference |
| `ValidationSuggestion` | Actionable improvement targeting a specific stage/agent |

### Event Contracts

| Interface | Purpose |
|-----------|---------|
| `ProtocolEvent` | Event with type, timestamp, runId, payload, causal parent |
| `ProtocolEventType` | 24 event types across 6 lifecycles |

### Trace Contracts

| Interface | Purpose |
|-----------|---------|
| `TraceContext` | Correlation IDs passed into tasks |
| `TraceMetadata` | Per-invocation: model, provider, tokens, cost, cache hit |

### Failure Contracts

| Interface | Purpose |
|-----------|---------|
| `FailurePolicy` | Action, maxRetries, backoff, escalation |
| `FailureReport` | Classified failure with action taken and resolution state |
| `FailureAction` | 6 actions: retry, retry_other, block, rollback, skip, abort |
| `FailureErrorType` | 8 error types: agent, tool, timeout, validation, policy, resource, external |

---

## 4. Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    RunContract created                       │
│                    → emit "run.created"                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    PERCEPTION STAGE     │
              │ ┌─────────────────────┐ │
              │ │ TaskEnvelope issued │ │  → emit "agent.task_issued"
              │ │ Agent executes      │ │  → emit "agent.started"
              │ │ AgentResponse       │ │  → emit "agent.completed"
              │ │ Artifact: "brief"   │ │  → emit "artifact.created"
              │ └─────────────────────┘ │
              │ → emit "stage.completed"│
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │      DESIGN STAGE       │
              │ ┌─────────────────────┐ │
              │ │ Receives brief      │ │
              │ │ May invoke tools    │ │  → emit "tool.invoked" / "tool.completed"
              │ │ Produces arch+plan  │ │  → emit "artifact.created" (x2)
              │ │ Records decisions   │ │
              │ └─────────────────────┘ │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │      BUILD STAGE        │
              │ ┌─────────────────────┐ │
              │ │ Receives arch+plan  │ │
              │ │ Generates code      │ │  → emit "artifact.created" (xN)
              │ │ Generates tests     │ │
              │ └─────────────────────┘ │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   VALIDATION STAGE      │
              │ ┌─────────────────────┐ │
              │ │ Reviews all arts    │ │
              │ │ Scores 5 dimensions │ │
              │ │ ValidationReport    │ │
              │ └─────────────────────┘ │
              │                         │
              │  avg >= 0.75? ──YES──┐  │
              │       │              │  │
              │      NO              │  │
              │       │              │  │
              │  FailureReport       │  │
              │  action: "rollback"  │  │
              │  → back to DESIGN    │  │
              │  (attempt 2)         │  │
              │  → emit              │  │
              │  "stage.rolled_back" │  │
              └──────────┼───────────┘  │
                         │              │
                         │   ┌──────────▼───────────┐
                         │   │  EVOLUTION STAGE      │
                         │   │ ┌──────────────────┐  │
                         │   │ │ Extract learnings│  │
                         │   │ │ Write to memory  │  │  → emit "memory.written"
                         │   │ │ Produce feedback │  │
                         │   │ └──────────────────┘  │
                         │   └──────────┬────────────┘
                         │              │
                         │   ┌──────────▼──────────┐
                         └──►│   RUN COMPLETED      │
                             │ RunResult + RunTrace │
                             │ → emit "run.completed│
                             └─────────────────────┘
```

---

## 5. Edge Cases

### 5.1 — No Agents Available
```
Error: FailureErrorType = "no_agents_available"
Action: abort (no fallback possible)
Event: "run.failed"
```

### 5.2 — Agent Timeout
```
Error: FailureErrorType = "timeout"
Action: retry (up to maxRetries), then escalate to "skip" or "abort"
TraceMetadata.durationMs captures the timeout duration
```

### 5.3 — Validation Rollback Loop
```
validation fails → rollback to design → design re-executes →
build re-executes → validation fails again →
rollback count incremented → if rollbackCount > maxRollbacks → abort
Prevents infinite loops via RunConfig.maxRollbacks (default: 3)
```

### 5.4 — Tool Call Failure Mid-Agent
```
ToolResult.status = "error" or "timeout"
Agent decides: retry tool, use fallback, or return failed AgentResponse
Orchestrator sees AgentResponse.status and applies FailurePolicy
```

### 5.5 — Artifact Schema Mismatch
```
ArtifactEnvelope.schemaRef allows downstream consumers to validate content shape.
If content doesn't match expected schema → FailureErrorType = "validation_error"
Future: JSON Schema validation adapter at artifact intake
```

### 5.6 — Cost Budget Exceeded
```
FailureErrorType = "resource_exhausted"
RunConfig could include maxCostUsd / maxTokens (future extension)
Orchestrator checks RunTrace totals after each agent response
```

### 5.7 — Partial Stage Success
```
Stage has 2 agents assigned. Agent A succeeds, Agent B fails.
StageResult.status = "failed" (any failure = stage failure)
But Agent A's artifacts are preserved in state
FailurePolicy determines if retry_other, skip, or rollback
```

---

## 6. Future Extension Points

### 6.1 — LLM Adapter Interface
```typescript
interface LLMAdapter {
  id: string;
  provider: string;
  invoke(prompt: string, options: LLMOptions): Promise<LLMResult>;
}
```
Agents call LLMs through adapters. The protocol doesn't know which model or provider is used — `TraceMetadata.model` and `.provider` record it for observability.

### 6.2 — Tool Adapter Interface
```typescript
interface ToolAdapter {
  toolId: string;
  name: string;
  schema: ToolDeclaration;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}
```
Tools are registered in the orchestrator. Agents request tool invocations via `ToolInvocation`. The orchestrator resolves and returns `ToolResult`.

### 6.3 — Persistent Memory Adapter
```typescript
interface MemoryAdapter extends IMemory {
  persist(runId: string): Promise<void>;
  restore(runId: string): Promise<void>;
  search(query: string, limit: number): Promise<MemoryEntry[]>;
}
```
Current `RuntimeMemory` is in-process. Future adapters back it with `agent_memory` table or vector store for semantic search.

### 6.4 — Event Sink Adapter
```typescript
interface EventSinkAdapter {
  flush(events: ProtocolEvent[]): Promise<void>;
}
```
Events are currently in-memory. Future sinks: `pipeline_logs` table, external observability (Datadog, OpenTelemetry), webhook notifications.

### 6.5 — Artifact Store Adapter
```typescript
interface ArtifactStoreAdapter {
  store(artifact: ArtifactEnvelope): Promise<string>; // returns URI
  retrieve(artifactId: string): Promise<ArtifactEnvelope>;
  findByKind(kind: ArtifactKind, runId: string): Promise<ArtifactEnvelope[]>;
}
```
Artifacts are currently in `RunState.artifacts[]`. Future adapters persist to `agent_outputs` / `story_subtasks` / object storage.

### 6.6 — Policy Engine
```typescript
interface PolicyEngine {
  evaluate(state: RunState, event: ProtocolEvent): PolicyDecision;
}
```
Current policies are static (`StagePolicy[]`). Future: dynamic policy evaluation based on run state, cost, time, and organizational rules (`pipeline_gate_permissions`).

### 6.7 — Scoring Adapter
```typescript
interface ScoringAdapter {
  score(artifacts: ArtifactEnvelope[], goal: string): Promise<ValidationScore>;
}
```
Current scoring is a placeholder heuristic. Future: LLM-based evaluation, deterministic rule checks, or hybrid scoring.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Pure interfaces over classes | Serializable, testable, cross-boundary |
| Envelope pattern | Separates metadata from content |
| 24 event types | Covers all lifecycle transitions without over-granularity |
| 6 failure actions | Exhaustive failure handling without ambiguity |
| Causal event ordering | Enables replay and root cause analysis |
| Content hash on artifacts | Enables incremental execution and deduplication |
| Confidence score on responses | Enables threshold-based automation |
| Decisions as first-class data | Enables learning and audit trails |
| Schema references on artifacts | Enables future content validation |
| Adapter interfaces (future) | Protocol remains stable as infrastructure evolves |

---

*This protocol is the contract layer of the Agent OS. It defines what flows between components — not how components are implemented. Every adapter, agent, and tool must conform to these contracts.*

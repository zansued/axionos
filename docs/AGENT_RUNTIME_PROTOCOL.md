# Agent Runtime Protocol

> **Version:** 0.1.1  
> **Status:** Specification  
> **Scope:** Agent Operating System — Execution Contract Layer

---

## 1. Purpose

The Agent Runtime Protocol defines the communication and execution contract between the orchestration kernel and all AI agents operating inside the Agent OS.

Its purpose is to ensure that:

- Agents operate within a predictable structure
- Artifacts are traceable and versioned
- Execution is observable and auditable
- Failures are handled deterministically
- The system can evolve without breaking compatibility

The protocol defines **execution semantics**, not infrastructure.

It must remain independent from:

- Database technologies
- Message queues
- LLM providers
- Tool implementations

---

## 2. Design Principles

### 2.1 Deterministic Orchestration

The orchestrator is the only authority that controls execution flow.  
Agents never self-advance stages.

### 2.2 Structured Communication

Agents must exchange information using strictly defined envelopes.  
Free text responses are forbidden at the protocol layer.

### 2.3 Artifact Lineage

All outputs must be wrapped in artifacts with lineage metadata.  
Every artifact must answer:

- Who created it
- When
- In which stage
- From which parent artifact

### 2.4 Observability First

All relevant runtime actions must emit events.  
Events must allow reconstruction of the entire run.

### 2.5 Agent Replaceability

Any agent must be replaceable without changing the runtime.

This requires:

- Strict contracts
- Tool abstraction
- Context isolation

### 2.6 Controlled Failure

Failure is expected and must be handled explicitly through:

- Retry
- Block
- Rollback

---

## 2.7 Type Boundary Rule

The protocol enforces a strict boundary between two type files:

| File | Scope | Rule |
|------|-------|------|
| `protocol.ts` | Contracts that cross boundaries (orchestrator ↔ agent ↔ tool ↔ storage) | If a type is exchanged between two runtime participants → `protocol.ts` |
| `types.ts` | Internal domain abstractions and kernel semantics | If a type is used only inside a single module → `types.ts` |

**Violation detection:** If a type from `types.ts` appears in a serialized payload or crosses a function boundary, it must be promoted to `protocol.ts`.

### 2.8 Naming Convention

All protocol contracts use `snake_case` for field names. This applies to:

- Spec documents
- TypeScript interfaces
- Emitted event payloads
- Adapter implementations
- Test fixtures

**Rationale:** Consistency with persistence layer (database columns), event logs, and external API surfaces. Inconsistent naming breaks automated parsing, observability tooling, and code generation.

---

## 3. System Context

Agent OS executes cognitive workflows across five stages:

```
Perception → Design → Build → Validation → Evolution
```

The orchestrator manages stage transitions based on policies.  
Validation may trigger rollback.

---

## 4. Core Entities

The protocol defines the following core entities:

| Entity | Purpose |
|--------|---------|
| `Run` | Complete execution lifecycle for a goal |
| `StageExecution` | An attempt to complete a stage |
| `AgentTask` | Invocation request sent to an agent |
| `AgentResponse` | Structured output from an agent |
| `ArtifactEnvelope` | Versioned output with lineage |
| `ToolInvocation` | Tool call request from an agent |
| `ToolExecutionResult` | Tool response |
| `ValidationReport` | Quality scoring report |
| `ProtocolRuntimeEvent` | Observable state transition |
| `TraceMetadata` | Correlation and causation links |
| `MemoryEntry` | Context stored across execution |

---

## 5. Run Contract

A Run represents a complete execution lifecycle for a goal.

```
Run {
  run_id: string
  goal: string
  status: "queued" | "running" | "completed" | "failed" | "blocked"

  current_stage:
    "perception" | "design" | "build" | "validation" | "evolution" | "done"

  started_at: timestamp
  updated_at: timestamp
  completed_at?: timestamp

  rollback_count: number

  metadata?: Record<string, unknown>
}
```

**Responsibilities:**
- Identify execution
- Group artifacts and events
- Track lifecycle state

---

## 6. Stage Execution Contract

Each stage execution represents an attempt to complete a stage.

```
StageExecution {
  run_id: string

  stage_name:
    "perception" | "design" | "build" | "validation" | "evolution"

  attempt: number

  status: "queued" | "running" | "completed" | "failed" | "blocked"

  started_at: timestamp
  completed_at?: timestamp

  input_artifact_ids: string[]
  output_artifact_ids: string[]

  assigned_agent_ids: string[]
}
```

---

## 7. Agent Task Contract

An AgentTask is the invocation request sent by the orchestrator.

```
AgentTask {
  task_id: string
  run_id: string
  stage: string

  agent_id: string
  agent_type: "perception" | "design" | "build" | "validation" | "evolution"
  mode: string

  goal: string
  instructions: string

  context: {
    memory_snapshot?: Record<string, unknown>
    input_artifacts?: ArtifactEnvelope[]
    previous_stage_outputs?: ArtifactEnvelope[]
    constraints?: string[]
    assumptions?: string[]
  }

  tool_access?: ToolCapability[]

  expected_outputs: ExpectedOutputSpec[]

  trace: TraceMetadata

  timeout_ms?: number
}
```

**Purpose:**
- Describe the work required
- Provide context
- Define expected outputs

---

## 8. Agent Response Contract

The response produced by an agent.

```
AgentResponse {
  task_id: string
  run_id: string
  agent_id: string

  status: "completed" | "failed" | "blocked"

  summary: string
  reasoning_digest?: string

  confidence: number

  produced_artifacts?: ArtifactEnvelope[]
  tool_calls?: ToolExecutionResult[]

  recommendations?: string[]
  warnings?: string[]

  metrics?: {
    latency_ms?: number
    tokens_in?: number
    tokens_out?: number
    cost_usd?: number
  }

  next_suggestions?: {
    suggested_stage?: string
    retry_recommended?: boolean
    escalation_recommended?: boolean
  }
}
```

**Important:** The protocol stores reasoning summaries, not raw chain-of-thought.

### 8.1 Confidence Score Definition

| Property | Value |
|----------|-------|
| **Field** | `confidence` |
| **Type** | `number` |
| **Scale** | `0.0` to `1.0` (standardized) |
| **Definition** | Degree of confidence the agent has in the **sufficiency** of the response it produced |

**Interpretation guide:**

| Range | Meaning |
|-------|---------|
| `0.0 – 0.3` | No confidence. Output is speculative |
| `0.3 – 0.5` | Low confidence. Key assumptions unverified |
| `0.5 – 0.7` | Moderate confidence. Some uncertainties remain |
| `0.7 – 0.9` | High confidence. Minor uncertainties only |
| `0.9 – 1.0` | Full confidence. All constraints satisfied |

**Rules:**

1. Confidence does **NOT** substitute external validation.
2. Confidence must **never** be used as the sole criterion for stage approval.
3. Confidence **may** be used as an auxiliary signal for:
   - Retry decisions
   - Escalation triggers
   - Learning / prompt optimization
4. Agents that consistently over-report confidence should be flagged by the Evolution stage (calibration drift detection).

---

## 9. Artifact Envelope

All outputs must be wrapped in artifact envelopes.

```
ArtifactEnvelope {
  artifact_id: string
  run_id: string
  stage: string

  kind:
    "brief" | "analysis" | "plan" | "architecture" | "code"
    | "workflow" | "report" | "feedback" | "spec"

  title: string
  version: number
  content: unknown
  schema_version: string

  created_by: {
    agent_id: string
    agent_type: string
  }

  created_at: timestamp

  lineage?: {
    parent_artifact_ids?: string[]
    derived_from_stage?: string
  }

  quality?: {
    validation_score?: number
    approved?: boolean
  }

  content_hash?: string

  tags?: string[]
}
```

Artifacts allow the system to reconstruct intellectual lineage.

### 9.1 Content Hash Specification

| Property | Value |
|----------|-------|
| **Field** | `content_hash` |
| **Algorithm** | SHA-256 |
| **Format** | Lowercase hex string (64 characters) |

**Canonicalization rules:**

1. Hash is computed over the `content` field **only** (not the envelope).
2. `content` is serialized using `JSON.stringify` with keys sorted alphabetically (stable serialization).
3. No whitespace (compact form).
4. Metadata, timestamps, version, tags, lineage, and quality are **excluded** from hash computation.
5. Result is a lowercase hex string.

**Rationale:** The envelope changes across versions (timestamps, version numbers, metadata). But the **content** may be semantically identical. Hashing only the canonicalized content enables:

- Deduplication across runs
- Incremental execution (skip unchanged artifacts)
- Cache invalidation
- Semantic equality checks

**Identity rule:** Two artifacts with identical `content_hash` have semantically identical content, regardless of envelope differences.

---

## 10. Tool Protocol

Agents may request tools through the runtime.

### Tool Capability

```
ToolCapability {
  tool_name: string
  description: string
  input_schema?: object
  output_schema?: object
  permissions?: string[]
  default_timeout_ms?: number
}
```

### Tool Invocation

```
ToolInvocation {
  invocation_id: string
  task_id: string
  tool_name: string
  arguments: object
  requested_at: timestamp
  timeout_requested_ms?: number
}
```

### Tool Execution Result

```
ToolExecutionResult {
  invocation_id: string
  tool_name: string
  status: "completed" | "failed" | "timeout"
  output?: object
  error?: string
  started_at: timestamp
  completed_at?: timestamp
  timeout_effective_ms?: number
}
```

Agents declare intent to use tools. Execution occurs in the runtime layer.

### 10.1 Timeout Semantics

The protocol distinguishes between two timeout values:

| Field | Location | Meaning |
|-------|----------|---------|
| `timeout_requested_ms` | `ToolInvocation` | What the agent requested |
| `timeout_effective_ms` | `ToolExecutionResult` | What the runtime actually enforced |

**Why the distinction matters:**

The runtime may adjust the effective timeout based on:
- Global policy limits
- Queue depth / backpressure
- Tool-specific constraints
- Cost budgets

Recording both values enables diagnostic analysis: if `timeout_effective_ms < timeout_requested_ms`, the runtime throttled the agent. This is critical for debugging latency issues and tuning policies.

---

## 11. Validation Protocol

Validation ensures artifact quality before stage advancement.

### Validation Report

```
ValidationReport {
  run_id: string
  stage: "validation"
  validator_agent_id: string
  evaluated_artifact_ids: string[]

  dimensions: {
    completeness: number
    correctness: number
    consistency: number
    maintainability: number
    goal_alignment: number
  }

  average_score: number
  threshold: number
  decision: "pass" | "fail"

  issues: ValidationIssue[]
  recommendations: string[]
  created_at: timestamp
}
```

### Validation Issue

```
ValidationIssue {
  severity: "low" | "medium" | "high" | "critical"

  category:
    "logic" | "structure" | "scope" | "quality" | "goal-fit" | "technical"

  message: string
  affected_artifact_id?: string
  recommendation?: string
}
```

---

## 12. Memory Protocol

Memory stores context across execution.

```
MemoryEntry {
  key: string
  run_id: string
  scope: "run" | "stage" | "agent" | "global"
  value: unknown
  created_at: timestamp
  updated_at?: timestamp
}
```

Recommended scopes for initial implementation: `run`, `stage`.

---

## 13. Runtime Events

Events provide observability and debugging capabilities.

```
ProtocolRuntimeEvent {
  event_id: string
  run_id: string
  stage?: string
  agent_id?: string
  task_id?: string

  event_type: RuntimeEventType

  timestamp: timestamp
  payload: object
  trace: TraceMetadata
}
```

### 13.1 Event Taxonomy

| Event | Emitted When | Required Payload | Origin | State Machine Impact |
|-------|-------------|-----------------|--------|---------------------|
| `run.created` | Run is initialized | `{ run_id, goal }` | Orchestrator | Run → `running` |
| `stage.started` | Stage begins execution | `{ run_id, stage, attempt }` | Orchestrator | Stage → `running` |
| `task.created` | AgentTask is dispatched | `{ run_id, task_id, agent_id, stage }` | Orchestrator | — |
| `agent.started` | Agent begins processing | `{ run_id, task_id, agent_id }` | Orchestrator | — |
| `agent.completed` | Agent returns successfully | `{ run_id, task_id, agent_id, status, summary }` | Orchestrator | — |
| `agent.failed` | Agent throws or returns failed | `{ run_id, task_id, agent_id, error }` | Orchestrator | May trigger retry |
| `agent.retried` | Agent is re-dispatched after failure | `{ run_id, task_id, agent_id, attempt }` | Orchestrator | Retry counter incremented |
| `agent.blocked` | Agent cannot continue | `{ run_id, task_id, agent_id, reason }` | Agent/Orchestrator | May trigger block action |
| `tool.requested` | Agent requests a tool call | `{ run_id, task_id, invocation_id, tool_name }` | Agent | — |
| `tool.completed` | Tool returns successfully | `{ run_id, invocation_id, tool_name }` | Runtime | — |
| `tool.failed` | Tool returns error | `{ run_id, invocation_id, tool_name, error }` | Runtime | — |
| `tool.timeout` | Tool exceeds timeout | `{ run_id, invocation_id, tool_name, timeout_effective_ms }` | Runtime | — |
| `artifact.created` | New artifact is produced | `{ run_id, artifact_id, kind, stage, agent_id }` | Orchestrator | Artifact added to state |
| `validation.started` | Validation stage begins scoring | `{ run_id, evaluated_artifact_ids }` | Orchestrator | — |
| `validation.completed` | Validation report produced | `{ run_id, decision, average_score, threshold }` | Orchestrator | Pass → next stage; Fail → rollback |
| `rollback.triggered` | Validation fails, returning to earlier stage | `{ run_id, from_stage, to_stage, rollback_count }` | Orchestrator | Stage resets; rollback_count++ |
| `memory.written` | Memory entry created or updated | `{ run_id, key, scope }` | Agent/Runtime | — |
| `run.completed` | Run finishes successfully | `{ run_id, status, artifact_count, score }` | Orchestrator | Run → `completed` |
| `run.failed` | Run terminates with failure | `{ run_id, status, error, last_stage }` | Orchestrator | Run → `failed` |

**Ordering guarantee:** Within a single stage execution, events are emitted in this order:

```
stage.started
  → task.created
    → agent.started
      → tool.requested → tool.completed | tool.failed | tool.timeout
      → artifact.created (0..N)
    → agent.completed | agent.failed
    → agent.retried (if applicable)
  → validation.started → validation.completed (validation stage only)
  → rollback.triggered (if validation fails)
stage.completed
```

---

## 14. Trace Metadata

Trace metadata links related runtime actions.

```
TraceMetadata {
  correlation_id: string
  causation_id?: string
  parent_event_id?: string
}
```

These fields enable execution reconstruction.

---

## 15. Failure Semantics

Agent responses may return three execution states:

| Status | Meaning |
|--------|---------|
| `completed` | Agent finished execution successfully |
| `failed` | Execution attempted but unsuccessful. Retry may occur |
| `blocked` | Execution cannot continue due to external dependency (missing input, unavailable tool, permission error) |

### 15.1 Failure Actions

| Action | Behavior |
|--------|----------|
| `retry` | Re-execute the **same** agent with the same input. Attempt counter incremented on the original task |
| `retry_other` | Dispatch to a **different** agent (see §15.2) |
| `block` | Pause execution. Emit `agent.blocked`. Wait for external resolution |
| `rollback` | Return to a previous stage (typically validation → design) |
| `skip` | Skip this agent, continue with remaining agents in the stage |
| `abort` | Terminate the entire run |

### 15.2 retry_other Rules

When the runtime decides to use `retry_other`:

| Rule | Constraint |
|------|-----------|
| Agent type | Must be the **same** `agent_type` as the failed agent |
| Mode | **May** change (runtime decides based on failure context) |
| Model/provider | **May** change |
| Task identity | Creates a **new task** (`new_task_id`) with lineage to the original |
| Original task | Marked as `"failed"` — never overwritten |
| Attempt counter | Does **not** increment `attempt` on the original task |
| Selection criteria | Runtime selects next agent by priority from the registry |

**When to use `retry_other`:**
- The failure is agent-specific (e.g., model hallucination, capability mismatch)
- The same task could succeed with a different agent/model combination
- The failure is NOT input-related (input problems require rollback, not retry)

---

## 16. Retry Policy

```
RetryPolicy {
  max_retries_per_task: number
  retry_on_status: ("failed" | "blocked")[]
  backoff_strategy: "none" | "linear" | "exponential"
  backoff_base_ms?: number
  escalation_after_retries?: boolean
  escalation_action?: FailureAction
}
```

---

## 17. Rollback Policy

Rollback is triggered when validation fails.

```
RollbackPolicy {
  from_stage: "validation"
  to_stage: "design"
  condition: "average_score_below_threshold"
  max_rollbacks: number
}
```

Rollback prevents infinite loops through `max_rollbacks`.

---

## 18. Execution Flow

```
1.  Run created                          → emit run.created
2.  Stage "perception" started           → emit stage.started
3.  AgentTask generated                  → emit task.created
4.  Agent executes                       → emit agent.started
5.  Artifact produced                    → emit artifact.created
6.  Agent completes                      → emit agent.completed
7.  Stage completed                      → emit stage.completed
8.  Next stage triggered
9.  ...repeat for design, build...
10. Validation executed                  → emit validation.started
11. Score calculated                     → emit validation.completed
    - Pass → Evolution
    - Fail → Rollback to Design          → emit rollback.triggered
12. Evolution stores improvements        → emit memory.written
13. Run completed                        → emit run.completed
```

---

## 19. Extension Points

Future extensions may include:

- Persistent memory stores
- Distributed agent execution
- Tool marketplace
- Adaptive scoring engines
- Reinforcement learning feedback
- Multi-agent negotiation protocols
- LLM adapter interface
- Artifact store adapter
- Event sink adapter (OpenTelemetry, Datadog)
- Dynamic policy engine

---

## 20. Versioning

The protocol follows semantic versioning: `MAJOR.MINOR.PATCH`

| Level | Trigger |
|-------|---------|
| Major | Breaking contract changes |
| Minor | New optional fields or entities |
| Patch | Clarifications and documentation fixes |

**Current version:** `0.1.1`

**Changelog:**

| Version | Changes |
|---------|---------|
| `0.1.0` | Initial protocol specification |
| `0.1.1` | Added: confidence score definition (§8.1), content_hash specification (§9.1), timeout semantics (§10.1), event taxonomy table (§13.1), retry_other rules (§15.2), type boundary rule (§2.7), naming convention (§2.8) |

---

## Final Note

The Agent Runtime Protocol transforms the Agent OS from a **prompt pipeline** into a **cognitive operating system**.

The difference is subtle but profound.

One executes tasks.  
The other orchestrates reasoning systems.

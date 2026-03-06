# Agent Runtime Protocol

> **Version:** 0.1  
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
| `RuntimeEvent` | Observable state transition |
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

  tags?: string[]
}
```

Artifacts allow the system to reconstruct intellectual lineage.

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
}
```

### Tool Execution Result

```
ToolExecutionResult {
  invocation_id: string
  tool_name: string
  status: "completed" | "failed"
  output?: object
  error?: string
  started_at: timestamp
  completed_at?: timestamp
}
```

Agents declare intent to use tools. Execution occurs in the runtime layer.

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
RuntimeEvent {
  event_id: string
  run_id: string
  stage?: string
  agent_id?: string

  event_type:
    "run.created" | "stage.started" | "stage.completed"
    | "task.created" | "agent.started" | "agent.completed" | "agent.failed"
    | "tool.requested" | "tool.completed"
    | "artifact.created" | "validation.completed"
    | "rollback.triggered" | "run.completed" | "run.failed"

  timestamp: timestamp
  payload: object
  trace: TraceMetadata
}
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

---

## 16. Retry Policy

```
RetryPolicy {
  max_retries_per_task: number
  retry_on_status: ("failed" | "blocked")[]
  backoff_strategy: "none" | "linear" | "exponential"
  escalation_after_retries?: boolean
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
1.  Run created
2.  Stage "perception" started
3.  AgentTask generated
4.  Agent executes
5.  Artifact produced
6.  Event emitted
7.  Stage completed
8.  Next stage triggered
9.  ...repeat for design, build...
10. Validation executed
11. Score calculated
    - Pass → Evolution
    - Fail → Rollback to Design
12. Evolution stores improvements
13. Run completed
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

---

## 20. Versioning

The protocol follows semantic versioning: `MAJOR.MINOR.PATCH`

| Level | Trigger |
|-------|---------|
| Major | Breaking contract changes |
| Minor | New optional fields or entities |
| Patch | Clarifications and documentation fixes |

---

## Final Note

The Agent Runtime Protocol transforms the Agent OS from a **prompt pipeline** into a **cognitive operating system**.

The difference is subtle but profound.

One executes tasks.  
The other orchestrates reasoning systems.

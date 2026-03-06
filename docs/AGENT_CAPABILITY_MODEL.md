# Agent Capability Model

> **Version:** 0.1  
> **Status:** Specification  
> **Scope:** Agent Operating System — Capability Declaration, Matching and Evolution  
> **Depends on:** Agent Runtime Protocol v0.1.1

---

## 1. Purpose

The Agent Capability Model defines how agents **declare**, **expose**, and **evolve** their capabilities inside the Agent OS.

It solves a fundamental problem: **how does the orchestrator know which agent to assign to a task?**

Without a formal capability model, agent selection degenerates into:
- Hardcoded mappings (fragile)
- Name-based matching (ambiguous)
- Type-only routing (insufficient granularity)

The Capability Model replaces these with a structured, observable, and evolvable contract.

---

## 2. Design Rationale

### 2.1 Identity ≠ Capability

An agent's **identity** (id, name, type) is separate from its **capabilities** (what it can do).

This separation enables:

| Benefit | How |
|---------|-----|
| Hot-swapping | Replace an agent without changing task definitions |
| Multi-capability agents | One agent declares multiple skills |
| Capability-based routing | Match task requirements to agent skills, not names |
| Performance tracking | Track performance per capability, not per identity |
| Evolution | Capabilities evolve independently of agent code |

### 2.2 Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│  Layer 1: DECLARATION                    │
│  What agents CAN do                      │
│  (CapabilityDeclaration, AgentProfile)   │
├─────────────────────────────────────────┤
│  Layer 2: MATCHING                       │
│  What tasks NEED vs what agents OFFER    │
│  (CapabilityRequirement, MatchResult)    │
├─────────────────────────────────────────┤
│  Layer 3: TRACKING                       │
│  How well agents PERFORM each capability │
│  (PerformanceRecord, EvolutionEvent)     │
└─────────────────────────────────────────┘
```

### 2.3 Alignment with Runtime Protocol

The Capability Model integrates with the Runtime Protocol at these points:

| Protocol Entity | Capability Model Integration |
|----------------|------------------------------|
| `AgentTask` | Carries `CapabilityRequirement[]` defining what the task needs |
| `AgentResponse` | `confidence` is tracked per capability |
| `ValidationReport` | `validation_score` feeds capability performance |
| `RetryPolicy` | `retry_other` uses capability matching to find substitutes |
| `ProtocolRuntimeEvent` | Capability events extend the event taxonomy |

---

## 3. Formal Model

### 3.1 Capability Declaration

A capability is a discrete, named skill that an agent can perform.

```
CapabilityDeclaration {
  capability_id: string         // e.g. "code_generation"
  name: string                  // e.g. "Code Generation"
  description: string
  version: string               // semver

  valid_for_types: AgentType[]  // which agent types may declare this
  valid_modes: AgentMode[]      // which modes activate this
  valid_stages: StageName[]     // which stages it's relevant in

  input_requirements: [{
    name: string
    description: string
    required: boolean
    artifact_kind?: string
  }]

  output_guarantees: [{
    name: string
    description: string
    artifact_kind?: string
    guaranteed: boolean
  }]

  constraints?: [{
    key: string
    description: string
    type: "max_tokens" | "max_cost_usd" | "max_latency_ms" | "requires_tool" | "custom"
    value: unknown
  }]

  tags?: string[]
}
```

### 3.2 Agent Profile

An AgentProfile binds an agent identity to its capabilities.

```
AgentProfile {
  agent_id: string
  agent_name: string
  agent_type: AgentType

  supported_modes: AgentMode[]

  capabilities: [{
    capability_id: string
    priority: number
    confidence_floor?: number
    constraint_overrides?: CapabilityConstraint[]
    enabled: boolean
  }]

  priority: number
  status: "active" | "inactive" | "degraded"
  profile_version: number

  provider?: string
  model?: string
  max_concurrency?: number
  cost_tier?: "low" | "medium" | "high"
}
```

### 3.3 Capability Requirement

What a task needs. Defined by the orchestrator when creating an `AgentTask`.

```
CapabilityRequirement {
  capability_id: string
  priority: "required" | "preferred" | "optional"
  min_performance_score?: number
  max_cost_usd?: number
  max_latency_ms?: number
  required_mode?: AgentMode
}
```

---

## 4. Matching Logic

### 4.1 Match Algorithm

Given a list of `CapabilityRequirement[]` and a set of `AgentProfile[]`:

```
FOR each agent_profile:
  match_score = 0
  unmatched = []

  FOR each requirement:
    binding = agent_profile.capabilities.find(c =>
      c.capability_id == requirement.capability_id
      && c.enabled == true
    )

    IF binding exists:
      check constraint satisfaction
      check performance history (if min_performance_score set)
      check cost/latency bounds
      IF all checks pass:
        match_score += weight(requirement.priority)
      ELSE:
        IF requirement.priority == "required":
          fully_qualified = false
    ELSE:
      IF requirement.priority == "required":
        fully_qualified = false
      unmatched.push(requirement.capability_id)

  RETURN CapabilityMatchResult {
    agent_id, match_score, matches, unmatched, fully_qualified
  }
```

### 4.2 Priority Weights

| Requirement Priority | Weight |
|---------------------|--------|
| `required` | 1.0 |
| `preferred` | 0.6 |
| `optional` | 0.2 |

### 4.3 Tie-Breaking

When multiple agents have the same `match_score`, the `SelectionPolicy` determines the tiebreaker:

```
SelectionPolicy {
  primary_sort: "match_score" | "performance" | "cost" | "priority" | "latency"
  secondary_sort?: (same options)
  require_full_qualification: boolean
  min_match_score: number
  max_agents: number
  prefer_proven: boolean     // prefer agents with recent successful history
}
```

---

## 5. Selection Flow

```
1. Orchestrator creates AgentTask with CapabilityRequirement[]

2. Router queries AgentRegistry for all profiles where:
   - agent_type matches stage policy
   - status == "active"

3. Router runs match algorithm against each profile
   → produces CapabilityMatchResult[]

4. Router filters by SelectionPolicy:
   - remove agents below min_match_score
   - if require_full_qualification: remove non-qualified
   - sort by primary_sort, then secondary_sort

5. Router selects top N agents (max_agents)

6. Orchestrator dispatches AgentTask to selected agent(s)

7. On completion: performance tracker updates CapabilityPerformanceRecord

8. On failure: fallback chain activates
   → next agent in FallbackChain.agent_sequence
   → if exhausted: execute exhaustion_action
```

---

## 6. Fallback & Substitution

### 6.1 Fallback Chain

```
FallbackChain {
  capability_id: string
  agent_sequence: string[]          // ordered agent IDs
  exhaustion_action: "abort" | "skip" | "block" | "degrade"
  allow_mode_change: boolean
  allow_provider_change: boolean
  max_total_cost_usd?: number
}
```

### 6.2 Degraded Capability

When no agent fully matches, the system may proceed with partial capability:

```
DegradedCapability {
  capability_id: string
  original_requirement: CapabilityRequirement
  actual_agent_id: string
  degradation_reason: string
  lost_guarantees: string[]
  confidence_penalty: number        // subtracted from agent's confidence
}
```

**Rule:** Degraded execution must emit a `capability.degraded` event and apply a confidence penalty. The validation stage must be informed of degradation.

---

## 7. Performance Tracking

### 7.1 Performance Record

```
CapabilityPerformanceRecord {
  agent_id: string
  capability_id: string

  total_invocations: number
  successful_invocations: number
  failed_invocations: number

  success_rate: number              // 0.0 - 1.0
  avg_confidence: number            // agent-reported
  avg_validation_score: number      // external validation
  avg_latency_ms: number
  avg_cost_usd: number

  performance_score: number         // composite (0.0 - 1.0)
  trend: "improving" | "stable" | "degrading"

  last_updated_at: timestamp
  window_size: number               // rolling window
}
```

### 7.2 Composite Score Formula

```
performance_score =
    success_rate        × 0.35
  + avg_confidence      × 0.15
  + avg_validation_score × 0.30
  + latency_factor      × 0.10
  + cost_factor         × 0.10
```

Where:
- `latency_factor = 1.0 - normalize(avg_latency_ms, max_acceptable_latency)`
- `cost_factor = 1.0 - normalize(avg_cost_usd, max_acceptable_cost)`

### 7.3 Trend Detection

| Condition | Trend |
|-----------|-------|
| Last 5 scores trending up > 5% | `improving` |
| Last 5 scores within ±5% | `stable` |
| Last 5 scores trending down > 5% | `degrading` |

**Action on `degrading`:** Evolution stage should flag the agent for review and potentially adjust its priority or confidence_floor.

---

## 8. Capability Evolution

### 8.1 Evolution Events

```
CapabilityEvolutionEvent {
  event_id: string
  capability_id: string
  agent_id?: string

  change_type:
    "capability_added" | "capability_removed"
    | "capability_version_bumped"
    | "binding_enabled" | "binding_disabled"
    | "constraint_added" | "constraint_removed"
    | "performance_threshold_changed"
    | "profile_upgraded"

  previous_value?: unknown
  new_value?: unknown
  reason: string
  occurred_at: timestamp
}
```

### 8.2 Versioning Rules

| What changes | Version impact |
|-------------|---------------|
| New optional output | `MINOR` bump |
| New required input | `MAJOR` bump |
| Constraint tightened | `MINOR` bump |
| Constraint loosened | `PATCH` bump |
| Output removed | `MAJOR` bump |

### 8.3 Capability Catalog

```
CapabilityCatalog {
  capabilities: CapabilityDeclaration[]
  version: string
  last_updated_at: timestamp
}
```

The catalog is the global registry of all declared capabilities. It is infrastructure-agnostic — could be in-memory, database, or file-based.

---

## 9. Examples

### 9.1 Capability Declaration

```typescript
const codeGeneration: CapabilityDeclaration = {
  capability_id: "code_generation",
  name: "Code Generation",
  description: "Generates source code files from specifications",
  version: "1.0.0",
  valid_for_types: ["build"],
  valid_modes: ["implement", "refactor"],
  valid_stages: ["build"],
  input_requirements: [
    { name: "architecture", description: "Architecture artifact", required: true, artifact_kind: "architecture" },
    { name: "plan", description: "Implementation plan", required: true, artifact_kind: "plan" },
  ],
  output_guarantees: [
    { name: "source_code", description: "Generated source files", artifact_kind: "code", guaranteed: true },
  ],
  constraints: [
    { key: "max_tokens", description: "Max tokens per file", type: "max_tokens", value: 8000 },
  ],
  tags: ["core", "build-phase"],
};
```

### 9.2 Agent Profile

```typescript
const kernelBuilder: AgentProfile = {
  agent_id: "agent-build-01",
  agent_name: "Kernel Builder",
  agent_type: "build",
  supported_modes: ["implement", "refactor"],
  capabilities: [
    { capability_id: "code_generation", priority: 90, confidence_floor: 0.7, enabled: true },
    { capability_id: "test_generation", priority: 60, enabled: true },
  ],
  priority: 80,
  status: "active",
  profile_version: 1,
  model: "google/gemini-2.5-flash",
  cost_tier: "medium",
};
```

### 9.3 Task Requirement → Match → Selection

```
Task requires:
  - code_generation (required, min_performance: 0.7)
  - test_generation (preferred)
  - documentation (optional)

Available agents:
  Agent A: code_generation ✓, test_generation ✓, documentation ✗
  Agent B: code_generation ✓, documentation ✓

Match results:
  Agent A: match_score = 1.0 + 0.6 = 1.6, fully_qualified = true
  Agent B: match_score = 1.0 + 0.2 = 1.2, fully_qualified = true

Selection (primary_sort: match_score):
  → Agent A selected
```

### 9.4 Fallback Scenario

```
Agent A fails on code_generation.

FallbackChain:
  agent_sequence: ["agent-build-01", "agent-build-02", "agent-build-03"]
  allow_mode_change: true
  exhaustion_action: "block"

→ Dispatch to agent-build-02
→ If agent-build-02 fails → dispatch to agent-build-03
→ If agent-build-03 fails → block execution, emit agent.blocked
```

---

## 10. Extension Points

| Extension | Description |
|-----------|-------------|
| Capability discovery | Agents self-declare capabilities at registration |
| Dynamic routing | Router adapts selection based on real-time performance |
| Cost-aware routing | Factor cost_tier into selection when budget is constrained |
| Capability marketplace | Shared capability catalog across organizations |
| Capability inheritance | Composite capabilities built from primitives |
| ML-based scoring | Replace heuristic performance_score with learned model |

---

## Final Note

The Capability Model transforms agent selection from a **static assignment** into an **informed, observable, and evolvable decision**.

The orchestrator doesn't ask "which agent should I use?"  
It asks "which agent best satisfies these capability requirements right now?"

That question contains time, performance, cost, and context.  
The answer gets better with every run.

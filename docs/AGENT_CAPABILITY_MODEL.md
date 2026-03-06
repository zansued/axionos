# Agent Capability Model

> **Version:** 0.2  
> **Status:** Specification  
> **Scope:** Agent Operating System — Capability Declaration, Matching, Scoring and Evolution  
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

| Benefit | How |
|---------|-----|
| Hot-swapping | Replace an agent without changing task definitions |
| Multi-capability agents | One agent declares multiple skills |
| Capability-based routing | Match task requirements to agent skills, not names |
| Performance tracking | Track performance per capability, not per identity |
| Evolution | Capabilities evolve independently of agent code |

### 2.2 Four-Layer Architecture

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
│  Layer 3: SCORECARD                      │
│  How well agents PERFORM each capability │
│  (Scorecard, ConfidenceDrift, Trend)     │
├─────────────────────────────────────────┤
│  Layer 4: LIFECYCLE                      │
│  How capabilities evolve, drift, retire  │
│  (EvolutionEvent, LifecycleTransition)   │
└─────────────────────────────────────────┘
```

### 2.3 Alignment with Runtime Protocol

| Protocol Entity | Capability Model Integration |
|----------------|------------------------------|
| `AgentTask` | Carries `CapabilityRequirement[]` defining what the task needs |
| `AgentResponse` | `confidence` is tracked per capability into the scorecard |
| `ValidationReport` | `validation_score` feeds scorecard and drift detection |
| `RetryPolicy` / `retry_other` | Uses capability matching to find substitutes |
| `ProtocolRuntimeEvent` | Capability events extend the event taxonomy |

---

## 3. Formal Model

### 3.1 Capability Declaration

```
CapabilityDeclaration {
  capability_id: string
  name: string
  description: string
  version: string                       // semver
  lifecycle: "draft" | "active" | "deprecated" | "retired"

  valid_for_types: AgentType[]
  valid_modes: AgentMode[]
  valid_stages: StageName[]

  input_requirements: CapabilityInputSpec[]
  output_guarantees: CapabilityOutputSpec[]
  constraints?: CapabilityConstraint[]
  tags?: string[]

  supersedes?: string                   // capability_id this replaces
  declared_at: timestamp
  updated_at: timestamp
}
```

### 3.2 Agent Identity vs Agent Profile

```
AgentIdentity {                        // WHO — stable, rarely changes
  agent_id: string
  agent_name: string
  agent_type: AgentType
  provider?: string
  model?: string
  created_at: timestamp
}

AgentProfile {                         // WHAT — changes over time
  agent_id: string
  agent_name: string
  agent_type: AgentType

  supported_modes: AgentMode[]
  capabilities: AgentCapabilityBinding[]

  priority: number
  status: "active" | "inactive" | "degraded"
  profile_version: number

  provider?: string
  model?: string
  max_concurrency?: number
  cost_tier?: "low" | "medium" | "high"

  routing_preferences?: RoutingPreferences
}
```

### 3.3 Capability Binding

```
AgentCapabilityBinding {
  capability_id: string
  priority: number
  confidence_floor?: number            // minimum confidence (guards under-reporting)
  confidence_ceiling?: number          // maximum confidence (guards over-reporting)
  constraint_overrides?: CapabilityConstraint[]
  enabled: boolean
  binding_status?: "active" | "suspended" | "probation"
}
```

### 3.4 Routing Preferences

Agent-declared preferences that influence (but don't override) routing:

```
RoutingPreferences {
  preferred_stages?: StageName[]
  preferred_modes?: AgentMode[]
  preferred_collaborators?: string[]   // agent_ids
  excluded_stages?: StageName[]
  max_load?: number
}
```

### 3.5 Capability Requirements

```
CapabilityRequirement {
  capability_id: string
  priority: "required" | "preferred" | "optional"
  min_performance_score?: number
  max_cost_usd?: number
  max_latency_ms?: number
  required_mode?: AgentMode
  min_confidence_floor?: number
  exclude_degrading?: boolean          // exclude agents with degrading trend
}
```

---

## 4. Matching Rules

### 4.1 Match Algorithm

```
FOR each agent_profile WHERE status == "active":
  match_score = 0
  unmatched = []
  fully_qualified = true

  FOR each requirement:
    binding = find capability binding WHERE:
      - capability_id matches
      - enabled == true
      - binding_status != "suspended"
      - capability lifecycle == "active" (or "deprecated" with grace period)

    IF binding exists:
      IF requirement has min_performance_score:
        scorecard = lookup(agent_id, capability_id)
        IF scorecard.performance_score < min_performance_score:
          IF requirement.priority == "required": fully_qualified = false
          CONTINUE

      IF requirement has exclude_degrading:
        IF scorecard.trend == "degrading":
          IF requirement.priority == "required": fully_qualified = false
          CONTINUE

      IF requirement has min_confidence_floor:
        IF binding.confidence_floor < min_confidence_floor:
          IF requirement.priority == "required": fully_qualified = false
          CONTINUE

      // Constraint checks (cost, latency bounds)
      IF constraints satisfied:
        match_score += weight(requirement.priority)
      ELSE:
        IF requirement.priority == "required": fully_qualified = false

    ELSE:
      unmatched.push(requirement.capability_id)
      IF requirement.priority == "required": fully_qualified = false

  // Factor routing preference alignment
  preference_alignment = compute_alignment(agent.routing_preferences, task.stage, task.mode)

  RETURN CapabilityMatchResult {
    agent_id, match_score, matches, unmatched,
    fully_qualified, preference_alignment, scorecard_summary
  }
```

### 4.2 Priority Weights

| Requirement Priority | Weight |
|---------------------|--------|
| `required` | 1.0 |
| `preferred` | 0.6 |
| `optional` | 0.2 |

### 4.3 Selection Policy

```
SelectionPolicy {
  primary_sort: "match_score" | "performance" | "cost" | "priority" | "latency" | "preference_alignment"
  secondary_sort?: (same options)
  require_full_qualification: boolean
  min_match_score: number
  max_agents: number
  prefer_proven: boolean
  exclude_probation?: boolean
  weight_routing_preferences?: number
}
```

---

## 5. Selection Flow

```
1. Orchestrator creates AgentTask with CapabilityRequirement[]
   → emit "task.created"

2. Router queries AgentRegistry for profiles WHERE:
   - agent_type matches stage policy
   - status == "active"
   - binding_status != "suspended"

3. Router runs match algorithm against each profile
   → produces CapabilityMatchResult[]
   → emit "capability.matched" or "capability.no_match"

4. Router filters by SelectionPolicy:
   - remove agents below min_match_score
   - if require_full_qualification: remove non-qualified
   - if exclude_probation: remove probation agents
   - sort by primary_sort, then secondary_sort
   - factor preference_alignment if weighted

5. Router selects top N agents (max_agents)
   → ties broken by agent.priority

6. Orchestrator dispatches AgentTask to selected agent(s)

7. On completion:
   - Scorecard updates (invocation counts, metrics)
   - Confidence drift detection runs
   - Trend recalculation
   → emit "capability.scorecard_updated"

8. On failure:
   - Fallback chain activates
   - Next agent in FallbackChain.agent_sequence
   → emit "capability.fallback_triggered"
   - If exhausted: execute exhaustion_action
```

---

## 6. Scorecard Semantics

### 6.1 Capability Scorecard

One scorecard exists per `(agent_id, capability_id)` pair.

```
CapabilityScorecard {
  agent_id: string
  capability_id: string

  // Volume
  total_invocations: number
  successful_invocations: number
  failed_invocations: number
  blocked_invocations: number

  // Rates
  success_rate: number                  // 0.0 - 1.0
  failure_rate: number

  // Quality
  avg_confidence: number                // agent-reported
  avg_validation_score: number          // external validation

  // Efficiency
  avg_latency_ms: number
  p95_latency_ms: number
  avg_cost_usd: number
  total_cost_usd: number
  avg_tokens: number

  // Composite
  performance_score: number             // weighted composite (0.0 - 1.0)

  // Trend
  trend: "improving" | "stable" | "degrading"
  trend_delta: number                   // % change over window

  // Confidence drift
  confidence_drift: ConfidenceDriftStatus

  // Temporal
  window_size: number
  first_invocation_at: timestamp
  last_invocation_at: timestamp
  last_updated_at: timestamp
}
```

### 6.2 Composite Score Formula

```
performance_score =
    success_rate        × 0.35
  + avg_confidence      × 0.15
  + avg_validation_score × 0.30
  + latency_factor      × 0.10
  + cost_factor         × 0.10
```

Where:
- `latency_factor = 1.0 - clamp(avg_latency_ms / max_acceptable_latency, 0, 1)`
- `cost_factor = 1.0 - clamp(avg_cost_usd / max_acceptable_cost, 0, 1)`

### 6.3 Trend Detection

| Condition | Trend | Delta |
|-----------|-------|-------|
| Last 5 scores trending up > 5% | `improving` | `+N%` |
| Last 5 scores within ±5% | `stable` | `~0%` |
| Last 5 scores trending down > 5% | `degrading` | `-N%` |

---

## 7. Confidence Drift Detection

### 7.1 Definition

Confidence drift occurs when an agent's self-reported `confidence` diverges from its actual `validation_score`.

```
drift_magnitude = |avg_confidence - avg_validation_score|
drift_direction = sign(avg_confidence - avg_validation_score)
```

### 7.2 Classification

| Severity | Drift Magnitude | Status |
|----------|----------------|--------|
| `none` | < 0.10 | `calibrated` |
| `mild` | 0.10 – 0.19 | direction-dependent |
| `significant` | 0.20 – 0.34 | direction-dependent |
| `severe` | ≥ 0.35 | direction-dependent |

### 7.3 Drift Types

| Status | Meaning | Risk |
|--------|---------|------|
| `calibrated` | confidence ≈ validation | None |
| `over_confident` | confidence >> validation | Dangerous: system trusts agent more than warranted |
| `under_confident` | confidence << validation | Wasteful: unnecessary retries and fallbacks |

### 7.4 Recommended Actions

| Severity | Over-confident | Under-confident |
|----------|---------------|-----------------|
| `mild` | `monitor` | `monitor` |
| `significant` | `adjust_confidence_floor` | `increase_priority` |
| `severe` | `reduce_priority` | `increase_priority` |
| Persistent (>10 runs) | `flag_for_evolution` | `flag_for_evolution` |

---

## 8. Edge Cases

### 8.1 No Agents Match Required Capability

```
Scenario: Task requires "schema_generation" but no active agent declares it.
Match result: fully_qualified = false for all agents.
Action: If require_full_qualification = true → capability.no_match event → abort or block.
If false → best partial match proceeds with DegradedCapability.
```

### 8.2 Agent on Probation

```
Scenario: Agent's scorecard shows degrading trend for 5+ consecutive runs.
Action: binding_status → "probation".
Effect: Excluded from routing if exclude_probation = true.
         Included but deprioritized otherwise.
Recovery: 3 consecutive successful runs → probation lifted.
```

### 8.3 Capability Deprecated Mid-Run

```
Scenario: A capability transitions to "deprecated" while a run is in progress.
Rule: Active runs continue using the capability until completion.
      New runs use the superseding capability if available.
      Grace period prevents immediate breakage.
```

### 8.4 Confidence Drift + retry_other

```
Scenario: Agent A fails with over_confident drift (confidence: 0.9, validation: 0.5).
Action: retry_other selects Agent B.
        Agent A's scorecard records the failure.
        Drift severity escalates.
        If severe: agent's priority is reduced for future routing.
```

### 8.5 All Agents in Fallback Chain Fail

```
Scenario: FallbackChain.agent_sequence exhausted.
Action: Execute exhaustion_action:
  - "abort" → run terminates
  - "skip" → stage proceeds without this capability
  - "block" → run pauses for external intervention
  - "degrade" → proceed with DegradedCapability (reduced guarantees)
```

### 8.6 Budget Exhaustion During Selection

```
Scenario: Task has max_cost_usd but only expensive agents remain.
Rule: Agents exceeding budget are filtered out during matching.
      If no agents remain: treat as "no agents match" (§8.1).
```

---

## 9. Capability Lifecycle

### 9.1 States

```
draft → active → deprecated → retired
  │                  ↑
  └──────────────────┘ (deprecation reversed)
  │
  └──→ retired (discarded without activation)
```

### 9.2 Transition Rules

| Transition | Trigger | Condition |
|-----------|---------|-----------|
| draft → active | Capability validated | At least one agent binds it |
| active → deprecated | Superseded or scheduled for removal | `supersedes` field set on replacement |
| deprecated → retired | Grace period expired | No active bindings remain |
| deprecated → active | Deprecation reversed | Explicit re-activation |
| draft → retired | Never activated | Discarded by design |

### 9.3 Evolution Events

```
CapabilityEvolutionEvent {
  event_id: string
  capability_id: string
  agent_id?: string

  change_type: CapabilityChangeType    // 18 change types
  previous_value?: unknown
  new_value?: unknown
  reason: string
  occurred_at: timestamp
  triggered_by: "system" | "evolution_agent" | "human" | "drift_detector"
}
```

---

## 10. Extension Points

| Extension | Description |
|-----------|-------------|
| Capability discovery | Agents self-declare capabilities at registration |
| Dynamic routing | Router adapts selection based on real-time scorecard |
| Cost-aware routing | Factor cost_tier into selection when budget is constrained |
| Capability marketplace | Shared capability catalog across organizations |
| Capability inheritance | Composite capabilities built from primitives |
| ML-based scoring | Replace heuristic performance_score with learned model |
| Drift auto-correction | Evolution agent adjusts confidence floors automatically |
| Cross-run learning | Scorecards persist across runs for long-term optimization |

---

## Final Note

The Capability Model transforms agent selection from a **static assignment** into an **informed, observable, and evolvable decision**.

The orchestrator doesn't ask "which agent should I use?"  
It asks "which agent best satisfies these capability requirements right now?"

That question contains time, performance, cost, and context.  
The answer gets better with every run.

# Agent Selection Engine — Specification v0.2

**Status:** Normative  
**Depends on:** Agent Runtime Protocol v0.1.1, Agent Capability Model v0.2  
**Module:** `supabase/functions/_shared/agent-os/selection.ts`

---

## 1. Purpose

The Agent Selection Engine is the component responsible for determining which agent should execute a specific task within the Agent OS.

It transforms:

```
AgentTask + CapabilityProfiles + Policies → SelectionDecision
```

The engine guarantees that:

- Only eligible agents are considered
- The choice is deterministic and explainable
- Multiple candidates can be ranked
- Fallback and retry_other are safe
- Decisions are auditable
- The system is extensible

---

## 2. Design Principles

### 2.1 Eligibility Before Ranking

No agent participates in ranking if it is not eligible.

Mandatory flow:

```
Eligibility → Ranking → Selection
```

### 2.2 Explainable Decisions

Every decision produces a `SelectionDecision` containing:

- Reason for the choice
- Candidates considered
- Candidates rejected
- Policies applied

### 2.3 Deterministic Routing

Given the same inputs, the system must produce the same decision.

This guarantees reproducibility and auditability.

### 2.4 Capability-Oriented Selection

Selection occurs by capability, not merely by agent_id.

An agent may possess multiple capabilities.

### 2.5 Policy-Aware Dispatch

Policies can influence:

- Eligibility
- Ranking
- Fallback
- Substitution

### 2.6 Safe Substitution

Fallback must preserve task semantics.

Substitutions must be recorded and limited.

---

## 3. System Context

The Selection Engine operates between:

```
Orchestrator
      ↓
Selection Engine
      ↓
Agent Execution
```

It consumes data from:

- `AgentTask`
- `AgentProfile` (capability profiles)
- `CapabilityScorecard`
- `RoutingPreferences`
- `FailurePolicy` / `RetryPolicy`
- `StagePolicy`
- Runtime context

---

## 4. Core Entities

| Entity | Purpose |
|--------|---------|
| `SelectionInput` | Everything the engine needs to decide |
| `EligibilityResult` | Hard-filter output (eligible vs ineligible) |
| `RankedCandidate` | Scored and sorted eligible agent |
| `SelectionDecision` | Final actionable output |
| `FallbackCandidate` | Next-best agent for substitution |
| `SelectionTrace` | Lightweight audit record |
| `SelectionPolicyModifier` | Runtime overrides |

---

## 5. Selection Input Contract

```typescript
SelectionInput {
  request_id: string
  task: AgentTask

  candidate_profiles: AgentProfile[]
  scorecards: CapabilityScorecard[]

  stage_policy?: string[]
  routing_preferences?: RoutingPreferences[]
  runtime_constraints?: RuntimeConstraint[]
  previous_attempts?: string[]
  fallback_chains?: FallbackChain[]
  policy: SelectionPolicy

  selection_context?: {
    stage: StageName
    mode?: AgentMode
    domain?: string
    complexity?: "low" | "medium" | "high" | "critical"
  }

  retry_context?: RetrySelectionContext
  requested_at: string
}
```

---

## 6. Eligibility Phase

The eligibility phase eliminates unviable candidates.

A candidate is considered ineligible if:

- The agent is `inactive`
- The capability does not support the stage
- The mode is not compatible
- Mandatory requirements are not met
- A `hard` constraint is violated
- Policy blocks execution
- The agent is in `previous_attempts`

### 6.1 Eligibility Checks (ordered)

| # | Check | Condition |
|---|-------|-----------|
| 1 | `agent_status_check` | `agent.status == "active"` |
| 2 | `stage_support_check` | Capability's `valid_stages` includes request stage |
| 3 | `mode_support_check` | Agent supports required mode |
| 4 | `requirement_check` | All mandatory requirements satisfied |
| 5 | `constraint_check` | No hard constraint violated |
| 6 | `policy_check` | No policy blocks execution |
| 7 | `exclusion_check` | `agent_id ∉ previous_attempts` |
| 8 | `probation_check` | Not on probation (if policy excludes) |
| 9 | `routing_exclusion_check` | Stage not in agent's `excluded_stages` |

First failure short-circuits (remaining checks are skipped).

### 6.2 Degraded Agent Exception

Agents with status `"degraded"` MAY pass eligibility if:
- `SelectionEngineConfig.allow_degraded_fallback == true`, AND
- No `"active"` agents passed eligibility, AND
- A `FallbackChain` with `exhaustion_action: "degrade"` exists

---

## 7. Ranking Phase

After eligibility, candidates are ranked. Each candidate receives multiple dimension scores.

### 7.1 Ranked Candidate

```typescript
RankedCandidate {
  agent_id: string
  capability_id: string

  requirement_score: number   // 0.0 – 1.0
  context_score: number       // 0.0 – 1.0
  performance_score: number   // 0.0 – 1.0
  policy_score: number        // 0.0 – 1.0
  efficiency_score: number    // 0.0 – 1.0

  penalties: {
    confidence_drift_penalty: number
    instability_penalty: number
    fallback_overuse_penalty: number
    total: number
  }

  final_match_score: number      // weighted composite
  final_adjusted_score: number   // after penalties
}
```

---

## 8. Scoring Model

All scores range from `0.0` to `1.0`.

### 8.1 Requirement Score

Evaluates how well requirements are satisfied.

- All mandatory satisfied → `1.0`
- Optional satisfied → incremental bonus

### 8.2 Context Score

Evaluates alignment between capability and context.

Considers:
- Domain hints
- Complexity hints
- Artifact shape
- Language/tooling

### 8.3 Performance Score

Based on historical data:

- Success rate
- Average validation score
- Rollback rate
- Fallback rate

If no scorecard exists: `0.5` (neutral default) with `no_scorecard` penalty.

### 8.4 Policy Score

Considers system preferences:

- Stability
- Cost limits
- Latency targets
- Compliance requirements

### 8.5 Efficiency Score

Evaluates the ratio:

```
quality / (cost × latency)
```

---

## 9. Score Formula

### 9.1 Weighted Composite

```
final_match_score =
  (requirement_score  × 0.35) +
  (context_score      × 0.20) +
  (performance_score  × 0.20) +
  (policy_score       × 0.15) +
  (efficiency_score   × 0.10)
```

### 9.2 Penalties

Penalties are applied AFTER the weighted composite:

```
final_adjusted_score =
  final_match_score
  - confidence_drift_penalty
  - instability_penalty
  - fallback_overuse_penalty

final_adjusted_score = clamp(result, 0.0, 1.0)
```

### 9.3 Standard Penalty Values

| Penalty | Value | Condition |
|---------|-------|-----------|
| `confidence_drift_severe` | -0.15 | Drift severity "severe" + "over_confident" |
| `confidence_drift_significant` | -0.08 | Drift severity "significant" + "over_confident" |
| `confidence_drift_mild` | -0.03 | Drift severity "mild" |
| `trend_degrading` | -0.10 | Scorecard trend is "degrading" |
| `binding_probation` | -0.12 | Binding is on "probation" |
| `retry_same_provider` | -0.05 | In retry context, same provider as failed agent |
| `fallback_overuse` | -0.07 | Agent frequently used as fallback |
| `instability` | -0.09 | High variance in performance scores |
| `over_budget` | -0.20 | Estimated cost exceeds budget |
| `no_scorecard` | -0.04 | No performance data available |

---

## 10. Confidence Drift Handling

Confidence drift occurs when:

```
declared_confidence >> observed_validation_score
```

Penalty is applied if drift exceeds threshold.

Detection uses the thresholds from the Capability Model:
- `calibrated`: magnitude < 0.10
- `mild`: 0.10 ≤ magnitude < 0.20
- `significant`: 0.20 ≤ magnitude < 0.35
- `severe`: magnitude ≥ 0.35

---

## 11. Candidate Sorting

Candidates are ordered by:

```
final_adjusted_score DESC
```

### Tie-Breaking (ordered)

When `final_adjusted_score` is identical:

1. Lower `avg_cost_usd` wins
2. If still tied, lower `avg_latency_ms` wins
3. If still tied, higher historical stability (`success_rate`) wins
4. If still tied, lexicographically lower `agent_id` wins (determinism guarantee)

---

## 12. Selection Phase

After ranking, the system selects:

- **Primary candidate** (rank #1)
- **Shortlist** (ranks 2 through `max_shortlist_size + 1`)
- **Fallback candidates** (from shortlist + configured fallback chains)

### 12.1 Selection Decision

```typescript
SelectionDecision {
  decision_id: string
  task_id: string

  outcome: SelectionOutcome
  selected_agent_id?: string
  selected_capability_id?: string

  shortlisted_candidates: RankedCandidate[]
  rejected_candidates?: IneligibleAgent[]
  fallback_candidates: FallbackCandidate[]

  decision_reason: string
  applied_rules: string[]
  flags: SelectionFlag[]

  eligibility_summary: EligibilitySummary
  created_at: string
}
```

---

## 13. Fallback Candidates

Fallback candidates are selected from the next-best eligible candidates.

```typescript
FallbackCandidate {
  agent_id: string
  capability_id: string
  fallback_rank: number
  fallback_mode?: AgentMode
  expected_degradation?: string[]
  confidence_penalty: number
}
```

---

## 14. Retry Semantics

Retry occurs in three forms:

### 14.1 Retry Same Agent (`same_agent`)

The same agent is invoked again.

Used when:
- Transient failure
- Tool error
- Mild timeout

### 14.2 Retry Other Agent (`other_agent`)

A different compatible agent is selected.

Used when:
- Persistent error
- Low confidence
- Historical instability

Rules:
- Do not reuse the failed `agent_id`
- Prioritize same capability
- If none available, use same category
- Maintain same stage
- Respect constraints and policies
- Record substitution event

### 14.3 Retry Other Capability (`other_capability`)

A different capability is used entirely.

Used when:
- Capability underperforms in this context
- Policy requires diversification

---

## 15. retry_other Rules

When `retry_other` is triggered:

1. Do not reuse previous `agent_id`
2. Prioritize same `capability_id`
3. If unavailable, use same capability category
4. Maintain same stage
5. Respect constraints
6. Respect policies
7. Record substitution event
8. Apply `retry_same_provider` penalty if candidate shares provider

---

## 16. Event Integration

The Selection Engine emits events:

| Event | When Emitted | Key Payload |
|-------|-------------|-------------|
| `selection.started` | Engine receives input | `request_id`, `task_id`, `candidate_count` |
| `selection.eligibility_checked` | Eligibility phase done | `eligible_count`, `ineligible_count`, `rate` |
| `selection.ranking_completed` | Ranking phase done | `ranked_count`, `top_score`, `margin` |
| `selection.decision_made` | Decision finalized | `decision_id`, `outcome`, `selected_agent_id` |
| `selection.fallback_defined` | Fallback chain built | `fallback_count`, `agent_ids` |
| `selection.retry_other_dispatched` | retry_other initiated | `original_task_id`, `failed_agent_ids` |
| `selection.no_eligible_agents` | Zero eligible agents | `request_id`, `ineligibility_reasons` |
| `selection.degraded_mode` | Reduced guarantees | `lost_guarantees`, `confidence_penalty` |
| `selection.narrow_margin_warning` | Top-2 gap < threshold | `agent_1`, `agent_2`, `score_gap` |
| `selection.low_eligibility_warning` | Eligibility rate below threshold | `rate`, `threshold` |

---

## 17. Selection Trace

For audit, decisions generate a lightweight trace.

```typescript
SelectionTrace {
  task_id: string
  decision_id: string
  evaluated_candidates: number
  eligible_candidates: number
  ranking_algorithm_version: string
  applied_penalties?: string[]
  decision_latency_ms?: number
  outcome: SelectionOutcome
  selected_agent_id?: string
  created_at: string
}
```

---

## 18. Edge Cases

### 18.1 No Eligible Agents

System returns `outcome: "no_eligible_agents"`.
Orchestrator decides global fallback or abort.

### 18.2 Capability Without Scorecard

Permitted, but receives `no_scorecard` penalty (-0.04).
`performance_score` defaults to `0.5`.

### 18.3 Multiple Equal Scores

Resolved by tie-breaking order: cost → latency → stability → agent_id.

### 18.4 Experimental Capability

May receive penalty by policy. Flag `"experimental_capability"` is set.

### 18.5 High Confidence but Poor Validation

Apply confidence drift penalty based on severity.

### 18.6 Frequent Fallback

Agent with high fallback rate receives `fallback_overuse` penalty (-0.07).

### 18.7 Budget Constraints

Policies can limit agents above a certain cost. `over_budget` penalty (-0.20).

### 18.8 Single Candidate

Selection proceeds normally. Flag `"single_candidate"` is set.
`selection_confidence` is reduced by 0.15 (no comparison possible).

### 18.9 All Candidates Degrading

All candidates have `trend: "degrading"`. Flag `"all_degrading"` is set.
Selection still proceeds. Evolution agent should be notified.

---

## 19. Extension Points

### 19.1 Adaptive Routing

Learning-based routing using historical decision outcomes.

### 19.2 Bandit Algorithms

Controlled exploration of new agents (epsilon-greedy, UCB).

### 19.3 Domain-Aware Router

Specialized routing by domain (fintech, healthtech, etc.).

### 19.4 Cost-Aware Routing

Budget-oriented selection (maximize quality within cost envelope).

### 19.5 Quality-First Routing

Prioritize quality above cost and latency.

### 19.6 Multi-Agent Dispatch

Execute multiple agents in parallel on the same task. Future `selectMultiple()`.

### 19.7 Federated Agent Registries

Selection across local and external agent registries.

### 19.8 Custom Eligibility Rules

Adapters may extend `EligibilityCheck` with custom rules.

### 19.9 Custom Ranking Weights

`RankingWeights` can be configured per-stage or per-run.

### 19.10 External Signals

Future adapters may inject load balancing, quota, SLA pressure as additional signals.

### 19.11 Learning Integration

Evolution agent consumes `SelectionDecision` history to tune weights, penalties, and bindings.

---

## 20. Observability Goals

The system must allow answering questions like:

- Which capability is most used per stage?
- Which agent generates the highest average score?
- Which agent has the greatest drift?
- Which fallback occurs most frequently?
- Which agent has the best cost/quality ratio?
- What is the average decision latency?
- How often does retry_other get triggered?

---

## 21. Compatibility

### Forward Compatibility

New optional fields may be added without version bump.

### Backward Compatibility

Breaking changes require a new MAJOR version.

---

## 22. Versioning

This document follows semantic versioning: `MAJOR.MINOR.PATCH`

Current version: `0.2.0`

---

## 23. Relationship with Other Specs

This document depends on:

- **Agent Runtime Protocol** (protocol.ts) — defines execution contracts
- **Agent Capability Model** (capabilities.ts) — defines capability semantics

Together they form:

```
Execution Grammar     (Runtime Protocol)
        +
Capability Semantics  (Capability Model)
        +
Selection Logic       (Selection Engine)
        =
Agent OS Decision Core
```

---

## 24. Pipeline Architecture

```
SelectionInput
      │
      ▼
┌──────────────────┐
│    ELIGIBILITY    │  Hard filter: status, stage, mode, requirements,
│      FILTER       │  constraints, policies, exclusions
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    CAPABILITY     │  Match task requirements to agent capabilities
│     MATCHING      │  Produces CapabilityMatchResult per agent
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     RANKING       │  5-component scoring + penalties
│     ENGINE        │  Produces RankedCandidate[] (sorted)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    SELECTION      │  Pick winner, build shortlist, define fallbacks
│    DECISION       │  Produces SelectionDecision
└──────────────────┘
```

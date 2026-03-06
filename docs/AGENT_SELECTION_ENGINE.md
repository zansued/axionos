# Agent Selection Engine — Specification v0.1

**Status:** Normative  
**Depends on:** Agent Runtime Protocol v0.1.1, Agent Capability Model v0.2  
**Module:** `supabase/functions/_shared/agent-os/selection.ts`

---

## 1. Design Rationale

The Selection Engine is the decision-making core between task requirements and agent assignment. It answers the question: **"Given this task, which agent should execute it?"**

### Principles

1. **Separation of eligibility and ranking** — Eligibility is a hard filter (yes/no). Ranking is a soft score (how well). Mixing them leads to non-deterministic behavior.

2. **Deterministic decisions** — Given identical inputs (candidates, scorecards, policy, config), the engine MUST produce identical output. No randomness, no side effects.

3. **Explainable decisions** — Every decision carries a `SelectionRationale` with step-by-step trace, decisive factors, and rejected alternatives. This supports auditing, observability, and Evolution agent learning.

4. **Infrastructure-agnostic** — The engine operates as a pure function pipeline. It does not fetch data, call agents, or access infrastructure. All inputs are pre-fetched and passed in the `SelectionRequest`.

5. **Fallback as first-class** — Fallback and `retry_other` are not error paths — they are designed selection flows with their own semantics.

---

## 2. Pipeline Architecture

```
SelectionRequest
      │
      ▼
┌──────────────┐
│  ELIGIBILITY │  Hard filter: type, status, capabilities, exclusions
│    FILTER    │  Output: EligibilityResult (eligible + ineligible)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  CAPABILITY  │  Match task requirements to agent capabilities
│   MATCHING   │  Output: CapabilityMatchResult per agent
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   RANKING    │  Score and sort by composite formula
│    ENGINE    │  Output: RankingResult (ranked candidates)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  SELECTION   │  Pick winner, build shortlist and fallback chain
│   DECISION   │  Output: SelectionDecision
└──────────────┘
```

---

## 3. Eligibility Rules

Eligibility is evaluated in order. First failure short-circuits (remaining rules are not checked).

| # | Rule | Condition | Short-circuits |
|---|------|-----------|----------------|
| 1 | `type_match` | `agent.agent_type == request.required_agent_type` | Yes |
| 2 | `status_active` | `agent.status == "active"` | Yes |
| 3 | `not_excluded` | `agent.agent_id ∉ request.excluded_agent_ids` | Yes |
| 4 | `mode_support` | `request.required_mode ∈ agent.supported_modes` (if specified) | Yes |
| 5 | `required_capabilities` | Agent has active binding for every "required" capability | Yes |
| 6 | `no_suspended_bindings` | No required binding is "suspended" | Yes |
| 7 | `not_on_probation` | Agent has no binding on "probation" (if policy.exclude_probation) | Yes |
| 8 | `stage_not_excluded` | `request.stage ∉ agent.routing_preferences.excluded_stages` | Yes |
| 9 | `within_cost_tier` | Agent's cost_tier is affordable given budget constraints | Yes |

### Rule 2 Exception

Agents with status `"degraded"` MAY pass eligibility if:
- The `SelectionEngineConfig.allow_degraded_fallback` is `true`, AND
- No `"active"` agents passed eligibility, AND
- A `FallbackChain` with `exhaustion_action: "degrade"` exists

---

## 4. Ranking Formula

### Components (all normalized to 0.0–1.0)

| Component | Source | Default Weight |
|-----------|--------|---------------|
| `match_component` | `CapabilityMatchResult.match_score` | 0.30 |
| `performance_component` | `CapabilityScorecard.performance_score` | 0.25 |
| `cost_component` | `1 - normalize(avg_cost_usd)` | 0.15 |
| `latency_component` | `1 - normalize(avg_latency_ms)` | 0.15 |
| `preference_component` | Routing preference alignment | 0.10 |
| `priority_component` | Normalized agent priority | 0.05 |

### Normalization

Within each candidate pool, values are normalized using min-max scaling:

```
normalized(x) = (x - min) / (max - min)
```

If `max == min` (all candidates identical), the component defaults to `0.5`.

### Composite Score

```
raw_score = Σ(component_i × weight_i)
total_penalty = Σ(applicable_penalties)
final_score = clamp(raw_score - total_penalty, 0.0, 1.0)
```

### Penalties

| Penalty Type | Value | Condition |
|-------------|-------|-----------|
| `confidence_drift_severe` | -0.15 | Drift severity "severe" AND status "over_confident" |
| `confidence_drift_significant` | -0.08 | Drift severity "significant" AND status "over_confident" |
| `trend_degrading` | -0.10 | Scorecard trend is "degrading" |
| `binding_probation` | -0.12 | Any active binding is on "probation" |
| `retry_same_provider` | -0.05 | In retry_other context AND same provider as failed agent |
| `over_budget` | -0.20 | Estimated cost exceeds request.max_cost_usd |

### Tie-Breaking

When `final_score` is identical (floating-point equality):
1. Higher `agent.priority` wins
2. If still tied, lexicographically lower `agent_id` wins (determinism guarantee)

---

## 5. Selection Flow

### 5.1 Normal Selection

1. Run eligibility filter → `EligibilityResult`
2. If `eligible.length == 0` → outcome `"no_candidates"`, emit `selection.no_candidates`
3. Run capability matching on eligible agents → `CapabilityMatchResult[]`
4. Filter by `policy.min_match_score` → if none qualify → outcome `"no_qualified"`
5. If `policy.require_full_qualification` → exclude agents where `fully_qualified == false`
6. Run ranking → `RankingResult`
7. Select top-ranked → `SelectedAgent`
8. Build shortlist (ranks 2 through `max_shortlist_size + 1`)
9. Build fallback sequence from shortlist + configured fallback chains
10. Emit `selection.decided`

### 5.2 retry_other Selection

Triggered when the orchestrator invokes selection with `retry_context`:

1. All `retry_context.failed_agent_ids` are added to `excluded_agent_ids`
2. If `retry_context.allow_mode_change == false` → filter to same mode
3. If `retry_context.allow_provider_change == false` → filter to same provider
4. Apply `retry_same_provider` penalty if candidate shares provider with failed agent
5. Proceed with normal flow (steps 1-10 above)
6. Set flag `"retry_selection"`
7. Emit `selection.retry_other_triggered`

### 5.3 Fallback Activation

When a selected agent fails during execution:

1. Orchestrator calls selection engine with next fallback from `fallback_sequence`
2. If the fallback entry has a `fallback_mode`, use that mode
3. If the fallback has `expected_degradation`, outcome becomes `"degraded_selected"`
4. Apply `confidence_penalty` from `FallbackEntry`
5. Emit `selection.fallback_activated`

### 5.4 Degraded Selection

When no fully-capable agent exists but a partial match is available:

1. Reduce capability requirements to "required" only (drop "preferred" and "optional")
2. Re-run matching and ranking
3. Record lost guarantees in `DegradedCapability[]`
4. Outcome: `"degraded_selected"`
5. Set flag `"degraded_mode"`
6. Emit `selection.degraded_mode`

---

## 6. Scorecard Integration

The selection engine consumes `CapabilityScorecard` data but never writes to it. The scorecard lifecycle is:

```
Agent executes task
      │
      ▼
ValidationReport generated
      │
      ▼
Scorecard updated (by scorecard adapter, NOT by selection engine)
      │
      ▼
Next selection request includes updated scorecards
```

### Performance Component Calculation

If a scorecard exists for `(agent_id, capability_id)`:
```
performance_component = scorecard.performance_score
```

If no scorecard exists (new agent or new capability):
```
performance_component = 0.5 (neutral default)
```

Flag `"no_performance_data"` is set if NO candidate has scorecard data.

---

## 7. Edge Cases

### 7.1 Single Candidate
- Selection proceeds normally
- Flag `"single_candidate"` is set
- Shortlist and fallback sequence are empty
- `selection_confidence` is reduced by 0.15 (no comparison possible)

### 7.2 Narrow Margin
- When `ranked[0].final_score - ranked[1].final_score < narrow_margin_threshold` (default 0.05)
- Flag `"narrow_margin"` is set
- Both agents appear in decision trace as near-equivalent
- Orchestrator may use this flag to apply additional tiebreakers

### 7.3 All Candidates Degrading
- All candidates have `trend: "degrading"`
- Flag `"all_degrading"` is set
- Selection still proceeds (degrading ≠ ineligible)
- Evolution agent should be notified for systemic investigation

### 7.4 No Scorecards Available
- All `performance_component` values default to 0.5
- Ranking is dominated by `match_component` and `priority_component`
- Flag `"no_performance_data"` is set
- Common during cold-start

### 7.5 Budget Exhaustion
- All candidates exceed `max_cost_usd`
- `over_budget` penalty applied to all
- Cheapest agent still wins unless penalty pushes score to zero
- Flag `"budget_constrained"` is set

### 7.6 retry_other With Exhausted Pool
- All eligible agents are in `failed_agent_ids`
- Outcome: `"exhausted"`
- Fallback chain `exhaustion_action` determines next step:
  - `"abort"` → terminate run
  - `"block"` → pause and wait
  - `"skip"` → skip task
  - `"degrade"` → try degraded mode

---

## 8. Extension Points

### 8.1 Custom Eligibility Rules
Adapters may add custom eligibility rules by extending the `EligibilityRule` type and providing a custom `ISelectionEngine` implementation.

### 8.2 Custom Ranking Weights
`RankingWeights` can be configured per-stage or per-run via `SelectionEngineConfig`.

### 8.3 Custom Penalties
`STANDARD_PENALTIES` can be overridden in `SelectionEngineConfig.penalties`.

### 8.4 External Signals
Future adapters may inject external signals (load balancing, quota, SLA pressure) as additional ranking components or penalties.

### 8.5 Learning Integration
The Evolution agent can consume `SelectionDecision` history to:
- Tune ranking weights per stage
- Adjust penalty values based on actual outcomes
- Recommend capability binding changes
- Detect systemic routing problems

### 8.6 Multi-Agent Selection
Current design selects a single agent per task. Future extension: `selectMultiple()` for multi-agent stages where several agents work in parallel on the same task.

---

## 9. Event Taxonomy

| Event | When Emitted | Key Payload |
|-------|-------------|-------------|
| `selection.requested` | Engine receives SelectionRequest | `request_id`, `task_id`, `candidate_count` |
| `selection.eligibility_completed` | Eligibility phase done | `eligible_count`, `ineligible_count`, `rate` |
| `selection.ranking_completed` | Ranking phase done | `ranked_count`, `top_score`, `margin` |
| `selection.decided` | Decision finalized | `decision_id`, `outcome`, `selected_agent_id` |
| `selection.no_candidates` | Zero eligible agents | `request_id`, `ineligibility_reasons` |
| `selection.fallback_activated` | Primary failed, using fallback | `fallback_position`, `fallback_agent_id` |
| `selection.degraded_mode` | Operating with reduced guarantees | `lost_guarantees`, `confidence_penalty` |
| `selection.retry_other_triggered` | retry_other selection initiated | `original_task_id`, `failed_agent_ids` |
| `selection.narrow_margin_warning` | Top-2 gap < threshold | `agent_1`, `agent_2`, `score_gap` |
| `selection.low_eligibility_warning` | Eligibility rate below threshold | `rate`, `threshold` |

---

## 10. Relationship to Other Modules

```
┌────────────────────┐
│  Runtime Protocol  │  Defines AgentTask, AgentResponse, RetryPolicy
│    (protocol.ts)   │  Selection engine reads retry context
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Capability Model  │  Defines profiles, scorecards, match results
│ (capabilities.ts)  │  Selection engine consumes these as inputs
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Selection Engine  │  Pure decision function
│  (selection.ts)    │  Produces SelectionDecision
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│   Orchestrator     │  Consumes SelectionDecision
│ (orchestrator.ts)  │  Dispatches AgentTask to selected agent
└────────────────────┘
```

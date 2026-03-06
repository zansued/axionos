# Agent Policy Engine — Specification v0.1

**Status:** Normative  
**Depends on:** Agent Runtime Protocol v0.1.1, Agent Capability Model v0.2, Agent Selection Engine v0.2  
**Module:** `supabase/functions/_shared/agent-os/policy-engine.ts`

---

## 1. Purpose

The Policy Engine is the rule evaluation layer of the Agent OS. It evaluates system rules against execution context and produces structured decisions that influence the orchestrator, selection engine, and retry logic.

It transforms:

```
PolicyContext + PolicyRule[] → PolicyDecision
```

The Policy Engine does NOT:
- Execute tasks
- Select agents
- Mutate state
- Access infrastructure

It is a pure evaluation function.

---

## 2. Design Principles

### 2.1 Separation of Evaluation and Enforcement

The Policy Engine **evaluates** rules and produces decisions. The orchestrator and selection engine **enforce** those decisions. This separation enables testing policies without side effects.

### 2.2 Scope Hierarchy

Policies are scoped hierarchically. When policies conflict, the most specific scope wins:

```
global → environment → stage → capability → agent → task
```

Within the same scope, higher `priority` wins.

### 2.3 Deterministic Evaluation

Given the same context, rules, and overrides, the engine MUST produce the same decision.

### 2.4 Declarative Rules

Rules are data, not code. They consist of conditions (predicates on context fields) and actions (declarative prescriptions). This enables:
- Serialization and storage
- Version control
- A/B testing
- Audit trails

### 2.5 Override Safety

Overrides are temporary exemptions that must be:
- Time-limited (`expires_at`)
- Auditable (`approved_by`, `reason`)
- Scoped (constrained to specific context)

---

## 3. Policy Evaluation Flow

```
PolicyContext
      │
      ▼
┌──────────────────┐
│  SCOPE FILTERING │  Select rules applicable to context
│                  │  (environment, stage, agent, capability)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  OVERRIDE CHECK  │  Remove rules with active overrides
│                  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    CONDITION     │  Evaluate each rule's conditions
│   EVALUATION     │  against the context
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   VIOLATION      │  Collect violations from triggered rules
│   COLLECTION     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    ACTION        │  Aggregate actions into modifiers
│   AGGREGATION    │  and recommendations
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    VERDICT       │  Determine final verdict
│   PRODUCTION     │  (allow / warn / block / critical)
└──────────────────┘
```

---

## 4. Core Entities

| Entity | Purpose |
|--------|---------|
| `PolicyContext` | Evaluation context with all relevant data |
| `PolicyRule` | A single evaluatable rule |
| `PolicyCondition` | A predicate on a context field |
| `PolicyAction` | What happens when a rule triggers |
| `PolicyEvaluation` | Result of evaluating one rule |
| `PolicyViolation` | A concrete violation detected |
| `PolicyDecision` | Final output with verdict, violations, modifiers |
| `PolicyOverride` | Temporary exemption from a rule |
| `PolicySet` | Named collection of rules |
| `PolicyModifier` | Adjustment for downstream systems |

---

## 5. Policy Scopes

| Scope | Level | Example |
|-------|-------|---------|
| `global` | 0 | "Max 10 retries per run" |
| `environment` | 1 | "No experimental capabilities in production" |
| `stage` | 2 | "Validation must score ≥ 0.70 for promotion" |
| `capability` | 3 | "Capability X blocked above $2 cost" |
| `agent` | 4 | "Agent Y restricted to staging only" |
| `task` | 5 | "This specific task requires approval" |

Conflict resolution: higher level number (more specific) wins. Within same level, higher `priority` wins.

---

## 6. Condition Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `stage eq "build"` |
| `neq` | Not equals | `environment neq "production"` |
| `gt` | Greater than | `run_cost_usd gt 5.0` |
| `gte` | Greater or equal | `attempt_number gte 3` |
| `lt` | Less than | `agent_confidence lt 0.6` |
| `lte` | Less or equal | `last_validation_score lte 0.50` |
| `in` | In list | `capability_lifecycle in ["draft", "deprecated"]` |
| `not_in` | Not in list | `agent_type not_in ["evolution"]` |
| `contains` | Contains | `tool_name contains "github"` |
| `exists` | Not null | `run_metrics exists` |
| `not_exists` | Is null | `agent_confidence not_exists` |

---

## 7. Action Types

| Action | Effect | Blocking |
|--------|--------|----------|
| `block` | Prevent execution | Yes |
| `warn` | Log warning, allow execution | No |
| `deny_agent` | Exclude agent from selection | Yes (for agent) |
| `deny_capability` | Suppress capability | Yes (for capability) |
| `deny_tool` | Block tool invocation | Yes (for tool) |
| `limit_retries` | Cap retry count | Conditional |
| `limit_retry_other` | Cap retry_other count | Conditional |
| `limit_cost` | Set cost ceiling | Conditional |
| `limit_latency` | Set latency ceiling | Conditional |
| `limit_concurrency` | Cap concurrent agents | Conditional |
| `limit_execution_time` | Cap total run time | Conditional |
| `require_validation_score` | Minimum validation score | Conditional |
| `require_confidence` | Minimum confidence | Conditional |
| `apply_ranking_penalty` | Add penalty to selection | No |
| `force_mode` | Override agent mode | No |
| `force_rollback` | Force rollback to stage | Yes |
| `require_approval` | Require human approval | Yes (until approved) |
| `emit_alert` | Emit alert event | No |
| `log` | Log for audit | No |

---

## 8. Policy Decision Verdicts

| Verdict | Meaning |
|---------|---------|
| `allow` | No rules triggered, proceed |
| `allow_with_warnings` | Warning rules triggered, proceed with caution |
| `block` | Error-severity rule triggered, stop |
| `block_critical` | Critical-severity rule triggered, stop + alert |
| `require_approval` | Human approval needed before proceeding |

---

## 9. Built-in Policy Rules

| Rule | Scope | Severity | Description |
|------|-------|----------|-------------|
| `builtin:max-retries-per-run` | global | error | Max 10 retries per run |
| `builtin:max-retry-other` | global | error | Max 5 retry_other per run |
| `builtin:no-experimental-in-prod` | environment | error | Block draft/deprecated in production |
| `builtin:run-cost-limit` | global | critical | Block when cost ≥ $10 |
| `builtin:max-execution-time` | global | error | Block after 30 minutes |
| `builtin:max-concurrent-agents` | global | warning | Warn at 5 concurrent agents |
| `builtin:min-confidence-prod` | environment | warning | Warn when confidence < 0.6 in prod |
| `builtin:min-validation-for-promotion` | stage | error | Block promotion if validation < 0.70 |

---

## 10. Integration Points

### 10.1 Orchestrator

Before each stage execution:
1. Build `PolicyContext` from run state
2. Call `policyEngine.evaluate(context, rules)`
3. If `verdict == "block"` → halt execution
4. If `verdict == "require_approval"` → pause and wait
5. Apply `policy_modifiers` to execution config

### 10.2 Selection Engine

During candidate filtering:
1. For each candidate, build agent-scoped `PolicyContext`
2. Evaluate agent-level and capability-level policies
3. Feed `policy_modifiers` (e.g., `apply_ranking_penalty`) into `SelectionPolicyModifier`
4. Feed `deny_agent` / `deny_capability` into excluded lists

### 10.3 Retry Logic

Before retry dispatch:
1. Build retry-scoped `PolicyContext` with attempt counts
2. Evaluate retry limit rules
3. If blocked → stop retrying, apply `escalation_action`

### 10.4 Tool Invocation

Before tool calls:
1. Build tool-scoped `PolicyContext`
2. Evaluate `deny_tool` rules
3. If blocked → skip tool, report to agent

### 10.5 Validation Pipeline

After validation scoring:
1. Build validation-scoped `PolicyContext`
2. Evaluate promotion rules
3. If `require_validation_score` not met → trigger rollback

---

## 11. Policy Overrides

Overrides temporarily exempt specific contexts from specific rules.

### Override Rules:
- Must have `expires_at` (no permanent overrides)
- Must have `approved_by` (accountability)
- Must have `reason` (auditability)
- Scoped to specific context (not blanket exemptions)

### Override Evaluation:
1. Before evaluating a rule, check if an active override exists
2. Override matches if its scope is a subset of the current context
3. If matched and not expired → skip rule, emit `policy.override_applied`

---

## 12. Edge Cases

### 12.1 No Rules
If no rules are provided, verdict is `"allow"`. This is the default-open posture.

### 12.2 Conflicting Rules
Same scope + same priority = both evaluated. If one blocks and another allows, block wins (safety-first).

### 12.3 Override for Critical Rule
Critical rules CAN be overridden but emit a `policy.override_applied` event with elevated severity for auditing.

### 12.4 Expired Override
Expired overrides are ignored. Emit `policy.override_expired` event.

### 12.5 Rule Evaluation Limit
If `max_rules_per_evaluation` is reached, remaining rules are skipped. Emit warning.

---

## 13. Event Taxonomy

| Event | When Emitted | Key Payload |
|-------|-------------|-------------|
| `policy.evaluation_started` | Engine begins evaluation | `run_id`, `rule_count`, `context_stage` |
| `policy.evaluation_completed` | Evaluation done | `decision_id`, `verdict`, `violation_count` |
| `policy.rule_triggered` | A rule's conditions were met | `rule_id`, `severity`, `actions` |
| `policy.violation_detected` | Violation recorded | `violation_id`, `rule_id`, `blocking` |
| `policy.execution_blocked` | Verdict is block/block_critical | `decision_id`, `blocking_rules` |
| `policy.warning_issued` | Warning violation detected | `rule_id`, `message` |
| `policy.override_applied` | Override exempted a rule | `override_id`, `rule_id` |
| `policy.override_expired` | Override has expired | `override_id`, `rule_id` |
| `policy.modifier_applied` | Modifier sent downstream | `modifier_target`, `source_rule_id` |
| `policy.approval_required` | Human approval needed | `decision_id`, `rule_id` |

---

## 14. Extension Points

### 14.1 Custom Policy Rules
Adapters can define custom rules with new `PolicyContextField` values via the `metadata` field.

### 14.2 Custom Condition Operators
Future versions may support regex, range, and compound operators.

### 14.3 Policy Learning
Evolution agent can analyze `PolicyDecision` history to recommend new rules or tune thresholds.

### 14.4 Dynamic Policies
Future adapters may load rules from a policy store, enabling runtime rule changes without redeployment.

### 14.5 Policy Simulation
The `evaluateRule()` method enables dry-run simulation of rules before activation.

### 14.6 Multi-Tenant Policies
Organization-scoped policy sets for SaaS deployments.

### 14.7 Policy Composition
Combining multiple `PolicySet` instances with merge strategies (union, intersection, override).

---

## 15. Relationship with Other Specs

```
┌────────────────────┐
│  Runtime Protocol  │  Defines RetryPolicy, RollbackPolicy
│                    │  Policy Engine evaluates limits
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Capability Model  │  Defines lifecycle states, constraints
│                    │  Policy Engine gates capabilities
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Selection Engine  │  Consumes PolicyModifiers
│                    │  Policy Engine feeds denylists + penalties
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│   Policy Engine    │  Pure rule evaluation
│                    │  Produces PolicyDecision
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│   Orchestrator     │  Enforces PolicyDecision
│                    │  Halts, pauses, or modifies execution
└────────────────────┘
```

---

## 16. Versioning

This document follows semantic versioning: `MAJOR.MINOR.PATCH`

Current version: `0.1.0`

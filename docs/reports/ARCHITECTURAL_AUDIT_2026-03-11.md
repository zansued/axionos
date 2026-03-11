# AxionOS — Architectural Audit Report

> **Date:** 2026-03-11
> **Scope:** Structural alignment of codebase with canonical Operational Decision Chain
> **Auditor:** System Architecture Review
> **Status:** Complete

---

## Executive Summary

The AxionOS codebase was audited against the canonical Operational Decision Chain:

```
Canon / Library → Readiness / Metrics → Policy / Governance → Action Engine → AgentOS Orchestrator → Agent Executor / Human Approval
```

**Finding:** The system is at **Phase 5 complete, Phase 6 partial**. Canon, Metrics, Readiness, and Policy layers exist as typed contracts. However, the Action Engine is entirely absent, and several layers remain disconnected from the actual execution flow.

---

## Part 1: Layer Audit

### 1. Canon / Library

| Item | Status | Observations |
|------|--------|-------------|
| Source Registry | **Partial** | Model defined in types, data in Supabase (`canon_sources`). Real ingestion depends on `canon-ingestion-agent` edge function using external Firecrawl |
| Ingestion Lifecycle | **Implemented** | 10 explicit states with valid transition state machine |
| Candidate Pipeline | **Implemented** | Candidate model with promotion validation, eligibility, and reliability scoring |
| Canon Entry Model | **Implemented** | Complete model with 20+ fields including lifecycle, approval, confidence |
| Pattern Library Model | **Implemented** | Canon → Pattern Library mapping with filters by stack, language, framework |
| Retrieval Contract | **Implemented** | Typed Query/Response with matchReason, confidence, suggestedUse |
| AgentOS Integration | **Partial** | Provider exists (`agent-canon-provider.ts`) with `formatCanonContextForAgent()`, but is **not invoked by the Orchestrator** — available contract, not connected flow |

**Key files:**
- `src/lib/canon/canon-types.ts`
- `src/lib/canon/canon-pipeline.ts`
- `src/lib/canon/agent-canon-provider.ts`
- `supabase/functions/canon-ingestion-agent/`
- `supabase/functions/canon-intake/`

### 2. Readiness / Events / Metrics

| Item | Status | Observations |
|------|--------|-------------|
| Metric Contract | **Implemented** | Source, confidence, updatedAt, explanation, layer — fully typed |
| Metric Registry | **Implemented** | 30+ metrics registered with calculation rules and frequencies. ~40% are `mock` |
| Metric Resolver | **Implemented** | Resolution with safe fallback and validation |
| Event Model | **Missing** | No formal business event model exists. `RuntimeEvent` exists in AgentOS, but no domain events for Readiness or Action Engine |
| Readiness Engine | **Implemented** | Deterministic, with checks per stage, named blockers, suggested actions |
| Named Blockers | **Implemented** | Each check has key, label, explanation, action |
| Named Warnings | **Implemented** | Non-required checks with status != pass |
| Derived Score | **Implemented** | `passedRequired / totalRequired` |

**Key files:**
- `src/lib/metrics/metric-contract.ts`
- `src/lib/metrics/metric-registry.ts`
- `src/lib/metrics/metric-resolver.ts`
- `src/lib/readiness/readiness-engine.ts`
- `src/lib/readiness/stage-definitions.ts`
- `src/lib/readiness/readiness-types.ts`

### 3. Policy / Governance

| Item | Status | Observations |
|------|--------|-------------|
| Policy Decision Model | **Implemented** | PolicyContext + PolicyRule[] → PolicyDecision. Hierarchical scope (global→task) |
| Execution Modes | **Partial** | Modes `bounded_auto_safe` and `advisory_only` exist in execution-policy-runner, but no canonical enum `auto / approval_required / manual_only / blocked` |
| Risk Classification | **Implemented** | RiskLevel (low/medium/high/critical) with weighted RiskFactor[] |
| Approval Requirement | **Partial** | `require_human_approval_for: SensitiveAction[]` exists, but **no functional approval queue** — UI placeholder only |
| Governance Checks | **Partial** | GovernanceDecision and AuditRecord exist as contracts, but real evaluation in pipeline is not connected |

**Key files:**
- `supabase/functions/_shared/agent-os/policy-engine.ts` (871 lines of contracts)
- `supabase/functions/_shared/agent-os/governance.ts` (523 lines)
- `supabase/functions/_shared/execution-policy/execution-policy-runner.ts`
- `supabase/functions/_shared/execution-policy/execution-policy-adjuster.ts`

### 4. Action Engine

| Item | Status | Observations |
|------|--------|-------------|
| Trigger Model | **Missing** | No formal trigger model for a central Action Engine |
| Intent Model | **Missing** | No intent model formalizing "what the system wants to do" |
| Action Record Contract | **Missing** | No action record contract with audit trail |
| Trigger → Intent Mapping | **Missing** | No formal mapping |
| Policy-aware Action Formalization | **Missing** | Domain-specific action engines exist (stabilization, predictive) but **no central Action Engine** |
| Action Audit Trail | **Missing** | No centralized audit trail for actions |

**Existing domain-specific action engines (not central):**
- `supabase/functions/_shared/platform-stabilization/platform-stabilization-action-engine.ts`
- `supabase/functions/_shared/predictive/preventive-action-engine.ts`

### 5. AgentOS Orchestrator

| Item | Status | Observations |
|------|--------|-------------|
| Agent Selection Logic | **Implemented** | Registry with `findForStage` + filter by `requiredTypes`. Selection Engine with ranking and penalties as contract (v0.2) |
| Dispatch Contract | **Implemented** | WorkInput → agent.execute() → WorkResult |
| Context Injection | **Implemented** | ExecutionContext with runId, stage, memory, emit, now |
| Knowledge Retrieval from Canon | **Missing** | `agent-canon-provider.ts` exists but **the Orchestrator does not invoke it**. No Canon/Library call in `orchestrator.ts` |
| Constraint-aware Dispatch | **Partial** | PolicyEngine exists as contract but **is not called by the Orchestrator**. Direct dispatch without policy consultation |
| Outcome Tracking | **Partial** | result.status and result.metrics are collected, but do not feed a formalized feedback loop |

**Key files:**
- `supabase/functions/_shared/agent-os/orchestrator.ts`
- `supabase/functions/_shared/agent-os/registry.ts`
- `supabase/functions/_shared/agent-os/selection.ts`
- `supabase/functions/_shared/agent-os/scoring.ts` (hardcoded values)

### 6. Executors / Human Approval

| Item | Status | Observations |
|------|--------|-------------|
| Executor Model | **Missing** | No executor model. Agents execute directly via `agent.execute()` |
| Action Execution Result Contract | **Missing** | WorkResult exists, but no action result contract (distinct from agent result) |
| Rollback/Escalation Path | **Partial** | Orchestrator has rollback via `nextOnFailure` in policies, but no escalation path to humans |
| Approval Queue Contract | **Missing** | UI shows "Approval Queue" as placeholder. No functional contract or table |

---

## Part 2: Conformance Checklist

### Canon / Library

| Check | Result |
|-------|--------|
| Source registry functional | ✅ Passed |
| Ingestion lifecycle explicit | ✅ Passed |
| Candidate pipeline | ✅ Passed |
| Canon entry model | ✅ Passed |
| Pattern library model | ✅ Passed |
| Retrieval contract | ✅ Passed |
| Operational integration with AgentOS | ⚠️ **Partial** — contract exists, not connected |

### Readiness / Events / Metrics

| Check | Result |
|-------|--------|
| Metric contract with source, confidence, updatedAt | ✅ Passed |
| Explicit event model | ❌ **Failed** — does not exist |
| Deterministic readiness engine | ✅ Passed |
| Named blockers | ✅ Passed |
| Named warnings | ✅ Passed |
| Readiness score derived from checks | ✅ Passed |

### Policy / Governance

| Check | Result |
|-------|--------|
| Policy decision model | ✅ Passed |
| Execution modes auto/approval_required/manual_only/blocked | ⚠️ **Partial** — 2 modes exist, canonical enum of 4 missing |
| Risk classification | ✅ Passed |
| Approval requirement model | ⚠️ **Partial** — contract exists, queue does not |
| Applicable governance checks | ⚠️ **Partial** — not connected to pipeline |

### Action Engine

| Check | Result |
|-------|--------|
| Trigger model | ❌ **Failed** |
| Intent model | ❌ **Failed** |
| Action record contract | ❌ **Failed** |
| Trigger → intent mapping | ❌ **Failed** |
| Policy-aware action formalization | ❌ **Failed** |
| Action audit trail | ❌ **Failed** |

### AgentOS Orchestrator

| Check | Result |
|-------|--------|
| Agent selection logic | ✅ Passed |
| Dispatch contract | ✅ Passed |
| Context injection | ✅ Passed |
| Knowledge retrieval from Canon/Library | ❌ **Failed** — not connected |
| Constraint-aware dispatch | ❌ **Failed** — policy not consulted |
| Outcome tracking | ⚠️ **Partial** |

### Executors / Human Approval

| Check | Result |
|-------|--------|
| Executor model | ❌ **Failed** |
| Action execution result contract | ❌ **Failed** |
| Rollback or escalation path | ⚠️ **Partial** |
| Approval queue contract | ❌ **Failed** |

### Summary

| Result | Count |
|--------|-------|
| ✅ Passed | 13 |
| ⚠️ Partial | 8 |
| ❌ Failed | 13 |

---

## Part 3: Flow Verification

### Inversions and Misalignments Detected

1. **AgentOS Orchestrator ignores Canon/Library** — The Orchestrator dispatches agents without consulting Canon. The correct flow would inject canon context into `WorkInput.context` before each stage. `agent-canon-provider.ts` exists in isolation.

2. **AgentOS Orchestrator ignores Policy Engine** — The Orchestrator executes agents directly without passing through PolicyEngine. `policy-engine.ts` has 871 lines of contracts but **no real invocation** in the orchestration flow. The governance layer exists as a dead contract.

3. **Scoring is hardcoded** — `scoring.ts` returns fixed values (0.8, 0.74, etc.) with a TODO comment. Pipeline validation is fictional.

4. **No central Action Engine exists** — There are 2 domain-specific action engines (stabilization, predictive) but the system has no formal layer between "policy decides" and "AgentOS dispatches". Actions are informal.

5. **No approval queue exists** — Governance defines `require_human_approval_for` but there is no mechanism to enqueue, present, and resolve approvals.

6. **Readiness Engine does not feed the Orchestrator** — The Readiness Engine evaluates initiative readiness in the UI, but the Orchestrator does not consult readiness before executing stages.

7. **Metrics do not feed Policy** — The Metric Registry is not consulted by the Policy Engine for data-driven governance decisions.

### Actual Flow (Current)

```
UI → Edge Function → AgentOS Orchestrator → agent.execute() → WorkResult
```

### Expected Canonical Flow

```
Canon informs → Readiness evaluates → Policy constrains → Action Engine formalizes → AgentOS orchestrates → Executor/Human acts
```

### Verdict

The system has **3 disconnected layers** (Canon, Policy, Governance) that exist as typed contracts but do not participate in the actual execution flow.

---

## Part 4: Maturity Phase Classification

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | UI Scaffolding | ✅ Complete |
| Phase 2 | Navigation Contract | ✅ Complete |
| Phase 3 | Metrics and Data Integrity | ✅ Complete |
| Phase 4 | Readiness Engine | ✅ Complete |
| Phase 5 | Canon and Library Operationalization | ✅ Complete |
| Phase 6 | AgentOS Decision Contract | ⚠️ **Partial** — contracts exist, not connected |
| Phase 7 | Action Engine | ❌ **Not implemented** |
| Phase 8 | Governance and Approval Flow | ❌ **Not implemented** (contracts exist, flow does not) |
| Phase 9 | Self-Healing and Recovery | ❌ Not implemented |
| Phase 10 | Learning Feedback Loop | ❌ Not implemented |

**Current System Phase: Phase 5 complete, Phase 6 partial.**

---

## Part 5: Requirements for Next Block (Action Engine)

### Prerequisites (Complete Phase 6)

1. **Connect Canon to Orchestrator** — Inject `formatCanonContextForAgent()` into `WorkInput.context` before each stage
2. **Connect PolicyEngine to Orchestrator** — Evaluate `PolicyDecision` before dispatching agents
3. **Connect Readiness to pipeline** — Verify readiness before initiating stages

### Action Engine (Phase 7) Implementation Requirements

| Item | Description |
|------|-------------|
| Trigger Model | `ActionTrigger { source, event_type, conditions, timestamp }` |
| Intent Model | `ActionIntent { trigger_id, desired_outcome, target, constraints }` |
| Action Record | `ActionRecord { id, intent, policy_decision, executor, status, result, audit_trail }` |
| Trigger → Intent Mapping | Declarative rules: "when signal X with condition Y, generate intent Z" |
| Policy-aware Formalization | Each intent passes through PolicyEngine before becoming an Action |
| Canonical Execution Modes | `auto \| approval_required \| manual_only \| blocked` |
| Approval Queue | Table and contract for actions requiring human approval |
| Action Audit Trail | Immutable log of all formalized actions |

---

## Appendix: Canonical Operational Decision Chain

```
Canon / Library           — informs
      |
Readiness / Events / Metrics  — evaluates
      |
Policy / Governance       — constrains
      |
Action Engine             — formalizes
      |
AgentOS Orchestrator      — orchestrates
      |
Agent Executor / Human    — acts
```

This chain is the **source of truth** for all operational behavior in AxionOS. See `docs/ARCHITECTURE.md` Section 4B for the full specification.

---

*End of Audit Report*

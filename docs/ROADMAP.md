# AxionOS — System Evolution Roadmap

> **Vision**: AxionOS is an autonomous software engineering platform that transforms ideas into governed, validated repositories.
>
> **What changed (2026-03-07):** Sprint 24 — Agent Memory Layer Operationalization. Per-agent memory profiles, bounded retrieval, scoped injection, write-back, and quality scoring now operational. Previous: Self-Improving Fix Agents v2 (Sprint 23).
>
> **Current Mode**: Level 5 — Institutional Engineering Memory
>
> **Current Maturity**: Level 5 ✅ Active
>
> Last updated: 2026-03-07

---

## Current Status

| Dimension | State |
|-----------|-------|
| **Platform Stage** | Level 4.5 Entry |
| **System State** | Meta-Aware Engineering Platform |
| **Kernel Status** | Stable and operational |
| **Commercial Status** | Plans, billing, usage enforcement — hardened |
| **Learning Status** | Active, rule-based, auditable |
| **Meta-Agents Status** | v1.4 active — memory-aware + quality feedback + advisory calibration, human-reviewed |
| **Execution Mode** | Sprint-based implementation |

---

## Strategic Directive

AxionOS has completed its Product Proof Closure and entered Commercial + Learning readiness. The architecture is sufficient. The full idea-to-deploy cycle is operational with structured inputs, deterministic execution, evidence-based repair, preventive guardrails, adaptive routing, a learning substrate, usage enforcement, and billing infrastructure.

**The focus is now:**
1. Stabilize Learning Agents v1 with real execution data
2. Validate commercial readiness with real billing flows
3. No major platform expansion until learning and billing are proven stable

**Rule:** No new architecture unless it directly improves reliability, cost, execution speed, product clarity, or sellability.

---

## Implementation Horizons

```
  DONE                     NOW                    NEXT                   LATER
  ──────────►              ──────────►            ──────────►            ──────────►
  Level 3                  Level 4 Entry          Learning Agents        Platform
  (Kernel +                (Commercial +          Expansion +            Intelligence
   Autonomous Eng)          Learning v1)          Meta-Agents
```

---

## Level 3 Closure — Completed Sprints

Level 3 (Autonomous Engineering System) is now **functionally complete**. Ten implementation sprints closed the product-proof loop:

### Sprint 1 — Initiative Brief Formalization
**Goal:** Turn idea intake into a structured contract for the pipeline.
**Status:** ✅ Complete

### Sprint 2 — Initiative Simulation Engine
**Goal:** Introduce a lightweight simulation gate before expensive pipeline execution.
**Status:** ✅ Complete

### Sprint 3 — Deploy Contract Completion
**Goal:** Close the loop from repository generation to actual deployment.
**Status:** ✅ Complete

### Sprint 4 — Product-Level Observability
**Goal:** Upgrade observability from runtime telemetry to product metrics.
**Status:** ✅ Complete

### Sprint 5 — Onboarding & Product Packaging
**Goal:** Make AxionOS understandable and activatable for real users.
**Status:** ✅ Complete

### Sprint 6 — Evidence-Oriented Repair Loop
**Goal:** Make the repair loop evidence-based, traceable, and measurable.
**Status:** ✅ Complete

### Sprint 7 — Error Pattern Library & Learning Foundation
**Goal:** Convert repair evidence into reusable error pattern intelligence.
**Status:** ✅ Complete

### Sprint 8 — Preventive Engineering Layer
**Goal:** Convert pattern knowledge into active prevention guardrails.
**Status:** ✅ Complete

### Sprint 9 — Adaptive Repair Routing
**Goal:** Select repair strategies based on historical effectiveness.
**Status:** ✅ Complete

### Sprint 10 — Learning Agents Foundation
**Goal:** Create the structured learning substrate for future self-improving agents.
**Status:** ✅ Complete

---

## Transition Zone — Entry into Level 4

Sprints 11 and 12 represent the **beginning** of Level 4.

### Sprint 11 — Commercial Readiness / Billing / Workspace Packaging ✅

**Purpose:** Make AxionOS operationally packageable as a real product.

**Delivered:**
- Product plans system (Starter / Pro / Enterprise) with limits enforcement
- Billing accounts with Stripe-ready schema
- Usage limit enforcer (initiatives, tokens, deployments, parallel runs)
- Billing calculator with cost breakdowns by stage and model
- Product dashboard API (overview, usage metrics)
- Enhanced Dashboard with pipeline success rate, deploy rate, repair rate
- Enhanced Billing page with plans selection, usage tabs, and limit configuration
- Workspace members table with granular roles
- All new tables with RLS policies and org isolation

**Hardening (post-implementation):**
- Usage enforcement connected to real pipeline entry points (`pipeline-bootstrap.ts`, `run-initiative-pipeline`)
- Cross-org query leakage fixed in `usage-limit-enforcer.ts` and `billing-calculator.ts`
- Cost double-counting fixed: `job_cost` is single source of truth
- Deploy status queries corrected: `"success"` instead of `"completed"`
- Blocked executions return HTTP 402 with `USAGE_LIMIT_EXCEEDED` code

**Status:** ✅ Implemented + Hardened

### Sprint 12 — Learning Agents v1 ✅

**Purpose:** Introduce the first controlled, explainable, auditable learning behavior.

**Delivered:**
- Prompt Outcome Analyzer: aggregates success/cost/retry metrics per stage+model signature
- Strategy Performance Engine: evaluates repair strategy effectiveness with recurrence tracking
- Predictive Error Engine: detects recurring failure patterns, generates prevention rule candidates when probability > 70%
- Repair Learning Engine: adjusts strategy routing weights based on evidence (bounded, reversible)
- Learning Recommendation Engine: generates structured recommendations (PROMPT_OPTIMIZATION, STRATEGY_RANKING_ADJUSTMENT, NEW_PREVENTION_RULE, PIPELINE_CONFIGURATION_HINT)
- Learning Dashboard API with overview/recommendations/strategies/errors views
- Full audit trail: all learning decisions logged with LEARNING_UPDATE events
- Safety: learning agents cannot modify pipeline, governance, plans, or billing
- 5 new tables with RLS: prompt_strategy_metrics, strategy_effectiveness_metrics, predictive_error_patterns, repair_strategy_weights, learning_recommendations

**Status:** ✅ Implemented

---

## Kernel — What Remains Active

| Module | Status |
|--------|--------|
| 32-stage deterministic pipeline | ✅ Operational |
| Project Brain (knowledge graph) | ✅ Operational |
| AI Efficiency Layer (compressor + cache + router) | ✅ Operational |
| Smart Context Window (~60-80% token reduction) | ✅ Operational |
| DAG Execution Engine (6 workers) | ✅ Operational |
| Runtime Validation (tsc + vite via CI) | ✅ Operational |
| Autonomous Build Repair + Fix Orchestrator | ✅ Operational |
| Evidence-Oriented Repair Loop | ✅ Operational |
| Error Pattern Library | ✅ Operational |
| Preventive Engineering Layer | ✅ Operational |
| Adaptive Repair Routing | ✅ Operational |
| Learning Foundation | ✅ Operational |
| Governance (gates, SLAs, audit logs) | ✅ Operational |
| Product-Level Observability | ✅ Operational |
| Stage & Agent IO Contracts | ✅ Implemented |
| Commercial Readiness (plans, billing, enforcement) | ✅ Operational |
| Learning Agents v1 (5 engines + dashboard) | ✅ Operational |
| Proposal Quality Feedback Loop | ✅ Operational |
| Advisory Calibration Layer | ✅ Operational |
| Prompt Optimization (A/B + Bounded Promotion) | ✅ Operational |
| Self-Improving Fix Agents v2 (Repair Policies) | ✅ Operational |

### What to Freeze

| Area | Reason |
|------|--------|
| Marketplace ecosystem | Not needed until Learning Agents are stable and real user load is validated |
| Global capability registry expansion | Current architecture is sufficient for product operation |
| Advanced distributed runtime | Current runtime handles workload adequately |
| Advanced multi-agent coordination | Existing coordination patterns meet current needs |
| Product intelligence layer | Requires Learning Agents to be proven stable first |
| Market intelligence layer | Requires product intelligence first |
| Startup factory ambitions | Premature before Level 4 stability is confirmed |
| Cognitive systems layer | Theoretical concepts, not practical for current focus |

These items remain frozen because they are not required for current product reliability, cost control, sellability, or learning safety.

---

## NEXT — Learning Agents Expansion

**Priority:** High
**Status:** 📋 Planned (after Sprint 12 stabilization)
**Dependency:** Requires stable Learning Agents v1

### Purpose

Scale learning behavior from prompt optimization to full agent self-improvement. Each execution improves future executions.

### Modules

| Module | Description |
|--------|-------------|
| Learning Agents v2 | Self-improving prompt strategies based on output quality |
| Agent Memory Layer | Persistent per-agent memory (foundation: `agent_memory` + `learning_records` tables) |
| Prompt Optimization Engine | A/B testing of prompt variations per stage |
| Predictive Error Detection | Predictive error identification from historical patterns |
| Self-Improving Fix Agents | Repair strategies that evolve based on success rates |

### Expected Outcome

Each execution improves future executions. The system transitions from deterministic execution to adaptive intelligence.

---

## DONE — Meta-Agents + Quality Feedback + Calibration (Level 4.5–5) ✅

**Status:** ✅ Implemented (Sprints 13–14, memory-aware Sprint 18, quality feedback Sprint 19, calibration Sprint 20)

4 memory-aware meta-agents active with historical context enrichment, continuity scoring, redundancy suppression, proposal layer v2, quality feedback loop, and advisory calibration layer. All recommendations require human review. Quality scoring tracks acceptance rates, confidence calibration, and memory effectiveness. Advisory calibration signals diagnose meta-agent performance, proposal usefulness, historical context value, and redundancy guard effectiveness — without applying automatic tuning.

---

## DONE — Engineering Memory Full Stack (Level 5 — Institutional Memory) ✅

**Status:** ✅ Implemented (Sprints 15–18)

Full engineering memory stack: foundation, retrieval surfaces, memory summaries, memory-aware meta-agents and proposals. Historical continuity scoring and redundancy guard operational.

---

## LATER — Expand Platform Intelligence

**Priority:** Long-term
**Status:** 📋 Planned (after learning agents are stable)

Product Intelligence and Market Intelligence become relevant only after:
1. The kernel is stable
2. The product is validated with real users
3. Learning agents are operational and measurably improving outcomes

---

## Agent OS v1.0 — Reference Architecture (Complete)

The Agent OS is fully designed with 14 modules across 5 planes. No expansion needed.

| Plane | Modules | Status |
|-------|---------|--------|
| **Core** | Runtime Protocol, Capability Model, Core Types | ✅ Complete |
| **Control** | Selection Engine, Policy Engine, Governance Layer, Adaptive Routing | ✅ Complete |
| **Execution** | Orchestrator, Coordination, Distributed Runtime, LLM Adapter, Tool Adapter | ✅ Partial (advanced features frozen) |
| **Data** | Artifact Store, Memory System, Observability | ✅ Complete |
| **Ecosystem** | Marketplace & Global Capability Registry | ❄️ Frozen |

Full specification: [AGENTS.md](AGENTS.md) | Pipeline contracts: [PIPELINE_CONTRACTS.md](PIPELINE_CONTRACTS.md)

---

## System Maturity

| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ Complete |
| Level 4 | Self-Learning Software Factory | 🔄 Entering |
| Level 5 | Autonomous Startup Factory | 🔮 Long-term |

> **Current position:** Level 5 — Institutional Engineering Memory active.
> **Current focus:** Memory-aware intelligence stabilization + commercial validation.
> **Execution mode:** Sprint-based implementation.

---

## Engineering Memory Architecture (Foundation + Retrieval + Summaries — Sprints 15–17)

### Engineering Memory Architecture (Full Stack — Sprints 15–18) ✅

**Purpose:** Enable AxionOS to accumulate and reason with institutional engineering memory across executions, failures, strategies, recommendations, decisions, and outcomes.

**Memory Types:** Execution Memory, Error Memory, Strategy Memory, Design Memory, Decision Memory, Outcome Memory.

**Sprint 15 — Foundation:** ✅ Core tables, RLS, capture events, retrieval API, observability.
**Sprint 16 — Retrieval Surfaces:** ✅ Structured retrieval for repair, meta-agents, artifacts, review. Deterministic ranking.
**Sprint 17 — Memory Summaries:** ✅ 6 summary types, signal strength scoring, generation service, UI.
**Sprint 18 — Memory-Aware Reasoning:** ✅ Meta-agent context enrichment, continuity scoring, redundancy guard, proposal layer v2.

**Key Design Decisions:**
- Cross-layer infrastructure (not a new execution layer)
- Event-driven capture from Execution, Learning, Meta-Agent, Proposal, and Human layers
- Dual indexing: structural (field-based) + semantic (future vector-based)
- Strict tenant isolation via organization_id + RLS
- Non-invasive: memory informs reasoning but never mutates system behavior

Full specification: [ARCHITECTURE.md — Layer 9](ARCHITECTURE.md)

---

## Governing Principle

> The architecture is sufficient. Level 3 is complete.
> Twenty-three sprints done: Brief, Simulation, Deploy, Observability, Onboarding, Repair Evidence, Error Patterns, Prevention, Adaptive Routing, Learning Foundation, Commercial Readiness, Learning Agents v1, Meta-Agents v1, Controlled Meta-Agent Actions, Engineering Memory Foundation, Memory Retrieval Surfaces, Memory Summaries, Memory-Aware Meta-Agents, Proposal Quality Feedback Loop, Advisory Calibration Layer, Prompt Optimization Engine, Bounded Promotion & Rollback Guard, and Self-Improving Fix Agents v2.
> The system now has structured inputs, reliable execution, product-level metrics, evidence-based repair, preventive guardrails, adaptive routing, a learning substrate, usage enforcement, billing infrastructure, active learning intelligence, memory-aware meta-level recommendations, historically-informed engineering proposals, foundational engineering memory, contextual memory retrieval, periodic historical synthesis, experience-aware reasoning, proposal quality feedback, advisory calibration diagnostics, prompt optimization with bounded promotion, and memory-aware repair policies.
> Repair decisions are now policy-driven, bounded, auditable, and reversible.
> Focus now: commercial stability, memory-aware intelligence validation, and contextual self-improvement.

# AxionOS — System Evolution Roadmap

> **Vision**: AxionOS is an autonomous software engineering platform that transforms ideas into governed, validated repositories.
>
> **Current Mode**: Level 4 Entry — Controlled Learning & Commercial Readiness
>
> **Current Maturity**: Level 3 ✅ Complete → Level 4 🔄 Entering
>
> Last updated: 2026-03-07

---

## Strategic Directive

AxionOS has completed its Product Proof Closure. The architecture is sufficient. The full idea-to-deploy cycle is operational with structured inputs, deterministic execution, evidence-based repair, preventive guardrails, adaptive routing, and a learning substrate.

**The focus is now:**
1. Stabilize commercial readiness and workspace packaging
2. Activate controlled, explainable learning behavior
3. No major platform expansion until Learning Agents v1 and billing are stable

**Rule:** No new architecture unless it directly improves reliability, cost, execution speed, product clarity, or sellability.

---

## Implementation Horizons

```
  NOW                    NEXT                   LATER
  ──────────►            ──────────►            ──────────►
  Level 4 Entry          Learning Agents        Platform
  (Commercial +          Expansion              Intelligence
   Learning v1)
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

### Level 3 Summary

Level 3 is functionally complete:
- Idea intake is structured (initiative brief)
- Simulation exists before execution
- Pipeline is deterministic (32 stages)
- Repository generation is validated (tsc + vite)
- Deployment is formalized (Vercel-first)
- Product-level observability exists
- Repair is evidence-oriented
- Prevention rules exist and are active
- Adaptive repair routing exists
- Learning foundations exist

---

## Transition Zone — Entry into Level 4

Sprints 11 and 12 represent the **beginning** of Level 4, not its completion. They introduce the first commercial and learning capabilities on top of the proven Level 3 foundation.

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

**Status:** ✅ Implemented

### Sprint 12 — Learning Agents v1 ✅

**Purpose:** Introduce the first controlled, explainable, auditable learning behavior.

**Delivered:**
- Prompt Outcome Analyzer: aggregates success/cost/retry metrics per stage+model signature
- Strategy Performance Engine: evaluates repair strategy effectiveness with recurrence tracking
- Predictive Error Engine: detects recurring failure patterns, generates prevention rule candidates when probability > 70%
- Repair Learning Engine: adjusts strategy routing weights based on evidence (bounded, reversible)
- Learning Recommendation Engine: generates structured recommendations (PROMPT_OPTIMIZATION, STRATEGY_RANKING_ADJUSTMENT, NEW_PREVENTION_RULE, PIPELINE_CONFIGURATION_HINT)
- Learning Dashboard API with overview/recommendations/strategies/errors views
- Enhanced Learning UI with tabs for recommendations, strategies, predictions, weight adjustments
- Full audit trail: all learning decisions logged with LEARNING_UPDATE events
- Safety: learning agents cannot modify pipeline, governance, plans, or billing
- 5 new tables with RLS: prompt_strategy_metrics, strategy_effectiveness_metrics, predictive_error_patterns, repair_strategy_weights, learning_recommendations

**Status:** ✅ Implemented

These sprints mark the start of the transition into **Level 4 — Self-Learning Software Factory**. Level 4 is not yet complete.

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

### What to Freeze

| Area | Reason |
|------|--------|
| Marketplace ecosystem | Not needed until Learning Agents are stable |
| Global capability registry expansion | Architecture sufficient |
| Advanced distributed runtime | Current runtime is adequate |
| Advanced multi-agent coordination | Existing coordination works |
| Product intelligence layer | Requires Learning Agents first |
| Market intelligence layer | Requires product intelligence first |
| Startup factory ambitions | Premature before Level 4 stability |
| Cognitive systems layer | Theoretical, not practical now |

No major platform expansion should happen until Learning Agents v1 and commercial readiness are stable.

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
| **Execution** | Orchestrator, Coordination, Distributed Runtime, LLM Adapter, Tool Adapter | ✅ Complete |
| **Data** | Artifact Store, Memory System, Observability | ✅ Complete |
| **Ecosystem** | Marketplace & Global Capability Registry | ✅ Complete |

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

> **Current position:** Level 3 complete → Level 4 entering.
> **Current focus:** Commercial readiness + controlled learning behavior.
> **Execution mode:** Sprint-based implementation.

---

## Governing Principle

> The architecture is sufficient. Level 3 is complete.
> Ten product-proof sprints are done: Brief, Simulation, Deploy, Observability, Onboarding, Repair Evidence, Error Patterns, Prevention, Adaptive Routing, and Learning Foundation.
> The system now has structured inputs, reliable execution, product-level metrics, evidence-based repair, preventive guardrails, adaptive routing, and a learning substrate.
> Focus now: commercial readiness and controlled learning activation.

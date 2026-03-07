# AxionOS — System Evolution Roadmap

> **Vision**: AxionOS is an autonomous software engineering platform that transforms ideas into governed, validated repositories.
>
> **Current Mode**: Product Proof Closure
>
> **Current Maturity**: Level 3 — Autonomous Engineering System
>
> Last updated: 2026-03-07

---

## Strategic Directive

AxionOS has the technical architecture required for an Autonomous Engineering System. The architecture is sufficient.

**The focus is now:**
1. Close the product cycle from Idea → Deploy
2. Simplify the experience for real users
3. Prove the product works end-to-end
4. Postpone broader platform ambitions until after validation

**Rule:** No new architecture unless it directly improves reliability, cost, execution speed, product clarity, or sellability.

---

## Implementation Horizons

```
  NOW                    NEXT                   LATER
  ──────────►            ──────────►            ──────────►
  Product Proof          Build Learning         Expand Platform
  Closure                Agents                 Intelligence
```

---

## NOW — Product Proof Closure

**Priority:** Highest
**Status:** 🔧 In Progress

AxionOS already has the technical architecture required for an Autonomous Engineering System (Level 3). The kernel is operational: 32-stage pipeline, Project Brain, AI Efficiency Layer, DAG Execution, Build Repair, Governance, and Observability are all in place.

**The product cycle must now be completed and simplified for real users.** This means closing the loop from Idea → Deploy with clear contracts, structured inputs, and measurable outcomes.

---

## Product Proof Implementation Sprints

The next phase is execution-focused and organized into short implementation sprints. The goal is to close the product loop:

```
idea → structured brief → simulation → pipeline → validated repository → deploy → product metrics
```

No new architecture expansion until these sprints are complete and stable.

---

### Sprint 1 — Initiative Brief Formalization

**Goal:** Turn idea intake into a structured contract for the pipeline.
**Status:** ✅ Implemented

---

### Sprint 2 — Initiative Simulation Engine

**Goal:** Introduce a lightweight simulation gate before expensive pipeline execution.
**Status:** ✅ Implemented

---

### Sprint 3 — Deploy Contract Completion

**Goal:** Close the loop from repository generation to actual deployment.
**Status:** ✅ Implemented

---

### Sprint 4 — Product-Level Observability

**Goal:** Upgrade observability from runtime telemetry to product metrics.

**Deliverables:**
- Initiative observability contract schema
- Initiative observability aggregation engine
- `initiative_observability` table with RLS
- Initiative lifecycle dashboard (pipeline/build/deploy success, cost, time-to-repo/deploy)
- Product outcome states: `in_progress`, `repository_ready`, `deployed`, `failed`, `partially_completed`

**Status:** ✅ Implemented

---

### Sprint 5 — Onboarding & Product Packaging

**Goal:** Make AxionOS understandable and activatable for real users.

**Deliverables:**
- 5-step bilingual onboarding flow
- First-run Dashboard hero with product journey visualization
- Improved empty states with contextual guidance
- InitiativeOutcomeCard for clear result communication
- Product framing: "idea → pipeline → repository → deploy"

**Status:** ✅ Implemented

---

### Sprint 6 — Evidence-Oriented Repair Loop

**Goal:** Make the repair loop evidence-based, traceable, and measurable.

**Deliverables:**
- Repair Evidence schema + Error Taxonomy + Repair Strategy Map
- Revalidation Result schema + Repair Evidence Recorder
- `repair_evidence` table with RLS
- RepairEvidenceCard UI component
- Integration with autonomous-build-repair

**Status:** ✅ Implemented

---

### Sprint 7 — Error Pattern Library & Learning Foundation

**Goal:** Convert repair evidence into reusable error pattern intelligence.

**Deliverables:**
- Error Pattern schema + Strategy Effectiveness schema + Prevention Rule Candidate schema
- Error Signature Normalizer (deterministic normalization)
- `error_patterns`, `strategy_effectiveness`, `prevention_rule_candidates` tables
- Error Pattern Library Engine (aggregation, effectiveness, candidates)
- ErrorPatternRadar UI (Observability → Patterns tab)

**Status:** ✅ Implemented

---

### Sprint 8 — Preventive Engineering Layer

**Goal:** Convert pattern knowledge into active prevention guardrails that reduce pipeline failures proactively.

**Deliverables:**
- Prevention Rule schema contract
- Prevention Evaluator (deterministic rule matching engine)
- Prevention Rule Engine (candidate → rule promotion)
- `active_prevention_rules` and `prevention_events` tables with RLS
- Pipeline integration in preventive-validation stage
- PreventionDashboard UI (Observability → Prevenção tab)
- Prevention metrics: rules triggered, failures prevented, blocks, warnings

**Status:** ✅ Implemented

---

### Sprint 9 — Adaptive Repair Routing

**Goal:** Select repair strategies based on historical effectiveness instead of static mapping.

**Deliverables:**
- Repair Routing schema contract
- Repair Routing Engine (3-layer: effectiveness → patterns → static)
- `repair_routing_log` table with RLS
- Integrated adaptive routing into autonomous-build-repair
- RepairRoutingCard UI for initiative details
- Routing decisions persisted for auditability

**Status:** ✅ Implemented

---

### Sprint 10 — Learning Agents Foundation

**Goal:** Create the structured learning substrate for future self-improving agents.

**Deliverables:**
- Learning Record schema contract (`learning-record.schema.ts`)
- Prompt Outcome schema contract (`prompt-outcome.schema.ts`)
- `learning_records` table with RLS and indexes
- Learning Foundation Engine (aggregation from repair, prevention, routing, jobs)
- LearningFoundationDashboard UI (Observability → Learning tab)
- Top success/failure patterns and adjustment candidates visibility

**Status:** ✅ Implemented

---

### Kernel — What Remains Active

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
| Marketplace ecosystem | Not needed for product proof |
| Global capability registry expansion | Architecture sufficient |
| Advanced distributed runtime | Current runtime is adequate |
| Advanced multi-agent coordination | Existing coordination works |
| Product intelligence layer | Requires validated product first |
| Market intelligence layer | Requires product intelligence first |
| Startup factory ambitions | Premature before validation |
| Cognitive systems layer | Theoretical, not practical now |

---

## NEXT — Build Learning Agents

**Priority:** High
**Status:** 📋 Planned (after product validation)
**Dependency:** Requires validated product proof

### Purpose

Upgrade agents from static prompt executors into adaptive learning systems. Each execution improves future executions.

### Modules

| Module | Description |
|--------|-------------|
| Learning Agents | Self-improving prompt strategies based on output quality |
| Agent Memory Layer | Persistent per-agent memory (foundation: `agent_memory` table) |
| Prompt Optimization Engine | A/B testing of prompt variations per stage |
| Error Pattern Recognition | Predictive error detection from historical data |
| Self-Improving Fix Agents | Repair strategies that evolve based on success rates |

### Expected Outcome

Each execution improves future executions. The system transitions from deterministic execution to adaptive intelligence.

---

## LATER — Expand Platform Intelligence

**Priority:** Long-term
**Status:** 📋 Planned (after learning agents)

Product Intelligence and Market Intelligence become relevant only after:
1. The kernel is stable
2. The product is validated with real users
3. Learning agents are operational

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
| Level 3 | Autonomous Engineering System | ✅ Current |
| Level 4 | Self-Learning Software Factory | 📋 After product validation |
| Level 5 | Autonomous Startup Factory | 🔮 Long-term |

> **Current position:** Level 3 — Autonomous Engineering System.
> **Current focus:** Product Proof Closure.
> **Execution mode:** Sprint-based implementation.

---

## Governing Principle

> The architecture is sufficient. The product proof is closing.
> Seven implementation sprints are complete: Brief, Simulation, Deploy, Observability, Onboarding, Repair Evidence, and Error Patterns.
> The system now has structured inputs, reliable execution, product-level metrics, evidence-based repair, and reusable pattern intelligence.
> Next: Learning Agents built on top of this evidence substrate.

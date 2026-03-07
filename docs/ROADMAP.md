# AxionOS — System Evolution Roadmap

> **Vision**: AxionOS is an autonomous software engineering platform that transforms ideas into governed, validated repositories.
>
> **What changed (2026-03-07):** Sprint 17 — Memory Summaries implemented. Six deterministic summary types, signal strength scoring, summary generation/observability, summary UI tab, related summary panels in Meta-Agents and Meta-Artifacts. Previous: Memory Retrieval Surfaces (Sprint 16).
>
> **Current Mode**: Level 5 — Institutional Engineering Memory
>
> **Current Maturity**: Level 4.5 ✅ Complete → Level 5 🔄 Entering
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
| **Meta-Agents Status** | v1.1 active — recommendation + artifact generation, human-reviewed |
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

## NEXT — Meta-Agents (Level 4.5 — Self-Designing Engineering System)

**Priority:** Medium
**Status:** 📋 Architecture designed — Not implemented
**Dependency:** Requires stable Learning Agents v2
**Target maturity:** Level 4.5

### Purpose

Introduce higher-order agents that reason about the orchestration system itself, enabling self-designing workflows, agent role synthesis, and architectural evolution — without sacrificing governance, auditability, or safety.

Meta-Agents transform AxionOS from a **Self-Improving Engineering Platform** into a **Self-Designing Engineering System**.

### Five Meta-Agent Types

| Meta-Agent | Purpose | Key Outputs |
|-----------|---------|-------------|
| **Architecture Meta-Agent** | Analyze execution outcomes, suggest pipeline improvements | `PIPELINE_OPTIMIZATION`, `STAGE_REORDERING_SUGGESTION`, `STAGE_SPLIT_OR_MERGE` |
| **Agent Role Designer** | Analyze task distribution, propose new agent roles | `NEW_AGENT_ROLE`, `AGENT_SPECIALIZATION`, `AGENT_DEPRECATION` |
| **Workflow Optimizer** | Improve pipeline efficiency from duration/retry/repair data | `WORKFLOW_PARALLELIZATION`, `STEP_ELIMINATION`, `STEP_REORDERING` |
| **Strategy Synthesizer** | Combine successful strategies into improved approaches | `NEW_EXECUTION_STRATEGY`, `PROMPT_STRATEGY_COMPOSITION` |
| **System Evolution Advisor** | Produce high-level system evolution guidance | `SYSTEM_EVOLUTION_REPORT`, `TECHNICAL_DEBT_ALERT`, `ARCHITECTURE_CHANGE_PROPOSAL` |

### Architecture Position

```
  Meta-Agent Coordination Layer    ← Planned
          ↑
  Learning Agents Layer            ← Active
          ↑
  Observability Layer              ← Active
          ↑
  Governance and Audit Layer       ← Active
          ↑
  Execution Kernel                 ← Active
```

### Safety Constraints

- Meta-Agents **never** modify pipeline stages, governance rules, billing, or contracts directly
- All outputs are **recommendations** requiring human review
- All actions are **auditable**, **explainable**, and **reversible**
- Meta-Agents operate in **read-only** mode against all lower layers
- Output structure: `meta_agent_recommendations` table with status workflow (`pending → reviewed → accepted | rejected`)

### Interaction Flow

```
Observability → Learning Agents → Meta-Agents → Recommendations → Human Review → Controlled Implementation
```

### Expected Outcome

The system evolves from reactive learning (Sprint 12) to proactive architectural self-improvement, while maintaining full human oversight and governance control.

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

> **Current position:** Level 3 complete → Level 4 entering.
> **Current focus:** Commercial stability + controlled learning activation.
> **Execution mode:** Sprint-based implementation.

---

## Engineering Memory Architecture (Foundation Implemented — Sprint 15)

**Purpose:** Enable AxionOS to accumulate institutional engineering memory across executions, failures, strategies, recommendations, decisions, and outcomes.

**Memory Types:** Execution Memory, Error Memory, Strategy Memory, Design Memory, Decision Memory, Outcome Memory.

**Sprint 15 — Foundation Implemented:**
- ✅ Core tables: `engineering_memory_entries`, `memory_links`, `memory_retrieval_log`
- ✅ Full RLS with tenant isolation
- ✅ Memory capture on recommendation acceptance and artifact transitions
- ✅ Retrieval API with filtering, pagination, and access tracking
- ✅ Observability metrics (total entries, by type, retrieval frequency, most accessed)
- ✅ Read-only UI in Observability → Memory tab
- 📋 Semantic retrieval (future — requires embeddings)
- 📋 Memory synthesis/summaries (future)
- 📋 Memory-driven agent reasoning (future)

**Key Design Decisions:**
- Cross-layer infrastructure (not a new execution layer)
- Event-driven capture from Execution, Learning, Meta-Agent, Proposal, and Human layers
- Dual indexing: structural (field-based) + semantic (future vector-based)
- Strict tenant isolation via organization_id + RLS
- Non-invasive: memory never mutates system behavior

Full specification: [ARCHITECTURE.md — Layer 9](ARCHITECTURE.md)

---

## Governing Principle

> The architecture is sufficient. Level 3 is complete.
> Fifteen sprints done: Brief, Simulation, Deploy, Observability, Onboarding, Repair Evidence, Error Patterns, Prevention, Adaptive Routing, Learning Foundation, Commercial Readiness, Learning Agents v1, Meta-Agents v1, Controlled Meta-Agent Actions, and Engineering Memory Foundation.
> The system now has structured inputs, reliable execution, product-level metrics, evidence-based repair, preventive guardrails, adaptive routing, a learning substrate, usage enforcement, billing infrastructure, active learning intelligence, meta-level recommendations, controlled engineering proposal generation, and foundational engineering memory.
> Focus now: commercial stability, controlled learning activation, and memory infrastructure enrichment.

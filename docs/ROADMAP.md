# AxionOS — System Evolution Roadmap

> **Vision**: AxionOS is an autonomous software engineering platform that transforms ideas into governed, validated repositories.
>
> **Current Mode**: Product Proof Closure
>
> **Current Maturity**: Level 3 — Autonomous Engineering System
>
> Last updated: 2026-03-06

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

No new architecture expansion until these four sprints are complete and stable.

---

### Sprint 1 — Initiative Brief Formalization

**Goal:** Turn idea intake into a structured contract for the pipeline.

**Deliverables:**
- `initiative_brief` schema (Zod-validated)
- AI-first initiative intake flow
- Initiative blueprint generation via AI prompt
- Blueprint approval/edit step
- `initiative_brief` stored in initiative record
- Stage 01 updated to consume `initiative_brief`

**Expected Impact:**
- Better pipeline inputs
- Fewer downstream failures
- Clearer product entry point

**Status:** ✅ Implemented (schema, intake engine, wizard, blueprint generation)

---

### Sprint 2 — Initiative Simulation Engine

**Goal:** Introduce a lightweight simulation gate before expensive pipeline execution.

**Deliverables:**
- Initiative simulation schema (Zod-validated)
- Simulation engine service
- Technical feasibility estimate
- Cost/time estimate
- Risk flags
- Go / Refine / Block recommendation
- Simulation report stored in initiative record

**Expected Impact:**
- Reduced wasted runs
- Better user guidance
- Improved cost control
- Stronger decision support

**Status:** ✅ Implemented (schema, engine, wizard integration, simulation view)

---

### Sprint 3 — Deploy Contract Completion

**Goal:** Close the loop from repository generation to actual deployment.

**Deliverables:**
- Formal deploy states (`draft` → `deployed` / `deploy_failed`)
- Deploy metadata persistence (`repo_url`, `commit_hash`, `deploy_url`, `health_status`)
- Deploy target definition (Vercel first)
- Deploy success / failure tracking
- Initiative state updated through publish/deploy lifecycle

**Deploy States:**

| State | Description |
|-------|-------------|
| `draft` | Initiative created, not yet started |
| `discovering` | Discovery phase active |
| `architecting` | Architecture generation in progress |
| `engineering` | Code generation and squad execution |
| `validating` | Build validation (tsc + vite) |
| `ready_to_publish` | Validation passed, awaiting publish |
| `published` | Repository created on GitHub |
| `deploying` | Deployment to target in progress |
| `deployed` | Successfully deployed and accessible |
| `deploy_failed` | Deployment failed |

**Expected Impact:**
- Complete product lifecycle
- Visible end result for user
- Operational proof of value

**Status:** 📋 Planned

---

### Sprint 4 — Product-Level Observability

**Goal:** Upgrade observability from runtime telemetry to product metrics.

**Deliverables:**
- Initiative Lifecycle Dashboard
- Metrics: `pipeline_success_rate`, `build_success_rate`, `deploy_success_rate`, `average_retries_per_initiative`, `automatic_repair_success_rate`, `cost_per_initiative`, `time_idea_to_repo`, `time_idea_to_deploy`

| Metric | Target |
|--------|--------|
| `pipeline_success_rate` | > 80% |
| `build_success_rate` | > 90% |
| `deploy_success_rate` | > 85% |
| `average_retries_per_initiative` | < 2 |
| `automatic_repair_success_rate` | > 70% |
| `cost_per_initiative` | Tracked & declining |
| `time_idea_to_repo` | < 15 min |
| `time_idea_to_deploy` | < 20 min |

**Expected Impact:**
- Product visibility
- Business-grade metrics
- Confidence for users and future customers

**Status:** 📋 Planned

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
| Governance (gates, SLAs, audit logs) | ✅ Operational |
| Observability + Cost Tracking | ✅ Operational |
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

> The architecture is sufficient. The product is not yet proven.
> Every implementation decision must serve product proof closure: structured inputs, reliable execution, and successful deployment.
> No expansion until the four product-proof sprints are complete and stable.

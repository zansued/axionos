# AxionOS — Execution Plan

> Last updated: 2026-03-06
> Mode: **Product Proof Closure**
> Execution: **Sprint-based**

---

## Strategic Directive

**AxionOS is not expanding architecture. AxionOS is closing the product-proof loop.**

The architecture is sufficient. The focus is now:
1. Close the product cycle from Idea → Deploy
2. Simplify the experience for real users
3. Prove the product works end-to-end
4. Package that product for real users

---

## First Product Proof

### Governed SaaS / MVP Generator

A user submits an idea → AxionOS produces:

| Output | Description |
|--------|-------------|
| Structured Brief | AI-analyzed initiative with structured contract |
| Simulation Report | Feasibility, cost, risk analysis before execution |
| Discovery | Market analysis, feasibility, refined idea |
| Architecture | System design, component structure, tech stack |
| PRD | Product requirements document |
| Stories & Subtasks | Backlog with acceptance criteria |
| Code | Business logic, API, UI generation |
| Validation | tsc + vite build verification |
| Repository | Git repository with atomic commits |
| Deploy | Live deployment with health check |
| Metrics | Pipeline success, cost, time tracking |

---

## Current Execution Block

### Initiative-to-Deploy Product Proof

The immediate goal:

```
idea → structured brief → simulation → pipeline → validated repo → deploy → metrics
```

Organized into four sequential sprints.

---

## Sprint 1 — Initiative Brief Formalization

**Objective:** Transform raw user idea into the canonical structured input of the pipeline.

**Key Deliverables:**
- `initiative_brief` Zod schema (`_shared/contracts/initiative-brief.schema.ts`)
- Initiative intake engine (`initiative-intake-engine/`)
- Initiative blueprint prompt (`_shared/prompts/initiative-blueprint.prompt.ts`)
- Database fields: `idea_raw`, `blueprint`, `initiative_brief`, `idea_analysis`
- Frontend flow: idea input → AI blueprint preview → user approval → initiative creation

**Affected Layers:**
- Frontend (wizard components)
- Intake service (edge function)
- Pipeline Stage 01
- Database (initiatives table)

**Dependencies:**
- Existing initiative creation flow
- Current Stage 01 contract

**Acceptance Criteria:**
- [x] User can enter a raw idea
- [x] AI generates blueprint
- [x] User can edit and approve blueprint
- [x] `initiative_brief` is validated and stored
- [ ] Pipeline starts using `initiative_brief` as canonical input

**Status:** ✅ Implemented

---

## Sprint 2 — Initiative Simulation Engine

**Objective:** Simulate execution feasibility before entering the full pipeline.

**Key Deliverables:**
- Simulation report schema (`_shared/contracts/initiative-simulation.schema.ts`)
- Simulation prompt (`_shared/prompts/initiative-simulation.prompt.ts`)
- Simulation engine service (`initiative-simulation-engine/`)
- Recommendation states: `go`, `refine`, `block`
- Risk flags with severity levels
- Cost/time/token estimates
- Recommended generation depth

**Affected Layers:**
- Simulation service (edge function)
- Frontend (SimulationView in wizard)
- Initiative persistence (simulation_report, risk_flags, estimates)
- Pipeline gate before Discovery

**Dependencies:**
- `initiative_brief` must exist (Sprint 1)

**Acceptance Criteria:**
- [x] Every `initiative_brief` can generate a simulation report
- [x] Simulation report is validated
- [x] User sees recommendation and risks
- [x] Pipeline can pause for refinement when needed

**Status:** ✅ Implemented

---

## Sprint 3 — Deploy Contract Completion

**Objective:** Standardize publish-to-deploy flow and make deployment a first-class product output.

**Key Deliverables:**
- Deploy state machine with deterministic transitions
- Deploy contract documentation
- Initiative deploy metadata fields (`repo_url`, `commit_hash`, `deploy_url`, `health_status`)
- Vercel-first deployment integration contract
- Deploy status persistence
- Explicit states: `ready_to_publish` → `deploying` → `deployed` / `deploy_failed`

**Affected Layers:**
- Publish pipeline
- Deploy integration
- Initiative lifecycle state
- UI status rendering

**Dependencies:**
- Validated repository output from pipeline

**Acceptance Criteria:**
- [ ] Initiative can move from `published` to `deployed`
- [ ] Deploy URL is stored and shown
- [ ] Failed deploys are visible and traceable
- [ ] State transitions are deterministic

**Status:** 📋 Planned

---

## Sprint 4 — Product-Level Observability

**Objective:** Measure product success, not only agent/runtime activity.

**Key Deliverables:**
- Initiative lifecycle dashboard spec
- Metrics aggregation:
  - `pipeline_success_rate`
  - `build_success_rate`
  - `deploy_success_rate`
  - `average_retries_per_initiative`
  - `automatic_repair_success_rate`
  - `cost_per_initiative`
  - `time_idea_to_repo`
  - `time_idea_to_deploy`
- Dashboard cards and initiative-level metrics

**Affected Layers:**
- Observability
- Initiative dashboard
- Cost tracking
- Reporting layer

**Dependencies:**
- Deploy contract states (Sprint 3)
- Initiative lifecycle data
- Build/repair events

**Acceptance Criteria:**
- [ ] Metrics exist at initiative level
- [ ] Dashboard reflects product outcomes
- [ ] Users can understand whether an initiative succeeded, how long it took, and how much it cost

**Status:** 📋 Planned

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Pipeline success rate (no manual intervention) | > 80% |
| Build OK rate | > 90% |
| Deploy success rate | > 85% |
| Average retries per initiative | < 2 |
| Automatic repair success rate | > 70% |
| Cost per initiative | Tracked & declining |
| Time from idea to validated repository | < 15 min |
| Time from idea to deployment | < 20 min |

---

## Active Kernel Components

| Component | Status |
|-----------|--------|
| 32-stage deterministic pipeline | ✅ |
| Project Brain (knowledge graph + semantic search) | ✅ |
| DAG Execution Engine (Kahn's algorithm, 6 workers) | ✅ |
| AI Efficiency Layer (compressor + cache + router) | ✅ |
| Smart Context Window (~60-80% token reduction) | ✅ |
| Runtime Validation (tsc + vite via CI) | ✅ |
| Autonomous Build Repair + Fix Orchestrator | ✅ |
| Adaptive Learning Engine | ✅ |
| Governance (gates, SLAs, audit logs) | ✅ |
| Observability + Cost Tracking | ✅ |

---

## Agent OS v1.0 — Reference Architecture (Frozen)

The Agent OS is fully designed. No expansion needed.

| Plane | Modules | Status |
|-------|---------|--------|
| **Core** | Runtime Protocol, Capability Model, Core Types | ✅ Designed |
| **Control** | Selection Engine, Policy Engine, Governance Layer, Adaptive Routing | ✅ Designed |
| **Execution** | Orchestrator, Coordination, Distributed Runtime, LLM Adapter, Tool Adapter | ✅ Designed |
| **Data** | Artifact Store, Memory System, Observability | ✅ Designed |
| **Ecosystem** | Marketplace & Global Capability Registry | ✅ Designed |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Lovable AI Gateway (Gemini 2.5 Flash/Pro) + Efficiency Layer |
| Git | GitHub API v3 (Tree API for atomic commits) |
| Deploy | Vercel/Netlify auto-generated configs |

---

## Product Positioning

**Present AxionOS as:**
- An autonomous software engineering platform
- A governed SaaS / MVP generator
- A system that transforms ideas into validated repositories

**Do NOT present as:**
- A startup factory
- A global marketplace of agents
- An abstract agent operating system

---

## What the UI Should Emphasize

1. **Initiative creation** — AI-first, guided, structured flow
2. **Simulation results** — feasibility, cost, risk before execution
3. **Pipeline progress** — real-time stage visualization
4. **Cost visibility** — per-initiative, per-stage costs
5. **Output access** — clear path to generated repository
6. **Error transparency** — what failed, why, what was repaired
7. **Deploy status** — from validation to live deployment

**De-emphasize:** Agent OS internals, marketplace, portfolio management, venture intelligence.

> Pipeline contracts: [docs/PIPELINE_CONTRACTS.md](../docs/PIPELINE_CONTRACTS.md) | Agents: [docs/AGENTS.md](../docs/AGENTS.md) | Roadmap: [docs/ROADMAP.md](../docs/ROADMAP.md)

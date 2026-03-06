# AxionOS — Execution Plan

> Last updated: 2026-03-06
> Mode: **Product Proof Closure**

---

## Strategic Directive

**AxionOS is no longer in architecture expansion mode.**
**AxionOS is now in product proof closure mode.**

The architecture is sufficient. The focus is now:
1. Close the product cycle from Idea → Deploy
2. Simplify the experience for real users
3. Prove the product works end-to-end
4. Package that product for real users
5. Postpone broader platform ambitions until after validation

---

## First Product Proof

### Governed SaaS / MVP Generator

A user submits an idea → AxionOS produces:

| Output | Description |
|--------|-------------|
| Structured Discovery | Market analysis, feasibility, refined idea |
| Architecture | System design, component structure, tech stack |
| PRD | Product requirements document |
| Stories & Subtasks | Backlog with acceptance criteria |
| Scaffold / Initial Code | Business logic, API, UI generation |
| Runtime Validation | tsc + vite build verification |
| Repository Output | Git repository with atomic commits |
| Pipeline Traceability | Full audit trail of every decision |

**This is the only product to validate right now.**

---

## Execution Priorities

### P0 — Initiative Creation AI-First

**Goal:** Transform idea intake into an AI-assisted flow that produces a structured initiative brief before entering the pipeline.

**Current stage flow:**

```
Idea (raw text) → Discovery → Architecture → ...
```

**New flow:**

```
User Idea (natural language)
       ↓
AI Idea Analysis
       ↓
AI Blueprint Generation
       ↓
User Review & Edit
       ↓
initiative_brief created
       ↓
Discovery Pipeline starts (with structured input)
```

**Status:** 🔧 In Progress (wizard implemented, blueprint generation operational)

---

### P1 — Harden the Kernel

| Task | Status |
|------|--------|
| Pipeline completion reliability | 🔧 In Progress |
| Build success rate improvement | 🔧 In Progress |
| Typed error taxonomy across all stages | 🔧 In Progress |
| Per-stage observability | ✅ Implemented |
| Per-model cost attribution | ✅ Implemented |
| Output contract enforcement | ✅ Implemented |
| Initiative traceability | ✅ Implemented |
| Stage contract system | ✅ Implemented |
| Agent IO contracts | ✅ Implemented |
| AI Efficiency Layer (compressor + cache + router) | ✅ Implemented |

### P2 — Deploy Contract Completion

| Task | Status |
|------|--------|
| Define deploy lifecycle states | 📋 Planned |
| Persist deploy metadata (repo_url, commit_hash, deploy_url) | 📋 Planned |
| Track deploy success rate | 📋 Planned |
| Vercel deployment integration | 📋 Planned |
| Post-deploy health check | 📋 Planned |

### P3 — Product-Level Observability

| Task | Status |
|------|--------|
| Initiative Lifecycle Dashboard | 📋 Planned |
| pipeline_success_rate metric | 📋 Planned |
| deploy_success_rate metric | 📋 Planned |
| time_idea_to_deploy metric | 📋 Planned |
| cost_per_initiative tracking | ✅ Implemented |

### P4 — Package for Real Usage

| Task | Status |
|------|--------|
| Onboarding flow improvement | 📋 Planned |
| Execution transparency (live pipeline view) | 🔧 In Progress |
| Export / deploy actions | 📋 Planned |
| Billing readiness | 📋 Planned |
| Workspace consistency | 📋 Planned |

### P5 — Delay Broader Platform Ambition

These remain valid but are **frozen** until product validation:

| Area | Status |
|------|--------|
| Marketplace ecosystem | ❄️ Frozen |
| Global capability registry expansion | ❄️ Frozen |
| Advanced distributed runtime | ❄️ Frozen |
| Advanced multi-agent coordination | ❄️ Frozen |
| Product intelligence layer | ❄️ Frozen |
| Market intelligence layer | ❄️ Frozen |
| Startup factory ambitions | ❄️ Frozen |
| Cognitive systems layer | ❄️ Frozen |

**Rule:** No new architecture unless it directly improves reliability, cost, execution speed, product clarity, or sellability.

---

## Initiative Creation AI-First — Implementation Plan

This module improves the **Idea stage of the pipeline**, transforming raw idea text into a structured `initiative_brief` that serves as the official input contract for all downstream stages.

### Component Architecture

#### Frontend

**New UI Flow:** Quick Start → Describe your idea → Review Blueprint → Confirm & Launch

| Component | Purpose |
|-----------|---------|
| `QuickStartView` | Idea input with optional reference URL and context |
| `BlueprintReview` | AI-generated blueprint review and editing |
| `RefinementView` | Final adjustments before pipeline launch |
| `InitiativeWizard` | Orchestrator dialog managing the full flow |

**Status:** ✅ Implemented

#### Backend

**Service:** `generate-initiative-blueprint` (Edge Function)

**Responsibilities:**

- Parse raw idea input
- Run AI analysis (market opportunity, feasibility, complexity)
- Generate structured blueprint
- Build `initiative_brief` object
- Return canonical brief for user review

**Status:** ✅ Implemented

#### Database

Fields on `initiatives` table supporting the flow:

| Field | Type | Purpose |
|-------|------|---------|
| `idea_raw` | TEXT | Original idea text |
| `discovery_payload` | JSONB | AI analysis results |
| `initial_estimate` | JSONB | Complexity and scope estimate |
| `complexity` | TEXT | AI-estimated complexity |

> Note: The `initiative_brief` is constructed client-side from these fields and the wizard state, then passed as the pipeline input.

**Status:** ✅ Schema exists

#### Pipeline Integration

**Stage 01 Contract Change:**

| Before | After |
|--------|-------|
| Idea → raw text | Idea → `initiative_brief` (structured object) |

The pipeline now receives structured input with problem statement, target audience, features, integrations, and generation depth — instead of raw idea text.

**Status:** 🔧 In Progress

### Acceptance Criteria

The feature is complete when:

- [x] A user can describe an idea in natural language
- [x] The system generates a structured initiative blueprint
- [x] The user can edit and approve it
- [x] The system generates `initiative_brief`
- [ ] The pipeline starts using the structured brief as its canonical input
- [ ] Pipeline success rate improves with structured inputs vs raw text

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
| Cost per useful output | Tracked & declining |
| Time from idea to validated repository | < 15 min |
| Time from idea to deployment | < 20 min |
| Pipeline progress clarity for user | Clear visual feedback |

> Pipeline contracts: [docs/PIPELINE_CONTRACTS.md](../docs/PIPELINE_CONTRACTS.md) | Agents: [docs/AGENTS.md](../docs/AGENTS.md) | Roadmap: [docs/ROADMAP.md](../docs/ROADMAP.md)

---

## What the UI Should Emphasize

1. **Initiative creation** — AI-first, guided, structured flow
2. **Pipeline progress** — real-time stage visualization
3. **Cost visibility** — per-initiative, per-stage costs
4. **Output access** — clear path to generated repository
5. **Error transparency** — what failed, why, what was repaired
6. **Deploy status** — from validation to live deployment

**De-emphasize:** Agent OS internals, marketplace, portfolio management, venture intelligence.

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

14 modules | 5 planes | Full TypeScript contracts | **Architecture complete — implementation follows product validation.**

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

## Short-Term Roadmap

```
  NOW                         NEXT (after validation)
  ────────────────────►       ────────────────────►
  Product Proof Closure       Build Learning Agents
  AI-First Initiative         Improve Agent Intelligence
  Deploy Contract             Expand to Product Intelligence
```

Everything else waits.

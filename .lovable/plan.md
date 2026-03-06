# AxionOS — Execution Plan

> Last updated: 2026-03-06

---

## Current Focus

AxionOS follows architecture-priority sequencing. Each implementation horizon must be stable before the next begins.

| Horizon | Focus | Status |
|---------|-------|--------|
| **NOW** | Stabilize the Kernel | 🔧 In Progress |
| **NEXT** | Build Learning Agents | 📋 Planned |
| **LATER** | Build Product Intelligence | 📋 Planned |
| **FUTURE** | Build Market Intelligence | 📋 Planned |

---

## What We Are Doing Now

**Stabilizing the Core System Kernel.**

The engineering infrastructure is implemented. The priority is hardening it — reducing entropy, standardizing contracts, improving reliability, and lowering cost.

### Active Work

- Pipeline execution reliability across all 32 stages
- AI Efficiency Layer optimization (prompt compression, semantic cache, model routing)
- Stage and agent IO contract standardization
- UI restructuring toward a control-center layout
- Pipeline visualization refactor
- Observability and cost tracking improvements

### Kernel Hardening Tasks

| Task | Status |
|------|--------|
| Stage Contract System — formal input/output/retry schemas per stage | ✅ Implemented |
| Agent IO Contracts — standardized agent output structure | ✅ Implemented |
| Observability Improvements — granular cost tracking | 🔧 In Progress |
| Pipeline Visualization Refactor — simplified control UI | 🔧 In Progress |
| AI Cost Tracking — per-stage, per-model attribution | ✅ Implemented |
| Error Taxonomy Standardization — typed failure modes | 🔧 In Progress |

These tasks reduce architectural entropy and prepare the system for the Agent Intelligence Layer (NEXT).

### Kernel Components (Implemented)

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

## What Comes Next

**Agent Intelligence Layer.**

After the kernel is stable, agents evolve from static prompt executors into learning systems that improve from previous executions.

| Module | Description |
|--------|-------------|
| Learning Agents | Self-improving prompt strategies |
| Agent Memory Layer | Persistent per-agent memory (foundation: `agent_memory` table) |
| Prompt Optimization Engine | A/B testing of prompt variations |
| Error Pattern Recognition | Predictive error detection |
| Self-Improving Fix Agents | Evolving repair strategies |
| Architecture Pattern Library | Reusable patterns by domain |

Agent memory structure: `{ agent_id, task_type, strategy_used, outcome, confidence, scope, times_used }` — enabling cross-project learning at the organization level.

**Dependency:** Requires stable kernel.

---

## What Must Wait

### Product Intelligence (LATER)

Post-deployment product evolution: analytics, behavior analysis, automatic UI optimization, feature suggestion.

**Dependency:** Requires stable kernel + learning agents.

### Market Intelligence (FUTURE)

Autonomous venture creation: opportunity discovery, market validation, revenue strategy, portfolio management.

**Dependency:** Requires all previous layers stable.

---

## Why the Order Matters

```
Kernel → Learning Agents → Product Intelligence → Market Intelligence
```

Each layer depends on the previous one:

1. **Without a stable kernel**, learning agents have no reliable data to learn from
2. **Without learning agents**, product intelligence cannot improve its analysis over time
3. **Without product intelligence**, market decisions are based on assumptions, not data

Skipping ahead creates compounding technical debt. The order is not arbitrary — it reflects architectural dependency.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   AI EFFICIENCY LAYER                    │
│  Prompt Compressor │ Semantic Cache │ Model Router       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   VENTURE     │  │  SOFTWARE    │  │   GROWTH &   │   │
│  │ INTELLIGENCE  │  │ ENGINEERING  │  │  EVOLUTION   │   │
│  │  (FUTURE)     │  │  (NOW)       │  │  (LATER)     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              PROJECT BRAIN                        │    │
│  │  DAG Engine │ Smart Context │ Embeddings │ Rules  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            ADAPTIVE LEARNING                      │    │
│  │  Error Intelligence │ Prevention Rules │ Patterns │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Pipeline — 32 Stages

### Discovery & Architecture (S06-10) — ✅ NOW
| # | Stage | Engine |
|---|-------|--------|
| 06 | Discovery Intelligence | 4-agent comprehension team |
| 07 | Market Intelligence | 4-agent architecture team |
| 08 | Technical Feasibility | Architecture simulation |
| 09 | Project Structuring | Preventive validation |
| 10 | Squad Formation | Specialized agent allocation |

### Infrastructure & Modeling (S11-16) — ✅ NOW
| # | Stage | Engine |
|---|-------|--------|
| 11 | Architecture Planning | Bootstrap + foundation scaffold |
| 12 | Domain Model Generation | Module graph + dependency intelligence |
| 13 | AI Domain Analysis | Entity/relationship extraction via LLM |
| 14 | Schema Bootstrap | Isolated PostgreSQL schema |
| 15 | DB Provisioning | Tables + RLS + storage |
| 16 | Data Model Generation | SQL tables, FK, indexes, RLS |

### Code Generation (S17-19) — ✅ NOW
| # | Stage | Engine |
|---|-------|--------|
| 17 | Business Logic Synthesis | Services, validations, workflows |
| 18 | API Generation | REST, RPCs, triggers, webhooks |
| 19 | UI Generation | Pages, components, hooks, navigation |

### Validation & Publish (S20-23) — ✅ NOW
| # | Stage | Engine |
|---|-------|--------|
| 20 | Validation | AI + deep analysis + drift detection |
| 21 | Build | Runtime validation via CI |
| 22 | Test | Self-healing build repair |
| 23 | Publish | Atomic Git Tree API |

### Growth & Evolution (S24-32) — Mixed
| # | Stage | Horizon |
|---|-------|---------|
| 24 | Observability | ✅ NOW |
| 25-27 | Analytics + Growth | 📋 LATER |
| 28 | Adaptive Learning | ✅ NOW |
| 29-30 | Product/Architecture Evolution | 📋 LATER |
| 31-32 | Portfolio + System Evolution | 📋 FUTURE |

---

## Edge Functions (50+)

```
supabase/functions/
├── Discovery & Architecture      (5 functions)
├── Infrastructure & Modeling      (8 functions)
├── Code Generation                (3 functions)
├── Validation & Publish           (6 functions)
├── Growth & Evolution             (9 functions)
├── Venture Intelligence           (4 functions — FUTURE)
├── Pipeline Control               (7 functions)
├── Support                        (11 functions)
└── _shared/                       (15 helper modules)
```

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

## System Maturity

| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ |
| Level 4 | Self-Learning Software Factory | 🔄 Transitioning |
| Level 5 | Autonomous Startup Factory | 🔮 Planned |

> Current position: Level 3 → Level 4 transition. Kernel stabilization is the prerequisite.

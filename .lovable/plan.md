# AxionOS — Execution Plan

> Last updated: 2026-03-06
> Mode: **Kernel Hardening & Product Proof**

---

## Strategic Directive

**AxionOS is no longer in architecture expansion mode.**
**AxionOS is now in kernel hardening and product proof mode.**

The architecture is sufficient. The focus is now:
1. Stabilize the kernel
2. Improve reliability and cost visibility
3. Define one clear product proof
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

### P2 — Clarify the Product Proof

| Task | Status |
|------|--------|
| Position AxionOS as "idea → governed MVP" | 🔧 In Progress |
| Simplify UX messaging around core use case | 🔧 In Progress |
| Landing / onboarding focused on single flow | 📋 Planned |

### P3 — Package for Real Usage

| Task | Status |
|------|--------|
| Onboarding flow improvement | 📋 Planned |
| Initiative creation UX simplification | 📋 Planned |
| Execution transparency (live pipeline view) | 🔧 In Progress |
| Export / deploy actions | 📋 Planned |
| Billing readiness | 📋 Planned |
| Workspace consistency | 📋 Planned |

### P4 — Delay Broader Platform Ambition

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

## Success Metrics

| Metric | Target |
|--------|--------|
| Pipeline success rate (no manual intervention) | > 80% |
| Build OK rate | > 90% |
| Average retries per initiative | < 2 |
| Automatic repair success rate | > 70% |
| Cost per initiative | Tracked & declining |
| Cost per useful output | Tracked & declining |
| Time from idea to validated repository | < 15 min |
| Pipeline progress clarity for user | Clear visual feedback |

> Pipeline contracts: [docs/PIPELINE_CONTRACTS.md](../docs/PIPELINE_CONTRACTS.md) | Agents: [docs/AGENTS.md](../docs/AGENTS.md) | Roadmap: [docs/ROADMAP.md](../docs/ROADMAP.md)

---

## What the UI Should Emphasize

1. **Initiative creation** — simple, guided, one flow
2. **Pipeline progress** — real-time stage visualization
3. **Cost visibility** — per-initiative, per-stage costs
4. **Output access** — clear path to generated repository
5. **Error transparency** — what failed, why, what was repaired

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
  Harden Kernel               Build Learning Agents
  Prove Product                Improve Agent Intelligence
  Package for Users            Expand to Product Intelligence
```

Everything else waits.

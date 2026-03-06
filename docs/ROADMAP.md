# AxionOS — System Evolution Roadmap

> **Vision**: AxionOS is an autonomous software engineering platform that transforms ideas into governed, validated repositories.
>
> **Current Mode**: Kernel Hardening & Product Proof
>
> Last updated: 2026-03-06

---

## Strategic Directive

AxionOS has a strong architectural foundation. The architecture is sufficient.

**The focus is now:**
1. Stabilize the kernel
2. Prove the product (Governed SaaS / MVP Generator)
3. Package for real users
4. Postpone broader platform ambitions until after validation

**Rule:** No new architecture unless it directly improves reliability, cost, execution speed, product clarity, or sellability.

---

## Implementation Horizons

```
  NOW                    NEXT                   LATER
  ──────────►            ──────────►            ──────────►
  Harden Kernel          Build Learning         Expand Platform
  Prove Product          Agents                 Intelligence
  Package for Users
```

---

## NOW — Harden the Kernel & Prove the Product

**Priority:** Highest
**Status:** 🔧 In Progress

### First Product Proof: Governed SaaS / MVP Generator

A user submits an idea → AxionOS produces:
- Structured discovery (market analysis, feasibility)
- Architecture (system design, tech stack)
- PRD (product requirements)
- Stories & subtasks (backlog with acceptance criteria)
- Scaffold / initial code (business logic, API, UI)
- Runtime validation (tsc + vite)
- Repository output (Git with atomic commits)
- Pipeline traceability (full audit trail)

### What to Keep Active

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

### What to Improve Now

| Task | Purpose | Status |
|------|---------|--------|
| Pipeline completion reliability | Reduce failures across stages | 🔧 In Progress |
| Build success rate | Improve first-attempt success | 🔧 In Progress |
| Typed error taxonomy | Standardize failure modes across 32 stages | 🔧 In Progress |
| Pipeline visualization | Simplify control-center UI | 🔧 In Progress |
| Onboarding flow | Guide users to first initiative | 📋 Planned |
| Initiative creation UX | Simplify idea-to-pipeline flow | 📋 Planned |
| Export / deploy actions | Clear path to generated repository | 📋 Planned |
| Billing readiness | Usage tracking + payment | 📋 Planned |

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

### Success Metrics

| Metric | Target |
|--------|--------|
| Pipeline success rate (no manual intervention) | > 80% |
| Build OK rate | > 90% |
| Average retries per initiative | < 2 |
| Automatic repair success rate | > 70% |
| Cost per initiative | Tracked & declining |
| Time from idea to validated repository | < 15 min |
| Pipeline progress clarity for user | Clear visual feedback |

### Expected Outcome

AxionOS becomes a focused, reliable, sellable product: the Governed SaaS / MVP Generator.

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

### Agent OS Foundation (Already Designed)

The Agent OS v1.0 architecture provides the structural foundation:
- **Adaptive Routing** — performance feedback loop
- **Memory System** — persistent memory with retention policies
- **Observability** — telemetry for learning
- **Governance** — trust levels to gate learned behaviors

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

These layers remain part of the long-term vision but do not drive implementation decisions now.

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
> The immediate goal is not Level 4. The immediate goal is **product validation at Level 3**.

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

## Governing Principle

> The architecture is sufficient. The product is not yet proven.
> Every implementation decision must serve kernel reliability, cost visibility, or product proof.
> No expansion until the first product is validated with real users.

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

### 1. Initiative Creation AI-First

**Goal:** Transform idea intake into an AI-assisted flow that produces a structured initiative brief before entering the pipeline.

**Purpose:** Improve pipeline success rate by providing structured inputs instead of raw text.

**Capabilities:**

- AI analyzes raw idea text
- Generates structured initiative blueprint (market opportunity, feasibility, features, architecture hints)
- Allows user review and correction
- Produces canonical `initiative_brief` object
- Starts pipeline using the structured brief

**Expected Output: `initiative_brief`**

| Field | Description |
|-------|-------------|
| `name` | Initiative name |
| `description` | Short description |
| `problem` | Problem statement |
| `target_users` | Target audience |
| `product_type` | SaaS, Marketplace, API, etc. |
| `core_features` | List of key features |
| `integrations` | Required integrations (auth, payments, etc.) |
| `tech_preferences` | Optional technical preferences |
| `deployment_target` | Vercel, Netlify, etc. |
| `complexity_estimate` | AI-estimated complexity |
| `generation_depth` | discovery / prd_architecture / prd_arch_stories / full_pipeline |
| `expected_outputs` | What the pipeline should produce |

> **This becomes the official input contract for the pipeline.**

**Status:** 🔧 In Progress (wizard implemented, blueprint generation operational)

---

### 2. Deploy Contract Completion

**Goal:** Close the loop from Idea → Deploy with clear states and metadata.

**Enhancements:**

- Define deploy states across the full lifecycle
- Persist deploy metadata for traceability
- Track deploy success rate
- Integrate with Vercel or equivalent deployment targets

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

**Deploy Metadata:**

| Field | Description |
|-------|-------------|
| `repo_url` | GitHub repository URL |
| `commit_hash` | Latest commit hash |
| `build_status` | tsc + vite build result |
| `deploy_url` | Live deployment URL |
| `health_status` | Post-deploy health check |

**Status:** 📋 Planned

---

### 3. Product-Level Observability

**Goal:** Expose product success metrics, not only agent telemetry.

**New Metrics:**

| Metric | Description | Target |
|--------|-------------|--------|
| `pipeline_success_rate` | Initiatives completing without manual intervention | > 80% |
| `build_success_rate` | First-attempt build success | > 90% |
| `deploy_success_rate` | Successful deployments | > 85% |
| `average_retries_per_initiative` | Retry count per initiative | < 2 |
| `automatic_repair_success_rate` | Self-healing success | > 70% |
| `cost_per_initiative` | Total AI cost per initiative | Tracked & declining |
| `time_idea_to_repo` | Time from idea to repository | < 15 min |
| `time_idea_to_deploy` | Time from idea to live deployment | < 20 min |

**Dashboard Requirement:** Initiative Lifecycle Dashboard — a single view showing the full journey of each initiative from idea to deployment, with cost, duration, and success metrics.

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
> **Current focus:** Product Proof Closure.
> **Next capability:** AI-First Initiative Creation.

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
> Every implementation decision must serve product proof closure: structured inputs, reliable execution, and successful deployment.
> No expansion until the first product is validated with real users.

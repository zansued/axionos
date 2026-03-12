# AxionOS Context File

> **Purpose:** Restore system understanding quickly when prior conversation context is unavailable.
> **Last Updated:** 2026-03-12

---

## System Identity

AxionOS is a **governed operating system for autonomous product creation**.
Its core promise is transforming an idea into validated, deployable software while improving its own execution capability over time.

**Core product journey:**

> Idea → Discovery → Architecture → Engineering → Validation → Deploy → Delivered Software

The system is designed as an adaptive operational organism that combines deterministic execution pipelines with governed agent intelligence.

---

## System Nature

AxionOS is **not** a chatbot, IDE assistant, or simple agent framework.

It is an infrastructure platform designed to:

- Orchestrate software creation workflows
- Coordinate specialized AI agents
- Learn from execution outcomes
- Improve operational strategies
- Maintain strict governance boundaries

The system behaves as a **controlled cybernetic organism**.

---

## Architecture Model

AxionOS architecture is divided into **four surfaces**.

| # | Surface | Description |
|---|---------|-------------|
| 1 | **Internal System Architecture** | Deep system engines responsible for execution, intelligence, learning, and calibration |
| 2 | **Advanced Operator Surface (Owner Mode)** | Workspace for reviewing outcomes, inspecting evidence, governance decisions, and supervising system evolution |
| 3 | **Platform Governance Surface** | Institutional control layer ensuring system safety, mutation boundaries, and policy enforcement |
| 4 | **User Product Surface (Builder Mode)** | The visible product interface where users move through the idea → deploy journey |

These layers must **never** be collapsed into a single interface.

---

## Workspace Mode Separation

| Mode | Path | Purpose |
|------|------|---------|
| **Builder Mode** | `/builder/*` | Tactical engineering — Dashboard, Projects, Agents, Pipelines, Runtime, Execution Observability |
| **Owner Mode** | `/owner/*` | Strategic governance — System Intelligence, Canon Intelligence, Governance Decisions, Insights, Handoff, Application Tracking, Security |

Builder Mode is for building and shipping software.
Owner Mode is for governing the platform's intelligence and evolution.

---

## System Cognitive Model

AxionOS should be understood as a **governed cognitive-operational system**. It does not merely execute tasks — it perceives, evaluates, constrains, formalizes, orchestrates, and learns.

The system's cognition follows a strict layered model where each layer has a defined role and cannot assume the role of another. This prevents the system from degenerating into unstructured agent behavior.

**Core cognitive principle:**
> The system knows before it evaluates, evaluates before it constrains, constrains before it formalizes, formalizes before it orchestrates, and orchestrates before it acts.

This cognitive model is what distinguishes AxionOS from conventional agent frameworks that allow unrestricted agent improvisation.

---

## Operational Decision Chain

AxionOS follows a strict six-layer decision and execution chain. All operational behavior respects this flow:

```
Canon / Library           — informs
   ↓
Readiness / Events / Metrics  — evaluates
   ↓
Policy / Governance       — constrains
   ↓
Axion Action Engine       — formalizes (Axion-style XML artifacts)
   ↓
AgentOS Orchestrator      — orchestrates (AIOS Round Robin Scheduler)
   ↓
Agent Executor / Human    — acts (with Auto-Healing)
```

**Canonical Rule:**
- Canon informs
- Readiness evaluates
- Policy constrains
- Action Engine formalizes
- AgentOS orchestrates
- Executors act

No layer may assume the responsibilities of another. Canon never triggers actions. Policy never executes. The Action Engine never runs agents directly. This separation prevents the system from degenerating into unstructured agent chaos.

For full details, see **[ARCHITECTURE.md](ARCHITECTURE.md) — Section 4B: Operational Decision Chain**.

---

## Subsystem Roles

| Subsystem | Role |
|-----------|------|
| **Canon** | Validated institutional knowledge — patterns, strategies, rules, playbooks. The system's long-term memory. |
| **Pattern Library** | Reusable implementation patterns extracted from execution evidence. Queried by agents at runtime. |
| **Readiness** | Deterministic evaluation of system state. Produces blockers, warnings, and readiness scores. |
| **Metrics** | Quantitative signals with source, confidence, and timestamp. Foundation for state evaluation. |
| **Events** | System-generated signals from pipeline execution, agent activity, and runtime behavior. |
| **Policy** | Governance rules that constrain what actions are permitted and under what conditions. |
| **Governance** | Structural approval workflows, mutation review, and compliance enforcement. |
| **Action Engine** | Formalizes triggers into intents, applies policy, and produces auditable action records using Axion-style XML. |
| **AgentOS** | Orchestrates agent selection, context assembly, knowledge injection, and task dispatch. |
| **Executors** | Final execution layer — agents, humans, or external systems that perform the action. |
| **Learning Loop** | Collects execution evidence, extracts patterns, promotes to canon, and feeds improvement. |

---

## Axion Action Engine

The Axion Action Engine is the formalization layer between governance evaluation and agent execution.

**Key capabilities:**
- Transforms triggers (events, signals, user prompts) into formal ActionIntents
- Applies policy-aware resolution using the **strictest-wins** principle (Blocked > Manual > Approval > Auto)
- Produces auditable ActionRecords with full lineage
- Supports human approval hooks with TTL-based expiration
- Uses Axion-style XML artifacts (`<axionArtifact>`, `<axionAction>`) for structured output
- Routes formalized actions to the AgentOS AIOS Round Robin Scheduler

**Status:** Implemented and operational (Sprints 139–142).

---

## Governance Decision Lifecycle

AxionOS manages governance changes through three distinct lifecycle domains:

1. **Decision Workflow** — 13-state formal review process (Draft → Closed) for governance proposals
2. **Execution Handoff** — 8-state lifecycle that transforms approved decisions into validated instruction packages
3. **Change Application Tracking** — Monitors downstream application, scope compliance, and outcome observation

These domains ensure that "Approved" (governance), "Released" (handoff), and "Applied" (operational) remain distinct concepts.

---

## Decision Logic

The canonical decision logic of AxionOS follows this sequence:

1. **Knowledge informs** — Canon and Pattern Library provide validated operational knowledge to all downstream layers
2. **Signals evaluate** — Metrics, Events, and Readiness transform system state into auditable signals
3. **Policy constrains** — Governance rules determine whether an action is permitted and under what execution mode
4. **Actions are formalized** — The Action Engine maps triggers to intents, applies policy, and creates action records
5. **Orchestration coordinates execution** — AgentOS selects agents, assembles context, injects knowledge, and dispatches tasks
6. **Execution returns evidence** — Executors produce results that are captured as execution evidence
7. **Evidence feeds learning** — Evidence is analyzed, patterns are extracted, and validated knowledge is promoted back into Canon

This creates a **closed feedback loop** where every execution improves future executions.

---

## Why This Separation Exists

The layered separation of the Operational Decision Chain exists to prevent four critical failure modes:

1. **UI-driven decision making** — The UI surfaces should display state, not drive operational decisions. Decisions must flow through the canonical chain.

2. **Agent improvisation without policy** — Agents must operate under governance constraints. Without policy evaluation, agents can produce unpredictable, ungoverned behavior.

3. **Knowledge layers executing actions** — Canon and Pattern Library exist to inform, not to act. If knowledge layers trigger actions directly, the system loses auditability and predictability.

4. **Governance being bypassed** — Every important action must pass through policy evaluation. Bypassing governance creates ungoverned state mutations that cannot be audited or rolled back.

Systems with agents but without architectural boundaries tend to evolve from **distributed intelligence** into **distributed chaos** rapidly. The Operational Decision Chain is AxionOS's primary defense against this degradation.

---

## Core Engines

AxionOS is powered by multiple coordinated engines:

- **Execution Pipeline Core** — Deterministic pipeline that converts product ideas into software artifacts
- **Operational Intelligence Engine** — Analyzes execution outcomes, detects patterns, and improves operational strategies
- **Learning Engine** — Transforms execution evidence into recommendations and bounded system improvements
- **Execution Governance Engine** — Ensures all structural changes follow governance rules and human approval
- **Platform Intelligence Engine** — Maintains system-level awareness and performance insights
- **Platform Self-Calibration Engine** — Maintains system stability and operational equilibrium
- **Execution Strategy Evolution Engine** — Explores and refines better strategies for software creation
- **Axion Action Engine** — Formalizes triggers into governed ActionRecords with policy-aware resolution

---

## Pipeline Principle

The system relies on a **deterministic execution pipeline**.

All execution follows a defined DAG sequence of stages. Agents may assist and enhance execution but **cannot arbitrarily change pipeline structure**.

This ensures:

- Predictability
- Reliability
- Auditability

---

## Agent Operating System

AxionOS coordinates agents under a structured ontology. Five fundamental agent types exist:

| Type | Role |
|------|------|
| **Perception Agents** | Interpret context and incoming information |
| **Design Agents** | Produce architecture and planning artifacts |
| **Build Agents** | Generate code and technical assets |
| **Validation Agents** | Evaluate artifact quality and system correctness |
| **Evolution Agents** | Analyze evidence and propose improvements |

Agents operate under governance rules and **cannot modify system architecture autonomously**.

---

## Learning Model

System learning follows a bounded cycle:

1. Observation
2. Evidence collection
3. Analysis
4. Recommendation
5. Human-approved adjustment

All learning is **advisory-first**. The system never mutates its own architecture without governance review.

---

## System Invariants

The following rules **cannot be violated**:

- **advisory-first** — all intelligence outputs are recommendations
- **governance before autonomy** — human approval for structural change
- **rollback everywhere** — every change preserves rollback capability
- **bounded adaptation** — all learning within declared envelopes
- **human approval for structural change** — no autonomous architecture mutation
- **tenant isolation** — all data scoped by organization_id with RLS
- **no autonomous architecture mutation** — forbidden mutation families enforced

These invariants act as the **physical laws** of the platform.

---

## Sprint Canon

- **Sprints 1–163** represent the canonical development arc of the platform
- **Blocks Foundation through AH** are complete
- The system has reached **Level 10+ maturity: Adaptive Operational Organism**
- **200+ Edge Functions** deployed across all pipeline stages and intelligence engines
- **Key milestones post-138:**
  - Sprint 139–142: Axion Action Engine (AE Block)
  - Sprint 143–146: Security Surface (AF Block)
  - Sprint 147–150: Adoption Intelligence & User Journey (AG Block)
  - Sprint 151–154: Landing Page, Builder/Owner Mode, Prompt Drawer (AG Block)
  - Sprint 155–158: Governance Review Workflow (AH Block)
  - Sprint 159–163: Governance Surfaces — Insights, Decisions, Handoff, Application Tracking (AH Block)

Future work focuses on improving:

- Intelligence quality and advisory precision
- Product experience and adoption feedback loop
- Institutional governance across distributed contexts
- Long-horizon system resilience
- Canon intelligence operational depth
- Real downstream execution of Action Engine packages

---

## System Maturity Phases

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | UI Scaffolding | Complete |
| Phase 2 | Navigation Contract | Complete |
| Phase 3 | Metrics and Data Integrity | Complete |
| Phase 4 | Readiness Engine | Complete |
| Phase 5 | Canon and Library Operationalization | Complete |
| Phase 6 | AgentOS Decision Contract | Complete |
| Phase 7 | Action Engine | Complete (Sprints 139–142) |
| Phase 8 | Governance and Approval Flow | Complete (Sprints 155–163) |
| Phase 9 | Self-Healing and Recovery | Partial (auto-repair exists, full governed recovery in progress) |
| Phase 10 | Learning Feedback Loop | Partial (learning engines exist, full closed-loop in progress) |

---

## Documentation Map

To understand the system fully:

1. Read **[README.md](README.md)** — platform thesis, canon boundaries, and invariants
2. Read **[ARCHITECTURE.md](ARCHITECTURE.md)** — structural architecture, layers, containers, data flow
3. Read **[GOVERNANCE.md](GOVERNANCE.md)** — Agent OS modules, contracts, and governance reference
4. Read **[diagrams/system-brain-map.md](diagrams/system-brain-map.md)** — canonical visual brain map

`AXION_CONTEXT.md` exists only to **restore understanding quickly**.

---

## Development Principles

Future development must follow strict rules:

- Work **sprint by sprint**
- Never casually reopen completed canon
- Preserve architecture boundaries
- Maintain deterministic execution pipelines
- Protect governance integrity

AxionOS evolves through **disciplined iteration**, not uncontrolled autonomy.

---

## Long-Term Vision

AxionOS aims to become a new category of infrastructure: **an operating system for autonomous product creation**.

It is designed to help individuals and organizations transform ideas into working software systems with increasing intelligence, reliability, and strategic awareness.

The platform should eventually function as a **governed digital organism** capable of continuously improving how software is created.

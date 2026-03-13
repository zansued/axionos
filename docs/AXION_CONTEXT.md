# AxionOS Context File

> **Purpose:** Restore system understanding quickly when prior conversation context is unavailable.
> **Last Updated:** 2026-03-13

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
- Supports human approval hooks with TTL-based expiration and automated expiration scheduling
- Uses Axion-style XML artifacts (`<axionArtifact>`, `<axionAction>`) for structured output
- Routes formalized actions to the AgentOS AIOS Round Robin Scheduler
- Enforces a **formal domain state machine** (14 states, 24 transitions) with explicit guards, allowed actors, side effects, and audit event types per transition
- Provides cross-surface navigation between Action Center and Approval Queue
- Supports governed recovery simulation with audit trail

**Status:** Implemented and operational (Sprints 139–142, hardened in Block AI: Sprints 164–169).

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

System learning follows a **complete knowledge metabolism pipeline**:

1. **Repository Analysis** — Absorb engineering knowledge from codebases and execution history
2. **Execution Signals** — Capture outcomes, errors, successes, and patterns from runtime
3. **Learning Candidates** — Generate candidate knowledge entries from signals and analysis
4. **Candidate Evaluation** — Score candidates by confidence, evidence strength, and domain fit
5. **Pattern Deduplication** — Merge overlapping or redundant candidates intelligently
6. **Canon Promotion** — Promote validated candidates into the canonical knowledge base
7. **Distilled Knowledge** — Compress canon entries into efficient cues and micro-skills
8. **Skill Injection** — Inject distilled knowledge into agent context at runtime
9. **Execution Feedback** — Measure impact of injected knowledge on execution quality
10. **Architecture Heuristics** — Extract architectural rules from success/failure patterns
11. **Self-Improvement Proposals** — Generate governed proposals for system self-improvement

All learning is **advisory-first and governance-constrained**. The system never mutates its own architecture without governance review. Self-improvement proposals must pass through the Governance Decision Surface.

---

## Knowledge Metabolism

AxionOS operates as a **knowledge metabolism system** — it ingests, digests, distills, and applies knowledge in a continuous governed cycle:

```
source → candidate → evaluation → merge/deduplication → canon promotion
→ distilled knowledge → runtime injection → execution feedback
→ learning signals → architecture improvement proposals → governance review
```

Each stage has explicit ownership:
- **Ingestion**: Repository Absorption Engine, Execution Evidence Collectors
- **Processing**: Learning Candidates Pipeline, Pattern Deduplication
- **Promotion**: Canon Promotion Workflow (governance-gated)
- **Distillation**: Canon Distillation Engine, Skill Distillation Engine
- **Application**: Agent Skill Injection Runtime, Token Budget Engine
- **Feedback**: Neural Feedback Loop, Runtime Learning Efficiency Dashboard
- **Evolution**: Self-Improvement Proposal Engine (governance-gated)

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

- **Sprints 1–185** represent the canonical development arc of the platform
- **Blocks Foundation through AN** are complete
- The system has reached **Level 15 maturity: Renewal-to-Governance Decision Bridge**
- **200+ Edge Functions** deployed across all pipeline stages and intelligence engines
- **Key milestones post-138:**
  - Sprint 139–142: Axion Action Engine (AE Block)
  - Sprint 143–146: Security Surface (AF Block)
  - Sprint 147–154: Adoption Intelligence, Landing Page, Builder/Owner Mode (AG Block)
  - Sprint 155–163: Governance Decision Lifecycle — Surfaces, Handoff, Tracking (AH Block)
  - Sprint 164–171: Repository Intelligence & Institutional Learning (AI Block)
  - Sprint 172–179: Self-Improving Architecture Engine (AJ Block)
  - Sprint 180–181: Knowledge Provenance & Trust-Weighted Intelligence (AK Block)
  - Sprint 182–183: Knowledge Renewal & Revalidation Engine (AL Block)
  - Sprint 184: Canon Intelligence Hub Restructuring — cognitive domain grouping, Skills layer (AM Block)
  - Sprint 185: Execution Architecture Evolution — adaptive risk-based routing, evidence-informed policy (AN Block)

Future work focuses on improving:

- Intelligence quality and advisory precision
- Product experience and adoption feedback loop
- Institutional governance across distributed contexts
- Long-horizon system resilience
- Canon intelligence operational depth
- Skills layer maturation and full operational coverage
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
| Phase 9 | Governed Execution Path | Complete (Sprints 139–142) |
| Phase 10 | Canon Pipeline Operationalization | Complete (Sprints 155–163) |
| Phase 11 | Repository Intelligence & Institutional Learning | Complete (Sprints 164–171) |
| Phase 12 | Self-Improving Architecture Engine | Complete (Sprints 172–179) |
| Phase 13 | Knowledge Provenance & Trust-Weighted Intelligence | Complete (Sprints 180–181) |
| Phase 14 | Knowledge Renewal & Revalidation | Complete (Sprints 182–183) |

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

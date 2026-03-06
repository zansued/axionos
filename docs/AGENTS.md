# AxionOS — Agent OS Reference

> Consolidated reference for the Agent Operating System architecture.
> Replaces individual AGENT_*.md files.
>
> Last updated: 2026-03-06

---

## 1. Architecture Overview

The Agent OS is a **layered, contract-first** system with 14 modules across 5 architectural planes.

```
+-------------------------------------------------------------------+
|                       ECOSYSTEM PLANE                              |
|   Marketplace - Capability Registry - Package Manager - Trust      |
+-------------------------------+-----------------------------------+
                                | discovery
+-------------------------------+-----------------------------------+
|                       EXECUTION PLANE                              |
|   Orchestrator - Coordination - Distributed Runtime                |
|   LLM Adapter - Tool Adapter - Event Bus - Agent Registry          |
+-----------+-----------------------+-------------------+-----------+
            | decisions             | persistence       | telemetry
+-----------+----------+  +---------+---------+  +------+----------+
|    CONTROL PLANE     |  |    DATA PLANE     |  |   DATA PLANE    |
|   Selection Engine   |  |   Artifact Store  |  |  Observability  |
|   Policy Engine      |  |   Memory System   |  |  Audit Ledger   |
|   Governance Layer   |  |                   |  |                 |
|   Adaptive Routing   |  |                   |  |                 |
+-----------+----------+  +---------+---------+  +------+----------+
            |                       |                    |
+-----------+-----------------------+--------------------+----------+
|                         CORE PLANE                                 |
|   Runtime Protocol - Capability Model - Core Types                 |
|   (Contracts, Schemas, Identity -- no state, no side effects)      |
+-------------------------------------------------------------------+
```

### Dependency Rules

```
Ecosystem  --> Core
Execution  --> Control, Data, Core
Control    --> Core
Data       --> Core
Core       --> (nothing)
```

---

## 2. Five Fundamental Agent Types

| Agent Type | Responsibility | Example Modes |
|-----------|---------------|---------------|
| **Perception** | Interprets ideas, requirements, market signals, context | `idea_intake`, `requirement_analysis`, `market_signal` |
| **Design** | Creates architecture, domain models, data models, API designs | `architecture`, `domain_modeling`, `data_modeling`, `api_design` |
| **Build** | Generates code, UI, configs, migrations, artifacts | `business_logic`, `api_generation`, `ui_generation` |
| **Validation** | Static analysis, runtime validation, QA, architectural checks | `static_analysis`, `runtime_build`, `drift_detection` |
| **Evolution** | Repair, learning, pattern extraction, prompt optimization | `build_repair`, `error_learning`, `pattern_extraction` |

### Specialization Model

```
Agent Specialization = Mode + Tools + Memory + Contract
```

---

## 3. Module Inventory

| # | Module | File | Plane | Version | Purpose |
|---|--------|------|-------|---------|---------|
| 1 | Runtime Protocol | `protocol.ts` | Core | v0.1 | Agent identity, task contracts, artifact schemas |
| 2 | Capability Model | `capabilities.ts` | Core | v0.2 | Capability declaration, matching, scoring, evolution |
| 3 | Core Types | `types.ts` | Core | v0.1 | Foundational types and enums |
| 4 | Selection Engine | `selection.ts` | Control | v0.2 | Agent selection & ranking by capability scores |
| 5 | Policy Engine | `policy-engine.ts` | Control | v0.2 | Policy evaluation, trust levels (6 tiers), autonomy limits |
| 6 | Governance Layer | `governance.ts` | Control | v1.1 | Approval workflows, access control, compliance, audit |
| 7 | Adaptive Routing | `adaptive-routing.ts` | Control | v0.7 | Performance feedback loop, routing signal analysis, exploration strategies |
| 8 | Orchestrator | `orchestrator.ts` | Execution | v0.1 | Task orchestration, agent dispatch |
| 9 | Agent Registry | `registry.ts` | Execution | v0.1 | Agent registration & lookup |
| 10 | Event Bus | `event-bus.ts` | Execution | v0.1 | Async event emission & subscription |
| 11 | Multi-Agent Coordination | `coordination.ts` | Execution | v0.8 | Debate, consensus, planner-executor patterns |
| 12 | Distributed Runtime | `distributed-runtime.ts` | Execution | v0.9 | Distributed task scheduling, worker management |
| 13 | LLM Adapter | `llm-adapter.ts` | Execution | v0.4 | LLM invocation with provider abstraction |
| 14 | Tool Adapter | `tool-adapter.ts` | Execution | v0.5 | External tool execution with sandboxing |
| 15 | Artifact Store | `artifact-store.ts` | Data | v0.1 | Versioned storage with lineage DAG, deduplication by SHA-256 |
| 16 | Memory System | `memory-system.ts` | Data | v0.6 | 6 memory types, embedding-based search, retention policies |
| 17 | Observability | `observability.ts` | Data | v0.3 | Telemetry, cost tracking, execution tracing, audit ledger |
| 18 | Marketplace | `marketplace.ts` | Ecosystem | v1.0 | Capability registry, package management, trust scoring |

---

## 4. Core Plane — Identity & Contracts

**Purpose:** Define what agents are, what they can do and how they communicate.

### Key Contracts

- `AgentIdentity` / `AgentProfile` — Who the agent is
- `CapabilityDeclaration` / `CapabilityCatalog` — What it can do
- `AgentTask` / `AgentResponse` — How tasks are defined and results returned
- `ArtifactEnvelope` / `ArtifactKind` — How outputs are packaged
- `ValidationReport` — How quality is assessed
- `RetryPolicy` / `RollbackPolicy` — How failures are handled

### Capability Model

Agents declare capabilities with:
- **Domain** — what area (frontend, backend, database, architecture)
- **Proficiency** — numeric score (0.0 - 1.0)
- **Evidence** — historical execution data backing the score
- **Evolution** — capabilities improve over time via feedback

Selection uses multi-dimensional scoring: capability match × trust level × cost efficiency × historical performance.

---

## 5. Control Plane — Decisions & Governance

**Purpose:** Decide which agent runs, under what rules, with what trust level.

### Selection Engine
- Multi-criteria ranking: capability score, trust tier, cost, latency
- Supports exploration strategies (ε-greedy, UCB, Thompson sampling)
- Override management for manual agent assignment

### Policy Engine
- 6 trust tiers: `untrusted` → `provisional` → `standard` → `trusted` → `expert` → `autonomous`
- Each tier defines: max autonomy level, allowed actions, approval requirements
- Policies can be stage-specific or organization-wide

### Governance Layer
- Approval workflows with configurable gate permissions
- SLA enforcement per stage (`stage_sla_configs`)
- Access control per role (`pipeline_gate_permissions`)
- Complete audit trail (`audit_logs`)

### Adaptive Routing
- Performance feedback loop: success rate, latency, cost per task
- Automatic rebalancing when agent performance degrades
- A/B routing for prompt optimization (NEXT horizon)

---

## 6. Execution Plane — Orchestration & Work

**Purpose:** Execute agent tasks, coordinate multi-agent workflows, distribute work.

### Orchestrator
- DAG-based topological scheduling (Kahn's algorithm)
- Wave computation for maximum parallelism
- 6 concurrent workers per execution
- Time-budget management with auto-continuation

### Coordination Patterns
- **Debate** — Multiple agents propose, evaluate, converge
- **Consensus** — Voting-based agreement
- **Planner-Executor** — One agent plans, others execute
- **Pipeline** — Sequential handoff between specialists

### Distributed Runtime
- Worker registration and health monitoring
- Task queue with priority scheduling
- Failure detection and automatic reassignment

### Adapters
- **LLM Adapter** — Provider-agnostic LLM invocation with prompt compression, caching, model routing
- **Tool Adapter** — External tool execution with sandboxing, timeout, retry

---

## 7. Data Plane — State & Knowledge

**Purpose:** Persist artifacts, memory, telemetry and audit records.

### Artifact Store
- Immutable versioning with content-hash deduplication (SHA-256)
- Lineage DAG — full provenance tracking from input to output
- Run Artifact Manifest — reconstructs complete reasoning chain
- Kinds: `code`, `config`, `schema`, `document`, `model`, `test`, `report`

### Memory System
- **6 memory types:** run, episodic, semantic, vector, procedural, meta
- Vector-native with pgvector (768-dim) for semantic retrieval
- Retention policies: TTL, importance, access-based, capacity
- Cross-execution learning: patterns, decisions, errors
- 12 observable event types via EventBus

### Observability
- Execution tracing with `run_id` / `trace_id` correlation
- Per-model, per-stage, per-initiative cost tracking
- SLA breach detection and alerting
- Performance metrics: latency, token usage, success rate

---

## 8. Ecosystem Plane — Discovery & Distribution

**Purpose:** Enable agent and capability sharing across environments.

> **Status:** ❄️ Frozen — not needed for current product proof.

- Capability registry with semantic versioning
- Package management for agent bundles
- Trust scoring for third-party agents
- Dependency resolution between capabilities

---

## 9. End-to-End Execution Flow

```
 1. Task arrives at Orchestrator                        [Execution]
 2. Orchestrator queries Selection Engine               [Control]
 3. Selection Engine checks Policy Engine               [Control]
 4. Governance Layer evaluates trust and autonomy       [Control]
 5. Adaptive Router applies routing adjustments         [Control]
 6. Agent selected, GovernanceDecision issued           [Control]
 7. If approval required: ApprovalEngine pauses         [Control]
 8. Orchestrator dispatches to Coordination Manager     [Execution]
 9. Coordination assigns roles via Selection Engine     [Control]
10. Agents execute via LLM/Tool Adapters                [Execution]
11. Artifacts stored in Artifact Store                  [Data]
12. Memory updated                                     [Data]
13. Telemetry recorded                                 [Data]
14. Audit record written                               [Data]
15. Events emitted via EventBus                        [Execution]
16. Adaptive Router consumes feedback                  [Control]
17. Result returned to caller                          [Execution]
```

---

## 10. Code Organization

```
supabase/functions/_shared/agent-os/
├── index.ts                    # Barrel exports
├── types.ts                    # Core types
├── protocol.ts                 # Runtime protocol
├── capabilities.ts             # Capability model
├── selection.ts                # Selection engine
├── policy-engine.ts            # Policy engine
├── governance.ts               # Governance layer
├── adaptive-routing.ts         # Adaptive routing
├── orchestrator.ts             # Orchestrator
├── registry.ts                 # Agent registry
├── event-bus.ts                # Event bus
├── coordination.ts             # Multi-agent coordination
├── distributed-runtime.ts      # Distributed runtime
├── llm-adapter.ts              # LLM adapter
├── tool-adapter.ts             # Tool adapter
├── artifact-store.ts           # Artifact store
├── memory-system.ts            # Memory system
├── memory.ts                   # Legacy memory (v0.1)
├── observability.ts            # Observability
├── marketplace.ts              # Marketplace (frozen)
├── utils.ts                    # Shared utilities
├── scoring.ts                  # Scoring functions
└── policies.ts                 # Default policies
```

---

## 11. Implementation Status

| Module | Status |
|--------|--------|
| All 14 core modules | ✅ Designed with full TypeScript contracts |
| Orchestrator + DAG Engine | ✅ Implemented and operational |
| Memory System (basic) | ✅ Implemented (`agent_memory` table) |
| Governance (gates, SLAs, audit) | ✅ Implemented |
| Observability + Cost Tracking | ✅ Implemented |
| Adaptive Learning | ✅ Implemented |
| Learning Agents | 📋 NEXT horizon |
| Prompt Optimization | 📋 NEXT horizon |
| Marketplace | ❄️ Frozen |
| Distributed Runtime (advanced) | ❄️ Frozen |

---

## 12. Governing Principle

> The Agent OS is a contract-driven, plane-separated architecture where decisions flow down from Control, execution flows through Execution, state flows into Data, identity is defined in Core, and discovery extends through Ecosystem. No plane may assume the responsibilities of another.

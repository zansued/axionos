# Agent OS v1.0 — Architecture Map

> Normative reference for the complete Agent OS architecture.
> This document defines planes, boundaries, dependency rules and the governing principle.

---

## 1. Architecture Rationale

The Agent OS is a **layered, contract-first** system that separates:

- **What** agents can do (capabilities, contracts)
- **Who** decides (selection, governance, policies)
- **How** work executes (orchestration, coordination, distribution)
- **Where** state lives (artifacts, memory, telemetry)
- **With whom** agents interact (marketplace, registries)

This separation yields five architectural planes, each with strict responsibility boundaries.

---

## 2. Architectural Planes

### 2.1 Core Plane — Identity & Contracts

**Purpose:** Define what agents are, what they can do and how they communicate.

**Modules:**
| Module | File | Version |
|---|---|---|
| Runtime Protocol | `protocol.ts` | v0.1 |
| Capability Model | `capabilities.ts` | v0.2 |
| Core Types | `types.ts` | v0.1 |

**Responsibilities:**
- Agent identity (`AgentIdentity`, `AgentProfile`)
- Capability declaration (`CapabilityDeclaration`, `CapabilityCatalog`)
- Task contracts (`AgentTask`, `AgentResponse`)
- Artifact schemas (`ArtifactEnvelope`, `ArtifactKind`)
- Validation contracts (`ValidationReport`)
- Failure & retry contracts (`RetryPolicy`, `RollbackPolicy`)

**Allowed dependencies:** None (leaf layer)

**Forbidden patterns:**
- Must NOT import from any other plane
- Must NOT reference execution, storage or network concerns
- Must NOT contain stateful logic

---

### 2.2 Control Plane — Decisions & Governance

**Purpose:** Decide which agent runs, under what rules, with what trust level.

**Modules:**
| Module | File | Version |
|---|---|---|
| Selection Engine | `selection.ts` | v0.2 |
| Policy Engine | `policy-engine.ts` | v0.2 |
| Governance Layer | `governance.ts` | v1.1 |
| Adaptive Routing | `adaptive-routing.ts` | v0.7 |

**Responsibilities:**
- Agent selection & ranking (`ISelectionEngine`)
- Policy evaluation (`IPolicyEngine`)
- Trust evaluation (`ITrustEvaluator`)
- Autonomy enforcement (`IAutonomyController`)
- Approval workflows (`IApprovalEngine`)
- Access control (`IAccessControlManager`)
- Compliance evaluation (`IComplianceEvaluator`)
- Routing signal analysis (`IAdaptiveRouter`)
- Override management (`IOverrideManager`)

**Allowed dependencies:** Core Plane (types & contracts only)

**Forbidden patterns:**
- Must NOT execute agent tasks directly
- Must NOT persist data (delegates to Data Plane)
- Must NOT import from Execution or Ecosystem planes

---

### 2.3 Execution Plane — Orchestration & Work

**Purpose:** Execute agent tasks, coordinate multi-agent workflows and distribute work.

**Modules:**
| Module | File | Version |
|---|---|---|
| Orchestrator | `orchestrator.ts` | v0.1 |
| Agent Registry | `registry.ts` | v0.1 |
| Event Bus | `event-bus.ts` | v0.1 |
| Multi-Agent Coordination | `coordination.ts` | v0.8 |
| Distributed Runtime | `distributed-runtime.ts` | v0.9 |
| LLM Adapter | `llm-adapter.ts` | v0.4 |
| Tool Adapter | `tool-adapter.ts` | v0.5 |

**Responsibilities:**
- Task orchestration (`AgentOS`)
- Agent registration & lookup (`AgentRegistry`)
- Event emission & subscription (`EventBus`)
- Multi-agent coordination loops (`ICoordinationManager`)
- Distributed task scheduling (`IDistributedRuntime`, `ITaskScheduler`)
- Worker management (`IWorkerRegistry`)
- LLM invocation (`ILLMAdapter`)
- Tool execution (`IToolAdapter`)

**Allowed dependencies:** Core Plane, Control Plane (for decisions), Data Plane (for persistence)

**Forbidden patterns:**
- Must NOT define contracts (those belong in Core Plane)
- Must NOT make governance decisions (delegates to Control Plane)
- Must NOT manage marketplace or registries

---

### 2.4 Data Plane — State & Knowledge

**Purpose:** Persist artifacts, memory, telemetry and audit records.

**Modules:**
| Module | File | Version |
|---|---|---|
| Artifact Store | `artifact-store.ts` | v0.1 |
| Memory System | `memory-system.ts` | v0.6 |
| Observability | `observability.ts` | v0.3 |

**Responsibilities:**
- Artifact storage & versioning (`IArtifactStore`)
- Artifact lineage tracking (`ArtifactLineageGraph`)
- Memory persistence & retrieval (`IMemoryStore`)
- Embedding-based search (`IMemoryEmbeddingProvider`)
- Retention policies (`MemoryRetentionPolicy`)
- Telemetry collection (`IObservabilityLayer`)
- Execution tracing (`ExecutionTrace`)
- Cost tracking (`CostMetrics`)
- Audit ledger (`IAuditLedger`)

**Allowed dependencies:** Core Plane (types only)

**Forbidden patterns:**
- Must NOT make decisions (no selection, no policy evaluation)
- Must NOT execute tasks
- Must NOT import from Control or Execution planes

---

### 2.5 Ecosystem Plane — Discovery & Distribution

**Purpose:** Enable agent and capability sharing across environments.

**Modules:**
| Module | File | Version |
|---|---|---|
| Marketplace | `marketplace.ts` | v1.0 |

**Responsibilities:**
- Capability registry (`ICapabilityRegistryClient`, `ICapabilityIndex`)
- Agent package management (`IPackageManager`)
- Registry synchronization (`IRegistrySyncService`)
- Trust scoring (`ITrustScoreEvaluator`)
- Dependency resolution (`DependencyResolutionResult`)
- Version management (`SemanticVersion`)

**Allowed dependencies:** Core Plane (types only)

**Forbidden patterns:**
- Must NOT execute tasks
- Must NOT make governance decisions
- Must NOT directly access memory or artifacts

---

## 3. Architecture Map

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

---

## 4. Dependency Rules

### 4.1 Allowed Dependency Direction

```
Ecosystem  --> Core
Execution  --> Control, Data, Core
Control    --> Core
Data       --> Core
Core       --> (nothing)
```

### 4.2 Forbidden Dependency Patterns

| From | To | Why |
|---|---|---|
| Core | Any | Core is the leaf; zero dependencies |
| Control | Execution | Decisions must not know how work runs |
| Control | Data | Decisions must not persist directly |
| Data | Control | Storage must not make decisions |
| Data | Execution | Storage must not trigger execution |
| Ecosystem | Control | Discovery must not enforce governance |
| Ecosystem | Execution | Discovery must not run tasks |

### 4.3 Cross-Plane Communication

All cross-plane communication flows through:
1. **Function calls** — Execution plane calls Control plane interfaces
2. **EventBus** — asynchronous event propagation (Execution emits, all planes consume)
3. **Contracts** — shared via Core plane types

---

## 5. End-to-End Execution Flow

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

## 6. Cross-Cutting Concerns

| Concern | Handled By | Plane |
|---|---|---|
| Event propagation | EventBus | Execution |
| Tracing and correlation | TraceMetadata (run_id, trace_id) | Core |
| Error handling | FailureAction, RetryPolicy | Core |
| Cost tracking | CostMetrics, CostRecord | Data |
| Audit trail | AuditLedger, AuditRecord | Data + Control |
| Versioning | SemanticVersion | Ecosystem |
| Scoring | CapabilityScorecard, ValidationScore | Core + Control |

---

## 7. Recommended Code Organization

```
supabase/functions/_shared/agent-os/
|
+-- index.ts                    # Barrel exports (public API)
|
+-- # -- Core Plane --
+-- types.ts                    # Foundational types
+-- protocol.ts                 # Runtime protocol contracts
+-- capabilities.ts             # Capability model
|
+-- # -- Control Plane --
+-- selection.ts                # Selection Engine
+-- policy-engine.ts            # Policy Engine
+-- governance.ts               # Governance Layer
+-- adaptive-routing.ts         # Adaptive Routing
|
+-- # -- Execution Plane --
+-- orchestrator.ts             # AgentOS orchestrator
+-- registry.ts                 # Agent registry
+-- event-bus.ts                # Event bus
+-- coordination.ts             # Multi-agent coordination
+-- distributed-runtime.ts      # Distributed runtime
+-- llm-adapter.ts              # LLM adapter
+-- tool-adapter.ts             # Tool adapter
|
+-- # -- Data Plane --
+-- artifact-store.ts           # Artifact store
+-- memory-system.ts            # Memory system
+-- memory.ts                   # Legacy memory (v0.1)
+-- observability.ts            # Observability and telemetry
|
+-- # -- Ecosystem Plane --
+-- marketplace.ts              # Marketplace and registry
|
+-- # -- Utilities --
+-- utils.ts                    # Shared utilities
+-- scoring.ts                  # Scoring functions
+-- policies.ts                 # Default policy definitions
```

---

## 8. Evolution Roadmap Alignment

| Version | Milestone | Plane |
|---|---|---|
| v0.1 | Runtime Protocol, Orchestrator, Registry, EventBus, Memory | Core + Execution |
| v0.2 | Capability Model, Selection Engine, Policy Engine | Core + Control |
| v0.3 | Observability and Telemetry | Data |
| v0.4 | LLM Adapter Layer | Execution |
| v0.5 | Tool Adapter Layer | Execution |
| v0.6 | Memory System | Data |
| v0.7 | Adaptive Routing | Control |
| v0.8 | Multi-Agent Coordination | Execution |
| v0.9 | Distributed Agent Runtime | Execution |
| v1.0 | Marketplace and Global Registry | Ecosystem |
| v1.1 | Governance Layer | Control |
| **v1.0 GA** | **Architecture Map (this document)** | **All** |

---

## 9. Final Governing Principle

> **The Agent OS is a contract-driven, plane-separated architecture where decisions flow down from Control, execution flows through Execution, state flows into Data, identity is defined in Core, and discovery extends through Ecosystem. No plane may assume the responsibilities of another.**

This principle ensures:
- **Modularity** — each plane can evolve independently
- **Testability** — planes can be tested in isolation via contracts
- **Governance** — every agent action passes through Control before Execution
- **Extensibility** — new modules slot into existing planes without cross-cutting changes
- **Auditability** — every decision and execution produces traceable records in Data

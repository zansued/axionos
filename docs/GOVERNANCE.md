# AxionOS -- Agent OS Reference

> Consolidated reference for the Agent Operating System architecture.
> Canonical source for planes, modules, agent types, contracts, safety boundaries, and events.
>
> Last updated: 2026-03-12
> 181 sprints complete (Blocks Foundation through AK)

## Document Authority

| Scope | Rule |
|-------|------|
| **Owns** | Agent OS 5 planes, 18-module inventory, 5 agent types, operational agents, supporting engines, learning agents, meta-agents, memory layers, contracts, safety boundaries, events |
| **Must not define** | System containers/C4 diagrams (-> ARCHITECTURE.md), Canon Intelligence Engine architecture (-> CANON_INTELLIGENCE_ENGINE.md) |
| **Update rule** | Update when Agent OS module inventory, contracts, or operational references change |

---

## 1. Architecture Overview

The Agent OS is a **layered, contract-first** system with 18 modules across 5 architectural planes.

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
| **Perception** | Interprets ideas, requirements, context | `idea_intake`, `requirement_analysis`, `market_signal` |
| **Design** | Creates architecture, domain models, API designs | `architecture`, `domain_modeling`, `data_modeling` |
| **Build** | Generates code, UI, configs, migrations | `business_logic`, `api_generation`, `ui_generation` |
| **Validation** | Static analysis, runtime validation, QA | `static_analysis`, `runtime_build`, `drift_detection` |
| **Evolution** | Repair, learning, pattern extraction | `build_repair`, `error_learning`, `pattern_extraction` |

### Specialization Model

```
Agent Specialization = Mode + Tools + Memory + Contract
```

---

## 3. Module Inventory

| # | Module | Plane | Version | Purpose |
|---|--------|-------|---------|---------|
| 1 | Runtime Protocol | Core | v0.1 | Agent identity, task contracts, artifact schemas |
| 2 | Capability Model | Core | v0.2 | Capability declaration, matching, scoring, evolution |
| 3 | Core Types | Core | v0.1 | Foundational types and enums |
| 4 | Selection Engine | Control | v0.2 | Agent selection and ranking by capability scores |
| 5 | Policy Engine | Control | v0.2 | Policy evaluation, trust levels (6 tiers), autonomy limits |
| 6 | Governance Layer | Control | v1.1 | Approval workflows, access control, compliance, audit |
| 7 | Adaptive Routing | Control | v0.7 | Performance feedback loop, routing signal analysis |
| 8 | Orchestrator | Execution | v0.1 | Task orchestration, agent dispatch |
| 9 | Agent Registry | Execution | v0.1 | Agent registration and lookup |
| 10 | Event Bus | Execution | v0.1 | Async event emission and subscription |
| 11 | Multi-Agent Coordination | Execution | v0.8 | Debate, consensus, planner-executor patterns |
| 12 | Distributed Runtime | Execution | v0.9 | Distributed task scheduling, worker management |
| 13 | LLM Adapter | Execution | v0.4 | LLM invocation with provider abstraction |
| 14 | Tool Adapter | Execution | v0.5 | External tool execution with sandboxing |
| 15 | Artifact Store | Data | v0.1 | Versioned storage with lineage DAG, SHA-256 dedup |
| 16 | Memory System | Data | v0.6 | 6 memory types, embedding-based search, retention |
| 17 | Observability | Data | v0.3 | Telemetry, cost tracking, execution tracing, audit |
| 18 | Marketplace | Ecosystem | v1.0 | Capability registry, package management, trust scoring |

---

## 4. Active Operational Agents

### Pipeline Orchestration
- **DAG Execution Engine** -- Kahn's algorithm, wave computation, 6 concurrent workers
- **Pipeline Orchestrator** -- 32-stage deterministic pipeline coordination
- **Pipeline Bootstrap** -- Lifecycle initialization with usage enforcement

### Validation Agents
- **Fix Loop Agent** -- AI-powered code correction (3 iterations)
- **Deep Static Analyzer** -- Import/reference/type consistency validation
- **Drift Detector** -- Architecture-to-code conformance checking
- **Runtime Validator** -- Real tsc + vite build via GitHub Actions CI

### Repair Agents
- **Autonomous Build Repair** -- Self-healing from CI error logs
- **Fix Orchestrator** -- Multi-iteration repair coordination with auto-PR
- **Repair Router** -- Evidence-based strategy selection
- **Repair Policy Engine** -- Memory-aware, policy-driven repair with bounded adjustments
- **Retry Path Intelligence** -- Contextual retry action computation

### Prevention Agents
- **Preventive Validator** -- Pre-generation guard against known failure patterns
- **Prevention Rule Engine** -- Active rule management and enforcement
- **Error Pattern Library** -- Pattern extraction and indexing

### Governance
- **Gate Permissions** -- Per-role stage access control
- **SLA Enforcement** -- Per-stage timing constraints
- **Audit Logger** -- Complete event ledger for all system actions

### Observability
- **Observability Engine** -- Telemetry aggregation and reporting
- **Initiative Observability** -- Per-initiative metrics (success rate, cost, MTTR)
- **Cost Tracker** -- Per-model, per-stage, per-initiative cost tracking

---

## 5. Supporting Engines

| Engine | Purpose |
|--------|---------|
| AI Client | Unified LLM invocation with compression, caching, routing |
| Prompt Compressor | 60-90% token reduction |
| Semantic Cache | Cosine similarity cache (threshold > 0.92) |
| Model Router | Complexity-based model selection |
| Smart Context | AST-like context window management |
| Pipeline Helpers | Standardized logging, jobs, messages |
| Brain Helpers | Knowledge graph operations |
| Embedding Helpers | Vector embedding generation |
| Incremental Engine | Hash-based dirty detection for re-execution |

---

## 6. Learning Agents v1 (Sprint 12)

Five intelligence modules that observe execution data and generate auditable improvement recommendations.

```
Observation -> Evidence -> Analysis -> Recommendation -> Human-safe Adjustment
```

| Agent | Inputs | Outputs | Safety |
|-------|--------|---------|--------|
| Prompt Outcome Analyzer | `prompt_outcomes`, `initiative_jobs` | `prompt_strategy_metrics` | Read-only |
| Strategy Performance Engine | `repair_routing_log`, `error_patterns` | `strategy_effectiveness_metrics` | Read-only |
| Predictive Error Engine | `error_patterns`, `initiative_jobs` | `predictive_error_patterns` | Proposes candidates only |
| Repair Learning Engine | `repair_routing_log`, `strategy_metrics` | `repair_strategy_weights` | Bounded, reversible |
| Learning Recommendation Engine | All metrics | `learning_recommendations` | Human review required |

### Learning Safety Constraints

Learning Agents **cannot** modify: pipeline stages, governance rules, autonomy boundaries, billing, prevention rules directly.

Learning Agents **can**: register evidence, generate recommendations, adjust routing weights (bounded), propose prevention candidates.

---

## 7. Meta-Agents (Sprints 13-20)

Higher-order agents that analyze system behavior, design new agent roles, adjust orchestration strategies, and recommend changes. They do **not** execute pipeline tasks directly.

| Meta-Agent | Purpose | Output Types |
|------------|---------|-------------|
| Architecture | Pipeline architecture improvements | `PIPELINE_OPTIMIZATION`, `STAGE_REORDERING_SUGGESTION` |
| Agent Role Designer | Propose new agent roles | `NEW_AGENT_ROLE`, `AGENT_SPECIALIZATION` |
| Workflow Optimizer | Pipeline efficiency | `WORKFLOW_PARALLELIZATION`, `STEP_ELIMINATION` |
| Strategy Synthesizer | Improved execution strategies | `NEW_EXECUTION_STRATEGY`, `REPAIR_STRATEGY_REWEIGHTING` |
| System Evolution Advisor | High-level system guidance | `SYSTEM_EVOLUTION_REPORT`, `ARCHITECTURE_CHANGE_PROPOSAL` |

### Meta-Agent Safety Rules

Meta-Agents **must never**: modify pipeline stages, change governance rules, modify billing, bypass RLS, alter contracts.

Meta-Agents **may only**: generate recommendations for human review, suggest changes with evidence, propose roles with justification.

### Proposal Quality Feedback Loop (Sprint 19)
Tracks quality and usefulness of recommendations over time via `proposal_quality_feedback` and `proposal_quality_summaries`.

### Advisory Calibration Layer (Sprint 20)
Produces structured calibration signals diagnosing how advisory intelligence should be tuned -- without applying tuning automatically.

---

## 8. Core Plane -- Identity & Contracts

Key contracts: `AgentIdentity`, `AgentProfile`, `CapabilityDeclaration`, `AgentTask`, `AgentResponse`, `ArtifactEnvelope`, `ValidationReport`, `RetryPolicy`, `RollbackPolicy`.

**Capability Model:** Agents declare capabilities with Domain, Proficiency (0.0-1.0), Evidence, and Evolution. Selection uses multi-dimensional scoring: capability match x trust level x cost efficiency x historical performance.

---

## 9. Control Plane -- Decisions & Governance

- **Selection Engine** -- Multi-criteria ranking with exploration strategies (epsilon-greedy, UCB, Thompson sampling)
- **Policy Engine** -- 6 trust tiers: `untrusted` -> `provisional` -> `standard` -> `trusted` -> `expert` -> `autonomous`
- **Governance Layer** -- Approval workflows, SLA enforcement, access control, audit trail
- **Adaptive Routing** -- Performance feedback loop with automatic rebalancing

---

## 10. Execution Plane -- Orchestration & Work

- **Orchestrator** -- DAG-based scheduling (Kahn's algorithm), 6 concurrent workers
- **Coordination** -- Debate, consensus, planner-executor, pipeline patterns
- **Distributed Runtime** -- Worker registration, priority scheduling, failure reassignment
- **LLM Adapter** -- Provider-agnostic with compression, caching, routing
- **Tool Adapter** -- External tool execution with sandboxing and timeout

---

## 11. Data Plane -- State & Knowledge

- **Artifact Store** -- Immutable versioning, SHA-256 dedup, lineage DAG
- **Memory System** -- 6 types (run, episodic, semantic, vector, procedural, meta), pgvector 768-dim
- **Observability** -- Execution tracing, per-model cost tracking, SLA breach detection

---

## 12. Ecosystem Plane -- Discovery & Distribution

Active (Block P, Sprints 79-82): Capability packaging, trust/entitlements, partner marketplace, outcome-aware exchange.

---

## 13. Engineering Memory (Sprints 15-18)

Cross-layer knowledge infrastructure. Agents read memory; capture is event-driven from outputs.

| Agent Class | Memory Types Used |
|-------------|-------------------|
| Build Agents | Error, Strategy |
| Validation Agents | Error, Execution |
| Architecture Agents | Design, Outcome |
| Meta-Agents | All types + summaries |

**Safety:** Agents read but never write directly. Memory never overrides governance. Scoped by `organization_id`.

---

## 14. Agent Memory Layer (Sprint 24)

Per-agent persistent memory profiles and structured records.

Memory types: `execution_pattern`, `repair_pattern`, `validation_pattern`, `review_pattern`, `failure_pattern`, `success_pattern`.

**Safety:** Cannot mutate pipeline, governance, billing. Bounded by relevance and size (max 4000 chars). Deprecated memory is never injected.

---

## 15. Predictive Error Detection (Sprint 25)

Runtime predictive prevention. Scores failure risk at bounded checkpoints.

Risk bands: `low` (0-0.35), `moderate` (0.35-0.6), `high` (0.6-0.8), `critical` (0.8-1.0).

Preventive action types: `strategy_fallback`, `prompt_fallback`, `extra_validation`, `extra_context`, `human_review` (advisory), `pause_execution` (advisory).

---

## 16. Cross-Stage Policy Synthesis (Sprint 26)

Detects cross-stage performance patterns, synthesizes bounded policies spanning multiple stages.

Relationship types: `failure_propagation`, `success_dependency`, `retry_correlation`, `cost_amplification`, `validation_cascade`, `repair_influence`.

---

## 17. Execution Policy Intelligence (Sprint 27)

Classifies execution context and selects bounded operating modes.

Policy modes: `balanced_default`, `high_quality`, `cost_optimized`, `rapid_iteration`, `risk_sensitive`, `deploy_hardened`, `repair_conservative`, `validation_heavy`.

---

## 18. Platform Intelligence (Sprint 30)

Aggregates system-level behavior, detects bottlenecks, generates advisory recommendations.

Health indices: `reliability_index`, `execution_stability_index`, `repair_burden_index`, `cost_efficiency_index`, `deploy_success_index`, `policy_effectiveness_index`.

---

## 19. Platform Self-Calibration (Sprint 31)

Bounded operational threshold calibration with guardrails and rollback.

**Forbidden families:** `pipeline_topology`, `governance_rules`, `billing_logic`, `plan_enforcement`, `execution_contracts`, `hard_safety_constraints`.

Max delta per calibration: 0.2. Advisory-first by default.

---

## 20. Execution Strategy Evolution (Sprint 32)

Bounded strategy variant experimentation with promotion and rollback.

Strategy families: `repair_escalation_sequencing`, `retry_switching_heuristics`, `validation_intensity_ladders`, `predictive_checkpoint_ordering`, `review_escalation_timing`, `deploy_hardening_sequencing`, `context_enrichment_sequencing`, `strategy_fallback_ladders`.

Max delta: 0.25. Advisory-first default.

---

## 21. Semantic Retrieval (Sprint 36)

Unified embedding-backed retrieval across all intelligence layers. 12 retrieval domains covering engineering memory, agent memory, repair history, platform insights, strategies, policies, and more.

---

## 22. Architecture Intelligence (Sprints 37-40)

| Sprint | Capability |
|--------|-----------|
| 37 | Discovery-Driven Architecture Signals |
| 38 | Architecture Change Simulation & Governance |
| 39 | Architecture Change Planning & Rollout Readiness |
| 40 | Architecture Rollout Sandbox & Controlled Migration |

All outputs are advisory-first and review-driven. Cannot mutate production topology.

---

## 23. End-to-End Execution Flow

```
 1. Task arrives at Orchestrator                        [Execution]
 2. Usage limits enforced                               [Commercial]
 3. Orchestrator queries Selection Engine               [Control]
 4. Selection Engine checks Policy Engine               [Control]
 5. Governance Layer evaluates trust and autonomy       [Control]
 6. Adaptive Router applies routing adjustments         [Control]
 7. Agent selected, GovernanceDecision issued           [Control]
 8. If approval required: ApprovalEngine pauses         [Control]
 9. Orchestrator dispatches to Coordination Manager     [Execution]
10. Coordination assigns roles via Selection Engine     [Control]
11. Agents execute via LLM/Tool Adapters                [Execution]
12. Artifacts stored in Artifact Store                  [Data]
13. Memory updated                                     [Data]
14. Telemetry recorded                                 [Data]
15. Audit record written                               [Data]
16. Events emitted via EventBus                        [Execution]
17. Adaptive Router consumes feedback                  [Control]
18. Learning Agents consume execution data              [Learning]
19. Result returned to caller                          [Execution]
```

---

## 24. Code Organization

```
supabase/functions/_shared/agent-os/
  index.ts                    # Barrel exports
  types.ts                    # Core types
  protocol.ts                 # Runtime protocol
  capabilities.ts             # Capability model
  selection.ts                # Selection engine
  policy-engine.ts            # Policy engine
  governance.ts               # Governance layer
  adaptive-routing.ts         # Adaptive routing
  orchestrator.ts             # Orchestrator
  registry.ts                 # Agent registry
  event-bus.ts                # Event bus
  coordination.ts             # Multi-agent coordination
  distributed-runtime.ts      # Distributed runtime
  llm-adapter.ts              # LLM adapter
  tool-adapter.ts             # Tool adapter
  artifact-store.ts           # Artifact store
  memory-system.ts            # Memory system
  observability.ts            # Observability
  marketplace.ts              # Marketplace
```

---

## 25. Universal Safety Boundaries

All modules share these invariants:

1. **Cannot mutate:** pipeline topology, governance rules, billing logic, plan enforcement, execution contracts, hard safety constraints
2. **Advisory-first:** all intelligent outputs are recommendations
3. **Rollback everywhere:** every change preserves rollback capability
4. **Tenant isolation:** all data scoped by `organization_id` with RLS
5. **Human authority:** structural evolution requires human approval
6. **Bounded adaptation:** all learning within declared envelopes
7. **Explainability:** every decision is traceable with provenance

---

---

## 26. Governance of Self-Improvement (Blocks AI–AJ)

AxionOS governs its own evolution through four governance domains introduced in Blocks AI and AJ:

### 26.1 Canon Evolution Governance

Canon entries follow a governed lifecycle: candidate → evaluation → deduplication → promotion → active → deprecated. All promotions require evidence and human review. Deprecated entries are never injected into agents.

### 26.2 Skill Distillation Governance

Distilled skills (micro-skills, compressed canon cues) are tracked with provenance. Injection into agent context is bounded by token budgets and relevance scores. Ineffective skills are flagged for review and deprecation.

### 26.3 Architecture Heuristics Governance

Architecture heuristics (preferred patterns, unsafe combinations, readiness boosters) are extracted from operational evidence. Each heuristic carries a confidence score, support evidence count, and domain fit. Heuristics are advisory — they inform Discovery, Planning, and AgentOS but never enforce autonomously.

### 26.4 Self-Improvement Proposal Governance

The Self-Improvement Proposal Engine generates structured proposals for system evolution:
- **Canon Tuning** — adjust canon entry weights and retrieval priorities
- **Skill Injection Tuning** — modify skill injection defaults and budgets
- **Retrieval Policy Tuning** — refine retrieval depth and compression settings
- **Architecture Pattern Preference** — promote or deprecate architecture patterns
- **Token Policy Tuning** — adjust token budget allocations

**All self-improvement proposals must pass through the Governance Decision Surface.** No proposal is applied automatically. The canonical rule applies:

> Canon informs → Readiness evaluates → Policy constrains → Action Engine formalizes → AgentOS orchestrates → Executors act

Self-improvement proposals are treated as governance changes — they follow the full Decision Workflow (13 states), Execution Handoff (8 states), and Change Application Tracking lifecycle.

---

## Documentation Boundaries

| File | Scope |
|------|-------|
| **GOVERNANCE.md** (this file) | Agent OS modules, contracts, safety boundaries, events, self-improvement governance |
| **ARCHITECTURE.md** | System structure, containers, layers, data flow, intelligence layers |
| **CANON_INTELLIGENCE_ENGINE.md** | Canon Intelligence Engine architecture |
| **docs/registry/sprints.yml** | Sprint-by-sprint implementation record |

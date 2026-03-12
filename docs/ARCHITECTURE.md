# AxionOS â€” System Architecture

> Technical architecture of the autonomous software engineering system.
>
> **Last updated:** 2026-03-11
> **Current state:** Level 10+ â€” Adaptive Operational Organism. 100+ architectural layers active. All blocks (Foundation through AD) complete. 138 sprints implemented.
> **Completed blocks:** Foundation through AD (Sprints 1â€“138)
> **Next horizon:** Future planning beyond Sprint 138
> **Sprint details:** #axionos--sprint-ledger

## Document Authority

| Scope | Rule |
|-------|------|
| **Owns** | System architecture, C4 diagrams, capability layers, containers, components, data flow, safety rules, AI efficiency layer, edge function architecture, database schema, technology stack, governing principle |
| **Must not define** | Full Agent OS module specs (â†’ GOVERNANCE.md), Canon Intelligence Engine details (â†’ CANON_INTELLIGENCE_ENGINE.md) |
| **Derived from** | GOVERNANCE.md for Agent OS summary; CANON_INTELLIGENCE_ENGINE.md for Canon subsystem |
| **Update rule** | Update when system structure or active architectural layers change |

### Core Subsystems

| Subsystem | Reference |
|-----------|-----------|
| Agent OS | [GOVERNANCE.md](GOVERNANCE.md) â€” planes, modules, agent types, contracts |
| Canon Intelligence Engine | [CANON_INTELLIGENCE_ENGINE.md](CANON_INTELLIGENCE_ENGINE.md) â€” knowledge layer, Agentâ€“Contract model, canonization workflow |

---

## Mermaid Diagram Color Canon

To keep the architecture legible across blocks and future documentation updates, AxionOS uses a semantic Mermaid color canon.

These colors are not decorative. They indicate architectural function.

| Function | Color | classDef |
|----------|-------|----------|
| Human / operator interaction | warm yellow | `fill:#F6E58D,stroke:#8C6D1F,color:#111` |
| Core system / platform structure | blue | `fill:#74B9FF,stroke:#1B4F72,color:#111` |
| Governance / policy / control | purple | `fill:#C56CF0,stroke:#6C3483,color:#111` |
| Intelligence / analysis / cognition | teal | `fill:#00CEC9,stroke:#117A65,color:#111` |
| Runtime / execution / repair loops | pink-magenta | `fill:#FD79A8,stroke:#AD1457,color:#111` |
| Data / memory / persistence | green | `fill:#55EFC4,stroke:#117A65,color:#111` |
| External systems / providers / connectors | neutral gray | `fill:#B2BEC3,stroke:#636E72,color:#111` |
| Strategic coordination layers | soft violet | `fill:#D6A2E8,stroke:#7D3C98,color:#111` |
| Reflexive governance / self-regulation | red | `fill:#FF7675,stroke:#922B21,color:#111` |
| Canonical knowledge / implementation intelligence | indigo | `fill:#6C5CE7,stroke:#2E1A8A,color:#fff` |

> All future Mermaid diagrams should reuse these semantic colors consistently whenever possible.

---

## 1. System Context

```mermaid
flowchart TB
    Dev["Developer / Operator"]:::human
    Lead["Engineering / Product Lead"]:::human

    Axion["AxionOS\nAdaptive Engineering Platform"]:::core

    Git["GitHub / Code Hosting"]:::external
    LLM["LLM Providers / Model APIs"]:::external
    DB["Supabase / PostgreSQL"]:::data
    Obs["Observability / Telemetry Stack"]:::external

    Dev --> Axion
    Lead --> Axion

    Axion --> Git
    Axion --> LLM
    Axion --> DB
    Axion --> Obs

    classDef human fill:#F6E58D,stroke:#8C6D1F,color:#111,stroke-width:1.5px;
    classDef core fill:#74B9FF,stroke:#1B4F72,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef external fill:#B2BEC3,stroke:#636E72,color:#111,stroke-width:1.5px;
```

**Actors:**
- **Developer / Operator** â€” submits ideas, monitors execution, reviews artifacts
- **Engineering / Product Lead** â€” governs strategy, reviews proposals, approves promotions

**External Systems:**
- **GitHub** â€” publish artifacts, PRs, atomic commits
- **LLM Providers** â€” reasoning, generation (Gemini 2.5 Flash/Pro via Lovable AI Gateway)
- **Supabase / PostgreSQL** â€” persistence, auth, RLS, Edge Functions
- **Observability** â€” metrics, logs, telemetry events

---

## 2. Container Architecture

```mermaid
flowchart TB
    UI["Web App / Dashboard"]:::human
    API["API / Edge Functions Layer"]:::core

    Core["Execution Pipeline Core"]:::runtime
    OI["Operational Intelligence Engine"]:::intelligence
    Learn["Learning Engine"]:::intelligence
    Gov["Execution Governance Engine"]:::governance
    PI["Platform Intelligence Engine"]:::intelligence
    Calib["Platform Self-Calibration Engine"]:::governance
    Strat["Execution Strategy Evolution Engine"]:::strategic

    Data["Persistence Layer\nSupabase / PostgreSQL"]:::data
    Ext["External Integration Layer\nGitHub / LLM / Telemetry"]:::external

    UI --> API

    API --> Core
    API --> OI
    API --> Learn
    API --> Gov
    API --> PI
    API --> Calib
    API --> Strat
    API --> Data

    Core --> OI
    Core --> Learn
    Core --> Data
    Core --> Ext

    OI --> Learn
    OI --> Data

    Learn --> Gov
    Learn --> PI
    Learn --> Data

    Gov --> PI
    Gov --> Data

    PI --> Calib
    PI --> Strat
    PI --> Data

    Calib --> Data
    Strat --> Data

    Ext --> GitHub["GitHub / Code Hosting"]:::external
    Ext --> Models["LLM Providers"]:::external
    Ext --> Telemetry["Telemetry / Notifications"]:::external

    classDef human fill:#F6E58D,stroke:#8C6D1F,color:#111,stroke-width:1.5px;
    classDef core fill:#74B9FF,stroke:#1B4F72,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef strategic fill:#D6A2E8,stroke:#7D3C98,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef external fill:#B2BEC3,stroke:#636E72,color:#111,stroke-width:1.5px;
```

**Containers:**

| Container | Technology | Responsibility |
|-----------|-----------|----------------|
| Web App / Dashboard | React 18 + Vite + Tailwind + shadcn/ui | User interaction, observability views, governance UI |
| API / Edge Functions | Supabase Edge Functions (Deno) | All backend logic, ~200+ functions |
| Execution Pipeline Core | Edge Functions + shared modules | 32-stage deterministic pipeline |
| Operational Intelligence | Shared modules | Error patterns, repair routing, prevention |
| Learning Engine | Shared modules | Prompt optimization, agent memory, prediction |
| Execution Governance | Shared modules | Policy selection, portfolio, tenant tuning |
| Platform Intelligence | Shared modules | Aggregation, bottleneck detection, health model |
| Platform Self-Calibration | Shared modules | Bounded threshold tuning with rollback |
| Strategy Evolution | Shared modules | Variant experimentation and promotion |
| Persistence Layer | Supabase PostgreSQL | 80+ tables with RLS |
| External Integration | GitHub API v3, Lovable AI Gateway | Code hosting, LLM reasoning |

---

## 3. Component Architecture

### 3.1 Execution Pipeline Core

```mermaid
flowchart TB
    Orchestrator["Stage Orchestrator"]:::core
    Runner["Deterministic Pipeline Runner"]:::runtime
    Artifact["Artifact Manager"]:::data
    Validation["Validation Engine"]:::governance
    Publish["Publish Engine"]:::core
    Events["Execution Event Emitter"]:::data

    Orchestrator --> Runner
    Runner --> Artifact
    Artifact --> Validation
    Validation --> Publish
    Publish --> Events

    classDef core fill:#74B9FF,stroke:#1B4F72,color:#111,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
```

**Modules:**
- `pipeline-bootstrap.ts` â€” Pipeline lifecycle initialization with usage enforcement
- `dependency-scheduler.ts` â€” Kahn's algorithm, wave computation, 6 workers
- `pipeline-execution-orchestrator` / `pipeline-execution-worker` â€” DAG agent swarm
- `pipeline-helpers.ts` â€” Standardized logging, jobs, messages
- `autonomous-build-repair` â€” Self-healing builds from CI error logs
- `pipeline-fix-orchestrator` â€” Multi-iteration fix coordination
- `pipeline-preventive-validation` â€” Pre-generation guard
- `prevention-rule-engine` â€” Active prevention rule management
- `repair-routing-engine` â€” Adaptive strategy selection
- `error-pattern-library-engine` â€” Pattern extraction and indexing
- `observability-engine` / `initiative-observability-engine` â€” Telemetry
- `usage-limit-enforcer.ts` â€” Plan limits enforcement
- 50+ Edge Functions covering all 32 stages

**Persistence:** `initiative_jobs`, `active_prevention_rules`, `error_patterns`, `prevention_rule_candidates`, `repair_routing_log`, `pipeline_gate_permissions`, `stage_sla_configs`, `audit_logs`, `initiative_observability`

### 3.2 Operational Intelligence Engine

```mermaid
flowchart TB
    ErrorLib["Error Pattern Library"]:::intelligence
    RepairTrack["Repair Strategy Tracker"]:::data
    RepairRouter["Adaptive Repair Router"]:::runtime
    Prevention["Prevention Candidate Generator"]:::governance

    Events["Execution Events"]:::data --> ErrorLib
    ErrorLib --> RepairTrack
    RepairTrack --> RepairRouter
    RepairRouter --> Prevention

    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
```

**Modules:**
- `error-pattern-library-engine` â€” Pattern extraction and indexing
- `repair-routing-engine` â€” Adaptive strategy selection based on historical success rates
- `prevention-rule-engine` â€” Active prevention rule management
- `repair-learning-engine` â€” Routing weight adaptation

**Persistence:** `error_patterns`, `repair_routing_log`, `prevention_rule_candidates`, `active_prevention_rules`, `repair_strategy_weights`

### 3.3 Learning Engine

```mermaid
flowchart TB
    PromptOpt["Prompt Optimization Engine"]:::intelligence
    PromptPR["Prompt Promotion / Rollback"]:::governance
    FixInt["Fix Agents Intelligence"]:::runtime
    Memory["Agent Memory Layer"]:::data
    Predict["Predictive Error Detector"]:::intelligence
    CrossStage["Cross-Stage Policy Synthesizer"]:::governance

    History["Execution History"]:::data --> PromptOpt
    PromptOpt --> PromptPR
    History --> FixInt
    History --> Memory
    History --> Predict
    History --> CrossStage

    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
```

**Sub-layers:**

| Sub-layer | Sprint | Modules |
|-----------|--------|---------|
| Prompt Optimization + Rollback | 21-22 | `learning/prompt-variant-selector.ts`, `prompt-promotion-rules.ts`, `prompt-rollout-engine.ts`, `prompt-rollback-engine.ts`, `prompt-health-guard.ts` |
| Self-Improving Fix Agents v2 | 23 | `repair/repair-policy-engine.ts`, `repair-policy-updater.ts`, `repair-policy-explainer.ts`, `repair-memory-retriever.ts`, `retry-path-intelligence.ts` |
| Agent Memory Operationalization | 24 | `agent-memory/agent-memory-retriever.ts`, `agent-memory-injector.ts`, `agent-memory-writer.ts`, `agent-memory-quality.ts` |
| Predictive Error Detection | 25 | `predictive/predictive-risk-engine.ts`, `predictive-checkpoint-runner.ts`, `preventive-action-engine.ts`, `predictive-outcome-tracker.ts` |
| Cross-Stage Policy Synthesis (LA v2) | 26 | `cross-stage/cross-stage-policy-synthesizer.ts`, `cross-stage-policy-evaluator.ts`, `cross-stage-policy-runner.ts`, `cross-stage-policy-lineage.ts` |

### 3.4 Execution Governance Engine

```mermaid
flowchart TB
    Selector["Execution Policy Selector"]:::governance
    Portfolio["Policy Portfolio Optimizer"]:::governance
    Tenant["Tenant Adaptive Tuning Engine"]:::intelligence
    Routing["Policy Routing Layer"]:::core

    Signals["Learning Signals"]:::data --> Selector
    Policies["Policy Portfolio"]:::data --> Selector
    TenantCtx["Tenant / Workspace Context"]:::human --> Tenant

    Selector --> Tenant
    Tenant --> Routing
    Portfolio --> Routing

    classDef human fill:#F6E58D,stroke:#8C6D1F,color:#111,stroke-width:1.5px;
    classDef core fill:#74B9FF,stroke:#1B4F72,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
```

**Sub-layers:**

| Sub-layer | Sprint | Modules |
|-----------|--------|---------|
| Execution Policy Intelligence | 27 | `execution-policy/execution-context-classifier.ts`, `execution-policy-selector.ts`, `execution-policy-adjuster.ts`, `execution-policy-runner.ts`, `execution-policy-feedback.ts` |
| Portfolio Optimization | 28 | `execution-policy/execution-policy-portfolio-evaluator.ts`, `execution-policy-ranking-engine.ts`, `execution-policy-lifecycle-manager.ts`, `execution-policy-conflict-resolver.ts` |
| Tenant Adaptive Tuning | 29 | `tenant-policy/tenant-policy-tuning-engine.ts`, `tenant-policy-override-guard.ts`, `tenant-aware-policy-selector.ts`, `tenant-policy-drift-detector.ts` |

### 3.5 Platform Intelligence Engine

```mermaid
flowchart TB
    Aggregator["Platform Behavior Aggregator"]:::data
    Bottleneck["Bottleneck Detector"]:::intelligence
    Pattern["Pattern Analyzer"]:::intelligence
    Insight["Insight Generator"]:::intelligence
    Reco["Recommendation Engine"]:::governance
    Health["Platform Health Model"]:::data

    Aggregator --> Bottleneck
    Aggregator --> Pattern
    Bottleneck --> Insight
    Pattern --> Insight
    Insight --> Reco
    Insight --> Health

    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
```

**Modules:** `platform-intelligence/platform-behavior-aggregator.ts`, `platform-bottleneck-detector.ts`, `platform-pattern-analyzer.ts`, `platform-insight-generator.ts`, `platform-recommendation-engine.ts`, `platform-health-model.ts`

**Health Indices:** reliability_index, execution_stability_index, repair_burden_index, cost_efficiency_index, deploy_success_index, policy_effectiveness_index

**Persistence:** `platform_insights`, `platform_recommendations`

### 3.6 Platform Self-Calibration Engine

```mermaid
flowchart TB
    Registry["Calibration Parameter Registry"]:::data
    Interpreter["Calibration Signal Interpreter"]:::intelligence
    Proposal["Calibration Proposal Engine"]:::intelligence
    Guard["Calibration Guardrails"]:::governance
    Runner["Calibration Runner"]:::runtime
    Outcome["Calibration Outcome Tracker"]:::data
    Rollback["Calibration Rollback Engine"]:::governance

    Signals["Platform Intelligence Signals"]:::intelligence --> Interpreter
    Registry --> Proposal
    Interpreter --> Proposal
    Proposal --> Guard
    Guard --> Runner
    Runner --> Outcome
    Outcome --> Rollback

    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
```

**Modules:** `platform-calibration/platform-calibration-signal-interpreter.ts`, `platform-calibration-proposal-engine.ts`, `platform-calibration-guardrails.ts`, `platform-calibration-runner.ts`, `platform-calibration-outcome-tracker.ts`, `platform-calibration-rollback-engine.ts`

**Persistence:** `platform_calibration_parameters`, `platform_calibration_proposals`, `platform_calibration_applications`, `platform_calibration_rollbacks`

**Forbidden Families:** pipeline_topology, governance_rules, billing_logic, plan_enforcement, execution_contracts, hard_safety_constraints

**Max delta:** 0.2 per calibration. Advisory-first by default.

### 3.7 Execution Strategy Evolution Engine

```mermaid
flowchart TB
    Family["Strategy Family Registry"]:::data
    Signal["Strategy Signal Interpreter"]:::intelligence
    Synth["Strategy Variant Synthesizer"]:::strategic
    Guard["Strategy Guardrails"]:::governance
    Experiment["Strategy Experiment Runner"]:::runtime
    Outcome["Strategy Outcome Tracker"]:::data
    Promote["Strategy Promotion Rules"]:::governance
    Rollback["Strategy Rollback Engine"]:::governance
    Lineage["Strategy Lineage"]:::data

    PlatformSignals["Platform Signals"]:::intelligence --> Signal
    Family --> Synth
    Signal --> Synth
    Synth --> Guard
    Guard --> Experiment
    Experiment --> Outcome
    Outcome --> Promote
    Outcome --> Rollback
    Synth --> Lineage
    Experiment --> Lineage
    Outcome --> Lineage
    Rollback --> Lineage

    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef strategic fill:#D6A2E8,stroke:#7D3C98,color:#111,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
```

**Modules:** `execution-strategy/execution-strategy-signal-interpreter.ts`, `execution-strategy-variant-synthesizer.ts`, `execution-strategy-guardrails.ts`, `execution-strategy-experiment-runner.ts`, `execution-strategy-outcome-tracker.ts`, `execution-strategy-promotion-rules.ts`, `execution-strategy-rollback-engine.ts`, `execution-strategy-lineage.ts`

**Strategy Families:** repair_escalation_sequencing, retry_switching_heuristics, validation_intensity_ladders, predictive_checkpoint_ordering, review_escalation_timing, deploy_hardening_sequencing, context_enrichment_sequencing, strategy_fallback_ladders

**Persistence:** `execution_strategy_families`, `execution_strategy_variants`, `execution_strategy_experiments`, `execution_strategy_outcomes`

**Max delta:** 0.25 per mutation. Advisory-first default.

---

## 4. Architectural Principles

| Principle | Description |
|-----------|-------------|
| **Deterministic Core** | 32-stage pipeline executes in a fixed, reproducible order via DAG scheduling |
| **Bounded Adaptation** | All learning, calibration, and strategy evolution operate within declared envelopes |
| **Advisory-First by Default** | All intelligent systems produce recommendations; humans approve structural changes |
| **Rollback Everywhere** | Every promotion, calibration, and strategy experiment preserves rollback capability |
| **Explainability and Lineage** | Every decision, variant, and outcome is traceable with full provenance |
| **Forbidden Mutation Families** | Pipeline topology, governance rules, billing logic, plan enforcement, execution contracts, and hard safety constraints are immutable by automated systems |
| **Multi-Tenant Isolation** | All data scoped by `organization_id` with RLS enforcement |
| **Additive Learning** | Learning modules consume existing data; they never modify the kernel directly |
| **Human Authority** | All structural evolution requires human review and approval |

---

## 4B. Operational Decision Chain

> **Canonical Rule:** This is the official decision and execution flow of AxionOS. All operational behavior must respect this chain.

```mermaid
flowchart TD
      Canon["Canon / Library"]:::canon
      Signals["Readiness / Events / Metrics"]:::data
      Policy["Policy / Governance"]:::governance
      AE["Axion Action Engine (XML/Prompt)"]:::runtime
      AgentOS["AgentOS Orchestrator (AIOS Scheduler)"]:::core
      Executor["Bolt-Execution-Worker (Atomic Commits)"]:::core
      Heal["Self-Healing (Build Repair)"]:::heal
      Final["GitHub / Live Repo"]:::human
  
      Canon --> Signals
      Signals --> Policy
      Policy --> AE
      AE --> AgentOS
      AgentOS --> Executor
      Executor --> Final
      Final -- "Build Failure" --> Heal
      Heal -- "Fix Patch" --> Executor

      classDef canon fill:#6C5CE7,stroke:#2E1A8A,color:#fff,stroke-width:1.5px;
      classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
      classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
      classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
      classDef core fill:#74B9FF,stroke:#1B4F72,color:#111,stroke-width:1.5px;
      classDef heal fill:#FF7675,stroke:#C0392B,color:#fff,stroke-width:1.5px;
      classDef human fill:#F6E58D,stroke:#8C6D1F,color:#111,stroke-width:1.5px;
```

**Canonical Responsibility Rule:**

| Layer | Role |
|-------|------|
| **Canon** | informs |
| **Readiness** | evaluates |
| **Policy** | constrains |
| **Action Engine** | formalizes |
| **AgentOS** | orchestrates |
| **Executors** | act |

### 4B.1 Layer Responsibilities

#### Canon / Library

Provides validated operational knowledge. Includes canon entries, patterns, templates, conventions, rules, and playbooks. Canon does not execute actions and does not make operational decisions. Its function is to supply applicable knowledge for agents and system decisions.

**Key files:** `src/lib/canon/`, `supabase/functions/_shared/canon-*/`, `supabase/functions/canon-*/`

#### Readiness / Events / Metrics

Transforms system state into auditable signals. Includes metrics with source and confidence, system events, readiness evaluations, blockers, and warnings. This layer does not execute actions and does not make decisions. Its function is to describe the state of the system.

**Key files:** `src/lib/metrics/`, `src/lib/readiness/`

#### Policy / Governance

Determines operational permissions and limits. Evaluates risk, environment, compliance, approval requirements, and governance rules. This layer does not execute actions. Its function is to decide whether an action can happen and under what conditions.

**Key files:** `supabase/functions/_shared/agent-os/policy-engine.ts`, `supabase/functions/_shared/agent-os/governance.ts`, `supabase/functions/_shared/execution-policy/`

#### Action Engine (AE)

Transforms signals and evaluations into formal, traceable actions. Interprets triggers, maps triggers to intents, applies policy decisions, creates action records, and routes actions to execution. The AE does not directly execute agents. Its function is to formalize actions within the system.

**Key concepts:**
- **Action Trigger** â€” an event or signal that initiates the action pipeline
- **Action Intent** â€” a formal declaration of what the system wants to do
- **Execution Mode** â€” `auto | approval_required | manual_only | blocked`
- **Action Record** â€” an auditable record of the formalized action
- **Action Outcome** â€” the result of execution, feeding back into the learning loop

**Status:** Planned (not yet implemented). Domain-specific action engines exist for stabilization and predictive error prevention, but no central Action Engine exists yet.

#### AgentOS Orchestrator

Coordinates execution of formalized actions. Selects agents, assembles execution context, consults Canon/Library for knowledge injection, dispatches tasks, and tracks outcomes. Its function is to orchestrate operational execution.

**Key files:** `supabase/functions/_shared/agent-os/orchestrator.ts`, `supabase/functions/_shared/agent-os/registry.ts`, `supabase/functions/_shared/agent-os/selection.ts`

#### Agent Executor / Human Approval

The final execution layer. Can be automatic agents, human operators, or external systems. Its function is to perform the action in the real world.

### 4B.2 Responsibility Boundaries

These rules **must not** be violated:

1. **Canon / Library** never triggers actions directly
2. **Readiness / Metrics** never executes actions
3. **Policy** does not execute actions â€” it only constrains them
4. **Action Engine** does not execute agents directly â€” it formalizes and routes
5. **AgentOS** must not bypass Action Engine in governed flows
6. **Every important action must be traceable** â€” with context and justification
7. **No layer may assume the responsibilities of another layer**

### 4B.3 AE â€” Action Engine Block

The Action Engine is the architectural layer responsible for formalizing actions within AxionOS. It connects knowledge (Canon), state evaluation (Readiness/Metrics), and governance (Policy) with the agent execution system (AgentOS).

**AE Block Roadmap:**

| Sprint | Capability |
|--------|-----------|
| AE-01 | Action Domain Model â€” Trigger, Intent, ActionRecord, ActionOutcome types |
| AE-02 | Trigger Intake Layer â€” event/signal capture and normalization |
| AE-03 | Trigger to Intent Mapping â€” declarative rules engine |
| AE-04 | Policy-Aware Action Resolution â€” intent + policy = execution mode |
| AE-05 | Action Registry and Audit Trail â€” immutable action log |
| AE-06 | AgentOS Dispatch Contract â€” formal handoff from AE to Orchestrator |
| AE-07 | Human Approval Hooks â€” approval queue and resolution flow |
| AE-08 | Initial Operational Flows â€” first end-to-end governed actions |
| AE-09 | Action Center Integration â€” UI surface for action visibility |
| AE-10 | Recovery and Reversibility Hooks â€” rollback and escalation paths |

### 4B.4 System Maturity Phases

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | UI Scaffolding â€” Component structure, layout, navigation shells | Complete |
| Phase 2 | Navigation Contract â€” Role-based routing, surface separation | Complete |
| Phase 3 | Metrics and Data Integrity â€” Metric contract with source, confidence, updatedAt | Complete |
| Phase 4 | Readiness Engine â€” Deterministic readiness evaluation with named blockers | Complete |
| Phase 5 | Canon and Library Operationalization â€” Ingestion lifecycle, candidate pipeline, retrieval contract | Complete |
| Phase 6 | AgentOS Decision Contract â€” Policy engine, selection engine, capability model (contracts exist, not fully connected) | Partial |
| Phase 7 | Action Engine â€” Trigger/Intent/ActionRecord formalization | Planned |
| Phase 8 | Governance and Approval Flow â€” Approval queue, human-in-the-loop execution | Planned |
| Phase 9 | Self-Healing and Recovery â€” Autonomous error recovery with governance | Planned |
| Phase 10 | Learning Feedback Loop â€” Execution outcomes feed Canon and strategy evolution | Planned |

**Current system phase: Phase 5 complete, Phase 6 partial. Next target: Phase 7 (Action Engine).**

### 4B.5 System Brain Map

For a comprehensive visual map of all subsystems and their relationships, see:

> **[System Brain Map](diagrams/system-brain-map.md)** â€” canonical architectural brain map showing surfaces, knowledge, signals, policy, action engine, orchestration, execution, runtime, and learning loop.

This diagram is the canonical visual reference for developers, AI coding agents, and system operators.

---

## 5. Architectural Direction

### 5.1 Current â€” Adaptive Operational Organism â€” âœ… Level 10+ Complete

With all 138 sprints complete, 100+ architectural layers active, and the full stack from execution kernel through adaptive operational organism operational, AxionOS has achieved **Level 10+ maturity**.

All blocks from Foundation through AD are implemented and hardened. The system now operates as a governed adaptive organism with the following capabilities fully active:

- **Explain better** â€” âœ… PageGuidanceShell, ContextualCopilotDrawer, GovernanceMentorDrawer, CopilotTrigger, 4 copilot submodes, centralized content registries
- **Decide better** â€” âœ… Institutional Decision Engine, sovereign decision rights, role-aware experience, approval posture hints
- **Learn better** â€” âœ… Evidence-governed improvement loops, cross-stage learning, predictive detection, calibration, learning canonization
- **Coordinate better** â€” âœ… Multi-agent coordination (debate, working memory, bounded swarm), adaptive coordination, attention allocation
- **Operate autonomously (bounded)** â€” âœ… Bounded autonomous operations, autonomy ladder, rollback posture, outcome-based autonomy
- **Adapt institutionally** â€” âœ… Cross-context doctrine adaptation, institutional conflict resolution, federated intelligence, resilience governance
- **Govern sovereignty** â€” âœ… Memory constitution, sovereign decision rights, dependency sovereignty, strategic succession
- **Coordinate strategically** â€” âœ… Multi-horizon alignment, tradeoff arbitration, mission integrity, civilizational continuity simulation
- **Govern evolution** â€” âœ… Evolution proposal governance, architectural mutation control, reflective validation, kernel integrity guard
- **Canonize knowledge** â€” âœ… Canon stewardship, pattern library & retrieval, failure memory, external knowledge intake
- **Runtime sovereignty** â€” âœ… Live runtime feedback mesh, tenant doctrine, outcome-based autonomy, compounding advantage
- **Organism-level awareness** â€” âœ… Multi-loop governance, systemic health model, organism memory, organism console

### 5.2 Reality Check â€” System Maturity Assessment

AxionOS is no longer a concept. It has real, operational layers for execution, governance, memory, sovereignty, strategic coordination, reflexive governance, canonical knowledge, runtime sovereignty, and organism-level self-observation. However, it remains under active refinement.

**Strongest in:** Governance, orchestration, explainability, strategic control, tenant isolation, advisory intelligence, audit and lineage, canonical knowledge governance, reflexive self-regulation.

**Still maturing in:** End-to-end delivery reliability under edge-case conditions, runtime self-reconfiguration quality, adoption feedback loops, and cross-tenant intelligence precision.
- stack-specific conventions
- failure memory and repair strategies
- validated external knowledge updates

This canon is not a passive wiki. It is designed to be queried and applied directly by planning, execution, repair, and validation flows.

- Planning agents should consult architectural canon before generating implementation strategies.
- Execution agents should retrieve approved templates and conventions before producing code.
- Repair systems should consult historical failure patterns and successful mitigations.
- Validation agents should compare generated artifacts against canon-approved practices.

> **Operational Integration Principle:** In AxionOS, knowledge only counts as system capability when it is operationally connected to runtime behavior. A pattern not consumed by agents or functions is documentation, not implementation intelligence.

Block Y therefore represents applied, governed, versioned, and operationally integrated knowledge.

**Planned scope:**

| Sprint | Capability |
|--------|-----------|
| 115 | Canon Steward & Knowledge Governance Engine |
| 116 | Implementation Pattern Library & Retrieval Layer |
| 117 | Failure Memory & Repair Intelligence Archive |
| 118 | External Knowledge Intake & Canon Evolution Control |

**Architectural risk note:** The main risk of Block Y is becoming a decorative or bloated wiki. Its antidote is operational retrieval, governance, deprecation, and selective application rather than passive accumulation.

#### AxionOS Layered Architecture Overview

```mermaid
flowchart TB
    U[Human Operator / Builder]:::human

    subgraph T1[Execution Layer]
        E1[Planning]
        E2[Execution]
        E3[Repair]
        E4[Validation]
    end

    subgraph T2[Coordination Layer]
        C1[Pipeline Orchestration]
        C2[Job / Stage Control]
        C3[Retries / Batching / Flow Routing]
    end

    subgraph T3[Governance Layer]
        G1[Policy & Approval]
        G2[Auditability]
        G3[Memory / Sovereignty / Continuity]
    end

    subgraph T4[Strategic Coordination Layer -- Block W]
        S1[Multi-Horizon Alignment]
        S2[Tradeoff Arbitration]
        S3[Mission Integrity]
        S4[Continuity Simulation]
    end

    subgraph T5[Reflexive Governance Layer -- Block X]
        R1[Evolution Proposal Governance]
        R2[Architectural Mutation Control]
        R3[Reflective Validation]
        R4[Kernel Integrity Guard]
    end

    subgraph T6[Canonical Knowledge Layer -- Block Y]
        K1[Canon Stewardship]
        K2[Pattern Library & Retrieval]
        K3[Failure Memory]
        K4[External Knowledge Intake]
    end

    subgraph T7[Runtime Sovereignty Layer -- Block Z-AA]
        Z1[Runtime Feedback Mesh]
        Z2[Tenant Doctrine & Profiles]
        Z3[Outcome-Based Autonomy]
        Z4[Compounding Advantage]
    end

    subgraph T8[Learning Canonization Layer -- Block AB]
        AB1[Learning Extraction]
        AB2[Canon Promotion Pipeline]
        AB3[Cross-Tenant Distillation]
        AB4[Canon Reuse Injection]
    end

    subgraph T9[Adaptive Coordination Layer -- Block AC]
        AC1[Operational Posture]
        AC2[Attention Allocation]
        AC3[Adaptive Resource Routing]
        AC4[Operational Rhythm]
    end

    subgraph T10[Organism Layer -- Block AD]
        AD1[Multi-Loop Governance]
        AD2[Systemic Health Model]
        AD3[Organism Memory]
        AD4[Organism Console]
    end

    X1[Models / AI Providers]:::external
    X2[Databases / Memory / Logs]:::data

    U --> E1
    E1 --> E2
    E2 --> E3
    E3 --> E4

    E1 --> C1
    E2 --> C1
    E3 --> C2
    E4 --> C3

    C1 --> G1
    C2 --> G2
    C3 --> G3

    G1 --> S1
    G2 --> S2
    G3 --> S3
    S3 --> S4

    S1 --> R1
    S2 --> R2
    S3 --> R3
    S4 --> R4

    R1 --> K1
    R2 --> K2
    R3 --> K3
    R4 --> K4

    K1 --> Z1
    K2 --> Z2
    K3 --> Z3
    K4 --> Z4

    Z1 --> AB1
    Z3 --> AB2
    Z4 --> AB3

    AB1 --> AC1
    AB2 --> AC2
    AB3 --> AC3
    AB4 --> AC4

    AC1 --> AD1
    AC2 --> AD2
    AC3 --> AD3
    AC4 --> AD4

    E1 --> X1
    E2 --> X1
    E3 --> X1
    E4 --> X1

    C1 --> X2
    G2 --> X2
    S4 --> X2
    K3 --> X2
    Z1 --> X2
    AD3 --> X2

    classDef human fill:#F6E58D,stroke:#8C6D1F,color:#111,stroke-width:1.5px;
    classDef core fill:#74B9FF,stroke:#1B4F72,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef strategic fill:#D6A2E8,stroke:#7D3C98,color:#111,stroke-width:1.5px;
    classDef reflexive fill:#FF7675,stroke:#922B21,color:#111,stroke-width:1.5px;
    classDef canon fill:#6C5CE7,stroke:#2E1A8A,color:#fff,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef external fill:#B2BEC3,stroke:#636E72,color:#111,stroke-width:1.5px;
    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;

    class E1,E2,E3,E4,C1,C2,C3 core;
    class G1,G2,G3 governance;
    class S1,S2,S3,S4 strategic;
    class R1,R2,R3,R4 reflexive;
    class K1,K2,K3,K4 canon;
    class Z1,Z2,Z3,Z4 runtime;
    class AB1,AB2,AB3,AB4 intelligence;
    class AC1,AC2,AC3,AC4 intelligence;
    class AD1,AD2,AD3,AD4 runtime;
    class X2 data;
    class X1 external;
```

#### Runtime Knowledge Application Principle

```mermaid
flowchart LR
    A[Stored Pattern / Guideline / Template]:::canon
    B[Canon Governance]:::governance
    C[Retrieval Layer]:::canon
    D[Planning Agent]:::core
    E[Execution Agent]:::core
    F[Repair Loop]:::runtime
    G[Validation Layer]:::governance
    H[Runtime Artifact / Code Output]:::data
    I[Passive Documentation Only]:::external

    A --> B
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G

    D --> H
    E --> H
    F --> H
    G --> H

    A -. if not retrieved .-> I

    classDef core fill:#74B9FF,stroke:#1B4F72,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef canon fill:#6C5CE7,stroke:#2E1A8A,color:#fff,stroke-width:1.5px;
    classDef data fill:#55EFC4,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef external fill:#B2BEC3,stroke:#636E72,color:#111,stroke-width:1.5px;
```

> A stored pattern becomes implementation intelligence only when it is selected, retrieved, and applied by runtime flows. Without operational use, the canon remains documentation rather than active system capability.

---

## 6. Capability Layers

```
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 17: ADAPTIVE OPERATIONAL ORGANISM (Block AD â€” Complete)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Multi-Loop Governance Orchestrator               â† Active (Sprint 135)
   Systemic Health Model                            â† Active (Sprint 136)
   Organism Memory Layers                           â† Active (Sprint 137)
   Adaptive Operational Organism Console            â† Active (Sprint 138)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 16: ADAPTIVE COORDINATION (Block AC â€” Complete)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Operational Posture Engine                       â† Active (Sprint 131)
   Attention Allocation Engine                      â† Active (Sprint 132)
   Adaptive Resource Routing                        â† Active (Sprint 133)
   Operational Rhythm & Recovery Cycles             â† Active (Sprint 134)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 15: LEARNING CANONIZATION (Block AB â€” Complete)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Learning Extraction Engine                       â† Active (Sprint 127)
   Canon Promotion Pipeline                         â† Active (Sprint 128)
   Cross-Tenant Pattern Distillation                â† Active (Sprint 129)
   Canon Reuse Injection                            â† Active (Sprint 130)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 14: RUNTIME SOVEREIGNTY & OUTCOME COMPOUNDING (Block Z-AA â€” Complete)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Live Runtime Feedback Mesh                       â† Active (Sprint 119)
   Tenant Doctrine & Adaptive Operating Profiles v2 â† Active (Sprint 120)
   Outcome-Based Autonomy Engine                    â† Active (Sprint 121)
   Compounding Advantage & Moat Orchestrator        â† Active (Sprint 122)
   Runtime Execution Validation Harness             â† Active (Sprint 123)
   Autonomy Ladder Stabilization                    â† Active (Sprint 124)
   Tenant-Adaptive Regression Profiles              â† Active (Sprint 125)
   Cold Start Explainability Layer                  â† Active (Sprint 126)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 13: CANONICAL KNOWLEDGE & IMPLEMENTATION INTELLIGENCE (Block Y â€” Complete)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Canon Steward & Knowledge Governance Engine      â† Active (Sprint 115)
   Implementation Pattern Library & Retrieval Layer â† Active (Sprint 116)
   Failure Memory & Repair Intelligence Archive     â† Active (Sprint 117)
   External Knowledge Intake & Canon Evolution Ctrl â† Active (Sprint 118)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 12: REFLEXIVE GOVERNANCE LAYER (Block X â€” Complete)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Evolution Proposal Governance Engine             â† Active (Sprint 111)
   Architectural Mutation Control Layer             â† Active (Sprint 112)
   Reflective Validation & Self-Revision Audit      â† Active (Sprint 113)
   Kernel Integrity & Anti-Corrosion Guard          â† Active (Sprint 114)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 11: STRATEGIC COORDINATION LAYER (Block W â€” Complete)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Multi-Horizon Strategic Alignment Engine         â† Active (Sprint 107)
   Institutional Tradeoff Arbitration System        â† Active (Sprint 108)
   Mission Integrity & Drift Prevention             â† Active (Sprint 109)
   Civilizational Continuity Simulation Layer       â† Active (Sprint 110)
     Cross-sprint causal signals active and bounded
     Constitution management UI and history/integration tabs operational
     Known maturity backlog: dimension/horizon mgmt UI limited,
       constitution-aware weight injection partial, bulk ops out of scope

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 10: USER-FACING INTELLIGENCE LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Contextual Guidance & Copilot System            â† Active (Sprints 66-71+)
     - PageGuidanceShell (page-level guidance contracts)
     - ContextualCopilotDrawer (role-aware decision support)
     - GovernanceMentorDrawer (governance mentor mode)
     - CopilotTrigger (contextual activation)
     - WhyThisMattersNow / NextBestAction / ApprovalHint
     - 4 Copilot Submodes: product, workspace, governance_mentor, architecture_mentor
     - Centralized content registry (copilot-content.ts, governance-mentor-content.ts)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 9: ARCHITECTURE RESEARCH & EVOLUTION LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Architecture Hypothesis Engine                  â† Active (Sprint 91)
   Simulated Evolution Campaigns                   â† Active (Sprint 92)
   Cross-Tenant Pattern Synthesis                  â† Active (Sprint 93)
   Governed Architecture Promotion                 â† Active (Sprint 94)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 8: DISTRIBUTED RUNTIME & DELIVERY LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Distributed Job Control Plane                   â† Active (Sprint 87)
   Cross-Region Recovery                           â† Active (Sprint 88)
   Tenant-Isolated Scale Runtime                   â† Active (Sprint 89)
   Resilient Orchestration                         â† Active (Sprint 90)
   Delivery Causality Analysis                     â† Active (Sprint 83)
   Post-Deploy Learning                            â† Active (Sprint 84)
   Reliability-Aware Tuning                        â† Active (Sprint 85)
   Outcome Assurance 2.0                           â† Active (Sprint 86)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 7: ECOSYSTEM & MARKETPLACE LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Capability Packaging & Registry                 â† Active (Sprint 79)
   Trust & Entitlement Governance                  â† Active (Sprint 80)
   Partner Marketplace Pilot                       â† Active (Sprint 81)
   Outcome-Aware Capability Exchange               â† Active (Sprint 82)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 6: MULTI-AGENT COORDINATION LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Role Arbitration & Capability Routing 2.0       â† Active (Sprint 75)
   Debate & Resolution Protocol                    â† Active (Sprint 76)
   Shared Working Memory & Task-State Negotiation  â† Active (Sprint 77)
   Bounded Swarm Execution                         â† Active (Sprint 78)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 5: SEMANTIC RETRIEVAL & STRATEGY LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Layer 21: Semantic Retrieval & Embedding Memory â† Active (Sprint 36)
   Layer 17: Execution Strategy Evolution          â† Active (Sprint 32)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 4: PLATFORM INTELLIGENCE & CALIBRATION LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Layer 16: Platform Self-Calibration             â† Active (Sprint 31)
   Layer 15: Platform Intelligence Entry           â† Active (Sprint 30)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 3: EXECUTION GOVERNANCE LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Layer 14: Tenant/Workspace Adaptive Tuning      â† Active (Sprint 29)
   Layer 13: Execution Mode Portfolio Optimization  â† Active (Sprint 28)
   Layer 12: Execution Policy Intelligence         â† Active (Sprint 27)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 2: LEARNING & INTELLIGENCE LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Layer 11: Cross-Stage Policy Synthesis (LA v2)  â† Active (Sprint 26)
   Layer 10: Predictive Error Detection            â† Active (Sprint 25)
   Layer 9:  Agent Memory Operationalization       â† Active (Sprint 24)
   Layer 8:  Self-Improving Fix Agents v2          â† Active (Sprint 23)
   Layer 7:  Prompt Optimization + Rollback        â† Active (Sprints 21-22)
   Layer 6:  Proposal Quality & Calibration        â† Active (Sprints 19-20)
   Layer 5:  Engineering Memory Architecture       â† Cross-layer (Sprints 15-18)
   Layer 4:  Proposal Generation + Meta-Agents     â† Active (Sprints 13-14)

   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TIER 1: FOUNDATION LAYER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Layer 3:  Learning Agents v1                    â† Active (Sprint 12)
   Layer 2:  Commercial Readiness                  â† Active (Sprint 11)
   Layer 1:  Execution Kernel                      â† Active (Sprints 1-10)
              (Pipeline + Prevention + Routing + Governance + Observability)
```

Engineering Memory (Layer 5) is a **cross-layer infrastructure** that captures knowledge from all layers but does not interfere with their operation.

---

## 6. Agent Operating System (Agent OS) â€” v1.0 GA

The Agent OS is the runtime architecture governing how agents are selected, executed, governed and coordinated. It consists of 18 modules organized into 5 architectural planes.

> **Full specification:** [GOVERNANCE.md](GOVERNANCE.md) â€” canonical reference for planes, modules, agent types, contracts, safety boundaries, and events.

| Plane | Status | Key Modules |
|-------|--------|-------------|
| **Core** | âœ… Implemented | Runtime Protocol, Capability Model, Core Types |
| **Control** | âœ… Implemented | Selection Engine, Policy Engine, Governance Layer, Adaptive Routing |
| **Execution** | âœ… Implemented | Orchestrator, Coordination, Distributed Runtime, LLM/Tool Adapters |
| **Data** | âœ… Implemented | Artifact Store, Memory System, Observability |
| **Ecosystem** | âœ… Implemented | Marketplace, Capability Registry, Trust Scoring, Package Management |

---

## 7. Pipeline â€” 32-Stage Model

```
===============================================================
  VENTURE INTELLIGENCE LAYER (Stages 1-5)              FUTURE
===============================================================

  Stage 01: Idea Intake
  Stage 02: Opportunity Discovery Engine
  Stage 03: Market Signal Analyzer
  Stage 04: Product Validation Engine
  Stage 05: Revenue Strategy Engine

===============================================================
  DISCOVERY & ARCHITECTURE (Stages 6-10)               NOW
===============================================================

  Stage 06: Discovery Intelligence (pipeline-comprehension) -- 4 agents
  Stage 07: Market Intelligence (pipeline-architecture) -- 4 agents
  Stage 08: Technical Feasibility (pipeline-architecture-simulation)
  Stage 09: Project Structuring (pipeline-preventive-validation)
  Stage 10: Squad Formation (pipeline-squad)

===============================================================
  INFRASTRUCTURE & MODELING (Stages 11-16)             NOW
===============================================================

  Stage 11: Architecture Planning
  Stage 12: Domain Model Generation
  Stage 13: AI Domain Analysis
  Stage 14: Schema Bootstrap
  Stage 15: DB Provisioning
  Stage 16: Data Model Generation

===============================================================
  CODE GENERATION (Stages 17-19)                       NOW
===============================================================

  Stage 17: Business Logic Synthesis
  Stage 18: API Generation
  Stage 19: UI Generation

===============================================================
  VALIDATION & PUBLISH (Stages 20-23)                  NOW
===============================================================

  Stage 20: Validation Engine (Fix Loop + Deep Static + Drift Detection)
  Stage 21: Build Engine (Runtime Validation via CI)
  Stage 22: Test Engine (Autonomous Build Repair)
  Stage 23: Publish Engine (Atomic Git Tree API)

===============================================================
  GROWTH & EVOLUTION LAYER (Stages 24-32)
===============================================================

  Stage 24: Observability Engine                       NOW
  Stage 25: Product Analytics Engine                   LATER
  Stage 26: User Behavior Analyzer                     LATER
  Stage 27: Growth Optimization Engine                 LATER
  Stage 28: Adaptive Learning Engine                   NOW
  Stage 29: Product Evolution Engine                   LATER
  Stage 30: Architecture Evolution Engine              LATER
  Stage 31: Startup Portfolio Manager                  FUTURE
  Stage 32: System Evolution Engine                    FUTURE
```

---

## 8. Data Flow Between Layers

```mermaid
flowchart LR
    Pipeline["Pipeline Core\n(execution events)"]:::runtime --> OI["Operational\nIntelligence"]:::intelligence
    OI --> Learn["Learning\nEngine"]:::intelligence
    Learn --> Gov["Execution\nGovernance"]:::governance
    Gov --> Pipeline
    Learn --> PI["Platform\nIntelligence"]:::intelligence
    PI --> Calib["Self-\nCalibration"]:::governance
    PI --> Strat["Strategy\nEvolution"]:::strategic
    Calib --> Pipeline
    Strat --> Pipeline

    classDef runtime fill:#FD79A8,stroke:#AD1457,color:#111,stroke-width:1.5px;
    classDef intelligence fill:#00CEC9,stroke:#117A65,color:#111,stroke-width:1.5px;
    classDef governance fill:#C56CF0,stroke:#6C3483,color:#111,stroke-width:1.5px;
    classDef strategic fill:#D6A2E8,stroke:#7D3C98,color:#111,stroke-width:1.5px;
```

**Flow description:**
1. **Pipeline Core** emits execution events (success, failure, timing, cost)
2. **Operational Intelligence** extracts patterns, tracks repair strategies
3. **Learning Engine** optimizes prompts, builds memory, predicts errors, synthesizes cross-stage policies
4. **Execution Governance** selects policies based on learning signals, adapts per tenant
5. **Platform Intelligence** aggregates system-level behavior, detects bottlenecks
6. **Self-Calibration** proposes bounded threshold adjustments based on intelligence signals
7. **Strategy Evolution** proposes and tests strategy variants against baselines
8. All calibrations and strategy changes flow back into the pipeline as bounded adjustments

---

## 9. Safety Architecture

### Structural Safety Rules

1. **Recommendations do not execute changes.** All recommendations require human review.
2. **Artifacts do not execute changes.** Engineering artifacts are documents for review.
3. **Memory is not a mutation engine.** Engineering Memory is informational infrastructure only.
4. **Calibration is advisory-first.** Calibration signals diagnose; humans decide.
5. **Strategy evolution is bounded.** Variants stay within declared mutation envelopes.
6. **Human review remains required for structural evolution.** Any pipeline/governance/billing change requires human action.
7. **Tenant isolation is absolute.** All data scoped by `organization_id` with RLS enforcement.
8. **Learning is bounded and reversible.** Weight adjustments have min/max constraints.
9. **Forbidden domains are immutable.** Pipeline topology, governance, billing, enforcement, execution contracts, and hard safety constraints cannot be calibrated or mutated by any automated system.

---

## 10. AI Efficiency Layer

The AI Efficiency Layer optimizes token consumption, cost, and quality across all AI calls. It consists of four integrated engines orchestrated through the unified `callAI()` client (`_shared/ai-client.ts`).

### Canonical AI Routing Matrix
**File:** `_shared/ai-routing-matrix.ts`

The routing matrix is the single source of truth for all AI provider/model routing decisions. It classifies every AI call by task class and routes to the optimal provider/model combination.

**Primary Providers:**
- **DeepSeek** â€” Economy-first engine for high-volume, drafting, extraction
- **OpenAI (GPT-5-mini)** â€” High-confidence engine for structured output, governance, user-facing
- **OpenAI (GPT-5.4)** â€” Premium escalation for rare strategic/architecture reviews
- **Pollinations** â€” Optional experimental fallback only (disabled by default)
- **Lovable AI Gateway** â€” Transport fallback when no external API keys are configured (explicit OpenAI model names, never Gemini)

**Routing Tiers:**

| Tier | Default Provider | Model | Cost | Use Cases |
|------|-----------------|-------|------|-----------|
| Economy | DeepSeek | `deepseek-chat` | 0.2x | Classification, tagging, extraction, summarization, rewriting, drafting, embedding, prompt compression |
| Balanced | DeepSeek | `deepseek-chat` / `deepseek-reasoner` | 0.5x | First-pass code, workspace analysis, heavy reasoning (cost-sensitive), generic tasks |
| High Confidence | OpenAI | `gpt-5-mini` | 0.8x | Strict structured output, governance recommendations, user-facing responses, architecture reasoning, code refactor |
| Premium | OpenAI | `gpt-5.4` | 1.0x | Rare executive synthesis, premium architecture review, critical strategic decisions |

**Task Classification:** 14 task classes mapped to tiers: `simple_transform`, `extraction`, `summarization`, `drafting`, `workspace_analysis`, `code_generation`, `code_refactor`, `strict_structured_output`, `user_facing_response`, `governance_recommendation`, `architecture_reasoning`, `heavy_reasoning_cost_sensitive`, `premium_strategy`, `embedding_generation`, `prompt_compression`, `generic`.

**Pipeline Stage Mapping:** `_shared/ai-routing-matrix.ts` maps known pipeline stages to their canonical task class (e.g., `architecture` â†’ `architecture_reasoning`, `api_generation` â†’ `strict_structured_output`, `observability` â†’ `extraction`).

### AI Router
**File:** `_shared/ai-router.ts`

Runtime resolution layer that handles:
- Provider availability checks (OpenAI key â†’ DeepSeek key â†’ Lovable Gateway)
- Heuristic complexity analysis when no explicit task class is provided
- Fallback chain assembly with provider swap
- Observability logging of all routing decisions

### Prompt Compression Engine
**File:** `_shared/prompt-compressor.ts`
**Result:** 60â€“90% token reduction while preserving engineering-critical information. Uses rule-based cleaning first, then AI-assisted compression for large prompts (>8000 chars).

### Semantic Cache Engine
**File:** `_shared/semantic-cache.ts`
**Table:** `ai_prompt_cache` (with `vector(768)` column)
**Threshold:** cosine similarity > 0.92 returns cached response. Tracks hit counts and tokens saved.

### Model Router (Legacy Bridge)
**File:** `_shared/model-router.ts`
Delegates to the canonical AI Router. Maintained for backward compatibility.

### Integration Flow
All modules integrate transparently in `callAI()` (`_shared/ai-client.ts`):
```
callAI() â†’ compress â†’ cache lookup â†’ canonical route (matrix + availability) â†’ LLM call (with retry + fallback chain) â†’ cache store â†’ return
```

**Provider Priority:** OpenAI (direct) â†’ DeepSeek (direct) â†’ Lovable AI Gateway (explicit OpenAI models, never Gemini defaults).

**Canonical Invariant:** Gemini is explicitly removed as a default route. AxionOS controls its own model selection based on task class, risk, and cost â€” not gateway defaults.

---

## 11. Edge Function Architecture

```
supabase/functions/
+-- Discovery & Architecture       (5 functions)
+-- Infrastructure & Modeling       (8 functions)
+-- Code Generation                 (3 functions)
+-- Validation & Publish            (6 functions)
+-- Growth & Evolution              (9 functions)
+-- Pipeline Control                (7 functions)
+-- Commercial Readiness            (2 functions -- Sprint 11)
+-- Learning Agents                 (6 functions -- Sprint 12)
+-- Meta-Agents                     (3 functions -- Sprint 13-14, 18)
+-- Engineering Memory              (2 functions -- Sprint 15, 17)
+-- Proposal Quality                (1 function -- Sprint 19)
+-- Advisory Calibration            (1 function -- Sprint 20)
+-- Prompt Optimization             (1 function -- Sprint 21-22)
+-- Repair Policy                   (1 function -- Sprint 23)
+-- Agent Memory                    (1 function -- Sprint 24)
+-- Predictive Error Detection      (2 functions -- Sprint 25)
+-- Cross-Stage Learning            (1 function -- Sprint 26)
+-- Execution Policy Intelligence   (1 function -- Sprint 27)
+-- Portfolio Optimization          (1 function -- Sprint 28)
+-- Tenant Adaptive Tuning          (1 function -- Sprint 29)
+-- Platform Intelligence           (1 function -- Sprint 30)
+-- Platform Self-Calibration       (1 function -- Sprint 31)
+-- Strategy Evolution              (1 function -- Sprint 32)
+-- Strategy Portfolio Governance   (1 function -- Sprint 33)
+-- Platform Self-Stabilization     (1 function -- Sprint 34)
+-- Engineering Advisor             (1 function -- Sprint 35)
+-- Semantic Retrieval              (1 function -- Sprint 36)
+-- Discovery Architecture          (1 function -- Sprint 37)
+-- Architecture Simulation         (1 function -- Sprint 38)
+-- Architecture Change Planning    (1 function -- Sprint 39)
+-- Architecture Rollout Sandbox    (1 function -- Sprint 40)
+-- Support                         (11 functions)
+-- _shared/                        (15+ helper modules)
    +-- agent-os/                   (14 Agent OS modules)
    +-- meta-agents/               (Meta-agent types, scoring, validation, memory, quality)
    +-- calibration/               (Calibration types, scoring, analysis service)
    +-- learning/                  (Prompt optimization, promotion, rollback)
    +-- repair/                    (Repair policies, strategies, memory, intelligence)
    +-- prevention/                (Prevention evaluator)
    +-- agent-memory/              (Agent memory retriever, injector, writer, quality)
    +-- predictive/                (Risk engine, checkpoint runner, preventive actions, outcome tracker)
    +-- cross-stage/               (Policy synthesizer, evaluator, runner, lineage)
    +-- execution-policy/          (Classifier, selector, adjuster, runner, feedback, portfolio, ranking, lifecycle, conflict)
    +-- tenant-policy/             (Tuning engine, override guard, selector, drift detector)
    +-- platform-intelligence/     (Behavior aggregator, bottleneck detector, pattern analyzer, insight generator, recommendation engine, health model)
    +-- platform-calibration/      (Signal interpreter, proposal engine, guardrails, runner, outcome tracker, rollback engine)
    +-- execution-strategy/        (Signal interpreter, variant synthesizer, guardrails, experiment runner, outcome tracker, promotion rules, rollback engine, lineage)
    +-- strategy-portfolio/        (Portfolio lifecycle, health scoring, conflict resolution)
    +-- platform-stabilization/    (Drift detector, oscillation detector, stability guard, safe modes)
    +-- engineering-advisor/       (Advisor synthesis, signal processor, review manager, explainer)
    +-- semantic-retrieval/        (Session manager, index manager, context builders, guardrails)
    +-- discovery-architecture/    (Signal correlation, recommendation generator, evidence linker)
    +-- architecture-simulation/   (Impact simulator, boundary analyzer, guardrails, review manager, explainer)
    +-- architecture-planning/     (Dependency planner, readiness assessor, validation/rollback blueprints, clustering, review)
    +-- architecture-rollout/      (Migration rehearsal, fragility analyzer, readiness assessor, rollback viability, sandbox guardrails)
```

---

## 12. Implementation Status

> **Canonical sprint-by-sprint record:** #axionos--sprint-ledger
> **Summary:** 138 sprints complete. 100+ architectural layers active. All blocks (Foundation through AD) implemented, validated, and hardened.

| Block | Sprints | Status |
|-------|---------|--------|
| Foundation + Operational Intelligence | 1â€“12 | âœ… Complete |
| Meta-Intelligence & Memory | 13â€“20 | âœ… Complete |
| Learning & Repair Intelligence | 21â€“26 | âœ… Complete |
| Execution Governance | 27â€“29 | âœ… Complete |
| Platform Intelligence & Calibration | 30â€“31 | âœ… Complete |
| Strategy Evolution & Governance | 32â€“33 | âœ… Complete |
| Platform Stabilization & Advisory | 34â€“37 | âœ… Complete |
| Architecture Intelligence | 38â€“40 | âœ… Complete |
| Architecture-Governed (J) | 41â€“43 | âœ… Complete |
| Architecture-Operating (K) | 44â€“45 | âœ… Complete |
| Architecture-Scaled (L) | 46â€“48 | âœ… Complete |
| Platform Convergence (M) | 49â€“70 | âœ… Complete |
| Governed Extensibility Bridge | 71 | âœ… Complete |
| Evidence-Governed Improvement Loop (N) | 72â€“74 | âœ… Complete |
| Advanced Multi-Agent Coordination (O) | 75â€“78 | âœ… Complete |
| Governed Capability Ecosystem (P) | 79â€“82 | âœ… Complete |
| Delivery Optimization & Outcome Assurance 2.0 (Q) | 83â€“86 | âœ… Complete |
| Distributed Runtime & Scaled Execution (R) | 87â€“90 | âœ… Complete |
| Research Sandbox for Architecture Evolution (S) | 91â€“94 | âœ… Complete |
| Governed Intelligence OS (T) | 95â€“98 | âœ… Complete |
| Adaptive Institutional Ecosystem (U) | 99â€“102 | âœ… Complete |
| Sovereign Institutional Intelligence (V) | 103â€“106 | âœ… Complete |
| Strategic Autonomy & Civilizational Coordination (W) | 107â€“110 | âœ… Complete |
| Reflexive Governance & Evolution Control (X) | 111â€“114 | âœ… Complete |
| Implementation Canon & Knowledge Governance (Y) | 115â€“118 | âœ… Complete |
| Runtime Sovereignty & Outcome Compounding (Z) | 119â€“122 | âœ… Complete |
| Runtime Proof & Adaptive Governance (AA) | 123â€“126 | âœ… Complete |
| Learning Canonization (AB) | 127â€“130 | âœ… Complete |
| Adaptive Coordination (AC) | 131â€“134 | âœ… Complete |
| Adaptive Operational Organism (AD) | 135â€“138 | âœ… Complete |

---

## 13. Database Schema (80+ tables)

### Core Tables
- `organizations`, `organization_members`, `profiles`
- `workspaces`, `initiatives`, `initiative_jobs`
- `agents`, `agent_messages`, `agent_memory`, `agent_outputs`

### Pipeline Tables
- `stories`, `story_phases`, `story_subtasks`
- `squads`, `squad_members`
- `planning_sessions`
- `code_artifacts`, `content_documents`, `adrs`

### Brain Tables
- `project_brain_nodes` (with `vector(768)` embedding)
- `project_brain_edges`
- `project_decisions`
- `project_errors`
- `project_prevention_rules`

### Governance Tables
- `pipeline_gate_permissions`
- `stage_sla_configs`
- `org_usage_limits`
- `audit_logs`
- `artifact_reviews`

### Efficiency Tables
- `ai_prompt_cache` (with `vector(768)` embedding, TTL, hit tracking)
- `ai_rate_limits`

### Knowledge Tables
- `org_knowledge_base`
- `git_connections`
- `supabase_connections`
- `validation_runs`
- `usage_monthly_snapshots`

### Commercial Tables (Sprint 11)
- `product_plans` â€” Starter / Pro / Enterprise with limits
- `billing_accounts` â€” Stripe-ready with period tracking
- `workspace_members` â€” Granular roles per workspace

### Learning Tables (Sprint 12)
- `prompt_strategy_metrics` â€” Prompt performance aggregation
- `strategy_effectiveness_metrics` â€” Repair strategy effectiveness
- `predictive_error_patterns` â€” Recurring failure predictions
- `repair_strategy_weights` â€” Adjusted routing weights
- `learning_recommendations` â€” Structured improvement suggestions
- `learning_records` â€” Learning foundation substrate

### Meta-Agent Tables (Sprint 13-14)
- `meta_agent_recommendations` â€” Architectural recommendations
- `meta_agent_artifacts` â€” Engineering proposals

### Engineering Memory Tables (Sprints 15-17)
- `engineering_memory_entries` â€” Core memory storage with type taxonomy
- `memory_links` â€” Typed relationships between memory entries
- `memory_retrieval_log` â€” Retrieval tracking
- `memory_summaries` â€” Periodic historical synthesis

### Proposal Quality Tables (Sprint 19)
- `proposal_quality_feedback` â€” Quality and outcome tracking
- `proposal_quality_summaries` â€” Periodic quality summaries

### Advisory Calibration Tables (Sprint 20)
- `advisory_calibration_signals` â€” Structured diagnostic signals
- `advisory_calibration_summaries` â€” Periodic calibration summaries

### Prompt Optimization Tables (Sprints 21-22)
- `prompt_variants` â€” Prompt variant registry with A/B testing
- `prompt_variant_executions` â€” Execution telemetry per variant
- `prompt_variant_metrics` â€” Aggregated variant performance metrics
- `prompt_variant_promotions` â€” Promotion events with lineage
- `prompt_rollout_windows` â€” Phased rollout tracking
- `prompt_promotion_health_checks` â€” Post-promotion health monitoring
- `prompt_rollback_events` â€” Rollback events

### Repair Policy Tables (Sprint 23)
- `repair_policy_profiles` â€” Memory-aware repair strategy profiles
- `repair_policy_decisions` â€” Logged repair decisions
- `repair_policy_adjustments` â€” Bounded, reversible adjustments

### Agent Memory Tables (Sprint 24)
- `agent_memory_profiles` â€” Per-agent persistent memory profiles
- `agent_memory_records` â€” Reusable memory units

### Predictive Error Detection Tables (Sprint 25)
- `predictive_risk_assessments` â€” Runtime risk scoring
- `predictive_runtime_checkpoints` â€” Checkpoint evaluations
- `predictive_preventive_actions` â€” Preventive actions

### Cross-Stage Learning Tables (Sprint 26)
- `cross_stage_learning_edges` â€” Learning graph edges
- `cross_stage_policy_profiles` â€” Synthesized cross-stage policies
- `cross_stage_policy_outcomes` â€” Policy outcome tracking

### Execution Policy Intelligence Tables (Sprint 27)
- `execution_policy_profiles` â€” Bounded execution policy modes
- `execution_policy_outcomes` â€” Outcome tracking per policy
- `execution_policy_decisions` â€” Audit trail of policy decisions

### Execution Mode Portfolio Tables (Sprint 28)
- `execution_policy_portfolio_entries` â€” Portfolio entries with scores
- `execution_policy_portfolio_recommendations` â€” Portfolio recommendations

### Tenant Adaptive Policy Tuning Tables (Sprint 29)
- `tenant_policy_preference_profiles` â€” Org/workspace preferences
- `tenant_policy_outcomes` â€” Tenant-specific outcomes
- `tenant_policy_recommendations` â€” Tenant recommendations

### Platform Intelligence Tables (Sprint 30)
- `platform_insights` â€” Platform-level insights
- `platform_recommendations` â€” Prioritized advisory recommendations

### Platform Self-Calibration Tables (Sprint 31)
- `platform_calibration_parameters` â€” Calibratable parameter registry
- `platform_calibration_proposals` â€” Calibration proposals
- `platform_calibration_applications` â€” Applied calibrations
- `platform_calibration_rollbacks` â€” Rollback records

### Execution Strategy Evolution Tables (Sprint 32)
- `execution_strategy_families` â€” Strategy family registry
- `execution_strategy_variants` â€” Bounded variant proposals
- `execution_strategy_experiments` â€” Controlled experiments
- `execution_strategy_outcomes` â€” Experiment outcome tracking

### Strategy Portfolio Governance Tables (Sprint 33)
- `strategy_portfolio_entries` â€” Strategy family portfolio entries
- `strategy_portfolio_health_snapshots` â€” Portfolio health snapshots
- `strategy_portfolio_recommendations` â€” Governance recommendations

### Platform Self-Stabilization Tables (Sprint 34)
- `platform_stability_signals` â€” Stability signals (drift, oscillation)
- `platform_stabilization_proposals` â€” Stabilization proposals
- `platform_stabilization_applications` â€” Applied stabilizations
- `platform_safe_mode_profiles` â€” Safe mode profiles

### Autonomous Engineering Advisor Tables (Sprint 35)
- `engineering_advisor_signals` â€” Cross-layer advisory signals
- `engineering_advisor_recommendations` â€” Advisory recommendations
- `engineering_advisor_reviews` â€” Recommendation review lifecycle

### Semantic Retrieval Tables (Sprint 36)
- `semantic_retrieval_sessions` â€” Retrieval sessions with audit
- `semantic_retrieval_feedback` â€” Retrieval usefulness feedback
- `semantic_index_profiles` â€” Index profiles per domain

### Discovery Architecture Tables (Sprint 37)
- `discovery_architecture_signals` â€” External/product signals
- `discovery_architecture_recommendations` â€” Architecture recommendations
- `discovery_architecture_evidence_links` â€” Evidence linkage

### Architecture Simulation Tables (Sprint 38)
- `architecture_change_proposals` â€” Change proposal registry
- `architecture_simulation_scope_profiles` â€” Simulation scope profiles
- `architecture_simulation_outcomes` â€” Simulation results
- `architecture_simulation_reviews` â€” Simulation review lifecycle

### Architecture Planning Tables (Sprint 39)
- `architecture_change_plans` â€” Implementation plans with blast radius
- `architecture_rollout_mode_profiles` â€” Rollout mode profiles
- `architecture_change_plan_reviews` â€” Plan review lifecycle

### Architecture Rollout Sandbox Tables (Sprint 40)
- `architecture_rollout_sandboxes` â€” Sandbox rehearsal environments
- `architecture_validation_hooks` â€” Validation hook registry
- `architecture_rollout_sandbox_outcomes` â€” Sandbox rehearsal results
- `architecture_rollout_governance_profiles` â€” Sandbox governance profiles
- `architecture_rollout_sandbox_reviews` â€” Sandbox review lifecycle

---

## 14. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine â€” Economy | DeepSeek (`deepseek-chat`, `deepseek-reasoner`) |
| AI Engine â€” High Confidence | OpenAI (`gpt-5-mini`) |
| AI Engine â€” Premium | OpenAI (`gpt-5.4` / `gpt-5.2`) |
| AI Engine â€” Fallback Transport | Lovable AI Gateway (explicit OpenAI models, no Gemini) |
| AI Efficiency Layer | Prompt compression + semantic cache + canonical routing matrix |
| Git Integration | GitHub API v3 (Tree API for atomic commits, PRs) |
| Deployment | Vercel/Netlify configs auto-generated |

### Multi-Tenancy Model

- **Organizations** â†’ **Workspaces** â†’ **Initiatives**
- RLS policies enforce isolation per `organization_id`
- Role-based access: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- Auto-provisioning: first login creates a default org via `create_organization_with_owner` RPC

### System Maturity

> **Current:** Level 10+ â€” Adaptive Operational Organism âœ… (138 sprints complete)

---

## 15. Governing Principle

> The Agent OS is a contract-driven, plane-separated architecture. Decisions flow through Control, execution through Execution, state into Data, identity from Core, discovery via Ecosystem. No plane assumes another's responsibilities.
>
> **Core invariants:**
> - Learning is additive, auditable, bounded â€” it cannot mutate the kernel directly
> - Engineering Memory informs but never commands
> - Calibration signals diagnose; humans decide when and how tuning is applied
> - All structural evolution requires human review and approval
> - Tenant isolation is absolute (organization_id + RLS)
> - Forbidden mutation families: pipeline topology, governance rules, billing logic, plan enforcement, execution contracts, hard safety constraints
> - Every promotion, calibration, strategy experiment, and architecture change preserves rollback capability
> - All advisory layers remain bounded, explainable, and review-driven
> - Internal sophistication serves the product experience â€” unnecessary complexity must not leak into the default user-facing journey

---

## 16. Product Boundary Model

AxionOS distinguishes four architectural surface layers:

| Surface Layer | Audience | Purpose | Examples |
|---------------|----------|---------|----------|
| **Internal System Architecture** | Platform engineers | Governance, intelligence, memory, calibration, observability, ecosystem controls, policy engines, orchestration | All 54 architectural layers, Agent OS modules, learning/repair/calibration engines |
| **Advanced Operator Surface** | Operators / leads | Governance dashboards, risk posture, policy management, product ops, ecosystem readiness, audit | Operational observability tabs, governance reviews, policy frames, fitness dimensions |
| **Platform Governance Surface** | Platform reviewers / admins | Infrastructure controls, multi-tenant orchestration, advanced AI pipeline tooling | Routing, debates, working memory, swarm, marketplace, meta-agents, calibration, observability |
| **User-Facing Product Surface** | End users | Dashboard, Journey, Onboarding, Initiatives, Stories, Code, Deployments, AutoPilot | Pipeline stages, progress indicators, approval gates, deploy status |

### Role and Surface Access Model

| Role | Product | Workspace | Platform |
|------|---------|-----------|----------|
| **End User** | âœ… | â€” | â€” |
| **Operator** | âœ… | âœ… | â€” |
| **Tenant Owner** | âœ… | âœ… | â€” |
| **Platform Reviewer** | âœ… | âœ… | âœ… |
| **Platform Admin** | âœ… | âœ… | âœ… |

**Key principle:** Internal architecture powers the system. Operator surfaces expose governance and advanced controls. The **default product surface** should present the journey from idea to delivered software without unnecessary internal complexity.

---

## 17. Architectural Direction â€” Post-Block AD

With 138 sprints complete, all blocks from Foundation through Adaptive Operational Organism (AD) delivered and hardened, the platform has achieved Level 10+ maturity. 100+ architectural layers are active.

### Completed Canon (Sprints 1â€“138)

- âœ… All layers from execution kernel through adaptive operational organism
- âœ… 100+ architectural layers active
- âœ… Full operating canon with all planned blocks implemented and hardened
- âœ… 200+ Edge Functions deployed

### Implemented Blocks (Nâ€“W)

#### Block N â€” Evidence-Governed Improvement Loop (Sprints 72â€“74) â€” âœ… Complete

**Architectural contribution:** Structured evidence collection from pipeline outcomes, bounded improvement proposal generation, governed testing/promotion, and rollback-safe experimentation.

#### Block O â€” Advanced Multi-Agent Coordination (Sprints 75â€“78) â€” âœ… Complete

**Architectural contribution:** Advanced role arbitration, bounded debate and resolution, shared working memory and task-state negotiation, bounded swarm execution with checkpoints and rollback posture.

#### Block P â€” Governed Capability Ecosystem (Sprints 79â€“82) â€” âœ… Complete

**Architectural contribution:** Capability packaging with semantic versioning, trust/entitlement governance, partner marketplace pilot, outcome-aware capability exchange.

#### Block Q â€” Autonomous Delivery Optimization (Sprints 83â€“86) â€” âœ… Complete

**Architectural contribution:** Delivery outcome causality analysis, post-deploy learning assimilation, reliability-aware tuning, outcome assurance 2.0.

#### Block R â€” Advanced Distributed Runtime (Sprints 87â€“90) â€” âœ… Complete

**Architectural contribution:** Distributed job control plane, cross-region recovery, tenant-isolated scale runtime, resilient large-scale orchestration.

#### Block S â€” Research Sandbox (Sprints 91â€“94) â€” âœ… Complete

**Architectural contribution:** Architecture hypothesis engine, simulated evolution campaigns, cross-tenant pattern synthesis, human-governed architecture promotion.

#### Block T â€” Governed Intelligence OS (Sprints 95â€“98) â€” âœ… Complete

**Architectural contribution:** Institutional memory consolidation, doctrine & playbook synthesis, bounded autonomous operations, institutional decision engine.

#### Block U â€” Adaptive Institutional Ecosystem (Sprints 99â€“102) â€” âœ… Complete

**Architectural contribution:** Cross-context doctrine adaptation, institutional conflict resolution, federated intelligence boundaries with tenant isolation, resilience & continuity governance.

#### Block V â€” Sovereign Institutional Intelligence (Sprints 103â€“106) â€” âœ… Complete

**Architectural contribution:** Institutional memory constitution (amendment governance, protection rules, memory sovereignty), sovereign decision rights orchestration (authority delegation, escalation), dependency sovereignty & external reliance governance (substitution readiness, sovereignty posture), strategic succession & long-horizon continuity (knowledge concentration detection, handoff orchestration, transition risk assessment).

#### Block W â€” Strategic Autonomy & Civilizational Coordination (Sprints 107â€“110) â€” âœ… Complete & Hardened

**Architectural contribution:** Multi-horizon strategic alignment engine (short/medium/long-term coordination, urgency vs strategy governance), institutional tradeoff arbitration system (explicit sacrifice tracking, auditable tradeoff objects), mission integrity & drift prevention (telos compass, strategic/moral/operational drift detection), civilizational continuity simulation layer (long-horizon scenario modeling, regulatory/technology/capacity shift foresight).

**Hardening applied:** Cross-sprint causal signal integration (bounded, inspectable, max Â±15% per signal / Â±25% total), constitution management UI with governance lifecycle (draft/active/deprecated), history/integration tabs with trend visualization, scoring transparency and causal modifier cards.

**Known maturity backlog (non-blocking):** Dimension/horizon management UI still limited; constitution-aware runtime weight injection still partial; bulk subject operations intentionally out of scope; historical visualization can still be refined.

#### Block X â€” Reflexive Governance & Evolution Control (Sprints 111â€“114) â€” âœ… Complete

**Architectural contribution:** Evolution proposal governance engine (govern proposals for changing the system itself), architectural mutation control layer (reversibility, blast radius, coupling expansion, mutation legitimacy), reflective validation & self-revision audit (audit whether self-corrections actually improved the system), kernel integrity & anti-corrosion guard (protect the kernel against corrosion, bloat, existential drift, loss of legibility).

#### Tier 13 â€” Canonical Knowledge & Implementation Intelligence (Block Y â€” âœ… Complete)

Block Y introduces the Canonical Knowledge & Implementation Intelligence layer.

This layer governs how implementation knowledge is stored, validated, retrieved, and operationally applied across the system.

Its purpose is not to accumulate documentation, but to transform implementation knowledge into runtime-connected system capability.

Block Y enables AxionOS to maintain a governed implementation canon including:

- approved architectural patterns
- reusable implementation templates
- curated code snippets
- stack-specific conventions
- failure memory and repair strategies
- validated external knowledge updates

This canon is not passive documentation.
It is designed to be queried and applied directly by system agents and pipeline stages.

Planning agents consult architectural canon before generating implementation strategies.

Execution agents retrieve approved templates and conventions before producing code.

Repair systems consult historical failure patterns and successful mitigation strategies.

Validation agents compare generated artifacts against canon-approved practices.

In AxionOS, knowledge only counts as system capability when it is operationally connected to runtime behavior.

A pattern not consumed by agents or functions is documentation, not implementation intelligence.

Block Y therefore introduces a governed knowledge system that is applied, versioned, auditable, and operationally integrated.

#### Tier 14 â€” Runtime Sovereignty & Outcome Compounding (Block Z â€” âœ… Complete)

Block Z introduces runtime sovereignty and outcome compounding.

Its purpose is to close the loop between generated software and live operational behavior, transforming runtime evidence into adaptive operating doctrine, bounded autonomy, and compounding system advantage.

This layer does not introduce unrestricted autonomy.
All governance constraints from previous layers remain active, including human authority over structural change and prohibition of autonomous architecture mutation.

Block Z focuses on four capabilities:

- **Live Runtime Feedback Mesh** â€” Connects deployment artifacts, runtime events, incidents, and repair outcomes into a unified outcome lineage model.

- **Tenant Doctrine & Adaptive Operating Profiles** â€” Derives evidence-based operating profiles for each organization based on runtime behavior, rollout patterns, rollback posture, and incident response tendencies.

- **Outcome-Based Autonomy Engine** â€” Implements graduated autonomy levels based on historical success, rollback behavior, incident frequency, and doctrine alignment.

- **Compounding Advantage Orchestrator** â€” Detects and consolidates operational strengths that emerge over time across stacks, workflows, and tenant domains.

**Architectural note:** Runtime sovereignty must always remain subordinate to governance layers introduced in Block X and Block Y. Block Z expands operational learning, not structural authority.

### Operational Lessons Learned

The validation/fix loop phase during Block W execution exposed a structural gap:

- **Observation:** AxionOS governance and observability are significantly stronger than its runtime self-reconfiguration capability.
- **Symptom:** Oversized artifact batches (6-8 per request) triggered 30+ sequential AI calls in a single edge function, exceeding the 60-second timeout. Jobs remained in `running` state indefinitely, creating orphaned execution slots.
- **Resolution:** Manual reduction of batch sizes (from 8 to 2), auto-cleanup of stale jobs, and frontend retry logic.
- **Structural insight:** The system could *detect* and *explain* problems (governance, observability, audit) but could not *autonomously reconfigure* its own execution parameters (batch size, timeout, retry posture) in response. This gap â€” between strategic awareness and runtime adaptation â€” is the direct motivation for Block X.

### Governing Constraint

Advisory-first, governance-before-autonomy. No autonomous architecture mutation. Internal sophistication serves the product experience â€” it does not replace it. All future blocks must preserve rollback capability, tenant isolation, and human authority over structural change.

---

## Architecture / Documentation Boundaries

- **ARCHITECTURE.md** (this file) defines system structure â€” containers, components, layers, data flow, safety rules
- **GOVERNANCE.md** defines Agent OS module reference â€” planes, modules, contracts, events; this file summarizes Agent OS but defers to GOVERNANCE.md for full specs
- **CANON_INTELLIGENCE_ENGINE.md** defines the Canon Intelligence Engine architecture â€” Agentâ€“Contract model, canonization workflow
- **AXION_CONTEXT.md** provides quick context restoration for humans
- **AXION_PRIMER.md** provides ultra-short cognitive anchor for AI
- **docs/registry/** contains lightweight canonical metadata (sprints.yml, doc-authority.yml)
- **docs/README.md** is the navigation and maintenance guide

> Diagrams in this file use **Mermaid** for GitHub rendering. PlantUML versions are in `docs/diagrams/` for corporate export.


# AxionOS â€” Sprint Ledger

> Sprint-by-sprint implementation record. **Canonical source for sprint status.**
> Last updated: 2026-03-11 Â· 138 sprints complete (Blocks Foundation through AD)
>
> For architecture detail â†’ [ARCHITECTURE.md](ARCHITECTURE.md)
> For agent/module specs â†’ [GOVERNANCE.md](GOVERNANCE.md)

## Governing Principles

- No autonomous architecture mutation â€” all structural changes require human approval
- Governance before autonomy â€” autonomy is earned through evidence, bounded, and reversible
- Learning candidates produce structured proposals only; they cannot modify canon automatically
- Rollback posture is mandatory for any elevated autonomy class

---

## Sprint Table

| Sprint | Block | Name | Layer | Status |
|--------|-------|------|-------|--------|
| 1 | Foundation | Initiative Brief Formalization | Execution Kernel | âœ… |
| 2 | Foundation | Initiative Simulation Engine | Execution Kernel | âœ… |
| 3 | Foundation | Deploy Contract Completion | Execution Kernel | âœ… |
| 4 | Foundation | Product-Level Observability | Execution Kernel (Observability) | âœ… |
| 5 | Foundation | Onboarding & Product Packaging | Execution Kernel | âœ… |
| 6 | Foundation | Evidence-Oriented Repair Loop | Execution Kernel (Repair) | âœ… |
| 7 | Foundation | Error Pattern Library & Learning Foundation | Execution Kernel (Prevention) | âœ… |
| 8 | Foundation | Preventive Engineering Layer | Execution Kernel (Prevention) | âœ… |
| 9 | Foundation | Adaptive Repair Routing | Execution Kernel (Routing) | âœ… |
| 10 | Foundation | Learning Agents Foundation | Execution Kernel (Learning Substrate) | âœ… |
| 11 | Foundation | Commercial Readiness / Billing | Commercial Readiness Layer | âœ… |
| 12 | Foundation | Learning Agents v1 (5 engines) | Learning Agents Layer | âœ… |
| 13 | Foundation | Meta-Agents v1 | Meta-Agent Coordination Layer | âœ… |
| 14 | Foundation | Controlled Meta-Agent Actions | Proposal Generation Layer | âœ… |
| 15 | Foundation | Engineering Memory Foundation | Engineering Memory Architecture | âœ… |
| 16 | Foundation | Memory Retrieval Surfaces | Engineering Memory Architecture | âœ… |
| 17 | Foundation | Memory Summaries | Engineering Memory Architecture | âœ… |
| 18 | Foundation | Memory-Aware Meta-Agents | Meta-Agent + Memory | âœ… |
| 19 | Foundation | Proposal Quality Feedback Loop | Proposal Quality & Calibration Layer | âœ… |
| 20 | Foundation | Advisory Calibration Layer | Proposal Quality & Calibration Layer | âœ… |
| 21 | Foundation | Prompt Optimization Engine (A/B testing) | Prompt Optimization Layer | âœ… |
| 22 | Foundation | Bounded Promotion & Rollback Guard | Prompt Optimization Layer | âœ… |
| 23 | Foundation | Self-Improving Fix Agents v2 | Repair Intelligence Layer | âœ… |
| 24 | Foundation | Agent Memory Layer Operationalization | Agent Memory Layer | âœ… |
| 25 | Foundation | Predictive Error Detection | Predictive Detection Layer | âœ… |
| 26 | Foundation | Learning Agents v2 (Cross-Stage Policy) | Cross-Stage Learning Layer | âœ… |
| 27 | Foundation | Execution Policy Intelligence | Execution Governance Layer | âœ… |
| 28 | Foundation | Execution Mode Portfolio Optimization | Execution Governance Layer | âœ… |
| 29 | Foundation | Workspace / Tenant Adaptive Policy Tuning | Execution Governance Layer | âœ… |
| 30 | Foundation | Platform Intelligence Entry | Platform Intelligence Layer | âœ… |
| 31 | Foundation | Platform Self-Calibration | Platform Calibration Layer | âœ… |
| 32 | Foundation | Execution Strategy Evolution | Strategy Evolution Layer | âœ… |
| 33 | Foundation | Strategy Portfolio Governance | Strategy Portfolio Governance Layer | âœ… |
| 34 | Foundation | Platform Self-Stabilization | Platform Stabilization Layer | âœ… |
| 35 | Foundation | Autonomous Engineering Advisor | Engineering Advisory Layer | âœ… |
| 36 | Foundation | Semantic Retrieval & Embedding Memory | Semantic Retrieval Layer | âœ… |
| 37 | Foundation | Discovery-Driven Architecture Signals | Discovery Architecture Layer | âœ… |
| 38 | Foundation | Architecture Change Simulation & Governance | Architecture Simulation Layer | âœ… |
| 39 | Foundation | Architecture Change Planning & Rollout Readiness | Architecture Planning Layer | âœ… |
| 40 | Foundation | Architecture Rollout Sandbox | Architecture Rollout Sandbox Layer | âœ… |
| 41 | J | Architecture Rollout Pilot Governance | Architecture Pilot Layer | âœ… |
| 42 | J | Controlled Architecture Migration Execution | Architecture Migration Layer | âœ… |
| 43 | J | Architecture Portfolio Governance | Architecture Portfolio Layer | âœ… |
| 44 | K | Architecture Fitness Functions | Architecture Fitness Layer | âœ… |
| 45 | K | Autonomous Change Advisory Orchestrator | Change Advisory Orchestration Layer | âœ… |
| 46 | L | Platform Self-Stabilization v2 | Platform Stabilization v2 Layer | âœ… |
| 47 | L | Tenant-Aware Architecture Modes | Tenant Architecture Layer | âœ… |
| 48 | L | Economic Optimization Layer | Economic Optimization Layer | âœ… |
| 49 | M | Platform Convergence Layer | Platform Convergence Layer | âœ… |
| 50 | M | Convergence Governance & Promotion Layer | Convergence Governance Layer | âœ… |
| 51 | M | Institutional Convergence Memory Layer | Convergence Memory Layer | âœ… |
| 52 | M | Operating Profiles & Policy Packs | Operating Profiles Layer | âœ… |
| 53 | M | Product Intelligence Entry | Product Intelligence Layer | âœ… |
| 54 | M | Product Intelligence Operating Layer | Product Intelligence Operations Layer | âœ… |
| 55 | M | Product Opportunity Portfolio Governance | Product Opportunity Governance Layer | âœ… |
| 56 | M | Controlled Ecosystem Readiness Layer | Ecosystem Readiness Layer | âœ… |
| 57 | M | Capability Exposure Governance Layer | Capability Exposure Governance Layer | âœ… |
| 58 | M | External Trust & Admission Layer | External Trust & Admission Layer | âœ… |
| 59 | M | Ecosystem Simulation & Sandbox Layer | Ecosystem Simulation Layer | âœ… |
| 60 | M | Limited Marketplace Pilot Layer | Limited Marketplace Pilot Layer | âœ… |
| 61 | M | Capability Registry Governance Layer | Capability Registry Governance Layer | âœ… |
| 62 | M | Multi-Party Policy & Revenue Governance | Multi-Party Policy & Revenue Governance Layer | âœ… |
| 63 | M | Institutional Outcome Assurance Layer | Institutional Outcome Assurance Layer | âœ… |
| 64 | M | Canon Integrity & Drift Governance | Canon Integrity & Drift Governance Layer | âœ… |
| 65 | M | Operating Completion Layer | Operating Completion Layer | âœ… |
| 66 | M | User Journey Orchestration Layer | User Journey Orchestration Layer | âœ… |
| 67 | M | Role-Based Experience Layer | Role-Based Experience Layer | âœ… |
| 68 | M | One-Click Delivery & Deploy Assurance | One-Click Delivery Layer | âœ… |
| 69 | M | Onboarding, Templates & Vertical Starters | Onboarding & Templates Layer | âœ… |
| 70 | M | Adoption Intelligence & Customer Success | Adoption Intelligence Layer | âœ… |
| 71 | â€” | Governed Extensibility & Developer Experience | Extensibility Foundation Layer | âœ… |
| 72 | N | Evidence Capture & Improvement Ledger | Evidence Capture Layer | âœ… |
| 73 | N | Improvement Candidate Distillation Engine | Improvement Candidate Layer | âœ… |
| 74 | N | Sandbox Benchmarking & Promotion Governance | Sandbox Benchmark Layer | âœ… |
| 75 | O | Role Arbitration & Capability Routing 2.0 | Capability Routing Layer | âœ… |
| 76 | O | Multi-Agent Debate & Resolution Layer | Agent Debate Layer | âœ… |
| 77 | O | Shared Working Memory & Task-State Negotiation | Shared Memory Layer | âœ… |
| 78 | O | Bounded Swarm Execution | Swarm Execution Layer | âœ… |
| 79 | P | Capability Packaging & Registry UX | Capability Packaging Layer | âœ… |
| 80 | P | Trust, Entitlements & Approval Flows | Trust & Entitlement Layer | âœ… |
| 81 | P | Creator / Partner Pilot Marketplace | Pilot Marketplace Layer | âœ… |
| 82 | P | Outcome-Aware Capability Marketplace | Outcome Marketplace Layer | âœ… |
| 83 | Q | Delivery Outcome Causality Layer | Delivery Causality Layer | âœ… |
| 84 | Q | Post-Deploy Learning & Feedback Assimilation | Post-Deploy Learning Layer | âœ… |
| 85 | Q | Reliability-Aware Delivery Tuning | Reliability Tuning Layer | âœ… |
| 86 | Q | Outcome Assurance 2.0 | Outcome Assurance Layer | âœ… |
| 87 | R | Distributed Job Control Plane | Distributed Control Layer | âœ… |
| 88 | R | Cross-Region Execution & Recovery | Cross-Region Layer | âœ… |
| 89 | R | Tenant-Isolated Scale Runtime | Scale Runtime Layer | âœ… |
| 90 | R | Resilient Large-Scale Orchestration | Resilient Orchestration Layer | âœ… |
| 91 | S | Architecture Hypothesis Engine | Architecture Hypothesis Layer | âœ… |
| 92 | S | Simulated Evolution Campaigns | Evolution Campaign Layer | âœ… |
| 93 | S | Cross-Tenant Pattern Synthesis | Pattern Synthesis Layer | âœ… |
| 94 | S | Human-Governed Architecture Promotion | Architecture Promotion Layer | âœ… |
| 95 | T | Institutional Memory Consolidation | Institutional Memory Layer | âœ… |
| 96 | T | Doctrine & Playbook Synthesis | Doctrine Synthesis Layer | âœ… |
| 97 | T | Bounded Autonomous Operations | Autonomous Operations Layer | âœ… |
| 98 | T | Institutional Decision Engine | Decision Engine Layer | âœ… |
| 99 | U | Cross-Context Doctrine Adaptation | Doctrine Adaptation Layer | âœ… |
| 100 | U | Institutional Conflict Resolution Engine | Conflict Resolution Layer | âœ… |
| 101 | U | Federated Intelligence Boundaries | Federated Intelligence Layer | âœ… |
| 102 | U | Resilience & Continuity Governance | Continuity Governance Layer | âœ… |
| 103 | V | Institutional Memory Constitution | Memory Constitution Layer | âœ… |
| 104 | V | Sovereign Decision Rights Orchestration | Sovereign Decision Layer | âœ… |
| 105 | V | Dependency Sovereignty & External Reliance Governance | Dependency Sovereignty Layer | âœ… |
| 106 | V | Strategic Succession & Long-Horizon Continuity | Strategic Succession Layer | âœ… |
| 107 | W | Multi-Horizon Strategic Alignment Engine | Strategic Alignment Layer | âœ… |
| 108 | W | Institutional Tradeoff Arbitration System | Tradeoff Arbitration Layer | âœ… |
| 109 | W | Mission Integrity & Drift Prevention | Mission Integrity Layer | âœ… |
| 110 | W | Civilizational Continuity Simulation Layer | Continuity Simulation Layer | âœ… |
| 111 | X | Evolution Proposal Governance Engine | Evolution Governance Layer | âœ… |
| 112 | X | Architectural Mutation Control Layer | Mutation Control Layer | âœ… |
| 113 | X | Reflective Validation & Self-Revision Audit | Reflective Validation Layer | âœ… |
| 114 | X | Kernel Integrity & Anti-Corrosion Guard | Kernel Integrity Layer | âœ… |
| 115 | Y | Canon Steward & Knowledge Governance Engine | Knowledge Governance Layer | âœ… |
| 116 | Y | Implementation Pattern Library & Retrieval Layer | Pattern Retrieval Layer | âœ… |
| 117 | Y | Failure Memory & Repair Intelligence Archive | Failure Memory Layer | âœ… |
| 118 | Y | External Knowledge Intake & Canon Evolution Control | Knowledge Intake Layer | âœ… |
| 119 | Z | Live Runtime Feedback Mesh | Runtime Feedback Layer | âœ… |
| 120 | Z | Tenant Doctrine & Adaptive Operating Profiles v2 | Adaptive Profiles Layer | âœ… |
| 121 | Z | Outcome-Based Autonomy Engine | Autonomy Engine Layer | âœ… |
| 122 | Z | Compounding Advantage & Moat Orchestrator | Compounding Advantage Layer | âœ… |
| 123 | AA | Runtime Execution Validation Harness | Runtime Validation Layer | âœ… |
| 124 | AA | Autonomy Ladder Stabilization | Autonomy Stabilization Layer | âœ… |
| 125 | AA | Tenant-Adaptive Regression Profiles | Regression Profile Layer | âœ… |
| 126 | AA | Cold Start Explainability Layer | Cold Start Layer | âœ… |
| 127 | AB | Learning Extraction Engine | Learning Extraction Layer | âœ… |
| 128 | AB | Canon Promotion Pipeline | Canon Promotion Layer | âœ… |
| 129 | AB | Cross-Tenant Pattern Distillation | Cross-Tenant Distillation Layer | âœ… |
| 130 | AB | Canon Reuse Injection | Canon Reuse Injection Layer | âœ… |
| 131 | AC | Operational Posture Engine | Operational Posture Layer | âœ… |
| 132 | AC | Attention Allocation Engine | Attention Allocation Layer | âœ… |
| 133 | AC | Adaptive Resource Routing | Adaptive Resource Routing Layer | âœ… |
| 134 | AC | Operational Rhythm & Recovery Cycles | Operational Rhythm Layer | âœ… |
| 135 | AD | Multi-Loop Governance Orchestrator | Multi-Loop Governance Layer | âœ… |
| 136 | AD | Systemic Health Model | Systemic Health Model Layer | âœ… |
| 137 | AD | Organism Memory Layers | Organism Memory Layer | âœ… |
| 138 | AD | Adaptive Operational Organism Console | Organism Console Layer | âœ… |

---

## Block Summary

| Block | Sprints | Name | Status |
|-------|---------|------|--------|
| Foundation | 1â€“40 | Execution Kernel + Intelligence + Governance + Architecture | âœ… Complete |
| J | 41â€“43 | Architecture-Governed | âœ… Complete |
| K | 44â€“45 | Architecture-Operating | âœ… Complete |
| L | 46â€“48 | Architecture-Scaled | âœ… Complete |
| M | 49â€“70 | Platform Convergence â†’ Customer Success | âœ… Complete |
| â€” | 71 | Governed Extensibility | âœ… Complete |
| N | 72â€“74 | Evidence-Governed Improvement Loop | âœ… Complete |
| O | 75â€“78 | Advanced Multi-Agent Coordination | âœ… Complete |
| P | 79â€“82 | Governed Capability Ecosystem & Marketplace | âœ… Complete |
| Q | 83â€“86 | Autonomous Delivery Optimization & Assurance 2.0 | âœ… Complete |
| R | 87â€“90 | Advanced Distributed Runtime & Scaled Execution | âœ… Complete |
| S | 91â€“94 | Research Sandbox for Architecture Evolution | âœ… Complete |
| T | 95â€“98 | Governed Intelligence OS | âœ… Complete |
| U | 99â€“102 | Adaptive Institutional Ecosystem | âœ… Complete |
| V | 103â€“106 | Sovereign Institutional Intelligence | âœ… Complete |
| W | 107â€“110 | Strategic Autonomy & Civilizational Coordination | âœ… Complete |
| X | 111â€“114 | Reflexive Governance & Evolution Control | âœ… Complete |
| Y | 115â€“118 | Implementation Canon & Knowledge Governance | âœ… Complete |
| Z | 119â€“122 | Runtime Sovereignty & Outcome Compounding | âœ… Complete |
| AA | 123â€“126 | Runtime Proof & Adaptive Governance | âœ… Complete |
| AB | 127â€“130 | Learning Canonization | âœ… Complete |
| AC | 131â€“134 | Adaptive Coordination | âœ… Complete |
| AD | 135â€“138 | Adaptive Operational Organism | âœ… Complete |

---

## Edge Function Registry (Summary)

| Category | Functions | Sprints |
|----------|----------|---------|
| Foundation (pipeline, validation, publish, repair, learning) | ~100 | 1â€“70 |
| Multi-Agent Coordination | 4 | 75â€“78 |
| Capability Ecosystem & Marketplace | 4 | 79â€“82 |
| Delivery Optimization | 4 | 83â€“86 |
| Distributed Runtime | 4 | 87â€“90 |
| Architecture Research | 4 | 91â€“94 |
| Governed Intelligence OS | 4 | 95â€“98 |
| Adaptive Institutional Ecosystem | 4 | 99â€“102 |
| Sovereign Institutional Intelligence | 4 | 103â€“106 |
| Strategic Autonomy & Civilizational Coordination | 4 | 107â€“110 |
| Reflexive Governance & Evolution Control | 4 | 111â€“114 |
| Implementation Canon & Knowledge Governance | 4 | 115â€“118 |
| Runtime Sovereignty & Outcome Compounding | 4 | 119â€“122 |
| Runtime Proof & Adaptive Governance | 4 | 123â€“126 |
| Learning Canonization | 4 | 127â€“130 |
| Adaptive Coordination | 4 | 131â€“134 |
| Adaptive Operational Organism | 4 | 135â€“138 |
| **Total** | **~165** | |




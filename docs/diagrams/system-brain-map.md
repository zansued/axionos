# AxionOS System Brain Map

> **Purpose:** Canonical high-level architectural map for developers, AI coding agents, system operators, and future contributors.
> **Last Updated:** 2026-03-11

---

## What This Document Is

This is the **visual brain map** of AxionOS — a single diagram showing all major subsystems, their relationships, and the direction of information and action flow.

It is designed to be:

- **Readable** — understand the full system at a glance
- **Canonical** — the official reference for system topology
- **Navigable** — locate any subsystem and understand its role

**Canonical reading principle:**

> Canon informs, signals evaluate, policy constrains, Action Engine formalizes, AgentOS orchestrates, executors act, evidence learns.

---

## Brain Map

```mermaid
flowchart TB

  %% SURFACES
  subgraph SURFACES["Operator & Product Surfaces"]
    UI["AxionOS UI"]
    Builder["Builder Mode"]
    Owner["Owner Mode"]
    Projects["Projects / Initiatives"]
    Pipelines["Pipelines"]
    RuntimeUI["Runtime"]
    ObsUI["Execution & Platform Observability"]
    HealthUI["System Health"]
    CanonUI["Canon Intelligence Hub"]
    LibraryUI["Pattern Library"]
    ActionsUI["Operational Actions Center"]
    GovernanceUI["Governance / Approval Queues"]
  end

  UI --> Builder
  UI --> Owner
  Builder --> Projects
  Builder --> Pipelines
  Builder --> RuntimeUI
  Builder --> ObsUI
  Owner --> HealthUI
  Owner --> CanonUI
  Owner --> LibraryUI
  Owner --> GovernanceUI
  Owner --> ActionsUI

  %% KNOWLEDGE
  subgraph KNOWLEDGE["Knowledge Layer"]
    Sources["Source Registry"]
    Ingestion["Canon Ingestion Pipeline"]
    Candidates["Canon Candidates"]
    Canon["Canon Entries"]
    Patterns["Pattern Library"]
    Retrieval["Retrieval Contract / Query Layer"]
    KnowledgePackets["Knowledge Packets for Agents"]
  end

  Sources --> Ingestion
  Ingestion --> Candidates
  Candidates --> Canon
  Canon --> Patterns
  Canon --> Retrieval
  Patterns --> Retrieval
  Retrieval --> KnowledgePackets

  CanonUI --> Sources
  CanonUI --> Ingestion
  CanonUI --> Candidates
  CanonUI --> Canon
  LibraryUI --> Patterns
  LibraryUI --> Retrieval

  %% SIGNALS
  subgraph SIGNALS["State Evaluation Layer"]
    Metrics["Metrics Contract"]
    Events["System Events"]
    Readiness["Readiness Engine"]
    Blockers["Blockers / Warnings"]
    DeliveryState["Delivery State"]
  end

  Projects --> DeliveryState
  Pipelines --> DeliveryState
  RuntimeUI --> DeliveryState
  DeliveryState --> Metrics
  DeliveryState --> Events
  DeliveryState --> Readiness
  Readiness --> Blockers

  %% POLICY
  subgraph POLICY["Policy & Governance Layer"]
    Policy["Policy Engine"]
    GovRules["Governance Rules"]
    Risk["Risk Classification"]
    Approvals["Approval Requirements"]
    Compliance["Compliance / Canon Boundaries"]
  end

  Metrics --> Policy
  Events --> Policy
  Readiness --> Policy
  Blockers --> Policy

  GovRules --> Policy
  Risk --> Policy
  Approvals --> Policy
  Compliance --> Policy

  %% ACTION ENGINE
  subgraph ACTION["AE - Action Engine"]
    Triggers["Action Triggers"]
    Intents["Trigger to Intent Mapping"]
    Resolution["Policy-Aware Action Resolution"]
    Records["Action Records / Audit Trail"]
    ActionQueue["Action Queue"]
  end

  Metrics --> Triggers
  Events --> Triggers
  Readiness --> Triggers
  Policy --> Resolution
  Triggers --> Intents
  Intents --> Resolution
  Resolution --> Records
  Records --> ActionQueue

  %% AGENT OS
  subgraph ORCH["AgentOS Orchestrator"]
    Dispatch["Dispatch Contract"]
    Selection["Agent Selection Logic"]
    Context["Context Assembly"]
    Constraints["Execution Constraints"]
    Swarm["Agent Swarm / Task Routing"]
  end

  ActionQueue --> Dispatch
  KnowledgePackets --> Context
  Policy --> Constraints
  Dispatch --> Selection
  Selection --> Context
  Constraints --> Context
  Context --> Swarm

  %% EXECUTION
  subgraph EXEC["Execution Layer"]
    DevAgent["Developer / Code Agent"]
    RepairAgent["Repair Agent"]
    DeployAgent["Deployment Agent"]
    RuntimeGuardian["Runtime Guardian"]
    GovAgent["Governance Agent"]
    Human["Human Approval / Operator"]
    External["External Systems / CI / Vercel / GitHub / Supabase"]
  end

  Swarm --> DevAgent
  Swarm --> RepairAgent
  Swarm --> DeployAgent
  Swarm --> RuntimeGuardian
  Swarm --> GovAgent
  Swarm --> Human

  DevAgent --> External
  RepairAgent --> External
  DeployAgent --> External
  RuntimeGuardian --> External
  GovAgent --> External
  Human --> External

  %% RUNTIME & DELIVERY
  subgraph RUNTIME["Runtime & Delivery Systems"]
    Repo["Repositories / GitHub"]
    CI["Build / CI / Validation"]
    Deploy["Deploy Targets"]
    LiveRuntime["Live Runtime"]
    Telemetry["Observability / Telemetry"]
  end

  External --> Repo
  External --> CI
  External --> Deploy
  Deploy --> LiveRuntime
  LiveRuntime --> Telemetry

  %% FEEDBACK LOOP
  subgraph LEARNING["Learning & Compounding Loop"]
    Evidence["Execution Evidence"]
    PatternsExtract["Pattern Extraction"]
    CanonUpdate["Canon Update / Promotion / Deprecation"]
    Memory["Institutional Memory"]
    Improvement["Adaptive Improvement"]
  end

  Telemetry --> Evidence
  CI --> Evidence
  Repo --> Evidence
  Evidence --> PatternsExtract
  PatternsExtract --> CanonUpdate
  CanonUpdate --> Canon
  Evidence --> Memory
  Memory --> Improvement
  Improvement --> GovRules
  Improvement --> Selection
  Improvement --> Readiness

  %% UI FEEDBACK
  Metrics --> ObsUI
  Metrics --> HealthUI
  Readiness --> Pipelines
  Blockers --> Pipelines
  Records --> ActionsUI
  Approvals --> GovernanceUI
  Telemetry --> RuntimeUI
  Canon --> CanonUI
  Patterns --> LibraryUI
```

---

## How to Read This Diagram

### 1. Surfaces

The UI is the visible face of the system:

- **Builder** operates initiatives, pipelines, and runtime
- **Owner** operates platform health, canon, governance, and actions

### 2. Knowledge Layer

Where AxionOS learns, organizes, and delivers knowledge:

- **Sources** → **Ingestion** → **Candidates** → **Canon** → **Patterns** → **Retrieval** → **Knowledge Packets**

### 3. State Evaluation Layer

Where the system measures and interprets its state:

- **Delivery State** → **Metrics**, **Events**, **Readiness** → **Blockers/Warnings**

### 4. Policy & Governance

Where operational limits are enforced:

- **Risk**, **Compliance**, **Approval Requirements**, **Governance Rules** → **Policy Engine**

### 5. Action Engine

Where signals become formal actions:

- **Triggers** → **Intents** → **Policy-Aware Resolution** → **Action Records** → **Action Queue**

### 6. AgentOS Orchestrator

Where execution is coordinated:

- **Dispatch** → **Selection** → **Context Assembly** (with Knowledge Packets + Constraints) → **Swarm**

### 7. Execution Layer

Where actions are performed:

- **Code Agents**, **Repair Agents**, **Deploy Agents**, **Runtime Guardians**, **Governance Agents**, **Human Operators** → **External Systems**

### 8. Learning & Compounding Loop

Where the system builds institutional intelligence over time:

- **Evidence** → **Pattern Extraction** → **Canon Update** → Canon
- **Evidence** → **Memory** → **Improvement** → Governance Rules, Agent Selection, Readiness

---

## Information Flow Direction

| Direction | What Flows |
|-----------|-----------|
| **Top → Down** | Knowledge, signals, constraints, formalized actions, dispatch, execution |
| **Bottom → Up** | Evidence, patterns, canon updates, improvements |
| **Left → Right** (within layers) | Processing within a subsystem |

---

## Governed Flows

The following flows are **governed** — they require policy evaluation before proceeding:

- Action Engine resolution (requires Policy input)
- AgentOS dispatch (constrained by Policy)
- Human Approval hooks (escalation from Action Engine or AgentOS)
- Canon promotion (requires governance review)
- Structural mutations (require human approval)

---

## Canonical One-Liner

> **Canon informs, signals evaluate, policy constrains, Action Engine formalizes, AgentOS orchestrates, executors act, evidence learns.**

---

## Source of Truth

This diagram must stay synchronized with:

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — Section 4B: Operational Decision Chain
- **[AXION_CONTEXT.md](../AXION_CONTEXT.md)** — Operational context and subsystem roles
- **[GOVERNANCE.md](../GOVERNANCE.md)** — Agent OS contracts and governance reference
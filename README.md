<p align="center">
  <h1 align="center">AxionOS</h1>
  <p align="center"><strong>Autonomous Software Engineering System</strong></p>
  <p align="center">
    From idea to deployable application — autonomously.<br/>
    Architecture, code, validation, repair, and delivery in a single pipeline.
  </p>
</p>

---

## What is AxionOS?

**AxionOS is not a code generator.** It operates an autonomous software engineering pipeline.

While traditional tools help you write code, AxionOS orchestrates the entire engineering cycle:

| Step | What Happens |
|------|-------------|
| Architecture | Designs the complete system structure |
| Planning | Generates PRD, epics, stories, and subtasks |
| Construction | Agent swarm generates all code in parallel |
| Validation | Static analysis + real build (tsc + vite) |
| Self-Healing | Autonomous error detection and repair |
| Delivery | Git repository with atomic commits |

Everything runs inside a **32-stage deterministic pipeline**.

---

## Core Capabilities

These are implemented and operational today:

### Project Brain
Persistent knowledge graph that stores architecture decisions, errors, patterns, and learned rules. Every agent prompt is enriched with relevant context from the Brain.

### AI Efficiency Layer
Prompt compression (60-90% token reduction), semantic cache (vector similarity, threshold 0.92), and intelligent model routing. Makes large pipeline executions economically viable.

### Self-Healing Pipeline
Runtime validation via real tsc + vite builds through CI. When errors are detected, a fix swarm analyzes logs, generates patches, and submits corrections automatically.

### Agent Swarm
Specialized agents execute tasks in parallel waves using DAG-based topological scheduling (6 concurrent workers).

### Adaptive Learning
The system learns from build failures, extracts patterns, and generates prevention rules. Each project benefits from accumulated knowledge of prior executions.

### Agent OS v1.0
A 14-module runtime architecture across 5 architectural planes (Core, Control, Execution, Data, Ecosystem) governing agent selection, governance, coordination, and distribution. Includes trust evaluation, approval workflows, adaptive routing, multi-agent coordination, distributed execution, and a global capability marketplace.

---

## Agent OS Architecture

The Agent Operating System provides the runtime foundation for all agent operations:

```
+-------------------------------------------------------------------+
|                       ECOSYSTEM PLANE                              |
|   Marketplace - Capability Registry - Package Manager              |
+-------------------------------+-----------------------------------+
|                       EXECUTION PLANE                              |
|   Orchestrator - Coordination - Distributed Runtime                |
|   LLM Adapter - Tool Adapter - Event Bus                           |
+-----------+-----------------------+-------------------+-----------+
|    CONTROL PLANE     |    DATA PLANE     |   DATA PLANE            |
|   Selection Engine   |   Artifact Store  |  Observability          |
|   Policy Engine      |   Memory System   |  Audit Ledger           |
|   Governance Layer   |                   |                         |
|   Adaptive Routing   |                   |                         |
+-----------+----------+---------+---------+------------------------+
|                         CORE PLANE                                 |
|   Runtime Protocol - Capability Model - Core Types                 |
+-------------------------------------------------------------------+
```

14 modules | 5 planes | Full TypeScript contracts

---

## How It Works

1. **Describe your idea** — what you want to build
2. **AxionOS executes the full pipeline:**
   - Comprehension → Architecture → Squad Formation
   - Domain Modeling → Schema → Data Model
   - Business Logic → API → UI Generation
   - Validation → Build → Repair → Publish
3. **Result:** A functional, deployable repository

---

## For Whom

- **Indie Hackers** — launch MVPs in hours
- **Technical Founders** — validate ideas rapidly
- **Micro SaaS Creators** — build and iterate fast
- **Rapid Prototyping** — explore concepts without setup
- **Early-Stage Teams** — multiply engineering capacity

---

## What's Next

AxionOS is currently stabilizing its core engineering kernel. Agent OS v1.0 architecture is fully designed. The next milestones:

1. **Learning Agents** — agents that improve their prompts and repair strategies from previous executions
2. **Product Intelligence** — generated applications that evolve automatically based on real user behavior

For the full technical roadmap, see [docs/ROADMAP.md](docs/ROADMAP.md).

For the Agent OS architecture, see [docs/AGENT_OS_ARCHITECTURE_MAP.md](docs/AGENT_OS_ARCHITECTURE_MAP.md).

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and technical details |
| [ROADMAP.md](docs/ROADMAP.md) | Implementation horizons and evolution plan |
| [AGENT_OS_ARCHITECTURE_MAP.md](docs/AGENT_OS_ARCHITECTURE_MAP.md) | Agent OS v1.0 plane-separated architecture |
| [AGENT_OS_EVOLUTION_ROADMAP.md](docs/AGENT_OS_EVOLUTION_ROADMAP.md) | Agent OS module evolution from v0.1 to v1.0 |
| [AGENT_RUNTIME_PROTOCOL.md](docs/AGENT_RUNTIME_PROTOCOL.md) | Runtime protocol specification |
| [AGENT_CAPABILITY_MODEL.md](docs/AGENT_CAPABILITY_MODEL.md) | Capability model specification |
| [AGENT_SELECTION_ENGINE.md](docs/AGENT_SELECTION_ENGINE.md) | Selection engine specification |
| [AGENT_POLICY_ENGINE.md](docs/AGENT_POLICY_ENGINE.md) | Policy engine specification |
| [AGENT_ARTIFACT_STORE.md](docs/AGENT_ARTIFACT_STORE.md) | Artifact store specification |
| [AGENT_OBSERVABILITY.md](docs/AGENT_OBSERVABILITY.md) | Observability specification |
| [AGENT_LLM_ADAPTER.md](docs/AGENT_LLM_ADAPTER.md) | LLM adapter specification |
| [AGENT_TOOL_ADAPTER.md](docs/AGENT_TOOL_ADAPTER.md) | Tool adapter specification |
| [AGENT_MEMORY_SYSTEM.md](docs/AGENT_MEMORY_SYSTEM.md) | Memory system specification |
| [AGENT_ADAPTIVE_ROUTING.md](docs/AGENT_ADAPTIVE_ROUTING.md) | Adaptive routing specification |
| [AGENT_COORDINATION.md](docs/AGENT_COORDINATION.md) | Multi-agent coordination specification |
| [AGENT_DISTRIBUTED_RUNTIME.md](docs/AGENT_DISTRIBUTED_RUNTIME.md) | Distributed runtime specification |
| [AGENT_MARKETPLACE.md](docs/AGENT_MARKETPLACE.md) | Marketplace specification |
| [AGENT_GOVERNANCE.md](docs/AGENT_GOVERNANCE.md) | Governance layer specification |

---

## Architecture

For detailed system architecture, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Contributing

Contributions are welcome:

- Open an **issue**
- Propose **improvements**
- Submit **pull requests**

---

## License

MIT License

---

## Manifesto

> The traditional software development model was built for large teams.
> But the new generation of builders **works alone**.
>
> AxionOS was built for that reality.
>
> **So that a single builder can operate with the power of an entire engineering team.**

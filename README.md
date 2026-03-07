<p align="center">
  <h1 align="center">AxionOS</h1>
  <p align="center"><strong>Autonomous Software Engineering Platform</strong></p>
  <p align="center">
    Submit an idea → receive a validated, deployable repository.<br/>
    Architecture, code, validation, repair, and delivery — autonomously.
  </p>
</p>

---

## What is AxionOS?

AxionOS is an **autonomous software engineering platform** that transforms ideas into governed, validated repositories and live deployments.

You describe what you want to build. AxionOS executes the full engineering pipeline:

| Phase | What Happens |
|-------|-------------|
| **Idea** | Capture and structure the idea with AI-generated blueprint |
| **Discovery** | Market analysis, opportunity validation, revenue strategy, PRD |
| **Architecture** | System design, simulation, preventive validation, scaffold |
| **Engineering** | Domain modeling, code generation (DB, API, UI), agent swarm execution |
| **Deploy** | Fix Loop → Deep Static → Runtime Validation → Build Repair → Publish |

Everything runs inside a **32-stage deterministic pipeline** with full cost tracking and observability.

---

## System Maturity

AxionOS has completed its Level 3 foundation as an **Autonomous Engineering System** and is now entering Level 4 with controlled learning and commercial packaging layers.

| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ Complete |
| Level 4 | Self-Learning Software Factory | 🔄 Entering |
| Level 5 | Autonomous Startup Factory | 🔮 Long-term |

---

## Core Capabilities

### Project Brain
Persistent knowledge graph that stores architecture decisions, errors, patterns, and learned rules. Every agent prompt is enriched with relevant context.

### AI Efficiency Layer
Prompt compression (60-90% token reduction), semantic cache, and intelligent model routing. Makes pipeline execution economically viable.

### Self-Healing Pipeline
Runtime validation via real tsc + vite builds. When errors are detected, a fix swarm analyzes logs, generates patches, and submits corrections automatically. Every repair attempt is recorded as structured evidence.

### Error Pattern Intelligence
Repair evidence is aggregated into recurring patterns with strategy effectiveness tracking. The system identifies which repair strategies work best per error category and generates prevention rule candidates.

### Preventive Engineering
Known failure patterns are converted into active prevention rules that block or warn before code generation, reducing pipeline failures proactively.

### Adaptive Repair Routing
Repair strategies are selected based on historical success rates, pattern similarity, and stage context — not just static mapping. Every routing decision is persisted for auditability.

### Learning Foundation
Structured learning records aggregate signals from repair evidence, prevention events, routing decisions, and stage executions. This substrate prepares future prompt optimization and self-improving agents.

### Agent Swarm
Specialized agents execute tasks in parallel waves using DAG-based topological scheduling (6 concurrent workers).

### Product-Level Observability
Full initiative lifecycle metrics: pipeline/build/deploy success rates, time from idea to repo/deploy, cost per initiative, repair success rates, and outcome tracking.

### Governed Execution
Stage gates, SLA enforcement, approval workflows, and complete audit logging. Every action is traceable and bounded.

---

## System Architecture

```
                         ┌─────────────────────────────────────┐
                         │        STRATEGY EVOLUTION           │
                         │-------------------------------------│
                         │ Strategy Families Registry          │
                         │ Strategy Signal Interpreter         │
                         │ Variant Synthesizer                 │
                         │ Experiment Runner                   │
                         │ Outcome Tracker                     │
                         │ Promotion Rules                     │
                         │ Rollback Engine                     │
                         │ Strategy Lineage                    │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      PLATFORM SELF-CALIBRATION      │
                         │-------------------------------------│
                         │ Calibration Parameter Registry      │
                         │ Calibration Signal Interpreter      │
                         │ Calibration Proposal Engine         │
                         │ Calibration Guardrails              │
                         │ Calibration Runner                  │
                         │ Outcome Tracker                     │
                         │ Rollback Engine                     │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      PLATFORM INTELLIGENCE          │
                         │-------------------------------------│
                         │ Platform Behavior Aggregator        │
                         │ Bottleneck Detector                 │
                         │ Pattern Analyzer                    │
                         │ Insight Generator                   │
                         │ Recommendation Engine               │
                         │ Platform Health Model               │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      EXECUTION GOVERNANCE           │
                         │-------------------------------------│
                         │ Execution Policy Intelligence       │
                         │ Policy Portfolio Optimization       │
                         │ Tenant / Workspace Adaptive Tuning  │
                         │ Policy Routing                      │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │           LEARNING LAYER            │
                         │-------------------------------------│
                         │ Prompt Optimization Engine          │
                         │ Bounded Promotion & Rollback        │
                         │ Self-Improving Fix Agents           │
                         │ Agent Memory                        │
                         │ Predictive Error Detection          │
                         │ Learning Agents v2                  │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      OPERATIONAL INTELLIGENCE       │
                         │-------------------------------------│
                         │ Error Pattern Library               │
                         │ Repair Strategy Tracking            │
                         │ Adaptive Repair Routing             │
                         │ Prevention Rule Candidates          │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
                         ┌─────────────────────────────────────┐
                         │      DETERMINISTIC PIPELINE         │
                         │-------------------------------------│
                         │ Stage Execution Engine              │
                         │ Artifact Governance                 │
                         │ Validation Engine                   │
                         │ Publish Pipeline                    │
                         │ Observability Feed                  │
                         └─────────────────────────────────────┘
```

---

## How It Works

```
  Idea → Discovery → Architecture → Engineering → Deploy
    │         │            │              │           │
    │         │            │              │           └─ Validated, published repository
    │         │            │              └─ All code generated and tested
    │         │            └─ Complete technical plan with simulation
    │         └─ Validated opportunity with market strategy
    └─ User's raw idea captured
```

1. **Describe your idea** — what you want to build
2. **AxionOS runs the full pipeline automatically** — each phase chains into the next
3. **Result:** A governed, validated, deployable Git repository

---

## For Whom

- **Indie Hackers** — launch MVPs in hours
- **Technical Founders** — validate ideas rapidly
- **Micro SaaS Creators** — build and iterate fast
- **Early-Stage Teams** — multiply engineering capacity

---

## Documentation

| Document | Description |
|----------|-------------|
| [Pipeline Contracts](docs/PIPELINE_CONTRACTS.md) | Product contracts per phase: inputs, outputs, success criteria, user actions |
| [Architecture](docs/ARCHITECTURE.md) | System architecture, 32-stage pipeline, tech stack |
| [Agent OS](docs/AGENTS.md) | Agent Operating System: 14 modules, 5 planes, contracts |
| [Roadmap](docs/ROADMAP.md) | Implementation priorities and evolution plan |
| [Execution Plan](.lovable/plan.md) | Current sprint priorities and success metrics |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Lovable AI Gateway (Gemini 2.5 Flash/Pro) + Efficiency Layer |
| Git | GitHub API v3 (Tree API for atomic commits) |
| Deploy | Vercel/Netlify auto-generated configs |

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

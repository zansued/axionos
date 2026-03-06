## AxionOS — Autonomous Software Engineering System

> Last updated: 2026-03-06

---

## Vision

AxionOS is an **autonomous software engineering system** evolving toward a self-operating venture studio. It orchestrates AI agents to discover opportunities, design architectures, generate full-stack applications, deploy to production, and evolve products automatically.

The system is currently at **Maturity Level 3→4** (Autonomous Engineering System → Self-Learning Factory).

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   AI EFFICIENCY LAYER                    │
│  Prompt Compressor │ Semantic Cache │ Model Router       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   VENTURE     │  │  SOFTWARE    │  │   GROWTH &   │   │
│  │ INTELLIGENCE  │  │ ENGINEERING  │  │  EVOLUTION   │   │
│  │  (S01-05)     │  │  (S06-23)    │  │  (S24-32)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              PROJECT BRAIN                        │    │
│  │  DAG Engine │ Smart Context │ Embeddings │ Rules  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            ADAPTIVE LEARNING                      │    │
│  │  Error Intelligence │ Prevention Rules │ Patterns │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Pipeline — 32 Stages

### Venture Intelligence Layer (S01-05)
| # | Stage | Engine |
|---|-------|--------|
| 01 | Idea Intake | Raw idea entry |
| 02 | Opportunity Discovery | Market gap identification |
| 03 | Market Signal Analysis | Demand + viability scoring |
| 04 | Product Validation | Synthetic testing + estimation |
| 05 | Revenue Strategy | Pricing + monetization |

### Discovery & Architecture (S06-10)
| # | Stage | Engine |
|---|-------|--------|
| 06 | Discovery Intelligence | 4-agent comprehension team |
| 07 | Market Intelligence | 4-agent architecture team |
| 08 | Technical Feasibility | Architecture simulation |
| 09 | Project Structuring | Preventive validation |
| 10 | Squad Formation | Specialized agent allocation |

### Infrastructure & Modeling (S11-16)
| # | Stage | Engine |
|---|-------|--------|
| 11 | Architecture Planning | Bootstrap + foundation scaffold |
| 12 | Domain Model Generation | Module graph + dependency intelligence |
| 13 | AI Domain Analysis | Entity/relationship extraction via LLM |
| 14 | Schema Bootstrap | Isolated PostgreSQL schema |
| 15 | DB Provisioning | Tables + RLS + storage |
| 16 | Data Model Generation | SQL tables, FK, indexes, RLS |

### Code Generation (S17-19)
| # | Stage | Engine |
|---|-------|--------|
| 17 | Business Logic Synthesis | Services, validations, workflows |
| 18 | API Generation | REST, RPCs, triggers, webhooks |
| 19 | UI Generation | Pages, components, hooks, navigation |

### Validation & Publish (S20-23)
| # | Stage | Engine |
|---|-------|--------|
| 20 | Validation | AI + deep analysis + drift detection |
| 21 | Build | Runtime validation via CI |
| 22 | Test | Self-healing build repair |
| 23 | Publish | Atomic Git Tree API |

### Growth & Evolution (S24-32)
| # | Stage | Engine |
|---|-------|--------|
| 24 | Observability | Real-time product monitoring |
| 25 | Product Analytics | AARRR metrics |
| 26 | User Behavior | Interaction patterns + friction points |
| 27 | Growth Optimization | Conversion + onboarding optimization |
| 28 | Adaptive Learning | Pattern extraction + prevention rules |
| 29 | Product Evolution | Autonomous feature addition/removal |
| 30 | Architecture Evolution | Cross-project pattern learning |
| 31 | Portfolio Management | Multi-product resource allocation |
| 32 | System Evolution | Meta-learning for platform improvement |

---

## Core Infrastructure

### Project Brain
- Directed graph: `project_brain_nodes` + `project_brain_edges`
- Decision memory: `project_decisions` (category, supersedes chain)
- Error tracking: `project_errors` + `project_prevention_rules`
- Full-text search: `tsvector` on nodes
- Semantic search: `pgvector` (768-dim) + cosine similarity
- Context injection: `generateBrainContext()` for all agent prompts

### AI Efficiency Layer (NEW)
- **Prompt Compressor** — Rule-based pre-compression + AI summarization via `gemini-2.5-flash-lite`
- **Semantic Cache** — Vector similarity cache (`ai_prompt_cache` table, threshold 0.92)
- **Model Router** — Complexity-based routing: `flash-lite` → `flash` → `pro`
- Integration point: `callAI()` in `_shared/ai-client.ts`

### DAG Execution Engine
- `buildExecutionDAG()` — constructs DAG from brain nodes/edges
- `computeWaves()` — topological sort (Kahn's algorithm) grouped by wave level
- `getReadyNodes()` — returns nodes with satisfied dependencies
- Orchestrator + 6 parallel workers

### Smart Context Window
- AST-like regex parser: extracts API surface (imports, types, signatures)
- ~60-80% token reduction while preserving integration context
- Priority budget: types > hooks > services > components

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Lovable AI Gateway (Gemini 2.5 Flash/Pro) + Efficiency Layer |
| Git | GitHub API v3 (Tree API for atomic commits) |
| Scraping | Firecrawl (ecosystem research agent) |
| Deploy | Vercel/Netlify auto-generated configs |

### Multi-Tenancy
- Organizations → Workspaces → Initiatives
- RLS policies per `organization_id`
- Roles: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- Auto-provisioning via `create_organization_with_owner` RPC

---

## Edge Functions (50+)

```
supabase/functions/
├── Venture Intelligence
│   ├── opportunity-discovery-engine/
│   ├── market-signal-analyzer/
│   ├── product-validation-engine/
│   └── revenue-strategy-engine/
├── Discovery & Architecture
│   ├── pipeline-comprehension/         (4 agents)
│   ├── pipeline-architecture/          (4 agents)
│   ├── pipeline-architecture-simulation/
│   ├── pipeline-preventive-validation/
│   └── pipeline-squad/
├── Infrastructure & Modeling
│   ├── project-bootstrap-intelligence/
│   ├── pipeline-foundation-scaffold/
│   ├── pipeline-module-graph-simulation/
│   ├── pipeline-dependency-intelligence/
│   ├── ai-domain-model-analyzer/
│   ├── supabase-schema-bootstrap/
│   ├── supabase-provisioning-engine/
│   └── supabase-data-model-generator/
├── Code Generation
│   ├── ai-business-logic-synthesizer/
│   ├── autonomous-api-generator/
│   └── autonomous-ui-generator/
├── Validation & Publish
│   ├── pipeline-validation/
│   ├── pipeline-deep-validation/
│   ├── pipeline-drift-detection/
│   ├── pipeline-runtime-validation/
│   ├── autonomous-build-repair/
│   └── pipeline-publish/
├── Growth & Evolution
│   ├── observability-engine/
│   ├── product-analytics-engine/
│   ├── user-behavior-analyzer/
│   ├── growth-optimization-engine/
│   ├── adaptive-learning-engine/
│   ├── product-evolution-engine/
│   ├── architecture-evolution-engine/
│   ├── startup-portfolio-manager/
│   └── system-evolution-engine/
├── Pipeline Control
│   ├── pipeline-approve/
│   ├── pipeline-reject/
│   ├── pipeline-ci-webhook/
│   ├── pipeline-fix-orchestrator/
│   ├── pipeline-fast-modify/
│   ├── pipeline-full-review/
│   └── run-initiative-pipeline/
├── Support
│   ├── brain-sync/
│   ├── error-intelligence/
│   ├── generate-embeddings/
│   ├── analyze-artifact/
│   ├── rework-artifact/
│   ├── generate-agents/
│   ├── generate-stories/
│   ├── organize-stories/
│   ├── generate-planning-content/
│   ├── github-proxy/
│   └── github-ci-webhook/
└── _shared/
    ├── ai-client.ts              Unified AI client + Efficiency Layer
    ├── prompt-compressor.ts      Prompt compression engine
    ├── semantic-cache.ts         Vector-based semantic cache
    ├── model-router.ts           Intelligent model routing
    ├── pipeline-helpers.ts       Logging, jobs, agent messages
    ├── pipeline-bootstrap.ts     Auth, CORS, rate limiting
    ├── dependency-scheduler.ts   DAG builder + wave computation
    ├── brain-helpers.ts          Project Brain CRUD + context
    ├── smart-context.ts          Smart Context Window
    ├── incremental-engine.ts     Incremental re-execution
    ├── embedding-helpers.ts      Vector embeddings
    ├── code-sanitizers.ts        Deterministic files
    ├── auth.ts                   Authentication
    ├── cors.ts                   CORS headers
    └── rate-limit.ts             Rate limiting
```

---

## Implementation Status

### ✅ Completed
| # | System | Details |
|---|--------|---------|
| 1 | Pipeline (32 stages) | 50+ independent Edge Functions |
| 2 | Project Brain | Nodes, edges, decisions, errors, prevention rules, tsvector, pgvector |
| 3 | DAG Execution Engine | Kahn's topological sort, wave computation, 6 parallel workers |
| 4 | Agent Swarm | Orchestrator + Worker, Code Architect → Developer → Integration Agent |
| 5 | Data Model Generator | Domain model → SQL tables, FK, indexes, RLS |
| 6 | Autonomous UI Generator | Pages, components, hooks, navigation |
| 7 | Adaptive Learning Engine | Prevention rules, patterns, cross-project learning |
| 8 | CI-Triggered Fix Swarm | Webhook + Fix Orchestrator + auto-PR |
| 9 | Self-Healing Codebase | Prevention rules with confidence scoring |
| 10 | Architectural Drift Detection | Rule-based + AI hybrid |
| 11 | Atomic Git Commits | Tree API for publish + fix PRs |
| 12 | Runtime Validation | Real tsc + vite build via GitHub Actions CI |
| 13 | Smart Context Window | ~60-80% token reduction |
| 14 | Vector Embeddings | pgvector 768-dim, cosine similarity |
| 15 | Incremental Re-execution | Hash-based dirty detection |
| 16 | AI Efficiency Layer | Prompt compression + semantic cache + model router |

### 🔮 Next (Phase 4: Agent Intelligence)
| # | Module | Priority |
|---|--------|----------|
| 1 | Learning Agents | P0 |
| 2 | Prompt Optimization Engine | P0 |
| 3 | Architecture Pattern Library | P1 |
| 4 | Error Pattern Recognition | P1 |
| 5 | Self-Improving Fix Agents | P2 |

---

## System Maturity

| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ |
| Level 4 | Self-Learning Software Factory | 🔄 Transitioning |
| Level 5 | Autonomous Startup Factory | 🔮 Planned |

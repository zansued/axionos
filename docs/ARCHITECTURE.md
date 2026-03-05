# AxionOS v3 — Autonomous Startup Factory Architecture

> Deep technical analysis of the AI-orchestrated autonomous venture creation system.  
> Last updated: 2026-03-05

---

## 1. Project Overview

**AxionOS v3** is a multi-tenant SaaS platform that evolves from an AI-assisted code generator into a fully autonomous venture creation system. It orchestrates multiple AI agents to autonomously discover product opportunities, validate market demand, generate complete production-ready applications, launch digital products, analyze market feedback, and evolve products automatically.

### Core Value Proposition
The system operates as an **AI-powered venture studio** — continuously generating and testing digital products, learning from real user behavior and improving future projects.

### Traditional Startup Process (Automated by AxionOS v3)
```
idea → validation → product → launch → growth → iteration
```

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Hybrid: Google Gemini 2.5 Flash/Pro via Lovable AI Gateway |
| Git Integration | GitHub API v3 (Tree API for atomic commits, PRs) |
| URL Scraping | Firecrawl (self-hosted or cloud) |
| Deployment | Vercel/Netlify configs auto-generated |

### Multi-Tenancy Model
- **Organizations** → **Workspaces** → **Initiatives**
- RLS policies enforce isolation per `organization_id`
- Role-based access: `owner`, `admin`, `editor`, `reviewer`, `viewer`
- Auto-provisioning: first login creates a default org via `create_organization_with_owner` RPC

---

## 2. System Architecture Layers

### Layer 1 — Venture Intelligence Layer (NEW in v3)
Responsible for product discovery and market validation **before** the build pipeline begins.

| Engine | Purpose |
|--------|---------|
| **Opportunity Discovery Engine** | Identify potential product ideas from market data, trends, communities |
| **Market Signal Analyzer** | Analyze search volume, competitor products, pricing, trend acceleration |
| **Product Validation Engine** | Simulate landing pages, synthetic user testing, demand estimation |
| **Revenue Strategy Engine** | Define pricing models, subscription tiers, market positioning |

### Layer 2 — Software Generation Pipeline (AxionOS v2 — preserved)
The original 22-stage deterministic pipeline for autonomous software engineering.

### Layer 3 — Growth & Evolution Layer (NEW in v3)
Post-launch intelligence for continuous product improvement.

| Engine | Purpose |
|--------|---------|
| **Product Analytics Engine** | Monitor user acquisition, activation, retention, conversion, revenue |
| **User Behavior Analyzer** | Analyze feature usage, drop-off points, session patterns |
| **Growth Optimization Engine** | Landing page optimization, feature prioritization, onboarding |
| **Product Evolution Engine** | Automatically add features, remove unused modules, optimize UI |
| **Startup Portfolio Manager** | Track and manage multiple products, allocate resources |
| **Architecture Evolution Engine** | Learn architectural patterns that lead to successful products |
| **System Evolution Engine** | Meta-learning for continuous platform improvement |

---

## 3. Pipeline — 32-Stage Model

```
═══════════════════════════════════════════════════════
  VENTURE INTELLIGENCE LAYER (Stages 1-5)
═══════════════════════════════════════════════════════

  → Stage 01: Idea Intake
  → Stage 02: Opportunity Discovery Engine ← NEW v3
  → Stage 03: Market Signal Analyzer ← NEW v3
  → Stage 04: Product Validation Engine ← NEW v3
  → Stage 05: Revenue Strategy Engine ← NEW v3

═══════════════════════════════════════════════════════
  DISCOVERY & ARCHITECTURE (Stages 6-10)
═══════════════════════════════════════════════════════

  → Stage 06: Discovery Intelligence (pipeline-comprehension) — 4 agents
  → Stage 07: Market Intelligence (pipeline-architecture) — 4 agents
  → Stage 08: Technical Feasibility (pipeline-architecture-simulation)
  → Stage 09: Project Structuring (pipeline-preventive-validation)
  → Stage 10: Squad Formation (pipeline-squad)

═══════════════════════════════════════════════════════
  INFRASTRUCTURE & MODELING (Stages 11-16)
═══════════════════════════════════════════════════════

  → Stage 11: Architecture Planning (project-bootstrap-intelligence + pipeline-foundation-scaffold)
  → Stage 12: Domain Model Generation (pipeline-module-graph-simulation + pipeline-dependency-intelligence)
  → Stage 13: AI Domain Model Analyzer (ai-domain-model-analyzer)
  → Stage 14: Supabase Schema Bootstrap (supabase-schema-bootstrap)
  → Stage 15: Supabase Provisioning Engine (supabase-provisioning-engine)
  → Stage 16: Supabase Data Model Generator (supabase-data-model-generator)

═══════════════════════════════════════════════════════
  CODE GENERATION (Stages 17-19)
═══════════════════════════════════════════════════════

  → Stage 17: AI Business Logic Synthesizer (ai-business-logic-synthesizer)
  → Stage 18: Autonomous API Generator (autonomous-api-generator)
  → Stage 19: Autonomous UI Generator (autonomous-ui-generator)

═══════════════════════════════════════════════════════
  VALIDATION & PUBLISH (Stages 20-23)
═══════════════════════════════════════════════════════

  → Stage 20: Validation Engine
      → AI Validation (pipeline-validation) — Fix Loop (3x)
      → Deep Static Analysis (pipeline-deep-validation)
      → Architectural Drift Detection (pipeline-drift-detection)
  → Stage 21: Build Engine (pipeline-runtime-validation) — Real tsc + vite build via CI
  → Stage 22: Test Engine (autonomous-build-repair) — Self-healing builds
  → Stage 23: Publish Engine (pipeline-publish) — Atomic Git Tree API

═══════════════════════════════════════════════════════
  GROWTH & EVOLUTION LAYER (Stages 24-32) ← NEW v3
═══════════════════════════════════════════════════════

  → Stage 24: Observability Engine ← NEW v3
  → Stage 25: Product Analytics Engine ← NEW v3
  → Stage 26: User Behavior Analyzer ← NEW v3
  → Stage 27: Growth Optimization Engine ← NEW v3
  → Stage 28: Adaptive Learning Engine (adaptive-learning-engine)
  → Stage 29: Product Evolution Engine ← NEW v3
  → Stage 30: Architecture Evolution Engine ← NEW v3
  → Stage 31: Startup Portfolio Manager ← NEW v3
  → Stage 32: System Evolution Engine ← NEW v3
```

---

## 4. v3 Module Specifications

### 4.1 Opportunity Discovery Engine (Stage 02)
**Purpose:** Identify potential product ideas automatically  
**Inputs:** Market data, search trends, developer communities, startup datasets, internal product performance  
**Outputs:** `opportunity_report`, `problem_statement`, `target_audience`, `product_type`  
**Example:**
```
Opportunity: AI tools for local government service automation
Audience: Municipal administrations
Problem: Manual citizen service workflows
```

### 4.2 Market Signal Analyzer (Stage 03)
**Purpose:** Analyze signals indicating market demand  
**Signals:** Search volume, community discussions, competitor products, pricing models, trend acceleration  
**Outputs:** `market_score`, `demand_level`, `competition_level`, `viability_index`  
**Gate:** Only opportunities above viability threshold enter the build pipeline

### 4.3 Product Validation Engine (Stage 04)
**Purpose:** Validate before building  
**Methods:** Landing page simulation, synthetic user testing, market simulation models, AI demand estimation  
**Outputs:** `validation_score`, `estimated_adoption`, `risk_level`  
**Gate:** Only validated opportunities proceed to software generation

### 4.4 Revenue Strategy Engine (Stage 05)
**Purpose:** Define monetization strategy for every generated product  
**Outputs:** Pricing model, subscription tiers, freemium options, upsells, market positioning  
**Example:**
```
pricing_model: SaaS subscription
tiers: [starter, pro, enterprise]
```

### 4.5 Product Analytics Engine (Stage 25)
**Purpose:** Monitor real usage after deployment  
**Metrics:** User acquisition, activation rate, retention, conversion, revenue  
**Output feeds:** Evolution engines

### 4.6 User Behavior Analyzer (Stage 26)
**Purpose:** Analyze user interaction patterns  
**Signals:** Feature usage, drop-off points, session duration, interaction patterns  
**Identifies:** Friction points, unused features, engagement drivers

### 4.7 Growth Optimization Engine (Stage 27)
**Purpose:** Improve product adoption  
**Capabilities:** Landing page optimization, feature prioritization, onboarding improvements, pricing experiments

### 4.8 Product Evolution Engine (Stage 29)
**Purpose:** Automatically evolve products after launch  
**Actions:** Add new features, remove unused modules, improve UI flows, optimize database structures

### 4.9 Startup Portfolio Manager (Stage 31)
**Purpose:** Manage multiple products simultaneously  
**Tracks:** Active products, growth stage, revenue, user base, risk level  
**Behavior:** Allocates more resources to products with stronger traction

### 4.10 Architecture Evolution Engine (Stage 30)
**Purpose:** Learn architectural patterns from successful products  
**Learns:** Better schema structures, onboarding patterns, feature sets  
**Output:** Internal architecture library for future projects

### 4.11 System Evolution Engine (Stage 32)
**Purpose:** Meta-learning for continuous platform improvement  
**Scope:** Improve the AxionOS system itself based on aggregate results

---

## 5. Existing v2 Modules (Preserved)

### 5.1 Supabase Data Model Generator (Stage 16)
**Edge Function:** `supabase-data-model-generator`  
**Input:** `domain_model` from Project Brain  
**Output:** `data_model` — normalized relational schema  

### 5.2 Autonomous UI Generator (Stage 19)
**Edge Function:** `autonomous-ui-generator`  
**Input:** `domain_model` + `data_model` + `business_logic` + `api_spec`  
**Output:** `ui_structure` — complete frontend specification  

### 5.3 Adaptive Learning Engine (Stage 28)
**Edge Function:** `adaptive-learning-engine`  
**Input:** `project_errors`, `initiative_jobs`, `prevention_rules`, brain nodes  
**Output:** New prevention rules + dependency constraints + architectural patterns  

---

## 6. Project Brain Extensions

### Node Types
| Type | Source | Description |
|------|--------|-------------|
| `file` | Scaffold/Execution | Source code files |
| `domain_model` | Domain Analyzer | Entities, attributes, relationships |
| `data_model` | Data Model Generator | Tables, columns, FK, indexes, RLS |
| `business_logic` | Logic Synthesizer | Services, workflows, validations |
| `api_spec` | API Generator | Endpoints, RPCs, webhooks |
| `ui_structure` | UI Generator | Pages, components, hooks, navigation |
| `engineering_patterns` | Adaptive Learning | Patterns, constraints, learned rules |
| `opportunity_report` | Opportunity Discovery | Market opportunities (v3) |
| `market_signal` | Market Signal Analyzer | Demand/viability signals (v3) |
| `product_analytics` | Product Analytics | Usage metrics, growth data (v3) |
| `evolution_plan` | Product Evolution | Auto-evolution roadmap (v3) |

### Edge Types
| Type | Description |
|------|-------------|
| `depends_on` | File/module dependency |
| `imports` | Import relationship |
| `renders_component` | Page → Component |
| `calls_service` | Component → Service/Hook |
| `stores_entity` | Service → Database Table |
| `validates_opportunity` | Signal → Opportunity (v3) |
| `evolves_from` | Product version chain (v3) |

---

## 7. Edge Function Architecture

```
supabase/functions/
├── pipeline-comprehension/              Stage 06 — Understanding (4 agents)
├── pipeline-architecture/               Stage 07 — Architecture (4 agents)
├── pipeline-architecture-simulation/    Stage 08 — Architecture Simulation
├── pipeline-preventive-validation/      Stage 09 — Preventive Validation
├── project-bootstrap-intelligence/      Stage 11 — Bootstrap Intelligence
├── pipeline-foundation-scaffold/        Stage 11 — Foundation Scaffold
├── pipeline-module-graph-simulation/    Stage 12 — Module Graph Simulation
├── pipeline-dependency-intelligence/    Stage 12 — Dependency Intelligence
├── ecosystem-drift-intelligence/        Ecosystem Drift Analysis (optional)
├── supabase-schema-bootstrap/           Stage 14 — Schema Bootstrap
├── supabase-provisioning-engine/        Stage 15 — DB Provisioning
├── ai-domain-model-analyzer/            Stage 13 — Domain Model Analysis
├── supabase-data-model-generator/       Stage 16 — Data Model Generation
├── ai-business-logic-synthesizer/       Stage 17 — Business Logic Synthesis
├── autonomous-api-generator/            Stage 18 — API Generation
├── autonomous-ui-generator/             Stage 19 — Autonomous UI Generation
├── pipeline-squad/                      Stage 10 — Squad Formation
├── pipeline-planning/                   Planning
├── pipeline-execution-orchestrator/     Execution Orchestrator
├── pipeline-execution-worker/           Execution Worker
├── pipeline-validation/                 Stage 20 — AI Validation + Fix Loop
├── pipeline-deep-validation/            Stage 20 — Deep Static Analysis
├── pipeline-drift-detection/            Stage 20 — Drift Detection
├── pipeline-runtime-validation/         Stage 21 — Runtime Validation (CI)
├── autonomous-build-repair/             Stage 22 — Build Repair
├── adaptive-learning-engine/            Stage 28 — Adaptive Learning
├── pipeline-publish/                    Stage 23 — Publish (Atomic Tree API)
├── pipeline-approve/                    Gate: Approve
├── pipeline-reject/                     Gate: Reject
├── pipeline-ci-webhook/                 CI Results Webhook
├── pipeline-fix-orchestrator/           CI Fix Swarm
├── pipeline-fast-modify/                Quick single-file modification
├── pipeline-full-review/                Full project review
├── brain-sync/                          Project Brain synchronization
├── error-intelligence/                  Error pattern analysis
├── generate-embeddings/                 Vector embedding generation
├── analyze-artifact/                    Artifact AI analysis
├── rework-artifact/                     Artifact rework
├── generate-agents/                     Agent generation
├── generate-stories/                    Story generation
├── organize-stories/                    Story organization
├── generate-planning-content/           Planning content generation
├── github-proxy/                        GitHub API proxy
├── github-ci-webhook/                   GitHub CI webhook
├── run-initiative-pipeline/             Legacy pipeline router
├── _shared/
│   ├── ai-client.ts                     Unified AI client
│   ├── pipeline-helpers.ts              Logging, jobs, agent messages
│   ├── pipeline-bootstrap.ts            Auth, CORS, rate limiting
│   ├── dependency-scheduler.ts          DAG builder + wave computation
│   ├── brain-helpers.ts                 Project Brain CRUD + context
│   ├── smart-context.ts                 Smart Context Window
│   ├── incremental-engine.ts            Incremental re-execution
│   ├── embedding-helpers.ts             Vector embeddings
│   ├── code-sanitizers.ts               Deterministic files
│   ├── auth.ts                          Authentication
│   ├── cors.ts                          CORS headers
│   └── rate-limit.ts                    Rate limiting
```

---

## 8. Implementation Status

### ✅ Implemented (v2 Complete)

| # | System | Status | Details |
|---|--------|--------|---------|
| 1 | Pipeline (22 stages core) | ✅ | 38+ independent Edge Functions |
| 2 | Project Brain | ✅ | Nodes, edges, decisions, errors, prevention rules, tsvector, pgvector |
| 3 | Dependency Scheduler | ✅ | DAG builder, topological sort, wave computation |
| 4 | Agent Swarm | ✅ | Orchestrator + Worker, parallel execution (6 workers) |
| 5 | Data Model Generator | ✅ | Domain model → SQL tables, FK, indexes, RLS |
| 6 | Autonomous UI Generator | ✅ | Pages, components, hooks, navigation |
| 7 | Adaptive Learning Engine | ✅ | Prevention rules, patterns, cross-project |
| 8 | CI-Triggered Fix Swarm | ✅ | Webhook + Fix Orchestrator + auto-PR |
| 9 | Self-Healing Codebase | ✅ | Prevention rules with confidence scoring |
| 10 | Architectural Drift Detection | ✅ | Rule-based + AI hybrid |
| 11 | Atomic Git Commits | ✅ | Tree API for publish + fix PRs |
| 12 | Runtime Validation | ✅ | Real tsc + vite build via GitHub Actions CI |
| 13 | Smart Context Window | ✅ | ~60-80% token reduction |
| 14 | Vector Embeddings | ✅ | pgvector 768-dim, cosine similarity |
| 15 | Incremental Re-execution | ✅ | Hash-based dirty detection |

### 🔜 Pending (v3 — Autonomous Startup Factory)

| # | Module | Priority | Status |
|---|--------|----------|--------|
| 1 | Opportunity Discovery Engine | P0 | 📋 Planned |
| 2 | Market Signal Analyzer | P0 | 📋 Planned |
| 3 | Product Validation Engine | P0 | 📋 Planned |
| 4 | Revenue Strategy Engine | P1 | 📋 Planned |
| 5 | Observability Engine | P1 | 📋 Planned |
| 6 | Product Analytics Engine | P1 | 📋 Planned |
| 7 | User Behavior Analyzer | P2 | 📋 Planned |
| 8 | Growth Optimization Engine | P2 | 📋 Planned |
| 9 | Product Evolution Engine | P2 | 📋 Planned |
| 10 | Architecture Evolution Engine | P3 | 📋 Planned |
| 11 | Startup Portfolio Manager | P3 | 📋 Planned |
| 12 | System Evolution Engine | P3 | 📋 Planned |

### 🟡 Remaining Gaps

| Gap | Description |
|-----|-------------|
| Approval Chains | No multi-approver workflow with quorum |
| Webhook Notifications | No Slack/Discord notifications |
| UI Visualizations | Missing ER diagrams, component trees, patterns view |
| v3 Database Schema | New tables for opportunities, signals, portfolios, analytics |

---
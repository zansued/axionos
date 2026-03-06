# AxionOS — Autonomous Software Engineering System Architecture

> Deep technical analysis of the AI-orchestrated autonomous software engineering system.
> Last updated: 2026-03-06

---

## 1. Project Overview

**AxionOS** is a multi-tenant SaaS platform that operates as an autonomous software engineering system. It orchestrates multiple AI agents to autonomously discover product opportunities, validate market demand, generate complete production-ready applications, launch digital products, analyze market feedback, and evolve products automatically.

### Core Value Proposition
The system operates as an **AI-powered venture studio** — continuously generating and testing digital products, learning from real user behavior and improving future projects.

### System Maturity
| Level | Name | Status |
|-------|------|--------|
| Level 1 | Code Generator | ✅ |
| Level 2 | Software Builder | ✅ |
| Level 3 | Autonomous Engineering System | ✅ |
| Level 4 | Self-Learning Software Factory | 🔄 Transitioning |
| Level 5 | Autonomous Startup Factory | 🔮 Planned |

> AxionOS is currently transitioning from Level 3 to Level 4.

### Technology Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query + React Context |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, RLS) |
| AI Engine | Lovable AI Gateway (Gemini 2.5 Flash/Pro) + Efficiency Layer |
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

### Layer 0 — AI Efficiency Layer (NEW)
Optimizes all LLM interactions across the entire system.

| Module | Purpose |
|--------|---------|
| **Prompt Compressor** | Rule-based + AI summarization to reduce context tokens by 60-90% |
| **Semantic Cache** | Vector similarity cache (pgvector, threshold 0.92) avoids redundant calls |
| **Model Router** | Complexity-based routing: `flash-lite` → `flash` → `pro` |

### Layer 1 — Venture Intelligence Layer
Responsible for product discovery and market validation **before** the build pipeline begins.

| Engine | Purpose |
|--------|---------|
| **Opportunity Discovery Engine** | Identify potential product ideas from market data, trends, communities |
| **Market Signal Analyzer** | Analyze search volume, competitor products, pricing, trend acceleration |
| **Product Validation Engine** | Simulate landing pages, synthetic user testing, demand estimation |
| **Revenue Strategy Engine** | Define pricing models, subscription tiers, market positioning |

### Layer 2 — Software Generation Pipeline
The 32-stage deterministic pipeline for autonomous software engineering.

### Layer 3 — Growth & Evolution Layer
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

### Layer 4 — Adaptive Learning Layer
Cross-cutting layer that enables self-improvement across all other layers.

| Module | Purpose |
|--------|---------|
| **Error Intelligence Engine** | Extract patterns from build failures and runtime errors |
| **Prevention Rules** | Confidence-scored rules that prevent known failure patterns |
| **Adaptive Learning Engine** | Automatically generate new rules from error analysis |
| **Project Brain** | Centralized knowledge graph with semantic search |

---

## 3. Pipeline — 32-Stage Model

```
═══════════════════════════════════════════════════════
  VENTURE INTELLIGENCE LAYER (Stages 1-5)
═══════════════════════════════════════════════════════

  → Stage 01: Idea Intake
  → Stage 02: Opportunity Discovery Engine
  → Stage 03: Market Signal Analyzer
  → Stage 04: Product Validation Engine
  → Stage 05: Revenue Strategy Engine

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
  GROWTH & EVOLUTION LAYER (Stages 24-32)
═══════════════════════════════════════════════════════

  → Stage 24: Observability Engine
  → Stage 25: Product Analytics Engine
  → Stage 26: User Behavior Analyzer
  → Stage 27: Growth Optimization Engine
  → Stage 28: Adaptive Learning Engine
  → Stage 29: Product Evolution Engine
  → Stage 30: Architecture Evolution Engine
  → Stage 31: Startup Portfolio Manager
  → Stage 32: System Evolution Engine
```

---

## 4. AI Efficiency Layer (NEW)

### 4.1 Prompt Compression Engine
**File:** `_shared/prompt-compressor.ts`
**Purpose:** Reduce context size before LLM calls
**Strategy:**
1. **Rule-based pre-compression:** Remove console logs, verbose comments, redundant separators, collapse empty lines
2. **Critical marker extraction:** Preserve architecture decisions, dependency constraints, errors, build config
3. **AI summarization:** Use `gemini-2.5-flash-lite` (cheapest model) to compress remaining context
**Result:** 60-90% token reduction while preserving engineering-critical information

### 4.2 Semantic Cache Engine
**File:** `_shared/semantic-cache.ts`
**Table:** `ai_prompt_cache` (with `vector(768)` column)
**Workflow:**
1. Generate embedding of incoming prompt
2. Check exact hash match (fastest path)
3. Search vector database for similar prompts (cosine similarity)
4. If similarity > 0.92 → return cached response (zero LLM cost)
5. Otherwise → call LLM and store response for future hits
**Fields:** `prompt_hash`, `embedding`, `response`, `stage`, `model_used`, `tokens_saved`, `hit_count`, `expires_at`

### 4.3 Model Router Engine
**File:** `_shared/model-router.ts`
**Strategy:** Route prompts to appropriate models based on complexity analysis
| Complexity | Model | Cost Multiplier |
|-----------|-------|-----------------|
| Low | `google/gemini-2.5-flash-lite` | 0.2x |
| Medium | `google/gemini-2.5-flash` | 0.5x |
| High | `google/gemini-2.5-pro` | 1.0x |

**Routing logic:**
- Stage-based: known stage → predetermined complexity tier
- Heuristic: analyze prompt content for complexity indicators
- Cache hits bypass model calls entirely

### 4.4 Integration Point
All three modules integrate transparently in `callAI()` (`_shared/ai-client.ts`):
```
callAI() → compress → cache lookup → route model → LLM call → cache store → return
```
Backward compatible: all new parameters are optional.

---

## 5. Module Specifications

### 5.1 Opportunity Discovery Engine (Stage 02)
**Purpose:** Identify potential product ideas automatically
**Inputs:** Market data, search trends, developer communities, startup datasets
**Outputs:** `opportunity_report`, `problem_statement`, `target_audience`, `product_type`

### 5.2 Market Signal Analyzer (Stage 03)
**Purpose:** Analyze signals indicating market demand
**Signals:** Search volume, community discussions, competitor products, pricing models
**Outputs:** `market_score`, `demand_level`, `competition_level`, `viability_index`
**Gate:** Only opportunities above viability threshold enter the build pipeline

### 5.3 Product Validation Engine (Stage 04)
**Purpose:** Validate before building
**Methods:** Landing page simulation, synthetic user testing, AI demand estimation
**Outputs:** `validation_score`, `estimated_adoption`, `risk_level`

### 5.4 Revenue Strategy Engine (Stage 05)
**Purpose:** Define monetization strategy for every generated product
**Outputs:** Pricing model, subscription tiers, freemium options, market positioning

### 5.5 Supabase Data Model Generator (Stage 16)
**Edge Function:** `supabase-data-model-generator`
**Input:** `domain_model` from Project Brain
**Output:** `data_model` — normalized relational schema

### 5.6 Autonomous UI Generator (Stage 19)
**Edge Function:** `autonomous-ui-generator`
**Input:** `domain_model` + `data_model` + `business_logic` + `api_spec`
**Output:** `ui_structure` — complete frontend specification

### 5.7 Adaptive Learning Engine (Stage 28)
**Edge Function:** `adaptive-learning-engine`
**Input:** `project_errors`, `initiative_jobs`, `prevention_rules`, brain nodes
**Output:** New prevention rules + dependency constraints + architectural patterns

### 5.8 Product Analytics Engine (Stage 25)
**Purpose:** Monitor real usage after deployment
**Metrics:** User acquisition, activation rate, retention, conversion, revenue

### 5.9 Growth Optimization Engine (Stage 27)
**Purpose:** Improve product adoption
**Capabilities:** Landing page optimization, feature prioritization, onboarding improvements

### 5.10 Startup Portfolio Manager (Stage 31)
**Purpose:** Manage multiple products simultaneously
**Tracks:** Active products, growth stage, revenue, user base, risk level

### 5.11 System Evolution Engine (Stage 32)
**Purpose:** Meta-learning for continuous platform improvement
**Scope:** Improve the AxionOS system itself based on aggregate results

---

## 6. Project Brain

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
| `opportunity_report` | Opportunity Discovery | Market opportunities |
| `market_signal` | Market Signal Analyzer | Demand/viability signals |
| `product_analytics` | Product Analytics | Usage metrics, growth data |
| `evolution_plan` | Product Evolution | Auto-evolution roadmap |

### Edge Types
| Type | Description |
|------|-------------|
| `depends_on` | File/module dependency |
| `imports` | Import relationship |
| `renders_component` | Page → Component |
| `calls_service` | Component → Service/Hook |
| `stores_entity` | Service → Database Table |
| `validates_opportunity` | Signal → Opportunity |
| `evolves_from` | Product version chain |

---

## 7. Edge Function Architecture

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
    ├── prompt-compressor.ts      Prompt compression engine (NEW)
    ├── semantic-cache.ts         Vector-based semantic cache (NEW)
    ├── model-router.ts           Intelligent model routing (NEW)
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

## 8. Implementation Status

### ✅ Completed (Phases 1-3)

| # | System | Status | Details |
|---|--------|--------|---------|
| 1 | Pipeline (32 stages) | ✅ | 50+ independent Edge Functions |
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
| 16 | AI Efficiency Layer | ✅ | Prompt compression + semantic cache + model router |

### 🔮 Next (Phase 4: Agent Intelligence)

| # | Module | Priority | Status |
|---|--------|----------|--------|
| 1 | Learning Agents | P0 | 📋 Planned |
| 2 | Prompt Optimization Engine | P0 | 📋 Planned |
| 3 | Architecture Pattern Library | P1 | 📋 Planned |
| 4 | Error Pattern Recognition | P1 | 📋 Planned |
| 5 | Self-Improving Fix Agents | P2 | 📋 Planned |

### 🟡 Remaining Gaps

| Gap | Description |
|-----|-------------|
| Approval Chains | No multi-approver workflow with quorum |
| Webhook Notifications | No Slack/Discord notifications |
| UI Visualizations | Missing ER diagrams, component trees, patterns view |

---

## 9. Database Schema (30+ tables)

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

### Efficiency Tables (NEW)
- `ai_prompt_cache` (with `vector(768)` embedding, TTL, hit tracking)
- `ai_rate_limits`

### Knowledge Tables
- `org_knowledge_base`
- `git_connections`
- `supabase_connections`

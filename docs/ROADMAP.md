# AxionOS v3 — Roadmap de Implementação

> Checklist ordenado do que foi feito e do que falta.  
> Marque com `[x]` conforme for concluído.  
> Última atualização: 2026-03-05

---

## Fase 1 — Migrar para Lovable AI Gateway ✅

- [x] Migrar todas as Edge Functions para Lovable AI Gateway (`google/gemini-2.5-flash`)
- [x] Unificar client AI em `_shared/ai-client.ts` com retry + cost tracking
- [x] Suporte a OpenAI como fallback quando `OPENAI_API_KEY` configurada

---

## Fase 2 — Pipeline Decomposition ✅

- [x] Decompor pipeline monolítico em 38+ Edge Functions independentes
- [x] `pipeline-comprehension` (4 agentes de compreensão)
- [x] `pipeline-architecture` (4 agentes de arquitetura)
- [x] `pipeline-squad` (Formação de squad)
- [x] `pipeline-planning` (Planejamento)
- [x] `pipeline-execution-orchestrator` + `pipeline-execution-worker` (Swarm)
- [x] `pipeline-validation` (AI Validation + Fix Loop)
- [x] `pipeline-deep-validation` (Deep Static Analysis)
- [x] `pipeline-drift-detection` (Architectural Drift Detection)
- [x] `pipeline-runtime-validation` (Runtime Validation via CI)
- [x] `pipeline-publish` (Atomic Tree API Publish)
- [x] `pipeline-ci-webhook` + `pipeline-fix-orchestrator` (CI Fix Swarm)
- [x] `pipeline-approve` / `pipeline-reject` (Gates)
- [x] `pipeline-fast-modify` / `pipeline-full-review` (Modificações)
- [x] Shared bootstrap (`pipeline-bootstrap.ts`) para auth, CORS, rate limiting

---

## Fase 3 — Chain-of-Agents ✅

- [x] Tabela `agent_messages` para rastreabilidade de conversas entre agentes
- [x] Cadeia de 3 agentes no Layer 4: Code Architect → Developer → Integration Agent
- [x] Registrar cada handoff como `agent_message`
- [x] Timeline de mensagens na UI (`AgentMessagesTimeline`)

---

## Fase 4 — Project Brain ✅

- [x] Tabela `project_brain_nodes` com todos os tipos de nó
- [x] Tabela `project_brain_edges` com relações de dependência
- [x] Tabela `project_decisions` com categorias, supersedes chain, status
- [x] Tabela `project_errors` com rastreamento de erros e root causes
- [x] Tabela `project_prevention_rules` com confidence scoring
- [x] Full-text search via `tsvector` em nodes
- [x] Vector embeddings via `pgvector` (768-dim) com cosine similarity
- [x] Painel interativo `ProjectBrainPanel` com DAG, Self-Healing, Decisions
- [x] `generateBrainContext()` para injeção automática em prompts de IA

---

## Fase 5 — DAG Execution Engine ✅

- [x] `buildExecutionDAG()` — constrói DAG a partir de brain nodes/edges
- [x] `computeWaves()` — topological sort (Kahn's) agrupando por wave level
- [x] `getReadyNodes()` — retorna nós com dependências satisfeitas
- [x] Orchestrator + Worker com 6 workers paralelos

---

## Fase 6 — Smart Context Window ✅

- [x] AST-like parser em `_shared/smart-context.ts`
- [x] ~60-80% redução de tokens enviados à IA

---

## Fase 7 — Self-Healing ✅

- [x] Learning Agent gera prevention rules após cada fix
- [x] Prevention rules com confidence scoring incremental
- [x] Self-Healing tab no `ProjectBrainPanel`

---

## Fase 8 — Observability & Governance ✅

- [x] Custos per-initiative com tracking em `initiative_jobs`
- [x] SLA configs per-stage (`stage_sla_configs`)
- [x] Gate permissions per-org (`pipeline_gate_permissions`)
- [x] Usage limits, Audit logs, Dashboard estratégico

---

## Fase 9 — Architecture Simulation ✅

- [x] `pipeline-architecture-simulation` — túnel de vento técnico
- [x] Grafo dirigido de componentes
- [x] AI prediction de falhas de build + auto-reparo

---

## Fase 10 — Pre-Generation Intelligence ✅

- [x] `pipeline-preventive-validation` — auditoria de regras históricas
- [x] `project-bootstrap-intelligence` — multi-stack detection + build prediction
- [x] `pipeline-foundation-scaffold` — scaffold mínimo buildável
- [x] `pipeline-module-graph-simulation` — bundler import analysis + DFS
- [x] `pipeline-dependency-intelligence` — NPM health audit

---

## Fase 11 — Supabase Infrastructure ✅

- [x] `supabase-schema-bootstrap` — schema isolado `app_{project_id}`
- [x] `supabase-provisioning-engine` — tabelas base + RLS + storage bucket

---

## Fase 12 — AI Analysis Chain ✅

- [x] `ai-domain-model-analyzer` — entidades, atributos, relacionamentos via LLM
- [x] `ai-business-logic-synthesizer` — services, validações, workflows
- [x] `autonomous-api-generator` — REST endpoints, RPCs, triggers, webhooks

---

## Fase 13 — AxionOS v2 Modules ✅

- [x] `supabase-data-model-generator` — domain_model → SQL tables, FK, indexes, RLS
- [x] `autonomous-ui-generator` — páginas, componentes, hooks, navegação
- [x] `adaptive-learning-engine` — prevention rules, patterns, cross-project learning

---

## Fase 14 — AxionOS v3: Venture Intelligence Layer 📋

### 14.1 — Opportunity Discovery Engine
- [ ] Edge Function `opportunity-discovery-engine`
- [ ] Inputs: market data, search trends, developer communities, startup datasets
- [ ] Outputs: `opportunity_report`, `problem_statement`, `target_audience`, `product_type`
- [ ] Pipeline stages: `discovering_opportunity` → `opportunity_discovered`
- [ ] Store `opportunity_report` in Project Brain

### 14.2 — Market Signal Analyzer
- [ ] Edge Function `market-signal-analyzer`
- [ ] Analyze: search volume, community discussions, competitor products, pricing
- [ ] Outputs: `market_score`, `demand_level`, `competition_level`, `viability_index`
- [ ] Pipeline stages: `analyzing_market` → `market_analyzed`
- [ ] Viability gate: block low-score opportunities

### 14.3 — Product Validation Engine
- [ ] Edge Function `product-validation-engine`
- [ ] Methods: landing page simulation, synthetic user testing, AI demand estimation
- [ ] Outputs: `validation_score`, `estimated_adoption`, `risk_level`
- [ ] Pipeline stages: `validating_product` → `product_validated`

### 14.4 — Revenue Strategy Engine
- [ ] Edge Function `revenue-strategy-engine`
- [ ] Define: pricing model, subscription tiers, freemium options, upsells
- [ ] Outputs: `revenue_strategy`, `pricing_tiers`, `market_positioning`
- [ ] Pipeline stages: `strategizing_revenue` → `revenue_strategized`

---

## Fase 15 — AxionOS v3: Growth & Evolution Layer 📋

### 15.1 — Observability Engine
- [ ] Edge Function `observability-engine`
- [ ] Real-time monitoring of deployed products
- [ ] Pipeline stages: `observing` → `observed`

### 15.2 — Product Analytics Engine
- [ ] Edge Function `product-analytics-engine`
- [ ] Track: user acquisition, activation, retention, conversion, revenue
- [ ] Feed metrics to evolution engines
- [ ] Pipeline stages: `analyzing_product` → `product_analytics_ready`

### 15.3 — User Behavior Analyzer
- [ ] Edge Function `user-behavior-analyzer`
- [ ] Analyze: feature usage, drop-off points, session duration, interaction patterns
- [ ] Identify: friction points, unused features, engagement drivers
- [ ] Pipeline stages: `analyzing_behavior` → `behavior_analyzed`

### 15.4 — Growth Optimization Engine
- [ ] Edge Function `growth-optimization-engine`
- [ ] Capabilities: landing page optimization, feature prioritization, onboarding improvements
- [ ] Pipeline stages: `optimizing_growth` → `growth_optimized`

### 15.5 — Product Evolution Engine
- [ ] Edge Function `product-evolution-engine`
- [ ] Auto-evolve: add features, remove unused modules, improve UI, optimize DB
- [ ] Pipeline stages: `evolving_product` → `product_evolved`

### 15.6 — Architecture Evolution Engine
- [ ] Edge Function `architecture-evolution-engine`
- [ ] Learn: better schema structures, onboarding patterns, feature sets
- [ ] Build internal architecture library
- [ ] Pipeline stages: `evolving_architecture` → `architecture_evolved`

### 15.7 — Startup Portfolio Manager
- [ ] Edge Function `startup-portfolio-manager`
- [ ] Track: active products, growth stage, revenue, user base, risk level
- [ ] Resource allocation based on traction
- [ ] Pipeline stages: `managing_portfolio` → `portfolio_managed`

### 15.8 — System Evolution Engine
- [ ] Edge Function `system-evolution-engine`
- [ ] Meta-learning for continuous platform improvement
- [ ] Pipeline stages: `evolving_system` → `system_evolved`

---

## Fase 16 — v3 Database Schema 📋

- [ ] Table `product_opportunities` — discovered opportunities with scores
- [ ] Table `market_signals` — demand signals with viability index
- [ ] Table `product_portfolios` — multi-product portfolio tracking
- [ ] Table `product_analytics` — usage metrics per deployed product
- [ ] Table `evolution_plans` — auto-generated evolution roadmaps
- [ ] New enum values for v3 pipeline stages
- [ ] RLS policies for all new tables

---

## Fase 17 — v3 UI 📋

- [ ] Venture Dashboard — opportunity funnel visualization
- [ ] Portfolio Manager — multi-product grid view
- [ ] Analytics Dashboard — per-product metrics
- [ ] Evolution Timeline — auto-evolution history
- [ ] Market Signal Map — viability heatmap

---

## 🟡 Pending Improvements (All versions)

| # | Item | Impact | Complexity |
|---|------|--------|-----------|
| 1 | UI for v2 stages (ER diagram, component tree) | 🟡 Medium | Medium |
| 2 | Approval chains with quorum | 🟡 Medium | High |
| 3 | Webhook notifications (Slack/Discord) | 🟠 Low | Low |
| 4 | Export enhancements | 🟠 Low | Low |

---

## Métricas do Projeto

### v2 (Implementado)
- **38+ Edge Functions** independentes
- **22 estágios** de pipeline determinístico
- **18+ agentes** especializados por role
- **12 shared helpers** reutilizáveis
- **28+ tabelas** no banco de dados
- **8+ tipos de nó** no Project Brain

### v3 (Planejado)
- **32 estágios** de pipeline (10 novos)
- **50+ Edge Functions** (12 novas)
- **8 novos motores** de inteligência
- **5+ novas tabelas** de banco de dados
- **Multi-product portfolio** management
- **Autonomous product evolution** loop

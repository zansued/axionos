# AxionOS — Roadmap de Implementação

> Checklist ordenado do que falta para completar o AIOS.  
> Marque com `[x]` conforme for concluído.  
> Última atualização: 2026-03-05

---

## Fase 1 — Migrar para Lovable AI Gateway ✅

- [x] Migrar todas as Edge Functions para Lovable AI Gateway (`google/gemini-2.5-flash`)
- [x] Unificar client AI em `_shared/ai-client.ts` com retry + cost tracking
- [x] Suporte a OpenAI como fallback quando `OPENAI_API_KEY` configurada

---

## Fase 2 — Pipeline Decomposition ✅

- [x] Decompor pipeline monolítico em 35+ Edge Functions independentes
- [x] `pipeline-comprehension` (Stage 1 — 4 agentes de compreensão)
- [x] `pipeline-architecture` (Stage 2 — 4 agentes de arquitetura)
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

- [x] Tabela `project_brain_nodes` com tipos: file, component, hook, service, api, table, type, schema, edge_function, page, context, util, domain_model, business_logic, api_spec
- [x] Tabela `project_brain_edges` com relações: imports, depends_on, calls_api, uses_component, implements_interface, exports, renders, stores_in_table
- [x] Tabela `project_decisions` com categorias, supersedes chain, status
- [x] Tabela `project_errors` com root cause, prevention rules, fix tracking
- [x] Tabela `project_prevention_rules` com confidence scoring + scope
- [x] Full-text search via `tsvector` + `search_vector`
- [x] Vector embeddings via `pgvector` (768-dim) com cosine similarity
- [x] CRUD helpers em `_shared/brain-helpers.ts`
- [x] Context generation para prompts AI (`generateBrainContext()`)
- [x] RLS policies para isolamento multi-tenant
- [x] Integração com Layer 2 (Architecture popula o Brain)
- [x] UI do Project Brain (`ProjectBrainPanel` com Graph, Decisions, Errors, Self-Healing)

---

## Fase 5 — Dependency Scheduler ✅

- [x] `buildExecutionDAG()` — constrói DAG a partir dos nós/edges do Brain
- [x] `computeWaves()` — topological sort (Kahn's algorithm) agrupando nós em waves
- [x] `getReadyNodes()` — nós com todas dependências satisfeitas
- [x] `applyLayerPriorities()` — prioridades implícitas por tipo de arquivo
- [x] `breakCycles()` — detecção e remoção de ciclos via DFS
- [x] `updateBrainEdgesFromImports()` — extração de imports do código gerado
- [x] `formatExecutionPlan()` — plano de execução legível para logs

---

## Fase 6 — Agent Swarm (Orchestrator + Workers) ✅

- [x] `pipeline-execution-orchestrator` — orquestra waves, despacha workers
- [x] `pipeline-execution-worker` — gera um único arquivo via cadeia de 3 agentes
- [x] Execução paralela via `Promise.all` com limite de `MAX_WORKERS = 6`
- [x] Workers invocados via `fetch()` ao endpoint da Edge Function
- [x] Comunicação via Project Brain (sem comunicação direta entre workers)
- [x] Retry automático (até 2x) com fallback para `project_errors`
- [x] Progress tracking em tempo real via `execution_progress` JSON

---

## Fase 7 — CI-Triggered Fix Swarm ✅

- [x] `pipeline-ci-webhook` — recebe resultados do GitHub Actions
- [x] `pipeline-fix-orchestrator` — agrupa erros por arquivo, despacha fix workers
- [x] Criação de PR atômico via Git Tree API com correções
- [x] Learning Agent gera prevention rules pós-fix
- [x] `CIFixSwarmStatus` — componente de monitoramento na UI

---

## Fase 8 — Self-Healing Codebase ✅

- [x] `project_prevention_rules` — regras com confidence scoring incremental
- [x] `upsertPreventionRule()` — bump de confidence em padrões recorrentes
- [x] Regras injetadas em todos os prompts via `generateBrainContext()`
- [x] Aba Self-Healing no `ProjectBrainPanel`
- [x] Escopo: initiative-specific + org-wide

---

## Fase 9 — Architectural Drift Detection ✅

- [x] `pipeline-drift-detection` — detecção híbrida (rule-based + AI)
- [x] Classificação de arquivos por camada (pages → components → hooks → services → data)
- [x] Detecção de dependências invertidas, camadas ausentes, violações de fronteira
- [x] Auto-trigger após Deep Validation
- [x] `ArchitecturalDriftStatus` — UI com drift score e lista de violações
- [x] Violations registradas em `project_errors` + prevention rules geradas

---

## Fase 10 — Atomic Git Commits (Tree API) ✅

- [x] `pipeline-publish` refatorado para Git Tree API
- [x] `pipeline-fix-orchestrator` refatorado para Git Tree API
- [x] Fluxo: Create Blobs (paralelo, batches de 5) → Build Tree → Single Commit → Update Ref
- [x] Elimina N requests sequenciais por 1 commit atômico

---

## Fase 11 — Runtime Validation (tsc + vite build) ✅

- [x] `pipeline-runtime-validation` — push para branch temporária `validate/{id}`
- [x] GitHub Actions executa: `npm install → tsc --noEmit → vite build`
- [x] Resultados voltam via `pipeline-ci-webhook` existente
- [x] Erros reais do compilador alimentam Fix Swarm
- [x] `RuntimeValidationStatus` — UI com status do CI, erros e build log
- [x] Disponível nos stages `validating` e `ready_to_publish`

---

## Fase 12 — Smart Context Window (AST-based) ✅

- [x] `_shared/smart-context.ts` — parser regex-based que extrai API pública
- [x] Extrai: imports, exports, interfaces, types, function signatures, component props
- [x] `buildSmartContextWindow()` — contexto compacto com priorização por tipo
- [x] Compressão de ~60-80% no volume de tokens
- [x] Integrado ao `pipeline-execution-orchestrator`
- [x] Stats de compressão logados periodicamente

---

## Fase 13 — Observabilidade & Custos ✅

- [x] Dashboard de custo por iniciativa e agente
- [x] Tempo médio por estágio
- [x] Alertas de budget
- [x] SLA configs por estágio

---

## Fase 14 — Memória e Contexto ✅

- [x] Tabela `agent_memory`
- [x] Herança de contexto entre iniciativas
- [x] Knowledge base organizacional
- [x] Extração de memórias pós-execução

---

## Fase 15 — Incremental Re-execution ✅

- [x] Engine de detecção incremental (`incremental-engine.ts`) com hash DJB2
- [x] Classificação dirty/clean por `content_hash` no Project Brain
- [x] Propagação em cascata: dependentes de nós dirty são marcados dirty
- [x] Orchestrator filtra subtasks e só re-gera dirty nodes
- [x] Reutiliza outputs existentes de subtasks limpas para context injection
- [x] Worker armazena `content_hash` determinístico via `simpleHash`
- [x] UI mostra badge "Incremental", contagem de reusados e % de economia

---

## Fase 16 — Vector Embeddings (pgvector) ✅

- [x] Extensão pgvector habilitada com coluna `embedding vector(768)` em `project_brain_nodes`
- [x] Colunas `embedding_model` e `embedded_at` para rastreabilidade
- [x] Índice IVFFlat para busca vetorial rápida
- [x] Função `match_brain_nodes` para similarity search por cosine distance
- [x] Função `get_unembedded_nodes` para processamento em lote
- [x] `embedding-helpers.ts`: geração de embeddings via Lovable AI Gateway
- [x] Worker gera embedding automaticamente após cada arquivo
- [x] Orchestrator executa batch embedding pós-execução
- [x] Semantic search integrada ao Smart Context Window
- [x] Edge Function `generate-embeddings` para embedding on-demand
- [x] Fallback determinístico (hash-based) quando AI falha

---

## Fase 17 — Templates de Iniciativas ✅

- [x] 6 templates pré-prontos (SaaS, API REST, Landing Page, E-commerce, Dashboard, CRM)
- [x] Template picker integrado ao dialog de criação
- [x] Pre-popula discovery_payload + campos de discovery (target_user, stack, complexity, risk, mvp)
- [x] Acelera as 2 primeiras camadas do pipeline

---

## Fase 18 — UX & Polish ✅

- [x] Atalhos de teclado (g+d, g+i, g+k, g+c, t, ?) com dialog de ajuda
- [x] Internacionalização pt-BR / en-US com toggle de idioma
- [x] Exportação de relatórios CSV e PDF (iniciativas)
- [x] Dark/Light theme refinements (melhor contraste, transições suaves)

---

## Fase 19 — Governança Avançada (Parcial)

- [x] Roles granulares por gate do pipeline
- [ ] Approval chains com múltiplos aprovadores
- [x] Compliance e exportação de evidências (Audit Trail, Governança, Reviews com CSV/PDF)
- [ ] Webhook notifications (Slack, Discord)

---

## Fase 20 — Adaptive Engineering System ✅

- [x] **Error Intelligence Engine** (`error-intelligence/index.ts`)
- [x] **Preventive Architecture Validator** (`pipeline-preventive-validation/index.ts`)
- [x] Integração com Build Self-Healing para disparo assíncrono de aprendizado
- [x] Novos estágios no pipeline: `validating_architecture` / `architecture_validated`

---

## Fase 21 — Architecture Simulation Engine ✅

- [x] **`pipeline-architecture-simulation`** — simula arquitetura antes da geração
- [x] Grafo dirigido, validação estrutural, predição de falhas, auto-reparo
- [x] Novos estágios: `simulating_architecture` / `architecture_simulated`

---

## Fase 22 — Foundation Scaffold Engine ✅

- [x] **`pipeline-foundation-scaffold`** — scaffold mínimo buildável
- [x] Template React+Vite, validação, auto-reparo, simulação de build
- [x] Novos estágios: `scaffolding` / `scaffolded`

---

## Fase 23 — Project Bootstrap Intelligence ✅

- [x] **`project-bootstrap-intelligence`** — validação de buildabilidade multi-stack
- [x] Novos estágios: `bootstrapping` / `bootstrapped`
- [x] Pipeline sequencial sem aprovações intermediárias

---

## Fase 24 — Module Graph Simulation ✅

- [x] **`pipeline-module-graph-simulation`** — análise de imports e circularidade via DFS
- [x] Reconstrói grafo de módulos do bundler (Vite/Rollup)
- [x] Novos estágios: `simulating_modules` / `modules_simulated`

---

## Fase 25 — Dependency Intelligence Engine ✅

- [x] **`pipeline-dependency-intelligence`** — auditoria de saúde dos pacotes NPM
- [x] Consulta NPM Registry + Firecrawl, Health Score com bloqueio se < 0.75
- [x] Novos estágios: `analyzing_dependencies` / `dependencies_analyzed`

---

## Fase 26 — Ecosystem Drift Intelligence ✅

- [x] **`ecosystem-drift-intelligence`** — análise de drift do ecossistema
- [x] Integrado como ação opcional no pipeline

---

## Fase 27 — Supabase Schema Bootstrap ✅

- [x] **`supabase-schema-bootstrap`** — cria schema PostgreSQL isolado (`app_{project_id}`)
- [x] Novos estágios: `bootstrapping_schema` / `schema_bootstrapped`

---

## Fase 28 — Supabase Provisioning Engine ✅

- [x] **`supabase-provisioning-engine`** — tabelas base, RLS, storage bucket
- [x] Cria users, settings, audit_logs no schema do projeto
- [x] Habilita RLS com policies de isolamento
- [x] Cria bucket privado `files_{project_id}`
- [x] Validação via `information_schema.tables`
- [x] Novos estágios: `provisioning_db` / `db_provisioned`

---

## Fase 29 — AI Domain Model Analyzer ✅

- [x] **`ai-domain-model-analyzer`** — extração de modelo de domínio via LLM
- [x] Entidades com atributos tipados, relacionamentos (FK), regras de negócio
- [x] Fallback para templates genéricos se análise falhar
- [x] Armazena `domain_model` + `domain_model_report` no Project Brain
- [x] Novos estágios: `analyzing_domain` / `domain_analyzed`

---

## Fase 30 — AI Business Logic Synthesizer ✅

- [x] **`ai-business-logic-synthesizer`** — gera lógica de negócio a partir do domain model
- [x] Services (CRUD + custom actions), validations, workflows (estados + transições)
- [x] Access control (RLS-compatible), computed fields
- [x] Fallback CRUD para entidades sem serviço
- [x] Armazena `business_logic` + `business_logic_report` no Project Brain
- [x] Novos estágios: `synthesizing_logic` / `logic_synthesized`

---

## Fase 31 — Autonomous API Generator ✅

- [x] **`autonomous-api-generator`** — gera camada de API completa
- [x] REST endpoints (CRUD + custom), RPC functions, event triggers, webhooks
- [x] Validação: toda entidade tem CRUD coverage
- [x] Armazena `api_spec` + `api_generation_report` no Project Brain
- [x] Novos estágios: `generating_api` / `api_generated`

---

## Fase 32 — Autonomous Build Repair ✅

- [x] **`autonomous-build-repair`** — auto-reparo de falhas de build
- [x] Novos estágios: `repairing_build` / `build_repaired` / `repair_failed`

---

## 🔜 Próximos Passos

| # | Fase | Impacto | Complexidade | Descrição |
|---|------|---------|-------------|-----------|
| 1 | Supabase Data Model Generator | 🔴 Alto | Médio | Gera tabelas SQL no schema do projeto a partir do domain_model |
| 2 | Approval chains | 🟡 Médio | Alto | Múltiplos aprovadores com quórum |
| 3 | Webhook notifications | 🟠 Baixo | Baixo | Slack/Discord em gates e SLA |
| 4 | UI para Domain Model / Business Logic / API Spec | 🟡 Médio | Médio | Visualizações dos artefatos gerados nos novos estágios |

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

- [x] Decompor pipeline monolítico em 20+ Edge Functions independentes
- [x] `pipeline-comprehension` (Layer 1 — 4 agentes de compreensão)
- [x] `pipeline-architecture` (Layer 2 — 4 agentes de arquitetura)
- [x] `pipeline-squad` (Formação de squad)
- [x] `pipeline-planning` (Layer 3 — Planejamento)
- [x] `pipeline-execution-orchestrator` + `pipeline-execution-worker` (Layer 4 — Swarm)
- [x] `pipeline-validation` (Layer 5a — AI Validation + Fix Loop)
- [x] `pipeline-deep-validation` (Layer 5b — Deep Static Analysis)
- [x] `pipeline-drift-detection` (Layer 5c — Architectural Drift Detection)
- [x] `pipeline-runtime-validation` (Layer 5d — Runtime Validation via CI)
- [x] `pipeline-publish` (Layer 6 — Atomic Tree API Publish)
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

- [x] Tabela `project_brain_nodes` com tipos: file, component, hook, service, api, table, type, schema, edge_function, page, context, util
- [x] Tabela `project_brain_edges` com relações: imports, depends_on, calls_api, uses_component, implements_interface, exports, renders, stores_in_table
- [x] Tabela `project_decisions` com categorias, supersedes chain, status
- [x] Tabela `project_errors` com root cause, prevention rules, fix tracking
- [x] Tabela `project_prevention_rules` com confidence scoring + scope
- [x] Full-text search via `tsvector` + `search_vector`
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
  - Coleta e analisa padrões de falha cross-project
  - Gera prevention rules automaticamente a partir de padrões recorrentes
  - Rastreia métricas: taxa de sucesso de build, tentativas de reparo, tempo para build
- [x] **Preventive Architecture Validator** (`pipeline-preventive-validation/index.ts`)
  - Validação pré-geração: checa entrypoints, scripts, configs obrigatórios
  - Compatibilidade de dependências (conflitos npm, peer dependencies)
  - Aplica prevention rules aprendidas para auto-correção do plano
- [x] Integração com Build Self-Healing para disparo assíncrono de aprendizado
- [x] Novos estágios no pipeline: `validating_architecture` / `architecture_validated`

---

## Fase 21 — Architecture Simulation Engine ✅

- [x] **`pipeline-architecture-simulation`** — simula a arquitetura antes da geração de código
- [x] Converte plano de arquitetura em grafo dirigido (módulos, serviços, APIs, DB)
- [x] **Validação estrutural**: entrypoints válidos, módulos conectados, ciclos detectados
- [x] **Validação de dependências**: conflitos npm, peer dependencies faltantes, plugins obrigatórios
- [x] **Predição de falhas via IA**: analisa o modelo e prediz problemas de build
- [x] **Auto-reparo**: corrige automaticamente o plano de arquitetura antes da execução
- [x] Resultado armazenado no Project Brain para contexto futuro
- [x] Novos estágios: `simulating_architecture` / `architecture_simulated`
- [x] Pipeline atualizado: Arquitetura → Simulação → Validação Preventiva → Squad → Execução

---

## Fase 22 — Foundation Scaffold Engine ✅

- [x] **`pipeline-foundation-scaffold`** — gera scaffold mínimo buildável antes da geração de features
- [x] Template React+Vite com package.json, index.html, src/main.tsx, src/App.tsx, vite.config.ts, tsconfig.json
- [x] Detecção automática de stack via discovery_payload
- [x] **Validação de scaffold**: verifica scripts, imports, entrypoints e dependências
- [x] **Auto-reparo**: injeta arquivos faltantes a partir de templates padrão
- [x] **Simulação de build via IA**: prevê se `npm install && vite build` passaria
- [x] Scaffold armazenado no Project Brain como nós com status "scaffold"
- [x] Novos estágios: `scaffolding` / `scaffolded`
- [x] Pipeline atualizado: Arquitetura → Simulação → Validação Preventiva → **Scaffold** → Squad → Execução

---

## Fase 23 — Project Bootstrap Intelligence ✅

- [x] **`project-bootstrap-intelligence`** — valida buildabilidade estrutural ANTES do Foundation Scaffold
- [x] Detecção multi-stack: `react-vite`, `nextjs`, `node-api`, `python-fastapi`
- [x] Templates de bootstrap por stack com arquivos mínimos necessários
- [x] **Validação de entrypoints**: parse de index.html → verifica script referenciado
- [x] **Validação de scripts**: dev/build/preview com valores corretos
- [x] **Validação de dependências**: react, react-dom, vite, typescript
- [x] **Predição de build via IA**: simula `npm install && tsc --noEmit && vite build`
- [x] Auto-injeção de arquivos faltantes no Project Brain como nós `bootstrap`
- [x] Reparo emergencial se predição de build falhar
- [x] Novos estágios: `bootstrapping` / `bootstrapped`
- [x] Pipeline atualizado: Arquitetura → Simulação → Validação Preventiva → **Bootstrap Intelligence** → Scaffold → Squad → Execução
- [x] Aprovação intermediária removida — pipeline agora é estritamente sequencial

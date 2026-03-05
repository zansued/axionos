# SynkrAIOS — Roadmap de Implementação

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

- [x] Decompor pipeline monolítico em Edge Functions independentes por estágio
- [x] `pipeline-comprehension` (Layer 1 — 4 agentes de compreensão)
- [x] `pipeline-architecture` (Layer 2 — 4 agentes de arquitetura)
- [x] `pipeline-squad` (Formação de squad)
- [x] `pipeline-planning` (Layer 3 — Planejamento)
- [x] `pipeline-execution` (Layer 4 — Execução sequencial)
- [x] `pipeline-validation` (Layer 5 — Validação)
- [x] `pipeline-publish` (Layer 6 — Publicação GitHub)
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
- [x] Full-text search via `tsvector` + `search_vector`
- [x] CRUD helpers em `_shared/brain-helpers.ts`
- [x] Context generation para prompts AI (`generateBrainContext()`)
- [x] RLS policies para isolamento multi-tenant
- [x] Integração com Layer 2 (Architecture popula o Brain)
- [x] UI do Project Brain (`ProjectBrainPanel`)

---

## Fase 5 — Dependency Scheduler ✅

- [x] `buildExecutionDAG()` — constrói DAG a partir dos nós/edges do Brain
- [x] `computeWaves()` — topological sort (Kahn's algorithm) agrupando nós em waves
- [x] `getReadyNodes()` — nós com todas dependências satisfeitas
- [x] `applyLayerPriorities()` — prioridades implícitas por tipo de arquivo
- [x] `breakCycles()` — detecção e remoção de ciclos via DFS
- [x] `updateBrainEdgesFromImports()` — extração de imports do código gerado
- [x] `formatExecutionPlan()` — plano de execução legível para logs
- [x] Módulo compartilhado: `_shared/dependency-scheduler.ts`

---

## Fase 6 — Agent Swarm (Orchestrator + Workers) ✅

- [x] `pipeline-execution-orchestrator` — orquestra waves, despacha workers
- [x] `pipeline-execution-worker` — gera um único arquivo via cadeia de 3 agentes
- [x] Execução paralela via `Promise.all` com limite de `MAX_WORKERS = 6`
- [x] Workers invocados via `fetch()` ao endpoint da Edge Function
- [x] Comunicação via Project Brain (sem comunicação direta entre workers)
- [x] Retry automático (até 2x) com fallback para `project_errors`
- [x] Context injection com código das dependências diretas
- [x] Progress tracking em tempo real via `execution_progress` JSON
- [x] Memory extraction pós-execução
- [x] Registro no `config.toml` com `verify_jwt = false`

---

## Fase 7 — Execução Autônoma ✅

- [x] Subtasks executadas automaticamente (sem clique manual)
- [x] Retry automático com backoff exponencial
- [x] Barra de progresso em tempo real (Supabase Realtime)
- [x] Pipeline roda em background (`PipelineContext` global)
- [x] Paralelização de subtasks independentes
- [x] Notificação quando execução completa

---

## Fase 8 — Validação Inteligente ✅

- [x] QA Agent analisa cada artefato com 5 critérios (0-100)
- [x] Auto-aprovação (≥70), auto-retrabalho (50-69), auto-rejeição (<50)
- [x] Cross-review arquitetural
- [x] Escalação para revisão humana

---

## Fase 9 — Publish & Git ✅ (parcial)

- [x] Branch name automática
- [x] Commit messages semânticos
- [x] PR description automática
- [x] Build Health Report
- [ ] **Atomic Git commits via Tree API** (ainda usa file-by-file)
- [ ] Suporte a múltiplos repositórios por organização
- [ ] Webhook para PR merge → atualizar status

---

## Fase 10 — Geração Full-Stack ✅

- [x] Detecção automática de necessidade de backend
- [x] File types: schema, migration, edge_function, seed, supabase_client, auth_config
- [x] Prompts especializados para SQL, Edge Functions, Auth, RLS
- [x] Conexão com Supabase externo

---

## Fase 11 — Memória e Contexto ✅

- [x] Tabela `agent_memory`
- [x] Herança de contexto entre iniciativas
- [x] Knowledge base organizacional
- [x] Extração de memórias pós-execução

---

## Fase 12 — Observabilidade & Custos ✅

- [x] Dashboard de custo por iniciativa e agente
- [x] Tempo médio por estágio
- [x] Alertas de budget
- [ ] Exportação de relatórios (CSV/PDF)

---

## 🔜 Próximos Passos (Fases Pendentes)

### Fase 13 — Fix Loop Automático
- [ ] Quando validação falha, re-executar subtasks com contexto do erro
- [ ] Ciclo: Validation → Fix Agent → Re-validation (max 3 iterações)
- [ ] Escalação automática para humano após limite

### Fase 14 — Runtime Validation (Sandbox)
- [ ] Montar filesystem virtual com todos os arquivos gerados
- [ ] Executar `tsc --noEmit` para verificação de tipos
- [ ] Executar `vite build` para verificação de build
- [ ] Alimentar erros reais ao Fix Agent

### Fase 15 — Atomic Git Operations
- [ ] Migrar de GitHub Contents API para Git Tree API
- [ ] Um único commit atômico para todo o projeto
- [ ] Suporte a `.gitignore` e arquivos binários

### Fase 16 — Visualização do DAG
- [ ] Mostrar grafo de execução no `ProjectBrainPanel` (waves, dependências, status)
- [ ] Visualização interativa com nós clicáveis
- [ ] Status em tempo real durante execução

### Fase 17 — Smart Context Window (AST-based)
- [ ] Extrair type signatures via AST (não apenas truncar strings)
- [ ] 40% direct deps (full) + 20% indirect (types only) + 15% architecture + 15% memory + 10% file tree

### Fase 18 — Vector Embeddings (pgvector)
- [ ] Adicionar coluna de embedding aos `project_brain_nodes`
- [ ] Gerar embeddings durante criação de nós
- [ ] Similarity search para context injection inteligente

### Fase 19 — Incremental Re-execution
- [ ] Reject re-gera apenas arquivos afetados (não reset total)
- [ ] Diff-based rework mostrando o que mudou
- [ ] Versionamento de arquivos gerados

### Fase 20 — UX & Polish
- [ ] Templates de iniciativas pré-configurados
- [ ] Atalhos de teclado
- [ ] Internacionalização (pt-BR / en-US)

### Fase 21 — Governança Avançada
- [ ] Roles granulares por gate do pipeline
- [ ] Approval chains com múltiplos aprovadores
- [ ] Compliance e exportação de evidências

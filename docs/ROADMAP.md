# AxionOS v2 — Roadmap de Implementação

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

- [x] Decompor pipeline monolítico em 38+ Edge Functions independentes
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

- [x] Tabela `project_brain_nodes` com tipos: file, component, hook, service, api, table, type, schema, edge_function, page, context, util, domain_model, data_model, business_logic, api_spec, ui_structure, engineering_patterns
- [x] Tabela `project_brain_edges` com relações: imports, depends_on, calls_api, uses_component, implements_interface, exports, renders, stores_in_table, renders_component, calls_service, stores_entity
- [x] Tabela `project_decisions` com categorias, supersedes chain, status
- [x] Tabela `project_errors` com rastreamento de erros, root causes, prevention rules
- [x] Tabela `project_prevention_rules` com confidence scoring, scope, cascade
- [x] Full-text search via `tsvector` em nodes
- [x] Vector embeddings via `pgvector` (768-dim) com cosine similarity
- [x] Painel interativo `ProjectBrainPanel` com DAG, Self-Healing, Decisions
- [x] `generateBrainContext()` para injeção automática em prompts de IA

---

## Fase 5 — DAG Execution Engine ✅

- [x] `buildExecutionDAG()` — constrói DAG a partir de brain nodes/edges
- [x] `computeWaves()` — topological sort (Kahn's) agrupando por wave level
- [x] `getReadyNodes()` — retorna nós com dependências satisfeitas
- [x] `applyLayerPriorities()` — soft dependencies por tipo de arquivo
- [x] `breakCycles()` — DFS cycle detection e edge removal
- [x] `updateBrainEdgesFromImports()` — parse imports do código gerado
- [x] Orchestrator + Worker com 6 workers paralelos

---

## Fase 6 — Smart Context Window ✅

- [x] AST-like parser em `_shared/smart-context.ts`
- [x] Extração: imports, types, interfaces, function signatures, re-exports
- [x] Budget: 60% deps diretas, 40% outros (priorizados por tipo)
- [x] ~60-80% redução de tokens enviados à IA

---

## Fase 7 — Self-Healing ✅

- [x] Learning Agent gera prevention rules após cada fix
- [x] `upsertPreventionRule()` com confidence scoring incremental
- [x] Rules injetadas em prompts via `generateBrainContext()`
- [x] Self-Healing tab no `ProjectBrainPanel`
- [x] Scope initiative/organization-wide

---

## Fase 8 — Observability & Governance ✅

- [x] Custos per-initiative com tracking em `initiative_jobs`
- [x] SLA configs per-stage (`stage_sla_configs`)
- [x] Gate permissions per-org (`pipeline_gate_permissions`)
- [x] Usage limits com hard/soft limites
- [x] Audit logs com severity e categorias
- [x] Dashboard estratégico com KPIs

---

## Fase 9 — Architecture Simulation ✅

- [x] `pipeline-architecture-simulation` — túnel de vento técnico
- [x] Grafo dirigido de componentes (Frontend, Backend, APIs, DB)
- [x] Detecção de módulos desconectados, ciclos, conflitos de deps
- [x] AI prediction de falhas de build
- [x] Auto-reparo do plano de arquitetura

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
- [x] Validação via `information_schema`

---

## Fase 12 — AI Analysis Chain ✅

- [x] `ai-domain-model-analyzer` — entidades, atributos, relacionamentos via LLM
- [x] `ai-business-logic-synthesizer` — services, validações, workflows, access control
- [x] `autonomous-api-generator` — REST endpoints, RPCs, triggers, webhooks
- [x] Fallback CRUD para cada entidade sem cobertura

---

## Fase 13 — AxionOS v2 Modules ✅

### 13.1 — Supabase Data Model Generator ✅
- [x] `supabase-data-model-generator` Edge Function
- [x] Converte `domain_model` em schema relacional normalizado
- [x] Gera tabelas, foreign keys, indexes, RLS policies
- [x] Armazena `data_model` no Project Brain
- [x] Fallback para tabelas CRUD básicas
- [x] Pipeline stages: `generating_data_model` → `data_model_generated`

### 13.2 — Autonomous UI Generator ✅
- [x] `autonomous-ui-generator` Edge Function
- [x] Gera páginas CRUD, componentes, hooks, navegação, layouts
- [x] Baseado em `domain_model` + `business_logic` + `api_spec` + `data_model`
- [x] Framework: React + Vite + Tailwind + shadcn/ui
- [x] Armazena `ui_structure` no Project Brain
- [x] Cria brain nodes para cada página e componente gerado
- [x] Pipeline stages: `generating_ui` → `ui_generated`

### 13.3 — Adaptive Learning Engine ✅
- [x] `adaptive-learning-engine` Edge Function
- [x] Analisa `project_errors`, `initiative_jobs`, prevention rules existentes
- [x] Gera novas prevention rules com confidence scoring
- [x] Detecta dependency constraints e architectural patterns
- [x] Armazena `engineering_patterns` no Project Brain
- [x] Cross-project learning via `org_knowledge_base`
- [x] Pipeline stages: `learning_system` → `system_learned`

---

## 🔜 Próximos Passos

| # | Fase | Impacto | Complexidade | Descrição |
|---|------|---------|-------------|-----------|
| 1 | UI para novos estágios | 🟡 Médio | Médio | Visualizações de Data Model, UI Structure, Engineering Patterns |
| 2 | Approval chains | 🟡 Médio | Alto | Múltiplos aprovadores com quórum por gate |
| 3 | Webhook notifications | 🟠 Baixo | Baixo | Slack/Discord em gates e SLA breaches |
| 4 | Export enhancements | 🟠 Baixo | Baixo | Visualizações e relatórios agendados |

---

## Métricas do Projeto

- **38+ Edge Functions** independentes
- **22 estágios** de pipeline determinístico (v1: 20)
- **18+ agentes** especializados por role
- **12 shared helpers** reutilizáveis
- **28+ tabelas** no banco de dados
- **8 tipos de nó** no Project Brain
- **3 novos módulos v2**: Data Model Generator, UI Generator, Adaptive Learning

## SynkrAIOS — Plano de Evolução

> Última atualização: 2026-03-05

---

## ✅ Implementações Concluídas

### 1. Pipeline Decomposition
Pipeline monolítico decomposto em 15+ Edge Functions independentes, cada uma com responsabilidade única, compartilhando helpers via `_shared/`.

### 2. Project Brain
Sistema de conhecimento estruturado com 5 tabelas:
- `project_brain_nodes` — grafo de entidades do projeto
- `project_brain_edges` — relacionamentos entre entidades
- `project_decisions` — decisões arquiteturais versionadas
- `project_errors` — erros históricos com regras de prevenção
- `project_prevention_rules` — regras de self-healing com confidence scoring
- Full-text search via `tsvector`, RLS multi-tenant, context generation

### 3. Dependency Scheduler
DAG-based execution ordering:
- Topological sort via Kahn's algorithm
- Execução em waves (nós sem dependências pendentes executam juntos)
- Prioridades por camada (config → types → services → hooks → components → pages)
- Detecção e remoção de ciclos

### 4. Agent Swarm (Orchestrator + Workers)
Arquitetura distribuída:
- **Orchestrator**: constrói DAG, despacha workers em paralelo (max 6)
- **Worker**: gera um arquivo via cadeia de 3 agentes (Code Architect → Developer → Integration Agent)
- Comunicação via Project Brain
- Retry até 2x, fallback para `project_errors`

### 5. Visualização do DAG
- `BrainDAGGraph` — grafo interativo de nós/edges com status visual
- Integrado ao `ProjectBrainPanel` com abas: Graph, Decisions, Errors, Self-Healing

### 6. CI-Triggered Fix Swarm
- `pipeline-ci-webhook` — recebe webhook do GitHub CI
- `pipeline-fix-orchestrator` — agrupa erros por arquivo, despacha fix workers em paralelo, cria PR automático
- `CIFixSwarmStatus` — componente de monitoramento em tempo real

### 7. Self-Healing Codebase
- Learning Agent pós-fix gera prevention rules
- `upsertPreventionRule` — confidence score incremental
- Regras injetadas em todos os prompts via `generateBrainContext`
- Aba Self-Healing no ProjectBrainPanel

### 8. Architectural Drift Detection
- `pipeline-drift-detection` — detecção híbrida (rule-based + AI)
- Classifica arquivos por camada (pages → components → hooks → services → data)
- Detecta dependências invertidas, camadas ausentes, violações de fronteira
- Auto-trigger após Deep Validation
- `ArchitecturalDriftStatus` — UI com drift score e lista de violações
- Violations registradas em `project_errors` + prevention rules geradas

### 9. Atomic Git Commits (Tree API)
- `pipeline-publish` e `pipeline-fix-orchestrator` refatorados para usar Git Tree API
- Fluxo: Create Blobs (paralelo) → Build Tree → Single Commit → Update Ref
- Elimina N requests sequenciais por 1 commit atômico
- Blobs criados em batches paralelos de 5

---

### 10. Runtime Validation (tsc + vite build)
- `pipeline-runtime-validation` — push para branch temporária `validate/{id}`
- GitHub Actions executa: `npm install → tsc --noEmit → vite build`
- Resultados voltam via `pipeline-ci-webhook` existente
- Erros reais do compilador alimentam Fix Swarm
- `RuntimeValidationStatus` — UI com status do CI, erros e build log
- Disponível nos stages `validating` e `ready_to_publish`

### 11. Smart Context Window (AST-based)
- `_shared/smart-context.ts` — parser regex-based que extrai apenas a API pública de cada arquivo
- Extrai: imports, exports, interfaces, types, function signatures, component props
- `buildSmartContextWindow()` — constrói contexto compacto com priorização:
  - Dependências diretas: contexto completo (60% do budget)
  - Outros arquivos: apenas export signatures
  - Prioridade: types > hooks > services > components > pages
- Compressão de ~60-80% no volume de tokens enviados à IA
- Integrado ao `pipeline-execution-orchestrator` e `pipeline-execution-worker`
- Stats de compressão logados a cada 5 arquivos via `pipelineLog`

---

## 🔜 Próximos Passos (em ordem de prioridade)

| # | Fase | Impacto | Complexidade | Descrição |
|---|------|---------|-------------|-----------|
| 1 | Incremental Re-execution | 🟡 Médio | Médio | Re-executar apenas arquivos cujo content_hash mudou |
| 2 | Vector Embeddings (pgvector) | 🟠 Baixo | Alto | Busca semântica no Brain para contexto mais relevante |
| 3 | Templates de Iniciativas | 🟠 Baixo | Baixo | Modelos pré-prontos (SaaS, API, Landing Page) |

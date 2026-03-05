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

## 🔜 Próximos Passos (em ordem de prioridade)

| # | Fase | Impacto | Complexidade | Descrição |
|---|------|---------|-------------|-----------|
| 1 | Runtime Validation (tsc + vite) | 🔴 Alto | Alto | Validação real com compilador TypeScript (hoje é AI-simulated) |
| 2 | Smart Context Window | 🟡 Médio | Alto | Reduzir tokens via AST parsing — enviar apenas interfaces/exports relevantes |
| 3 | Incremental Re-execution | 🟡 Médio | Médio | Re-executar apenas arquivos cujo content_hash mudou |
| 4 | Vector Embeddings (pgvector) | 🟠 Baixo | Alto | Busca semântica no Brain para contexto mais relevante |
| 5 | Templates de Iniciativas | 🟠 Baixo | Baixo | Modelos pré-prontos (SaaS, API, Landing Page) |
| 6 | Templates de Iniciativas | 🟠 Baixo | Baixo | Modelos pré-prontos (SaaS, API, Landing Page) |

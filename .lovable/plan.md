## AxionOS — Plano de Evolução

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

### 12. Observabilidade & Custos
- Dashboard de custo por iniciativa e agente, alertas de budget, SLA configs

### 13. Memória e Contexto
- `agent_memory` com herança de contexto, knowledge base organizacional

### 14. Incremental Re-execution
- Engine com hash DJB2, propagação dirty em cascata, reuso de subtasks limpas

### 15. Vector Embeddings (pgvector)
- `embedding vector(768)`, `match_brain_nodes`, semantic search no Smart Context

### 16. Templates de Iniciativas
- 6 templates pré-prontos, pre-popula discovery_payload

### 17. UX & Polish
- Atalhos de teclado, i18n pt-BR/en-US, exportação CSV/PDF, dark/light refinements

### 18. Governança — Compliance & Evidências
- Auditoria com abas (Audit Trail, Governança, Reviews), exportação CSV/PDF

### 19. Adaptive Engineering System
- **Error Intelligence Engine** (`error-intelligence`): Análise de padrões de erro cross-project, geração automática de prevention rules, métricas de taxa de sucesso de build
- **Preventive Architecture Validator** (`pipeline-preventive-validation`): Validação pré-geração com checagem estrutural, compatibilidade de dependências e aplicação de regras aprendidas
- Integração com Build Self-Healing para aprendizado contínuo

### 20. Architecture Simulation Engine
- **`pipeline-architecture-simulation`** — simula a arquitetura antes da geração de código
- Converte o plano de arquitetura em grafo dirigido (módulos, serviços, dependências)
- **Validação estrutural**: entrypoints, módulos desconectados, dependências circulares
- **Validação de dependências**: conflitos npm, peer dependencies, compatibilidade de framework
- **Predição de falhas**: IA analisa o modelo e prediz problemas de build
- **Auto-reparo**: corrige automaticamente o plano de arquitetura antes da execução
- Resultado armazenado no Project Brain para contexto futuro
- Novo fluxo: Arquitetura → **Simulação** → Validação Preventiva → Squad → Execução

### 21. Foundation Scaffold Engine
- **`pipeline-foundation-scaffold`** — gera scaffold mínimo buildável antes da geração de features
- Template React+Vite: package.json, index.html, src/main.tsx, src/App.tsx, vite.config.ts, tsconfig.json
- Detecção automática de stack via discovery_payload
- **Validação de scaffold**: verifica scripts, imports, entrypoints e dependências
- **Auto-reparo**: injeta arquivos faltantes a partir de templates padrão
- **Simulação de build via IA**: prevê se `npm install && vite build` passaria
- Scaffold armazenado no Project Brain como nós com status "scaffold"
- Novo fluxo: Validação Preventiva → **Scaffold** → Squad → Execução

---

## 🔜 Próximos Passos

| # | Fase | Impacto | Complexidade | Descrição |
|---|------|---------|-------------|-----------|
| 1 | Approval chains | 🟡 Médio | Alto | Múltiplos aprovadores com quórum |
| 2 | Webhook notifications | 🟠 Baixo | Baixo | Slack/Discord em gates e SLA |

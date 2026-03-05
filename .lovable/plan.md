## SynkrAIOS — Plano de Evolução

> Última atualização: 2026-03-05

---

## ✅ Implementações Concluídas

### 1. Pipeline Decomposition
Pipeline monolítico decomposto em 15+ Edge Functions independentes, cada uma com responsabilidade única, compartilhando helpers via `_shared/`.

### 2. Project Brain
Sistema de conhecimento estruturado com 4 tabelas:
- `project_brain_nodes` — grafo de entidades do projeto
- `project_brain_edges` — relacionamentos entre entidades
- `project_decisions` — decisões arquiteturais versionadas
- `project_errors` — erros históricos com regras de prevenção
- Full-text search via `tsvector`, RLS multi-tenant, context generation

### 3. Dependency Scheduler
DAG-based execution ordering:
- Topological sort via Kahn's algorithm
- Execução em waves (nós sem dependências pendentes executam juntos)
- Prioridades por camada (config → types → services → hooks → components → pages)
- Detecção e remoção de ciclos
- Extração automática de imports do código gerado

### 4. Agent Swarm (Orchestrator + Workers)
Arquitetura distribuída:
- **Orchestrator**: constrói DAG, despacha workers em paralelo (max 6), monitora conclusão
- **Worker**: gera um arquivo via cadeia de 3 agentes (Code Architect → Developer → Integration Agent)
- Comunicação via Project Brain (sem comunicação direta entre workers)
- Retry até 2x, fallback para `project_errors`

---

## 🔜 Próximo Passo Recomendado

### Fix Loop Automático (Fase 13)

**Por quê:** Hoje, quando a validação falha, o processo para. O Fix Loop permitirá correção automática, fechando o ciclo Execution → Validation → Fix → Re-validation.

**Escopo:**
1. Criar `pipeline-fix-loop` Edge Function
2. Fix Agent recebe erros exatos + código que falhou + contexto do Brain
3. Re-gera apenas os arquivos que falharam
4. Re-valida (max 3 iterações)
5. Escala para humano se ainda falhar

---

## Passos Seguintes (em ordem de prioridade)

| # | Fase | Impacto | Complexidade |
|---|------|---------|-------------|
| 1 | Fix Loop Automático | 🔴 Alto | Médio |
| 2 | Visualização do DAG na UI | 🟡 Médio | Baixo |
| 3 | Runtime Validation (tsc + vite build) | 🔴 Alto | Alto |
| 4 | Atomic Git Commits (Tree API) | 🟡 Médio | Médio |
| 5 | Smart Context Window (AST-based) | 🟡 Médio | Alto |
| 6 | Vector Embeddings (pgvector) | 🟠 Baixo | Alto |
| 7 | Incremental Re-execution | 🟡 Médio | Médio |
| 8 | Templates de Iniciativas | 🟠 Baixo | Baixo |

# AxionOS — Pipeline Product Contracts

> Documentação operacional do produto. Cada fase responde:
> - O usuário entende o que está acontecendo?
> - O sistema mostra valor visível?
> - Essa etapa aproxima do resultado final?
>
> Last updated: 2026-03-06

---

## Visão Geral do Ciclo

```
  Idea → Discovery → Architecture → Engineering → Deploy
    │         │            │              │           │
    │         │            │              │           └─ Repositório validado e publicado
    │         │            │              └─ Código gerado, testado e reparado
    │         │            └─ Plano técnico completo com simulação
    │         └─ Oportunidade validada com mercado e estratégia
    └─ Captura da ideia bruta do usuário
```

---

## Fase 1: Idea

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Capturar a ideia do usuário e transformá-la em um brief estruturado |
| **Input esperado** | Texto livre descrevendo a ideia (+ opcionais: tipo de produto, mercado alvo, problema) |
| **Output gerado** | `initiative` criada com título, descrição, tipo, mercado, URL de referência |
| **Critérios de sucesso** | Iniciativa criada no banco com `stage_status = draft` |
| **Possíveis falhas** | Ideia vaga demais (sem contexto suficiente para Discovery) |
| **Ação do usuário** | "Iniciar Opportunity Discovery" ou "Pular para Compreensão" |

### Artefatos

| Artefato | Tipo | Descrição |
|----------|------|-----------|
| Initiative Record | DB | Registro da iniciativa com metadados de negócio |
| AI Blueprint (opcional) | JSON | Análise inicial gerada por IA com escopo, mercado e competidores |

### Regras de Controle

| Condição | Ação disponível |
|----------|----------------|
| `stage_status = draft` | Iniciar Discovery (ação primária) |
| Ideia tem URL de referência | Blueprint inclui scraping da referência |
| Sempre | Usuário pode editar título/descrição antes de avançar |

### Definition of Done

✅ Iniciativa existe no banco com título e descrição  
✅ Usuário pode visualizar e editar antes de prosseguir  
✅ Pelo menos um caminho de avanço disponível

---

## Fase 2: Discovery

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Validar a oportunidade de negócio e refinar a ideia com inteligência de mercado |
| **Input esperado** | Iniciativa com ideia bruta + metadados opcionais |
| **Output gerado** | Blueprint refinado: oportunidade, mercado, validação, estratégia de receita, PRD, arquitetura inicial |
| **Critérios de sucesso** | Todas as sub-etapas concluídas com artefatos gerados |
| **Possíveis falhas** | Timeout de IA, mercado não identificável, viabilidade muito baixa |
| **Ação do usuário** | Aprovar Discovery → avançar para Architecture |

### Sub-etapas (sequenciais, automáticas após a primeira)

| # | Sub-etapa | Edge Function | Output |
|---|-----------|---------------|--------|
| S02 | Opportunity Discovery | `opportunity-discovery-engine` | Score de oportunidade, TAM, análise competitiva |
| S03 | Market Signal Analysis | `market-signal-analyzer` | Viability index, timing, TAM/SAM/SOM |
| S04 | Product Validation | `product-validation-engine` | Análise 7 dimensões, go/no-go, personas |
| S05 | Revenue Strategy | `revenue-strategy-engine` | Modelo de precificação, tiers, projeções MRR/ARR |
| S06 | Compreensão (4 agentes) | `pipeline-comprehension` | PRD, requisitos, análise de mercado consolidada |

### Artefatos

| Artefato | Origem | Persistência |
|----------|--------|-------------|
| `opportunity_score.json` | S02 | `initiative_jobs.outputs` |
| `market_signals.json` | S03 | `initiative_jobs.outputs` |
| `product_validation.json` | S04 | `initiative_jobs.outputs` |
| `revenue_strategy.json` | S05 | `initiative_jobs.outputs` |
| `prd_content` | S06 | `initiatives.prd_content` |
| `market_analysis` | S06 | `initiatives.market_analysis` |
| `refined_idea` | S06 | `initiatives.refined_idea` |

### Regras de Controle

| Condição | Ação |
|----------|------|
| Sub-etapa concluída com sucesso | Próxima sub-etapa inicia automaticamente |
| Sub-etapa falhou | Mostrar qual falhou + botão "Re-executar" |
| Todas sub-etapas concluídas | Mostrar "Aprovar Discovery" (ação primária) |
| Usuário desaprova | "Solicitar Ajustes" → volta ao estágio anterior |
| Viabilidade muito baixa (S04) | Sugerir "Descartar Oportunidade" |

### Transição para Architecture

✅ Todas as 5 sub-etapas com outputs válidos  
✅ Usuário aprovou explicitamente  
✅ `initiatives.approved_at_discovery` preenchido  
✅ Status avança para `architecture_ready`

---

## Fase 3: Architecture

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Criar o plano técnico completo: arquitetura, simulação, validação preventiva, scaffold |
| **Input esperado** | PRD, requisitos, análise de mercado (outputs de Discovery) |
| **Output gerado** | Arquitetura validada, schema DB, scaffold de projeto, grafo de dependências |
| **Critérios de sucesso** | Arquitetura simulada e validada sem riscos críticos |
| **Possíveis falhas** | Dependências circulares, conflitos de pacotes, componentes desconectados |
| **Ação do usuário** | Aprovar em pontos-chave (pós-compreensão, pós-dependencies) |

### Sub-etapas

| # | Sub-etapa | Edge Function | Output |
|---|-----------|---------------|--------|
| S07 | Arquitetura (4 agentes) | `pipeline-architecture` | `architecture_content`, stack, componentes |
| S08 | Simulação de Arquitetura | `pipeline-architecture-simulation` | Grafo dirigido, detecção de problemas, auto-reparo |
| S09 | Validação Preventiva | `pipeline-preventive-validation` | Auditoria contra padrões de falha históricos |
| S10 | Bootstrap Intelligence | `project-bootstrap-intelligence` | Plano de bootstrap com verificações |
| S11 | Foundation Scaffold | `pipeline-foundation-scaffold` | Estrutura inicial de arquivos e configs |
| S12 | Module Graph Simulation | `pipeline-module-graph-simulation` | Grafo de módulos com resolução de dependências |
| S13 | Dependency Intelligence | `pipeline-dependency-intelligence` | Análise de compatibilidade de packages |

### Artefatos

| Artefato | Origem | Persistência |
|----------|--------|-------------|
| `architecture_content` | S07 | `initiatives.architecture_content` |
| `architecture.yaml` | S07 | `initiative_jobs.outputs` |
| `simulation_report.json` | S08 | `initiative_jobs.outputs` |
| `validation_report.json` | S09 | `initiative_jobs.outputs` |
| `bootstrap_plan.json` | S10 | `initiative_jobs.outputs` |
| `file_tree` | S11 | `story_subtasks` (scaffold files) |
| `module_graph.json` | S12 | `initiative_jobs.outputs` |
| `dependency_report.json` | S13 | `initiative_jobs.outputs` |

### Regras de Controle

| Condição | Ação |
|----------|------|
| Arquitetura gerada (S07) | "Simulação de Arquitetura" (automático) |
| Simulação OK (S08) | Validação Preventiva inicia automaticamente |
| Validação Preventiva OK (S09) | Bootstrap Intelligence inicia automaticamente |
| Bootstrap OK (S10) | "Gerar Foundation Scaffold" |
| Scaffold OK (S11) | "Module Graph Simulation" |
| Module Graph OK (S12) | "Dependency Intelligence" |
| Dependencies OK (S13) | "Schema Bootstrap" (transição para Engineering) |
| Qualquer sub-etapa falhou | Mostrar erro + "Re-executar" |

### Transição para Engineering

✅ Dependency Intelligence concluído com sucesso  
✅ Nenhum conflito crítico de dependências  
✅ Status avança para `bootstrapping_schema`

---

## Fase 4: Engineering

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Gerar todo o código do produto: schema, modelos, lógica, API, UI |
| **Input esperado** | Arquitetura validada, scaffold, grafo de dependências |
| **Output gerado** | Código completo: DB schema, domain models, business logic, API, UI |
| **Critérios de sucesso** | Todos os arquivos gerados e associados a subtasks |
| **Possíveis falhas** | Timeout de IA, schema inválido, lógica inconsistente |
| **Ação do usuário** | Cada sub-etapa avança automaticamente; aprovação no final |

### Sub-etapas

| # | Sub-etapa | Edge Function | Output |
|---|-----------|---------------|--------|
| S14 | Schema Bootstrap | `supabase-schema-bootstrap` | SQL de criação de tabelas |
| S15 | DB Provisioning | `supabase-provisioning-engine` | Execução do schema no banco |
| S16 | Domain Analysis | `ai-domain-model-analyzer` | Entidades, relações, atributos |
| S17 | Data Model Generation | `supabase-data-model-generator` | Tabelas, FK, indexes, RLS |
| S18 | Business Logic Synthesis | `ai-business-logic-synthesizer` | Serviços, workflows, validações |
| S19 | API Generation | `autonomous-api-generator` | REST/RPC endpoints, webhooks |
| S20 | UI Generation | `autonomous-ui-generator` | Páginas, componentes, hooks, navegação |

### Sub-etapas pós-geração (Squad → Planning → Execution)

| # | Sub-etapa | Edge Function | Output |
|---|-----------|---------------|--------|
| S21 | Squad Formation | `pipeline-squad` | Squad de agentes com roles |
| S22 | Planning | `generate-planning-content` | Stories, phases, subtasks com DAG |
| S23 | Execution (Agent Swarm) | `pipeline-execution-orchestrator` | Código gerado em paralelo (6 workers) |

### Artefatos

| Artefato | Origem | Persistência |
|----------|--------|-------------|
| `schema.sql` | S14 | `initiative_jobs.outputs` |
| `domain_model.json` | S16 | `project_brain_nodes` (tipo `domain_model`) |
| `data_model.json` | S17 | `project_brain_nodes` (tipo `data_model`) |
| `business_logic.json` | S18 | `project_brain_nodes` (tipo `business_logic`) |
| `api_spec.json` | S19 | `project_brain_nodes` (tipo `api_spec`) |
| `ui_structure.json` | S20 | `project_brain_nodes` (tipo `ui_structure`) |
| Código fonte (*.tsx, *.ts) | S23 | `story_subtasks.output` |

### Regras de Controle

| Condição | Ação |
|----------|------|
| Schema Bootstrap OK | DB Provisioning inicia |
| Cada sub-etapa OK | Próxima inicia automaticamente |
| UI Generated OK | "Aprovar UI → Squad" |
| Squad Formed | "Aprovar Squad" |
| Planning concluído | "Iniciar Execução (Agent Swarm)" |
| Execução em lotes | Auto-continua sem intervenção (time-budget) |
| Timeout na execução | Auto-retry automático |
| Execução completa | Avança automaticamente para Deploy |

### Transição para Deploy

✅ Todas as subtasks executadas  
✅ Arquivos de código gerados e persistidos  
✅ Status avança para `validating`

---

## Fase 5: Deploy

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Validar o código gerado, reparar erros e publicar no repositório Git |
| **Input esperado** | Código gerado (story_subtasks com outputs) |
| **Output gerado** | Repositório Git com código validado e compilável |
| **Critérios de sucesso** | Build passa (tsc + vite), código publicado no GitHub |
| **Possíveis falhas** | Erros de TypeScript, imports quebrados, build failure, token Git inválido |
| **Ação do usuário** | Um clique: "Iniciar Validação Completa" → tudo roda automaticamente |

### Sub-etapas (sequenciais, totalmente automáticas)

| # | Sub-etapa | Edge Function | O que faz | Output |
|---|-----------|---------------|-----------|--------|
| 1 | **Fix Loop (AI)** | `pipeline-validation` | IA analisa cada arquivo, detecta erros de lógica, imports faltantes, tipos incorretos. Corrige automaticamente até 3 iterações. | Lista de erros corrigidos, `overall_pass` |
| 2 | **Deep Static Analysis** | `pipeline-deep-validation` | Análise estática profunda: verifica imports reais, referências de tipos, consistência entre arquivos, presença de exports. | `passed` + relatório de inconsistências |
| 3 | **Drift Detection** | `pipeline-drift-detection` | Compara código gerado contra a arquitetura planejada. Detecta desvios: arquivos não previstos, padrões violados, dependências não declaradas. | `drift_score`, lista de violações |
| 4 | **Runtime Validation** | `pipeline-runtime-validation` | Push do código para branch `validate/*` no GitHub. GitHub Actions executa: `npm install → tsc --noEmit → vite build`. Resultados reais de compilador. | `ci_running` → resultado via webhook |
| 5 | **Build Repair** (se falhar) | `autonomous-build-repair` | Se o CI falhou, analisa logs de erro, gera patches, submete correções automaticamente. Pode rodar múltiplas iterações. | Código reparado + novo push |
| 6 | **Publicação** | `pipeline-publish` | Gera changelog, cria release, push final para branch principal com atomic commits via Tree API. | `repo_url`, versão, arquivos commitados |

### Artefatos

| Artefato | Origem | Persistência |
|----------|--------|-------------|
| `validation_report.json` | Fix Loop | `initiative_jobs.outputs` |
| `deep_validation_report.json` | Deep Static | `initiative_jobs.outputs` |
| `drift_report.json` | Drift Detection | `initiative_jobs.outputs` |
| `ci_result` | Runtime Validation | `initiatives.execution_progress` |
| `build_repair_patches` | Build Repair | `initiative_jobs.outputs` |
| `release_manifest` | Publicação | `initiative_jobs.outputs` com `repo_url` |

### Regras de Controle

| Condição | Ação |
|----------|------|
| `stage_status = validating` | **Um botão**: "Iniciar Validação Completa" |
| Fix Loop concluído com `overall_pass` | Deep Static inicia automaticamente |
| Deep Static `passed` | Drift Detection inicia automaticamente |
| Drift Detection `passed` | Runtime Validation inicia automaticamente |
| CI passa (webhook) | Status → `ready_to_publish` |
| CI falha (webhook) | Fix Swarm inicia automaticamente → Build Repair |
| Build Repair OK | Re-validação completa ou "Aprovar → Publicar" |
| Build Repair falhou | "Retry Build Repair" ou "Solicitar Ajustes" |
| `ready_to_publish` | **Um botão**: "Publicar no GitHub" |
| Publicação OK | Status → `published` |
| Qualquer sub-etapa falha | Mostrar qual falhou + erro + "Re-executar" |

### O que o usuário NÃO precisa fazer

- ❌ Escolher qual validação rodar (tudo é sequencial e automático)
- ❌ Entender a diferença entre Fix Loop, Deep Static e Runtime (o sistema cuida)
- ❌ Decidir a ordem das validações
- ❌ Re-executar manualmente após timeout (auto-retry)

### Definition of Done da Iniciativa

✅ Build passa no CI (tsc + vite)  
✅ Código publicado no repositório Git  
✅ `repo_url` disponível na interface  
✅ Todos os artefatos rastreáveis no pipeline  
✅ Custos registrados por estágio

---

## Fase 6: Growth (Secundária)

> **Status:** Implementada mas secundária para o produto-prova atual.
> O foco é fechar o ciclo Idea → Deploy primeiro.

| Sub-etapa | Propósito |
|-----------|-----------|
| Observability | Health score do sistema gerado |
| Product Analytics | Funis AARRR, métricas de uso |
| User Behavior | Fricção, drop-off, retenção |
| Growth Optimization | Experimentos prioritizados (ICE score) |
| Adaptive Learning | Regras de prevenção aprendidas |
| Product Evolution | Roadmap de features baseado em dados |
| Architecture Evolution | Evolução técnica do sistema |
| Portfolio Manager | Gestão multi-produto |
| System Evolution | Meta-learning da plataforma |

---

## Padrão de Visualização de Artefatos

Cada artefato no sistema segue este padrão:

1. **Nomeado** — nome claro que indica o conteúdo
2. **Clicável** — abre detalhes/conteúdo no Context Panel
3. **Origem clara** — mostra qual agente/estágio gerou
4. **Rastreável** — ligado a decisões (`project_decisions`), erros (`project_errors`) e regras de prevenção (`project_prevention_rules`)
5. **Versionado** — hash de conteúdo para deduplicação

### Centro de Evidência (Project Brain)

O Project Brain serve como centro de evidência visual:
- Grafo de dependências (DAG) interativo
- Nós tipados (file, domain_model, data_model, business_logic, api_spec, ui_structure)
- Arestas com relações semânticas (depends_on, imports, renders_component, calls_service, stores_entity)
- Busca semântica por embeddings (pgvector 768-dim)

---

## Princípios de Controle

### Quando aparece "Aprovar"
- Após conclusão de uma fase completa (Discovery, Architecture, UI, Squad, Planning)
- Sempre com botão primário destacado

### Quando aparece "Re-executar"
- Quando uma sub-etapa falhou
- Sempre disponível como ação secundária em estágios concluídos

### Quando bloqueia avanço
- Sub-etapa obrigatória não concluída
- Erro crítico sem reparo automático

### Quando permite avanço parcial
- Sub-etapas opcionais (ex: Adaptive Learning pode ser pulado)
- Aprovação manual override em casos de urgência

---

## Métricas de Sucesso do Pipeline

| Métrica | Target |
|---------|--------|
| Taxa de sucesso sem intervenção manual | > 80% |
| Taxa de build OK na primeira tentativa | > 90% |
| Retries médios por iniciativa | < 2 |
| Taxa de reparo automático com sucesso | > 70% |
| Custo por iniciativa | Rastreado e declinante |
| Tempo ideia → repositório validado | < 15 min |
| Clareza do progresso para o usuário | Feedback visual claro |

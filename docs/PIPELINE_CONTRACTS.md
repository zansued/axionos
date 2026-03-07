# AxionOS — Pipeline Product Contracts

> Documentação operacional do produto. Cada fase responde:
> - O usuário entende o que está acontecendo?
> - O sistema mostra valor visível?
> - Essa etapa aproxima do resultado final?
>
> **What changed (2026-03-07):** Added Meta-Agent interaction contracts (planned), extended safety principles with meta-agent constraints. Previous: Added Commercial Layer contracts, Learning Layer contracts, contract safety principles.
>
> Last updated: 2026-03-07

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
| S21 | Squad Formation | `pipeline-squad` | Squad de agentes com roles |
| S22 | Planning | `generate-planning-content` | Stories, phases, subtasks com DAG |
| S23 | Execution (Agent Swarm) | `pipeline-execution-orchestrator` | Código gerado em paralelo (6 workers) |

### Transição para Deploy

✅ Todas as subtasks executadas
✅ Arquivos de código gerados e persistidos
✅ Status avança para `validating`

---

## Fase 5: Deploy

### Contrato de Produto

| Campo | Valor |
|-------|-------|
| **Objetivo** | Validar o código gerado, reparar erros, publicar no repositório Git e fazer deploy |
| **Input esperado** | Código gerado (story_subtasks com outputs) |
| **Output gerado** | Repositório Git validado + deploy em produção |
| **Critérios de sucesso** | Build passa (tsc + vite), código publicado, deploy acessível |
| **Possíveis falhas** | Erros de TypeScript, build failure, token Git inválido, deploy failure |
| **Ação do usuário** | Um clique: "Iniciar Validação Completa" → tudo roda automaticamente |

### Deploy State Machine

```
  validating
      │
      ▼
  ready_to_publish
      │
      ▼
  published ──────► deploying
                        │
                   ┌────┴────┐
                   ▼         ▼
              deployed   deploy_failed
```

### Sub-etapas (sequenciais, totalmente automáticas)

| # | Sub-etapa | Edge Function | O que faz |
|---|-----------|---------------|-----------|
| 1 | Fix Loop (AI) | `pipeline-validation` | IA corrige erros até 3 iterações |
| 2 | Deep Static Analysis | `pipeline-deep-validation` | Imports, referências, consistência |
| 3 | Drift Detection | `pipeline-drift-detection` | Conformidade com arquitetura planejada |
| 4 | Runtime Validation | `pipeline-runtime-validation` | tsc + vite build real via CI |
| 5 | Build Repair (se falhar) | `autonomous-build-repair` | Auto-reparo com patches e retry |
| 6 | Publicação | `pipeline-publish` | Atomic commits via Tree API |
| 7 | Deploy | `pipeline-deploy` (planned) | Deploy automático para Vercel |

### Definition of Done da Iniciativa

✅ Build passa no CI (tsc + vite)
✅ Código publicado no repositório Git
✅ `repo_url` disponível na interface
✅ Deploy executado com sucesso
✅ `deploy_url` acessível e verificado
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

## Contratos da Camada Comercial (Sprint 11)

### Contrato: Verificação de Limites de Uso

**Ponto de aplicação:** Entrada do pipeline (`pipeline-bootstrap.ts`, `run-initiative-pipeline`)

| Campo | Valor |
|-------|-------|
| **Input** | `organization_id`, tipo de limite a verificar |
| **Output (sucesso)** | Pipeline prossegue normalmente |
| **Output (bloqueio)** | HTTP 402, `{ error: "USAGE_LIMIT_EXCEEDED", limit_type, current_value, max_value }` |
| **Persistência** | `audit_logs` com ação `usage_limit_blocked` |

### Limites verificados

| Limite | Fonte | Tipo |
|--------|-------|------|
| `max_initiatives_per_month` | `product_plans` | Contagem de iniciativas no período |
| `max_tokens_per_month` | `product_plans` | Soma de tokens usados |
| `max_deploys_per_month` | `product_plans` | Contagem de deploys com status `"success"` |
| `max_parallel_runs` | `product_plans` | Jobs com status `running` no momento |

### Contrato: Cálculo de Custo

| Campo | Valor |
|-------|-------|
| **Input** | `organization_id` |
| **Output** | `{ total_cost_usd, stage_breakdown[], model_breakdown[], estimated_monthly_cost }` |
| **Fonte de verdade** | `initiative_jobs.cost_usd` (não duplica com tokens) |
| **Isolamento** | Filtra jobs apenas de iniciativas da organização solicitante |

### Contrato: Dados de Workspace

| Campo | Valor |
|-------|-------|
| **Regra** | Todas as consultas agregadas devem filtrar por `organization_id` |
| **Proibição** | Consultas sem filtro de organização são proibidas |
| **Verificação** | Jobs são agregados via IDs de iniciativas da organização |

---

## Contratos da Camada de Learning (Sprint 12)

### Contrato: Prompt Strategy Metrics

| Campo | Valor |
|-------|-------|
| **Gerado por** | `prompt-outcome-analyzer` |
| **Schema** | `{ stage_name, prompt_signature, runs_count, success_rate, average_quality_score, average_cost, retry_rate }` |
| **Frequência** | Sob demanda (invocação explícita) |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Strategy Effectiveness Metrics

| Campo | Valor |
|-------|-------|
| **Gerado por** | `strategy-performance-engine` |
| **Schema** | `{ strategy_name, error_type, runs_count, success_rate, avg_resolution_time, avg_cost, error_recurrence_rate }` |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Predictive Error Patterns

| Campo | Valor |
|-------|-------|
| **Gerado por** | `predictive-error-engine` |
| **Schema** | `{ stage_name, error_signature, probability_score, observations_count, recommended_prevention_rule }` |
| **Threshold** | Se `probability_score > 0.7`, gera `prevention_rule_candidate` |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Learning Recommendations

| Campo | Valor |
|-------|-------|
| **Gerado por** | `learning-recommendation-engine` |
| **Schema** | `{ recommendation_type, target_component, description, confidence_score, supporting_evidence[], metrics_summary, expected_improvement }` |
| **Tipos** | `PROMPT_OPTIMIZATION`, `STRATEGY_RANKING_ADJUSTMENT`, `NEW_PREVENTION_RULE`, `PIPELINE_CONFIGURATION_HINT` |
| **Status** | Criadas como `pending`. Requerem revisão humana. |
| **Isolamento** | Filtrado por `organization_id` |

### Contrato: Repair Strategy Weights

| Campo | Valor |
|-------|-------|
| **Gerado por** | `repair-learning-engine` |
| **Schema** | `{ strategy_name, stage_name, current_weight, previous_weight, adjustment_reason, adjusted_at }` |
| **Fórmula** | `new_weight = previous_weight + success_factor − failure_penalty` |
| **Limites** | Pesos limitados a intervalo seguro, reversíveis |
| **Auditoria** | Cada ajuste gera evento `LEARNING_UPDATE` em `audit_logs` |
| **Isolamento** | Filtrado por `organization_id` |

---

## Princípios de Segurança de Contratos

### Estabilidade

- Contratos de stage IO devem permanecer estáveis
- Mudanças em contratos requerem versionamento explícito
- Learning não pode alterar a forma (shape) de contratos existentes
- Meta-Agents não podem modificar contratos diretamente (quando implementados)

### Isolamento

- Camadas comerciais consomem dados de observabilidade, não duplicam o kernel
- Acesso cross-tenant a contratos é **proibido**
- Todas as consultas agregadas devem incluir filtro `organization_id`
- Meta-Agents terão acesso somente leitura a dados de observabilidade e learning

### Separação de Responsabilidades

- Learning gera recomendações, não executa mudanças automaticamente
- Commercial verifica limites, não modifica comportamento do pipeline
- O kernel processa estágios, não conhece billing ou learning
- Meta-Agents (quando implementados) geram recomendações de alto nível, não mutam o sistema

### Auditabilidade

- Toda decisão de learning é registrada em `audit_logs`
- Todo bloqueio de uso é registrado em `audit_logs`
- Eventos rastreáveis: `LEARNING_UPDATE`, `USAGE_LIMIT_EXCEEDED`, `PIPELINE_EXECUTION`, `REPAIR_APPLIED`
- Meta-Agent recommendations (planejado) serão rastreáveis via `meta_agent_recommendations` table

---

## Interação com Meta-Agents (Planejado — Não Implementado)

> **Status:** 📋 Arquitetura planejada — Não implementado

Quando implementados, Meta-Agents interagirão com o pipeline **apenas** através de:

| Fonte | Tipo de Acesso | Propósito |
|-------|---------------|-----------|
| `initiative_observability` | Leitura | Métricas de estágio, durações, distribuição de falhas |
| `prompt_strategy_metrics` | Leitura | Tendências de performance de prompts |
| `strategy_effectiveness_metrics` | Leitura | Efetividade de estratégias de reparo |
| `predictive_error_patterns` | Leitura | Previsões de falhas |
| `learning_recommendations` | Leitura | Recomendações existentes |
| `repair_evidence` | Leitura | Histórico de resultados de reparo |
| `audit_logs` | Leitura | Histórico de eventos do sistema |

**Meta-Agents não modificam contratos de pipeline diretamente.** Suas saídas são recomendações estruturadas que passam por revisão humana antes de qualquer implementação.

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
- **Limite de uso excedido** (HTTP 402, `USAGE_LIMIT_EXCEEDED`)

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

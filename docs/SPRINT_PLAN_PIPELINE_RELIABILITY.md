# AxionOS — Sprint Plan: Initiative Pipeline Reliability

> **Objetivo:** Tornar o pipeline de iniciativas confiável e rastreável de ponta a ponta.  
> **Base:** [`INITIATIVES_PIPELINE_AUDIT.md`](./INITIATIVES_PIPELINE_AUDIT.md) + [`INITIATIVE_DELIVERY_PIPELINE_MAP.md`](./INITIATIVE_DELIVERY_PIPELINE_MAP.md)  
> **Critério de sucesso:** As 5 perguntas do operador respondíveis em <30s (ver Audit §Critério de pronto).  
> **Last Updated:** 2026-03-16

---

## Bloco A — P0: Destravar e dar visibilidade (Sprints 202–204)

### Sprint 202 — Robustez do Orquestrador
**Tema:** Nenhuma execução deve travar por slot preso.

| # | Item | Arquivo(s) | Checklist Audit |
|---|------|-----------|-----------------|
| 1 | Reagendar continuação explícita quando `batch_incomplete` (não depender de retry implícito do frontend) | `pipeline-execution-orchestrator` | C.2 |
| 2 | Separar contagem de paralelismo: jobs mestres vs workers (workers não devem consumir slot de orquestrador) | `usage-limit-enforcer.ts` | C.3 |
| 3 | Política unificada de cleanup de jobs órfãos — cron ou trigger no início de cada invocação | `usage-limit-enforcer.ts`, novo `job-cleanup` helper | C.4 |
| 4 | Migrar retry de validação do frontend para backend job orchestration | `pipeline-validation`, frontend | Hotspot documentado |

**Critério de aceite:** Rodar 3 iniciativas consecutivas sem `PARALLEL_LIMIT_EXCEEDED` e sem jobs presos por >5min.

---

### Sprint 203 — Rastreabilidade completa de Execution + Fix Loop
**Tema:** Saber exatamente o que está rodando, em qual wave, qual artefato e qual tentativa.

| # | Item | Arquivo(s) | Checklist Audit |
|---|------|-----------|-----------------|
| 1 | Persistir `wave_number`, `agent_role`, `retry_count` por node na `execution_progress` | `pipeline-execution-orchestrator`, `pipeline-execution-worker` | A.3 |
| 2 | Exibir histórico curto das últimas 5 subtasks concluídas/falhadas no painel | `ExecutionProgress.tsx` | A.4 |
| 3 | Persistir lista resumida de issues por categoria no Fix Loop | `pipeline-validation` | B.4 |
| 4 | Exibir tempo decorrido por artefato validado | `pipeline-validation`, `ExecutionProgress.tsx` | B.5 |
| 5 | Log estruturado do Fix Loop: entrada → análise → fix → reanalysis → resultado, com timestamps | `pipeline-validation` | B.1–B.3 |

**Critério de aceite:** Durante execução, a UI responde "em que subtask está?", "qual artefato está validando?", "quantas tentativas de fix?" sem abrir console.

---

### Sprint 204 — Consistência de estado da iniciativa
**Tema:** O estado macro nunca pode divergir do estado operacional.

| # | Item | Arquivo(s) | Checklist Audit |
|---|------|-----------|-----------------|
| 1 | Criar contrato canônico de transições de `stage_status` como enum/mapa com transições válidas | Novo `_shared/initiative-state-machine.ts` | E.1 |
| 2 | Toda função `pipeline-*` valida transição antes de alterar `stage_status` | `pipeline-helpers.ts` | E.1 |
| 3 | Reconciliador: function que detecta e corrige divergências entre `stage_status`, `execution_progress`, jobs e URLs | Novo `initiative-state-reconciler` ou helper | E.2, E.3 |
| 4 | Trigger de proteção: `stage_status` só avança para `published` se `repo_url` existir | `pipeline-publish` | D.5, E.2 |

**Critério de aceite:** Nenhuma iniciativa pode ter `stage_status = planning` com `execution_progress` completo e URLs preenchidas.

---

## Bloco B — P1: Publish/Deploy confiável (Sprints 205–206)

### Sprint 205 — Publish seguro
**Tema:** Publish só executa se todas as pré-condições estiverem satisfeitas.

| # | Item | Arquivo(s) | Checklist Audit |
|---|------|-----------|-----------------|
| 1 | Pre-flight: validar token GitHub antes de iniciar publish (chamada `GET /user` com o token) | `pipeline-publish` | D.1, D.2 |
| 2 | Pre-flight: validar presença de arquivos críticos (`index.html`, `vite.config.ts`, `package.json`, `tsconfig.json`) nos `agent_outputs` | `pipeline-publish` | D.3 |
| 3 | Bloquear dependências proibidas (`@vitejs/plugin-react`) já na etapa de **execução**, não só no publish | `pipeline-execution-worker`, `code-sanitizers.ts` | D.4 |
| 4 | Mensagem de erro estruturada: categoria + artefato faltante + ação sugerida | `pipeline-publish` | — |

**Critério de aceite:** Publish com token inválido falha em <2s com mensagem clara. Publish sem `index.html` falha antes de tocar no GitHub.

---

### Sprint 206 — Deploy confiável + Post-deploy
**Tema:** Deploy só dispara após publish confirmado, e verifica o resultado.

| # | Item | Arquivo(s) | Checklist Audit |
|---|------|-----------|-----------------|
| 1 | Guard: deploy rejeita se `repo_url` não existir ou publish não estiver `completed` | `initiative-deploy-engine` | D.5 |
| 2 | Post-deploy health check: verificar se URL responde 200 após deploy | `initiative-deploy-engine` ou `post-deploy-feedback` | — |
| 3 | Retry com backoff para deploy transiente (ex: Vercel/Netlify intermitente) | `initiative-deploy-engine` | — |
| 4 | Persistir resultado do deploy (success/failure + URL + timestamp) em `execution_progress` | `initiative-deploy-engine` | — |

**Critério de aceite:** Iniciativa completa mostra URL de deploy funcional. Deploy sem publish retorna erro claro.

---

## Bloco C — P2: Alinhamento estrutural e observabilidade (Sprints 207–209)

### Sprint 207 — Timeline unificada da iniciativa
**Tema:** Uma visão única e cronológica de tudo que aconteceu com uma iniciativa.

| # | Item | Arquivo(s) |
|---|------|-----------|
| 1 | Criar view/query que consolida `initiative_jobs` + `agent_outputs` + `action_audit_events` em timeline ordenada | Nova query ou view SQL |
| 2 | Componente `InitiativeTimeline.tsx` que exibe: stage → job → subtask → resultado, com timestamps e durações | Novo componente |
| 3 | Indicador visual de duração por estágio (barra de progresso ou sparkline) | `InitiativeTimeline.tsx` |

**Critério de aceite:** Para qualquer iniciativa, o operador vê uma timeline de eventos com <1s de carregamento.

---

### Sprint 208 — Dashboard de falhas por estágio
**Tema:** Entender padrões de falha agregados, não só por iniciativa.

| # | Item | Arquivo(s) |
|---|------|-----------|
| 1 | Query agregada: falhas por estágio × motivo × período | Nova query SQL |
| 2 | Componente `PipelineHealthDashboard.tsx` com breakdown visual | Novo componente |
| 3 | Top 5 motivos de falha por estágio (últimos 7 dias) | Dashboard |
| 4 | Alerta visual quando um estágio tem >30% de falha nos últimos 10 runs | Dashboard |

**Critério de aceite:** Operador identifica em <10s que "validation falhou 40x por timeout" sem consultar banco.

---

### Sprint 209 — Performance: Reduzir I/O do pipeline
**Tema:** Aplicar os achados da auditoria de performance (AI latency = 85-95% do tempo).

| # | Item | Arquivo(s) | Ref |
|---|------|-----------|-----|
| 1 | Merge de roles sequenciais (Architect + Developer) em prompt único onde possível | `pipeline-execution-worker` | Perf audit |
| 2 | Batch de writes de DB com `.in()` em vez de loops sequenciais | `pipeline-helpers.ts`, workers | Perf audit |
| 3 | Progress updates não-bloqueantes (fire-and-forget para logs/progress) | `pipeline-helpers.ts` | Perf audit |
| 4 | Métricas de duração por estágio persistidas para benchmark futuro | `pipeline-helpers.ts` | — |

**Critério de aceite:** Redução de ≥20% no tempo médio de execução de uma iniciativa completa (medir antes/depois com 3 runs).

---

## Resumo visual

```
Sprint 202  ████████  Robustez do Orquestrador (P0)
Sprint 203  ████████  Rastreabilidade Execution + Fix Loop (P0)
Sprint 204  ████████  Consistência de Estado (P0)
Sprint 205  ██████    Publish Seguro (P1)
Sprint 206  ██████    Deploy Confiável (P1)
Sprint 207  ████      Timeline Unificada (P2)
Sprint 208  ████      Dashboard de Falhas (P2)
Sprint 209  ████      Performance I/O (P2)
```

**Bloco A (P0):** Sprints 202–204 → Pipeline não trava, operador sabe o que está acontecendo.  
**Bloco B (P1):** Sprints 205–206 → Publish e deploy funcionam de primeira.  
**Bloco C (P2):** Sprints 207–209 → Visibilidade agregada e otimização.

---

## Dependências entre sprints

```
202 (Orquestrador) ─┐
                    ├─► 203 (Rastreabilidade) ─► 204 (Consistência) ─► 207 (Timeline)
                    │                                                      │
                    │                                                      ▼
                    │                                                   208 (Dashboard)
                    │
                    └─► 205 (Publish) ─► 206 (Deploy)
                    
209 (Performance) pode rodar em paralelo com qualquer sprint do Bloco B ou C.
```

---

## Métricas de sucesso do bloco completo

| Métrica | Hoje | Meta pós-Sprint 209 |
|---------|------|---------------------|
| Taxa de `PARALLEL_LIMIT_EXCEEDED` | Frequente | 0% |
| Jobs presos >5min | Comum | 0 |
| Publish com `Bad credentials` | ~4 ocorrências | 0 (pre-flight catch) |
| Publish sem arquivos críticos | ~3 ocorrências | 0 (pre-flight catch) |
| Operador responde "onde está?" em <30s | Não | Sim |
| Deploy funcional na primeira tentativa | Raro | >90% |
| Tempo médio idea→deploy | Desconhecido | Medido e rastreado |

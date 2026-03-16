# AxionOS — Sprint Plan: Initiative Pipeline Reliability

> **Objetivo:** Tornar o pipeline de iniciativas confiável e rastreável de ponta a ponta.  
> **Base:** [`INITIATIVES_PIPELINE_AUDIT.md`](./INITIATIVES_PIPELINE_AUDIT.md) + [`INITIATIVE_DELIVERY_PIPELINE_MAP.md`](./INITIATIVE_DELIVERY_PIPELINE_MAP.md)  
> **Critério de sucesso:** As 5 perguntas do operador respondíveis em <30s (ver Audit §Definition of Done).  
> **Last Updated:** 2026-03-16

---

## Bloco A — P0: Destravar e dar visibilidade (Sprints 202–204)

### Sprint 202 — Robustez e Idempotência do Orquestrador
**Tema:** Nenhuma execução deve travar por slot preso. Nenhuma continuação deve duplicar trabalho.

| # | Item | Arquivo(s) | Audit Ref |
|---|------|-----------|-----------|
| 1 | Reagendar continuação explícita quando `batch_incomplete` (não depender de retry implícito do frontend) | `pipeline-execution-orchestrator` | C.2 |
| 2 | Separar contagem de paralelismo: jobs mestres vs workers (workers não devem consumir slot de orquestrador) | `usage-limit-enforcer.ts` | C.3 |
| 3 | Política unificada de cleanup de jobs órfãos — cron ou trigger no início de cada invocação | `usage-limit-enforcer.ts`, novo `job-cleanup` helper | C.4 |
| 4 | Migrar retry de validação do frontend para backend job orchestration | `pipeline-validation`, frontend | Hotspot |
| 5 | **Idempotência do re-agendamento:** guard contra continuação duplicada (lock por `initiative_id`), worker não reprocessa wave já concluída, no máximo 1 job mestre ativo por iniciativa | `pipeline-execution-orchestrator`, `pipeline-execution-worker` | Novo |

**Critério de aceite:**
- Rodar 3 iniciativas consecutivas sem `PARALLEL_LIMIT_EXCEEDED` e sem jobs presos por >5min.
- Simular pausa + re-invocação dupla: apenas uma continuação executa.
- Query de verificação:
```sql
-- No duplicate master jobs per initiative
SELECT initiative_id, count(*) FROM initiative_jobs
WHERE stage = 'execution_orchestrator' AND status = 'running'
GROUP BY initiative_id HAVING count(*) > 1;
-- Expected: 0 rows
```

---

### Sprint 203 — Rastreabilidade completa de Execution + Fix Loop
**Tema:** Saber exatamente o que está rodando, com IDs canônicos para correlação automática.

| # | Item | Arquivo(s) | Audit Ref |
|---|------|-----------|-----------|
| 1 | Persistir `wave_number`, `agent_role`, `retry_count` por node na `execution_progress` | `pipeline-execution-orchestrator`, `pipeline-execution-worker` | A.3 |
| 2 | **IDs canônicos de rastreamento:** todo evento de execução deve carregar `trace_id` (por run), `subtask_id`, `attempt_id` (por tentativa de geração/fix) | `pipeline-execution-worker`, `pipeline-validation`, `pipeline-helpers.ts` | Novo |
| 3 | Exibir histórico curto das últimas 5 subtasks concluídas/falhadas no painel | `ExecutionProgress.tsx` | A.4 |
| 4 | Persistir lista resumida de issues por categoria no Fix Loop | `pipeline-validation` | B.4 |
| 5 | Exibir tempo decorrido por artefato validado | `pipeline-validation`, `ExecutionProgress.tsx` | B.5 |
| 6 | Log estruturado do Fix Loop: entrada → análise → fix → reanalysis → resultado, com timestamps e `attempt_id` | `pipeline-validation` | B.1–B.3 |

**Critério de aceite:**
- Durante execução, a UI responde "em que subtask está?", "qual artefato está validando?", "quantas tentativas de fix?" sem abrir console.
- Todo registro em `initiative_jobs` e `agent_outputs` possui `trace_id` correlacionável.
- Query de verificação:
```sql
-- All recent execution jobs have trace metadata
SELECT count(*) FROM initiative_jobs
WHERE stage IN ('execution_worker', 'validation')
AND created_at > now() - interval '1 day'
AND (metadata->>'trace_id') IS NULL;
-- Expected: 0
```

---

### Sprint 204 — Consistência de estado + Base de Timeline consolidada
**Tema:** O estado macro nunca pode divergir do estado operacional. Base de dados para timeline já disponível.

| # | Item | Arquivo(s) | Audit Ref |
|---|------|-----------|-----------|
| 1 | Criar contrato canônico de transições de `stage_status` como enum/mapa com transições válidas | Novo `_shared/initiative-state-machine.ts` | E.1 |
| 2 | Toda função `pipeline-*` valida transição antes de alterar `stage_status` | `pipeline-helpers.ts` | E.1 |
| 3 | Reconciliador: function que detecta e corrige divergências entre `stage_status`, `execution_progress`, jobs e URLs | Novo helper ou edge function | E.2, E.3 |
| 4 | Trigger de proteção: `stage_status` só avança para `published` se `repo_url` existir | `pipeline-publish` | D.5, E.2 |
| 5 | **Timeline consolidada (base):** criar SQL view `initiative_timeline_v` que une `initiative_jobs` + `agent_outputs` + `action_audit_events` em timeline ordenada por timestamp | Nova view SQL | Antecipado de 207 |

**Critério de aceite:**
- Nenhuma iniciativa pode ter `stage_status = planning` com `execution_progress` completo e URLs preenchidas.
- `SELECT * FROM initiative_timeline_v WHERE initiative_id = $1` retorna timeline ordenada com eventos de todos os estágios.

---

## Bloco B — P1: Publish/Deploy confiável (Sprints 205–206)

### Sprint 205 — Publish seguro
**Tema:** Publish só executa se todas as pré-condições estiverem satisfeitas.

| # | Item | Arquivo(s) | Audit Ref |
|---|------|-----------|-----------|
| 1 | Pre-flight: validar token GitHub antes de iniciar publish (`GET /user` com o token) | `pipeline-publish` | D.1, D.2 |
| 2 | Pre-flight: validar presença de arquivos críticos (`index.html`, `vite.config.ts`, `package.json`, `tsconfig.json`) nos `agent_outputs` | `pipeline-publish` | D.3 |
| 3 | Bloquear dependências proibidas (`@vitejs/plugin-react`) já na etapa de **execução**, não só no publish | `pipeline-execution-worker`, `code-sanitizers.ts` | D.4 |
| 4 | Mensagem de erro estruturada: categoria + artefato faltante + ação sugerida | `pipeline-publish` | — |

**Critério de aceite:** Publish com token inválido falha em <2s com mensagem clara. Publish sem `index.html` falha antes de tocar no GitHub.

---

### Sprint 206 — Deploy confiável + Contrato canônico de "publish confirmado"
**Tema:** Deploy só dispara após publish confirmado de forma canônica, e verifica o resultado.

#### Contrato canônico: Publish Confirmado

Um publish é considerado **confirmado** quando ALL of:

| Condition | Verification |
|-----------|-------------|
| Repository exists on GitHub | `repo_url` is set AND `GET /repos/{owner}/{repo}` returns 200 |
| Target branch is synchronized | `last_commit_sha` is persisted and matches remote HEAD |
| Critical files are committed | `publish_manifest` contains `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json` |
| Artifact manifest is persisted | `execution_progress.publish_manifest` exists with file list + commit SHA |
| Stage status is consistent | `stage_status` = `published` or `ready_to_deploy` |

| # | Item | Arquivo(s) | Audit Ref |
|---|------|-----------|-----------|
| 1 | Implementar contrato de publish confirmado: persistir `publish_manifest` com file list, commit SHA, repo URL, branch, timestamp | `pipeline-publish` | Novo |
| 2 | Guard: deploy rejeita se publish manifest não existir ou falhar validação contra contrato acima | `initiative-deploy-engine` | D.5 |
| 3 | Post-deploy health check: verificar se URL responde 200 após deploy (com retry 3x, backoff 5s/15s/30s) | `initiative-deploy-engine` ou `post-deploy-feedback` | — |
| 4 | Persistir resultado do deploy (success/failure + URL + timestamp + health check result) em `execution_progress` | `initiative-deploy-engine` | — |

**Critério de aceite:**
- Iniciativa completa mostra URL de deploy funcional.
- Deploy sem publish manifest retorna 400 com mensagem: `"Publish not confirmed. Missing: [specific items]"`.
- Deploy com publish manifest que falha health check é marcado como `deploy_unhealthy` (não `completed`).

---

## Bloco C — P2: Alinhamento estrutural e observabilidade (Sprints 207–209)

### Sprint 207 — Timeline visual + Dashboard de falhas
**Tema:** Observabilidade completa para operador e gestão.

> **Nota:** A SQL view de timeline (`initiative_timeline_v`) já foi criada no Sprint 204. Este sprint foca na camada visual.

| # | Item | Arquivo(s) |
|---|------|-----------|
| 1 | Componente `InitiativeTimeline.tsx` que consome `initiative_timeline_v`: stage → job → subtask → resultado, com timestamps e durações | Novo componente |
| 2 | Indicador visual de duração por estágio (barra de progresso ou sparkline) | `InitiativeTimeline.tsx` |
| 3 | Query agregada: falhas por estágio × motivo × período | Nova query SQL |
| 4 | Componente `PipelineHealthDashboard.tsx` com breakdown visual | Novo componente |
| 5 | Top 5 motivos de falha por estágio (últimos 7 dias) | Dashboard |
| 6 | Alerta visual quando um estágio tem >30% de falha nos últimos 10 runs | Dashboard |

**Critério de aceite:**
- Para qualquer iniciativa, o operador vê uma timeline de eventos com <1s de carregamento.
- Operador identifica em <10s que "validation falhou 40x por timeout" sem consultar banco.

---

### Sprint 208 — Performance: Reduzir I/O do pipeline
**Tema:** Aplicar os achados da auditoria de performance (AI latency = 85-95% do tempo).

| # | Item | Arquivo(s) | Ref |
|---|------|-----------|-----|
| 1 | Merge de roles sequenciais (Architect + Developer) em prompt único onde possível | `pipeline-execution-worker` | Perf audit |
| 2 | Batch de writes de DB com `.in()` em vez de loops sequenciais | `pipeline-helpers.ts`, workers | Perf audit |
| 3 | Progress updates não-bloqueantes (fire-and-forget para logs/progress) | `pipeline-helpers.ts` | Perf audit |
| 4 | Métricas de duração por estágio persistidas para benchmark futuro | `pipeline-helpers.ts` | — |

**Critério de aceite:** Redução de ≥20% no tempo médio de execução. Medido com **≥5 runs** da mesma classe de iniciativa (mesmo perfil de complexidade — ex: "CRUD app com 3 entidades") antes e depois.

**Nota metodológica:** 3 runs são insuficientes para pipeline com IA — variabilidade do modelo pode mascarar ganhos reais. Usar ≥5 runs com perfil de complexidade controlado. Reportar média, mediana e P95.

---

## Resumo visual

```
Sprint 202  ████████  Robustez + Idempotência do Orquestrador (P0)
Sprint 203  ████████  Rastreabilidade + IDs Canônicos (P0)
Sprint 204  ████████  Consistência de Estado + Timeline Base (P0)
Sprint 205  ██████    Publish Seguro (P1)
Sprint 206  ██████    Deploy + Contrato Publish Confirmado (P1)
Sprint 207  ████      Timeline Visual + Dashboard de Falhas (P2)
Sprint 208  ████      Performance I/O (P2)
```

**Bloco A (P0):** Sprints 202–204 → Pipeline não trava, operador sabe o que está acontecendo, timeline base pronta.  
**Bloco B (P1):** Sprints 205–206 → Publish e deploy funcionam de primeira com contratos canônicos.  
**Bloco C (P2):** Sprints 207–208 → Visibilidade agregada e otimização.

---

## Dependências entre sprints

```
202 (Orquestrador + Idempotência) ─┐
                                    ├─► 203 (Rastreabilidade + IDs) ─► 204 (Estado + Timeline Base)
                                    │                                        │
                                    │                                   ┌────┴────┐
                                    │                                   ▼         ▼
                                    │                              207 (UI)    205 (Publish)
                                    │                                   │         │
                                    │                                   ▼         ▼
                                    │                                         206 (Deploy)
                                    │
208 (Performance) pode rodar em paralelo com qualquer sprint do Bloco B ou C.
```

---

## Métricas de sucesso do bloco completo

| Métrica | Hoje | Meta pós-Sprint 208 |
|---------|------|---------------------|
| Taxa de `PARALLEL_LIMIT_EXCEEDED` | Frequente | 0% |
| Jobs presos >5min | Comum | 0 |
| Jobs mestres duplicados por iniciativa | Possível | 0 |
| Publish com `Bad credentials` | ~4 ocorrências | 0 (pre-flight catch) |
| Publish sem arquivos críticos | ~3 ocorrências | 0 (pre-flight catch) |
| Deploy sem publish confirmado | Possível | 0 (contract guard) |
| Operador responde "onde está?" em <30s | Não | Sim |
| Deploy funcional na primeira tentativa | Raro | >90% |
| Eventos sem `trace_id` | Maioria | 0 |
| Tempo médio idea→deploy | Desconhecido | Medido (média, mediana, P95) |

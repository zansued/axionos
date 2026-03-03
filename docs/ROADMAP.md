# AxionOS — Roadmap de Implementação

> Checklist ordenado do que falta para completar o AIOS.  
> Marque com `[x]` conforme for concluído.

---

## Fase 1 — Migrar para Lovable AI Gateway (eliminar DeepSeek)

- [ ] Migrar `execute-subtask` para usar Lovable AI Gateway (`google/gemini-2.5-flash`)
- [ ] Migrar `run-initiative-pipeline` (stages discovery, planning, execution, validation)
- [ ] Migrar `generate-agents`, `generate-stories`, `organize-stories`
- [ ] Migrar `generate-planning-content`
- [ ] Migrar `analyze-artifact` e `rework-artifact`
- [ ] Remover dependência da secret `DEEPSEEK_API_KEY`

---

## Fase 2 — Chain-of-Agents (Colaboração entre Agentes)

- [ ] Criar tabela `agent_messages` (from_agent, to_agent, initiative_id, stage, content, created_at)
- [ ] Implementar padrão sequencial no estágio **Execution**:
  1. Architect analisa story e define estrutura técnica
  2. Dev recebe output do Architect e gera código
  3. QA recebe código do Dev e faz review
  4. Dev recebe feedback do QA e corrige (loop até aprovação)
- [ ] Registrar cada troca como `agent_message` para rastreabilidade
- [ ] Exibir timeline de conversação entre agentes na UI (InitiativeDetail)

---

## Fase 3 — Execução Autônoma Real

- [ ] Subtasks executadas automaticamente em sequência (sem clique manual por subtask)
- [ ] Paralelização: subtasks independentes executam em paralelo
- [ ] Retry automático com backoff em caso de falha
- [ ] Barra de progresso em tempo real (Realtime via Supabase)
- [ ] Notificação quando execução completa (toast + badge no menu)

---

## Fase 4 — Validação Inteligente

- [ ] QA Agent analisa cada artefato de código automaticamente
- [ ] Checklist automático: lint, type-check, coverage estimado
- [ ] Cross-review: Architect valida decisões arquiteturais do código gerado
- [ ] Score de qualidade por artefato (0-100)
- [ ] Gate automático: só avança para Publish se score > threshold

---

## Fase 5 — Publish & Git Avançado

- [ ] Geração automática de branch name baseada na initiative
- [ ] Commit messages semânticos gerados pelo agente
- [ ] PR description gerada automaticamente com resumo do que foi feito
- [ ] Suporte a múltiplos repositórios por organização
- [ ] Webhook para notificar quando PR é mergeado → atualizar status

---

## Fase 6 — Memória e Contexto Compartilhado

- [ ] Criar tabela `agent_memory` (agent_id, key, value, scope, ttl)
- [ ] Agentes herdam contexto de iniciativas anteriores da mesma org
- [ ] Knowledge base organizacional: decisões arquiteturais (ADRs) alimentam futuros agents
- [ ] Padrões de código da org influenciam output do Dev agent

---

## Fase 7 — Observabilidade & Custos

- [ ] Dashboard de custo por iniciativa (tokens + USD)
- [ ] Dashboard de custo por agente
- [ ] Tempo médio por estágio do pipeline
- [ ] Alertas quando budget mensal atinge threshold
- [ ] Exportação de relatórios (CSV/PDF)

---

## Fase 8 — UX & Polish

- [ ] Onboarding guiado para novos usuários
- [ ] Templates de iniciativas pré-configurados
- [ ] Dark/Light mode toggle
- [ ] Responsividade mobile completa
- [ ] Atalhos de teclado (K para Kanban, I para Initiatives, etc.)
- [ ] Internacionalização (pt-BR / en-US)

---

## Fase 9 — Governança Avançada

- [ ] Roles granulares: quem pode aprovar cada gate do pipeline
- [ ] Approval chain: múltiplos aprovadores por estágio
- [ ] SLA por estágio: alertas se ficou parado mais de X horas
- [ ] Audit trail completo com diff de cada mudança
- [ ] Compliance: exportação de evidências de governança

---

## Status Atual (o que já temos ✅)

- [x] Autenticação e multi-org
- [x] CRUD de Agentes com roles tipados
- [x] Formação de Squads (manual + automática via AI)
- [x] Pipeline de 6 estágios com gates humanos
- [x] Discovery inteligente (análise de mercado, viabilidade, MVP)
- [x] Planning com geração de PRD e arquitetura
- [x] Geração de Stories e Subtasks via AI
- [x] Execução de subtasks individuais via AI (DeepSeek)
- [x] Artefatos versionados com review humano
- [x] ADRs automáticos para decisões arquiteturais
- [x] Validação de artefatos
- [x] Publish com criação de PR no GitHub
- [x] Kanban board com drag-and-drop
- [x] Audit logs
- [x] Observabilidade básica
- [x] Billing e controle de uso

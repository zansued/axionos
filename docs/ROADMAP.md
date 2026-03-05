# AxionOS — Roadmap de Implementação

> Checklist ordenado do que falta para completar o AIOS.  
> Marque com `[x]` conforme for concluído.

---

## Fase 1 — Migrar para Lovable AI Gateway (eliminar DeepSeek)

- [x] Migrar `execute-subtask` para usar Lovable AI Gateway (`google/gemini-2.5-flash`)
- [x] Migrar `run-initiative-pipeline` (stages discovery, planning, execution, validation)
- [x] Migrar `generate-agents`, `generate-stories`, `organize-stories`
- [x] Migrar `generate-planning-content`
- [x] Migrar `analyze-artifact` e `rework-artifact`
- [x] Remover dependência da secret `DEEPSEEK_API_KEY`

---

## Fase 2 — Chain-of-Agents (Colaboração entre Agentes)

- [x] Criar tabela `agent_messages` (from_agent, to_agent, initiative_id, stage, content, created_at)
- [x] Implementar padrão sequencial no estágio **Execution**:
  1. Architect analisa story e define estrutura técnica
  2. Dev recebe output do Architect e gera código
  3. QA recebe código do Dev e faz review
  4. Dev recebe feedback do QA e corrige (loop até aprovação)
- [x] Registrar cada troca como `agent_message` para rastreabilidade
- [x] Exibir timeline de conversação entre agentes na UI (InitiativeDetail)

---

## Fase 3 — Execução Autônoma Real

- [x] Subtasks executadas automaticamente em sequência (sem clique manual por subtask)
- [x] Retry automático com backoff exponencial em caso de falha (até 3 tentativas)
- [x] Barra de progresso em tempo real (Realtime via Supabase)
- [x] Progresso salvo incrementalmente (resume em caso de timeout)
- [x] Pipeline roda em background (PipelineContext global — não para ao navegar)
- [x] Paralelização: subtasks independentes executam em paralelo
- [x] Notificação quando execução completa (toast + badge no menu)

---

## Fase 4 — Validação Inteligente

- [x] QA Agent analisa cada artefato de código automaticamente
- [x] Score de qualidade por artefato (0-100) com 5 critérios
- [x] Gate automático: só avança para Publish se todos artefatos score >= 70
- [x] Auto-aprovação: artefatos com score >= 70 aprovados automaticamente
- [x] Auto-retrabalho: artefatos com score 50-69 retrabalhados e re-validados (até 2x)
- [x] Auto-rejeição: artefatos com score < 50 rejeitados automaticamente
- [x] Escalação para revisão humana quando retrabalho excede limite
- [x] Cross-review: Architect valida decisões arquiteturais do código gerado

---

## Fase 5 — Publish & Git Avançado

- [x] Geração automática de branch name baseada na initiative
- [x] Commit messages semânticos gerados pelo agente
- [x] PR description gerada automaticamente com resumo do que foi feito
- [ ] Suporte a múltiplos repositórios por organização
- [ ] Webhook para notificar quando PR é mergeado → atualizar status

---

## Fase 6 — Geração Full-Stack (Frontend + Backend)

- [x] Planning detecta necessidade de backend automaticamente
- [x] Novos `file_type` para backend: `schema`, `migration`, `edge_function`, `seed`, `supabase_client`, `auth_config`
- [x] Prompts especializados para gerar SQL, Edge Functions, Auth, RLS
- [x] Geração de `.env.example` e `src/lib/supabase.ts` determinísticos
- [x] Story automática "Backend Setup" quando projeto precisa de persistência
- [x] UI de Code Explorer mostra ícones e badges para arquivos de backend
- [x] Conexão com Supabase externo (tabela `supabase_connections`, UI em Conexões)
- [x] Prefixo obrigatório em tabelas geradas (`CREATE TABLE IF NOT EXISTS prefixo_tabela`)
- [x] Integrar `supabase_connections` no pipeline: sistemas gerados usam conexão cadastrada
- [x] Botão "Testar Conexão" que valida URL e Anon Key antes de salvar
- [x] Gerar README.md automático com instruções de setup do Supabase

---

## Fase 7 — Memória e Contexto Compartilhado

- [x] Criar tabela `agent_memory` (agent_id, key, value, scope, ttl)
- [x] Agentes herdam contexto de iniciativas anteriores da mesma org
- [x] Knowledge base organizacional: decisões arquiteturais (ADRs) alimentam futuros agents
- [x] Padrões de código da org influenciam output do Dev agent

---

## Fase 8 — Observabilidade & Custos

- [x] Dashboard de custo por iniciativa (tokens + USD)
- [x] Dashboard de custo por agente
- [x] Tempo médio por estágio do pipeline
- [x] Alertas quando budget mensal atinge threshold
- [ ] Exportação de relatórios (CSV/PDF)

---

## Fase 9 — UX & Polish

- [ ] Onboarding guiado para novos usuários
- [ ] Templates de iniciativas pré-configurados
- [ ] Dark/Light mode toggle
- [ ] Responsividade mobile completa
- [ ] Atalhos de teclado (K para Kanban, I para Initiatives, etc.)
- [ ] Internacionalização (pt-BR / en-US)

---

## Fase 10 — Governança Avançada

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
- [x] Execução de subtasks via AI (Lovable AI Gateway)
- [x] Artefatos versionados com review humano
- [x] ADRs automáticos para decisões arquiteturais
- [x] Validação de artefatos com auto-aprovação/retrabalho/rejeição
- [x] Publish com criação de PR no GitHub
- [x] Kanban board com drag-and-drop
- [x] Audit logs
- [x] Observabilidade básica
- [x] Billing e controle de uso
- [x] Geração Full-Stack (Frontend + Backend com Supabase)
- [x] Conexões com Supabase externo
- [x] Pipeline global em background (PipelineContext)
- [x] Deploy automático via Agente Revisor

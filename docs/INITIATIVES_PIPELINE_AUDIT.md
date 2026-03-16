# Auditoria do Pipeline de Iniciativas

## Objetivo canônico
Garantir a promessa principal do AxionOS: **Idea → Discovery → Architecture → Engineering → Validation → Deploy → Delivered Software** com rastreabilidade suficiente para explicar **o que está rodando, onde falhou e por quê**.

## Diagnóstico objetivo encontrado

### 1) Gargalo crítico atual — limite de paralelismo
**Problema real confirmado:** quando o `pipeline-execution-orchestrator` pausa por orçamento de tempo, o job mestre podia ficar em `running` mesmo com a invocação já encerrada. Isso consome slot paralelo indevidamente e empurra o sistema para `PARALLEL_LIMIT_EXCEEDED`.

**Evidência encontrada**
- `execution_orchestrator` com falhas por cleanup de job preso.
- `execution_worker` com falhas por cleanup de runtime estourado.
- O branch `batch_incomplete` do orquestrador não liberava o job mestre.

### 2) Falhas recorrentes no Fix Loop
**Principais causas observadas na base**
- `validation` falhou **40x** nos últimos registros.
- **24x**: `Execução interrompida antes de finalizar (timeout/redeploy)`.
- **13x**: `Superseded by new validation run.`
- **10x**: auto-cleanup antigo por runtime curto demais.
- **2x**: bug anterior `safeSubtaskIds is not defined`.

**Leitura:** o Fix Loop estava executando sem trilha operacional suficiente e com interrupções/reexecuções encavaladas.

### 3) Publish/Deploy ainda não está confiável
**Falhas de publish observadas**
- **4x** `Bad credentials` → problema de credencial/integração do GitHub.
- **4x** bloqueio por dependência proibida `@vitejs/plugin-react`.
- **3x** arquivos críticos ausentes (`index.html`, `vite.config.ts`, etc.).

**Falha de deploy observada**
- `Repository URL not found. Initiative must be published first.`

**Leitura:** hoje o deploy falha por três classes diferentes: credencial, artefatos incompletos e publish não concluído com consistência.

### 4) Inconsistência de estado da iniciativa
Foi observado caso com `execution_progress` concluído e URLs de repositório/deploy já preenchidas, mas `stage_status` ainda em `planning`.

**Leitura:** existe desalinhamento entre estado macro da iniciativa e estado operacional do pipeline.

---

## Checklist operacional obrigatório

### A. Rastreabilidade de execução
- [x] Mostrar **subtask atual** durante `execution`.
- [x] Persistir `current_subtask_description`, `current_file`, `current_story_id` e `current_stage`.
- [ ] Mostrar também **wave**, agente atual e retry atual por node.
- [ ] Exibir histórico curto das últimas 5 subtasks concluídas/falhadas.

### B. Rastreabilidade do Fix Loop
- [x] Persistir artefato atual em validação.
- [x] Persistir fase atual (`analysis`, `reanalysis`, `fixing`, `approved`, `escalated`, `failed`).
- [x] Persistir tentativa atual e bloqueio principal.
- [ ] Persistir lista resumida das issues por categoria.
- [ ] Exibir tempo por artefato validado.

### C. Robustez do orquestrador
- [x] Liberar o job mestre quando a execução pausar por `time_budget`.
- [ ] Reagendar continuação explicitamente em vez de depender de retry implícito.
- [ ] Separar contagem de paralelismo entre jobs mestres e workers.
- [ ] Criar política de cleanup unificada para jobs órfãos.

### D. Publish/Deploy
- [ ] Validar conexão GitHub antes de iniciar publish.
- [ ] Falhar cedo se token/credencial estiver inválido.
- [ ] Validar arquivos críticos antes de publicar.
- [ ] Bloquear geração de dependências proibidas já na etapa de execução.
- [ ] Não permitir deploy sem `repo_url` confirmado.

### E. Consistência de estado
- [ ] Criar tabela/contrato canônico de transição de estados da iniciativa.
- [ ] Garantir reconciliação entre `stage_status`, `execution_progress`, jobs e URLs finais.
- [ ] Rodar rotina de reparo para iniciativas com estado macro divergente.

---

## Plano de correção por prioridade

### P0 — impedir travamento e dar visibilidade
1. Liberar slot paralelo do orquestrador ao pausar.
2. Mostrar subtask atual na UI.
3. Mostrar artefato/fase/tentativa atual do Fix Loop.
4. Registrar erro principal da validação na `execution_progress`.

### P1 — estabilizar publish/deploy
1. Corrigir fonte de `Bad credentials`.
2. Revisar política de dependências bloqueadas versus prompts de geração.
3. Garantir presença de arquivos críticos antes de publish.
4. Bloquear deploy sem publish consistente.

### P2 — alinhamento estrutural
1. Reconciliador de estado macro da iniciativa.
2. Timeline única da iniciativa por estágio/job/subtask.
3. Dashboard de falhas por estágio com motivos agregados.

---

## Critério de pronto para a área de iniciativas
A área só pode ser considerada confiável quando, para qualquer iniciativa em execução, o operador conseguir responder em menos de 30 segundos:
1. **Em que etapa está?**
2. **Qual subtask/artefato está rodando agora?**
3. **Qual foi o último erro?**
4. **Se travar, o slot paralelo é liberado?**
5. **O que falta para publish e deploy?**

Enquanto essas 5 respostas não forem triviais na UI e no backend, a promessa “da ideia ao software pronto” ainda está incompleta.

# Arquivo de Contexto AxionOS

> **Propósito:** Restaurar o entendimento do sistema rapidamente quando o contexto de conversa anterior não estiver disponível.
> **Última Atualização:** 2026-03-14

---

## Identidade do Sistema

AxionOS é um **sistema operacional governado para criação autônoma de produtos**.
Sua promessa central é transformar uma ideia em software validado e implantável enquanto melhora sua própria capacidade de execução ao longo do tempo.

**Jornada central do produto:**

> Ideia → Descoberta → Arquitetura → Engenharia → Validação → Deploy → Software Entregue

O sistema é projetado como um organismo operacional adaptativo que combina pipelines de execução determinísticos com inteligência de agentes governada.

---

## Natureza do Sistema

AxionOS **não** é um chatbot, assistente de IDE ou framework simples de agentes.

É uma plataforma de infraestrutura projetada para:

- Orquestrar workflows de criação de software
- Coordenar agentes de IA especializados
- Aprender com resultados de execução
- Melhorar estratégias operacionais
- Manter fronteiras rigorosas de governança

O sistema se comporta como um **organismo cibernético controlado**.

---

## Modelo de Arquitetura

A arquitetura do AxionOS é dividida em **quatro superfícies**.

| # | Superfície | Descrição |
|---|------------|-----------|
| 1 | **Arquitetura Interna do Sistema** | Engines profundas do sistema responsáveis por execução, inteligência, aprendizado e calibração |
| 2 | **Superfície Avançada do Operador (Modo Owner)** | Workspace para revisão de resultados, inspeção de evidências, decisões de governança e supervisão da evolução do sistema |
| 3 | **Superfície de Governança da Plataforma** | Camada de controle institucional garantindo segurança do sistema, fronteiras de mutação e aplicação de políticas |
| 4 | **Superfície de Produto do Usuário (Modo Builder)** | Interface visível do produto onde usuários percorrem a jornada ideia → deploy |

Estas camadas **nunca** devem ser colapsadas em uma única interface.

---

## Separação de Modos de Workspace

| Modo | Caminho | Propósito |
|------|---------|-----------|
| **Modo Builder** | `/builder/*` | Engenharia tática — Dashboard, Projetos, Agentes, Pipelines, Runtime, Observabilidade de Execução |
| **Modo Owner** | `/owner/*` | Governança estratégica — Inteligência do Sistema, Inteligência Canon, Decisões de Governança, Insights, Handoff, Rastreamento de Aplicação, Segurança |

Modo Builder é para construir e entregar software.
Modo Owner é para governar a inteligência e evolução da plataforma.

---

## Modelo Cognitivo do Sistema

AxionOS deve ser entendido como um **sistema cognitivo-operacional governado**. Ele não apenas executa tarefas — ele percebe, avalia, restringe, formaliza, orquestra e aprende.

A cognição do sistema segue um modelo em camadas estrito onde cada camada tem um papel definido e não pode assumir o papel de outra. Isso previne que o sistema degenere em comportamento de agente não estruturado.

**Princípio cognitivo central:**
> O sistema conhece antes de avaliar, avalia antes de restringir, restringe antes de formalizar, formaliza antes de orquestrar e orquestra antes de agir.

Este modelo cognitivo é o que distingue o AxionOS de frameworks convencionais de agentes que permitem improvisação irrestrita.

---

## Cadeia de Decisão Operacional

AxionOS segue uma cadeia estrita de seis camadas de decisão e execução. Todo comportamento operacional respeita este fluxo:

```
Canon / Biblioteca            — informa
   ↓
Prontidão / Eventos / Métricas  — avalia
   ↓
Política / Governança          — restringe
   ↓
Axion Action Engine            — formaliza (artefatos XML no estilo Axion)
   ↓
Orquestrador AgentOS           — orquestra (Escalonador AIOS Round Robin)
   ↓
Executor Agente / Humano       — age (com Auto-Cura)
```

**Regra Canônica:**
- Canon informa
- Prontidão avalia
- Política restringe
- Action Engine formaliza
- AgentOS orquestra
- Executores agem

Nenhuma camada pode assumir as responsabilidades de outra. Canon nunca dispara ações. Política nunca executa. O Action Engine nunca executa agentes diretamente. Esta separação previne que o sistema degenere em caos de agentes não estruturado.

---

## Papéis dos Subsistemas

| Subsistema | Papel |
|------------|-------|
| **Canon** | Conhecimento institucional validado — padrões, estratégias, regras, playbooks. A memória de longo prazo do sistema. |
| **Biblioteca de Padrões** | Padrões de implementação reutilizáveis extraídos de evidências de execução. Consultados por agentes em runtime. |
| **Prontidão** | Avaliação determinística do estado do sistema. Produz bloqueadores, avisos e scores de prontidão. |
| **Métricas** | Sinais quantitativos com fonte, confiança e timestamp. Fundação para avaliação de estado. |
| **Eventos** | Sinais gerados pelo sistema a partir de execução de pipeline, atividade de agentes e comportamento em runtime. |
| **Política** | Regras de governança que restringem quais ações são permitidas e sob quais condições. |
| **Governança** | Workflows de aprovação estrutural, revisão de mutação e aplicação de conformidade. |
| **Action Engine** | Formaliza triggers em intents, aplica política e produz registros de ação auditáveis usando XML no estilo Axion. |
| **AgentOS** | Orquestra seleção de agentes, montagem de contexto, injeção de conhecimento e dispatch de tarefas. |
| **Executores** | Camada final de execução — agentes, humanos ou sistemas externos que executam a ação. |
| **Loop de Aprendizado** | Coleta evidências de execução, extrai padrões, promove ao canon e alimenta melhoria. |

---

## Axion Action Engine

O Axion Action Engine é a camada de formalização entre avaliação de governança e execução de agentes.

**Capacidades chave:**
- Transforma triggers (eventos, sinais, prompts de usuário) em ActionIntents formais
- Aplica resolução policy-aware usando o princípio **mais restritivo vence** (Blocked > Manual > Approval > Auto)
- Produz ActionRecords auditáveis com lineage completa
- Suporta hooks de aprovação humana com expiração baseada em TTL e agendamento automatizado de expiração
- Usa artefatos XML no estilo Axion (`<axionArtifact>`, `<axionAction>`) para saída estruturada
- Roteia ações formalizadas para o Escalonador AIOS Round Robin do AgentOS
- Impõe uma **máquina de estados formal de domínio** (14 estados, 24 transições) com guardas explícitos, atores permitidos, efeitos colaterais e tipos de evento de auditoria por transição
- Fornece navegação cross-surface entre Action Center e Fila de Aprovação
- Suporta simulação de recuperação governada com trilha de auditoria

**Status:** Implementado e operacional (Sprints 139–142, reforçado no Bloco AI: Sprints 164–169).

---

## Ciclo de Vida de Decisões de Governança

AxionOS gerencia mudanças de governança através de três domínios distintos de ciclo de vida:

1. **Workflow de Decisão** — processo formal de revisão com 13 estados (Rascunho → Fechado) para propostas de governança
2. **Handoff de Execução** — ciclo de vida com 8 estados que transforma decisões aprovadas em pacotes de instrução validados
3. **Rastreamento de Aplicação de Mudanças** — Monitora aplicação downstream, conformidade de escopo e observação de resultados

Estes domínios garantem que "Aprovado" (governança), "Liberado" (handoff) e "Aplicado" (operacional) permaneçam conceitos distintos.

---

## Lógica de Decisão

A lógica de decisão canônica do AxionOS segue esta sequência:

1. **Conhecimento informa** — Canon e Biblioteca de Padrões fornecem conhecimento operacional validado para todas as camadas downstream
2. **Sinais avaliam** — Métricas, Eventos e Prontidão transformam estado do sistema em sinais auditáveis
3. **Política restringe** — Regras de governança determinam se uma ação é permitida e sob qual modo de execução
4. **Ações são formalizadas** — O Action Engine mapeia triggers para intents, aplica política e cria registros de ação
5. **Orquestração coordena execução** — AgentOS seleciona agentes, monta contexto, injeta conhecimento e despacha tarefas
6. **Execução retorna evidências** — Executores produzem resultados capturados como evidências de execução
7. **Evidências alimentam aprendizado** — Evidências são analisadas, padrões extraídos e conhecimento validado é promovido de volta ao Canon

Isso cria um **loop de feedback fechado** onde toda execução melhora execuções futuras.

---

## Por Que Esta Separação Existe

A separação em camadas da Cadeia de Decisão Operacional existe para prevenir quatro modos críticos de falha:

1. **Tomada de decisão dirigida por UI** — As superfícies de UI devem exibir estado, não dirigir decisões operacionais
2. **Improvisação de agentes sem política** — Agentes devem operar sob restrições de governança
3. **Camadas de conhecimento executando ações** — Canon e Biblioteca de Padrões existem para informar, não para agir
4. **Governança sendo contornada** — Toda ação importante deve passar por avaliação de política

Sistemas com agentes mas sem fronteiras arquiteturais tendem a evoluir de **inteligência distribuída** para **caos distribuído** rapidamente.

---

## Engines Centrais

AxionOS é alimentado por múltiplas engines coordenadas:

- **Core de Pipeline de Execução** — Pipeline determinístico que converte ideias de produto em artefatos de software
- **Engine de Inteligência Operacional** — Analisa resultados de execução, detecta padrões e melhora estratégias operacionais
- **Engine de Aprendizado** — Transforma evidências de execução em recomendações e melhorias limitadas do sistema
- **Engine de Governança de Execução** — Garante que todas as mudanças estruturais sigam regras de governança e aprovação humana
- **Engine de Inteligência da Plataforma** — Mantém consciência em nível de sistema e insights de performance
- **Engine de Auto-Calibração da Plataforma** — Mantém estabilidade do sistema e equilíbrio operacional
- **Engine de Evolução de Estratégia de Execução** — Explora e refina melhores estratégias para criação de software
- **Axion Action Engine** — Formaliza triggers em ActionRecords governados com resolução policy-aware

---

## Princípio de Pipeline

O sistema depende de um **pipeline de execução determinístico**.

Toda execução segue uma sequência DAG definida de estágios. Agentes podem auxiliar e aprimorar a execução mas **não podem mudar arbitrariamente a estrutura do pipeline**.

Isso garante:

- Previsibilidade
- Confiabilidade
- Auditabilidade

---

## Sistema Operacional de Agentes

AxionOS coordena agentes sob uma ontologia estruturada. Cinco tipos fundamentais de agente existem:

| Tipo | Papel |
|------|-------|
| **Agentes de Percepção** | Interpretam contexto e informações recebidas |
| **Agentes de Design** | Produzem artefatos de arquitetura e planejamento |
| **Agentes de Build** | Geram código e ativos técnicos |
| **Agentes de Validação** | Avaliam qualidade de artefatos e correção do sistema |
| **Agentes de Evolução** | Analisam evidências e propõem melhorias |

Agentes operam sob regras de governança e **não podem modificar a arquitetura do sistema autonomamente**.

---

## Modelo de Aprendizado

O aprendizado do sistema segue um **pipeline completo de metabolismo de conhecimento**:

1. **Análise de Repositório** — Absorver conhecimento de engenharia de codebases e histórico de execução
2. **Sinais de Execução** — Capturar resultados, erros, sucessos e padrões do runtime
3. **Candidatos de Aprendizado** — Gerar entradas candidatas de conhecimento a partir de sinais e análises
4. **Avaliação de Candidatos** — Pontuar candidatos por confiança, força de evidência e ajuste de domínio
5. **Deduplicação de Padrões** — Mesclar candidatos sobrepostos ou redundantes inteligentemente
6. **Promoção ao Canon** — Promover candidatos validados para a base de conhecimento canônica
7. **Conhecimento Destilado** — Comprimir entradas canon em dicas eficientes e micro-skills
8. **Injeção de Skills** — Injetar conhecimento destilado no contexto do agente em runtime
9. **Feedback de Execução** — Medir impacto do conhecimento injetado na qualidade de execução
10. **Heurísticas de Arquitetura** — Extrair regras arquiteturais de padrões de sucesso/falha
11. **Propostas de Auto-Melhoria** — Gerar propostas governadas para auto-melhoria do sistema

Todo aprendizado é **advisory-first e restringido por governança**. O sistema nunca muta sua própria arquitetura sem revisão de governança.

---

## Metabolismo de Conhecimento

AxionOS opera como um **sistema de metabolismo de conhecimento** — ele ingere, digere, destila e aplica conhecimento em um ciclo governado contínuo:

```
fonte → candidato → avaliação → merge/deduplicação → promoção ao canon
→ conhecimento destilado → injeção em runtime → feedback de execução
→ sinais de aprendizado → propostas de melhoria de arquitetura → revisão de governança
```

---

## Invariantes do Sistema

As seguintes regras **não podem ser violadas**:

- **advisory-first** — todas as saídas de inteligência são recomendações
- **governança antes de autonomia** — aprovação humana para mudança estrutural
- **rollback em todo lugar** — toda mudança preserva capacidade de rollback
- **adaptação limitada** — todo aprendizado dentro de envelopes declarados
- **aprovação humana para mudança estrutural** — nenhuma mutação autônoma de arquitetura
- **isolamento de tenant** — todos os dados com escopo por organization_id com RLS
- **nenhuma mutação autônoma de arquitetura** — famílias de mutação proibidas impostas

Estas invariantes agem como as **leis físicas** da plataforma.

---

## Canon de Sprints

- **Sprints 1–207** representam o arco de desenvolvimento canônico da plataforma
- **Blocos Foundation até AS** estão completos
- O sistema alcançou **maturidade Nível 19: Organismo Adaptativo Governado com Hub Canon Totalmente Operacional**
- **200+ Edge Functions** implantadas em todos os estágios de pipeline e engines de inteligência

Marcos principais pós-138:
- Sprint 139–142: Axion Action Engine (Bloco AE)
- Sprint 143–146: Superfície de Segurança (Bloco AF)
- Sprint 147–154: Inteligência de Adoção, Landing Page, Modo Builder/Owner (Bloco AG)
- Sprint 155–163: Ciclo de Vida de Decisões de Governança (Bloco AH)
- Sprint 164–169: Caminho de Execução Governada (Bloco AI)
- Sprint 170–179: Operacionalização do Pipeline Canon (Bloco AJ)
- Sprint 180–181: Proveniência de Conhecimento e Inteligência Ponderada por Confiança (Bloco AK)
- Sprint 182–183: Engine de Renovação e Revalidação de Conhecimento (Bloco AL)
- Sprint 184: Reestruturação do Hub de Inteligência Canon e Camada Skills (Bloco AM)
- Sprint 185: Evolução da Arquitetura de Execução (Bloco AN)
- Sprint 186–192: Pipeline Canon Auto-Aprimorante (Bloco AO)
- Sprint 193–200: Hardening de Segurança e Integridade Canon (Bloco AP)
- Sprint 201: Ajustes Operacionais — unificação do pipeline, normalização de lifecycle (Bloco AQ)
- Sprint 202: Consolidação de Review — autoridade única, cron de ingestão diária (Bloco AR)
- Sprint 203–207: Ativação Operacional Completa do Hub Canon (Bloco AS) — UI de Revisão Humana, Repo Trust no Cron, Producers de Sinais Operacionais, Mineração de Padrões, Recalibração Automática de Confiança

---

## Fases de Maturidade do Sistema

| Fase | Nome | Status |
|------|------|--------|
| Fase 1 | Scaffolding de UI | Completo |
| Fase 2 | Contrato de Navegação | Completo |
| Fase 3 | Métricas e Integridade de Dados | Completo |
| Fase 4 | Engine de Prontidão | Completo |
| Fase 5 | Operacionalização de Canon e Biblioteca | Completo |
| Fase 6 | Contrato de Decisão AgentOS | Completo |
| Fase 7 | Action Engine | Completo (Sprints 139–142) |
| Fase 8 | Governança e Fluxo de Aprovação | Completo (Sprints 155–163) |
| Fase 9 | Caminho de Execução Governada | Completo (Sprints 164–169) |
| Fase 10 | Operacionalização do Pipeline Canon | Completo (Sprints 170–179) |
| Fase 11 | Proveniência de Conhecimento e Inteligência Ponderada por Confiança | Completo (Sprints 180–181) |
| Fase 12 | Renovação e Revalidação de Conhecimento | Completo (Sprints 182–183) |
| Fase 13 | Reestruturação do Hub Canon e Camada Skills | Completo (Sprint 184) |
| Fase 14 | Evolução da Arquitetura de Execução | Completo (Sprint 185) |
| Fase 15 | Pipeline Canon Auto-Aprimorante | Completo (Sprints 186–192) |
| Fase 16 | Hardening de Segurança e Integridade Canon | Completo (Sprints 193–200) |
| Fase 17 | Ajustes Operacionais e Consolidação de Review | Completo (Sprints 201–202) |

---

## Mapa de Documentação

Para entender o sistema completamente:

1. Leia **[README.md](README.md)** — tese da plataforma, fronteiras canônicas e invariantes
2. Leia **[ARCHITECTURE.md](../ARCHITECTURE.md)** — arquitetura estrutural, camadas, containers, fluxo de dados
3. Leia **[GOVERNANCE.md](../GOVERNANCE.md)** — módulos Agent OS, contratos e referência de governança

`AXION_CONTEXT.md` existe apenas para **restaurar o entendimento rapidamente**.

---

## Princípios de Desenvolvimento

O desenvolvimento futuro deve seguir regras estritas:

- Trabalhar **sprint por sprint**
- Nunca reabrir casualmente o canon completo
- Preservar fronteiras de arquitetura
- Manter pipelines de execução determinísticos
- Proteger a integridade da governança

AxionOS evolui através de **iteração disciplinada**, não autonomia descontrolada.

---

## Visão de Longo Prazo

AxionOS tem como objetivo se tornar uma nova categoria de infraestrutura: **um sistema operacional para criação autônoma de produtos**.

Ele é projetado para ajudar indivíduos e organizações a transformar ideias em sistemas de software funcionais com inteligência, confiabilidade e consciência estratégica crescentes.

A plataforma deve eventualmente funcionar como um **organismo digital governado** capaz de melhorar continuamente como o software é criado.

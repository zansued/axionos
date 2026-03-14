# AxionOS — Índice de Documentação

> Ponto único de navegação para toda a documentação do AxionOS.
> Última atualização: 2026-03-13

---

## Mapa de Documentos

| Documento | Autoridade | Propósito |
|-----------|------------|-----------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Estrutura do sistema | Diagramas C4, camadas de capacidade, containers, componentes, fluxo de dados, regras de segurança, modelo de fronteiras do produto |
| [GOVERNANCE.md](../GOVERNANCE.md) | Referência Agent OS e governança | 5 planos, inventário de módulos, tipos de agente, contratos, limites de segurança, eventos |
| [CANON_INTELLIGENCE_ENGINE.md](../CANON_INTELLIGENCE_ENGINE.md) | Motor de Inteligência Canon | Modelo Agente–Contrato, camada de conhecimento Canon, workflow de canonização, consulta em runtime |
| [UI_BLUEPRINT.md](../UI_BLUEPRINT.md) | Arquitetura de interface | Mapa de telas, design system, fluxos de navegação, regras de UX |
| [AXION_CONTEXT.md](AXION_CONTEXT.md) | Restauração rápida de contexto | Identidade do sistema, engines, invariantes, canon de sprints, princípios de desenvolvimento |
| [AXION_PRIMER.md](AXION_PRIMER.md) | Âncora cognitiva para IA | Explicação ultra-curta do sistema (~2 min de leitura) |

---

## Como Continuar Se o Contexto da Conversa For Perdido

Se o histórico anterior do chat não estiver disponível, siga esta sequência para restabelecer o contexto:

1. **Leia este README primeiro** — entenda a nota canônica atual, fronteiras e invariantes
2. **Leia ARCHITECTURE.md** — contexto estrutural: camadas, containers, fluxo de dados, modelo de fronteiras do produto, modelo de roles/superfícies
3. **Leia GOVERNANCE.md** — referência Agent OS: módulos, contratos, governança, limites de segurança

### Regras de Implementação

- A implementação de sprints futuros deve prosseguir **um sprint de cada vez**
- Cada sprint deve ser revisado e aprovado antes do início da execução
- Sprints 1–200 são o canon completo — não reabra casualmente
- Todos os blocos (Foundation até AP) estão completos
- Não colapse a arquitetura interna e a jornada do usuário na mesma superfície

---

## Tese do Produto

AxionOS é um **Sistema Operacional governado para Criação Autônoma de Produtos** — uma plataforma que transforma ideias em artefatos de software validados enquanto melhora sua própria capacidade de fazê-lo ao longo do tempo, sob governança.

A promessa da plataforma permanece: **da ideia ao software entregue**.

A jornada padrão voltada ao usuário permanece:
> Ideia → Descoberta → Arquitetura → Engenharia → Validação → Deploy → Software Entregue

---

## Nota Canônica Atual

> A documentação pública reflete a **linha arquitetural estável** até o Sprint 202 (todos os blocos Foundation até AR).
>
> O roadmap interno e o canon experimental podem estar à frente desta baseline.
> Este aviso existe para preservar credibilidade — não para obscurecer progresso.

---

## Modelo de Fronteiras Canônicas

| # | Camada | Descrição |
|---|--------|-----------|
| 1 | **Arquitetura Interna do Sistema** | Engines, governança, inteligência, memória, calibração, loops de evidência, benchmarking, inteligência institucional soberana |
| 2 | **Superfície Avançada do Operador (Modo Owner)** | Inteligência do sistema, insights de governança, decisões de governança, handoff de execução, rastreamento de aplicação, segurança, inteligência canon |
| 3 | **Superfície de Governança da Plataforma** | Roteamento, debates, memória de trabalho, enxame, marketplace, meta-agentes, calibração, observabilidade |
| 4 | **Superfície de Produto Voltada ao Usuário (Modo Builder)** | Dashboard, Projetos, Agentes, Pipelines, Runtime, Observabilidade de Execução, Configurações |

---

## Separação de Modos de Workspace

O AxionOS separa sua interface em dois modos operacionais:

| Modo | Caminho | Propósito |
|------|---------|-----------|
| **Modo Builder** | `/builder/*` | Engenharia tática focada na entrega de produto — Dashboard, Projetos, Agentes, Pipelines, Runtime, Observabilidade |
| **Modo Owner** | `/owner/*` | Governança estratégica da plataforma — Inteligência do Sistema, Inteligência Canon, Decisões de Governança, Insights, Handoff, Rastreamento de Aplicação, Segurança |

O Modo Builder é para construir e entregar software.
O Modo Owner é para governar a inteligência e evolução da plataforma.

---

## Modelo de Acesso por Role e Superfície

| Role | Produto | Workspace | Plataforma |
|------|---------|-----------|------------|
| Usuário Final | ✅ | — | — |
| Operador | ✅ | ✅ | — |
| Tenant Owner | ✅ | ✅ | — |
| Platform Reviewer | ✅ | ✅ | ✅ |
| Platform Admin | ✅ | ✅ | ✅ |

---

## Capacidades Chave Adicionadas Após Sprint 138

| Faixa de Sprint | Bloco | Capacidade |
|-----------------|-------|-----------|
| 139–142 | AE | Action Engine — intake de triggers, mapeamento de intenções, resolução policy-aware, registro, auditoria, dispatch, hooks de aprovação, fluxos operacionais, UI Action Center, hooks de recuperação |
| 143–146 | AF | Superfície de Segurança — mapeamento de domínios de ameaça, mapeamento de superfície de segurança, perfis de risco de agentes/contratos, Sala de Guerra de Segurança |
| 147–150 | AG | Inteligência de Adoção e Jornada do Usuário — modelos de adoção, detecção de fricção, rastreamento de resultados, orquestração de jornada |
| 151–154 | AG | Landing Page, Axion Prompt Drawer, separação Builder/Owner Mode |
| 155–158 | AH | Workflow de Revisão de Governança — máquina de estados de decisão, superfície de revisão, ciclo de vida de propostas |
| 159–163 | AH | Superfícies de Governança — Insights, Superfície de Decisão, Handoff de Execução, Rastreamento de Aplicação de Mudanças |
| 164–171 | AI | Inteligência de Repositório e Aprendizado Institucional — revisão de candidatos canon, deduplicação, promoção, retrieval, destilação de skills, grafo de inteligência, injeção em agentes, governança de aprendizado |
| 172–179 | AJ | Engine de Arquitetura Auto-Aprimorante — destilação canon, micro-skills, orçamento de tokens, memória multi-camada, heurísticas de arquitetura, propostas de auto-melhoria, dashboard de eficiência, governança de auto-melhoria |
| 180–181 | AK | Proveniência de Conhecimento e Inteligência Ponderada por Confiança |
| 182–183 | AL | Engine de Renovação e Revalidação de Conhecimento |
| 184 | AM | Reestruturação do Hub de Inteligência Canon — agrupamento por domínio cognitivo, tabelas da camada Skills |
| 185 | AN | Evolução da Arquitetura de Execução — roteamento adaptativo baseado em risco, ajuste de política informado por evidências |
| 186–192 | AO | Pipeline Canon Auto-Aprimorante — Deep Repo Absorber, Previsão de Demanda de Conhecimento, Orquestrador de Aquisição, Otimização de Portfólio, Engine de ROI, Consolidação UI do Hub, Ativação de Skills |
| 193–200 | AP | Hardening de Segurança e Integridade Canon — Prevenção de Envenenamento, Hardening de Auth (3 ondas em 200+ Edge Functions), Ajuste de RLS, Segurança de Workers de Execução, Resistência a Inferência |

---

## Após Sprint 200 — Estado Estratégico Atual

A plataforma completou 200 sprints em todos os blocos de Foundation até AP. O sistema opera como um organismo adaptativo governado com segurança reforçada com:

- ✅ Action Engine Axion completo com pipeline de execução governada
- ✅ Ciclo de vida de decisões de governança (proposta → revisão → handoff → rastreamento de aplicação)
- ✅ Superfície de segurança com mapeamento de domínios de ameaça e perfis de risco
- ✅ Separação Builder/Owner Mode para fronteiras claras de workspace
- ✅ Inteligência de adoção e orquestração de jornada do usuário
- ✅ Operacionalização do pipeline canon (revisão, evolução, dedup, promoção, skills, grafo, injeção)
- ✅ Pipeline canon auto-aprimorante (deep repo absorber, demanda de conhecimento, aquisição, portfólio, ROI)
- ✅ Proveniência de conhecimento, inteligência ponderada por confiança e engine de renovação
- ✅ Hub de Inteligência Canon com estrutura de domínio cognitivo
- ✅ Camada Skills emergente (skill_bundles, engineering_skills, skill_capabilities)
- ✅ Roteamento de execução adaptativo com ajuste de política informado por evidências
- ✅ Engine de Prevenção de Envenenamento Canon
- ✅ Hardening completo de auth em 200+ Edge Functions (3 ondas)
- ✅ Auditoria e ajuste de políticas RLS
- ✅ Resistência a inferência — prevenção de inferência de existência cross-tenant
- ✅ 200+ Edge Functions implantadas e com segurança reforçada

O foco agora se volta para:
- Aprofundar a qualidade da inteligência e precisão consultiva
- Fortalecer a experiência do produto e o loop de feedback de adoção
- Endurecer a governança institucional em contextos distribuídos e federados
- Conectar o Action Engine à execução real downstream
- Melhorar a confiabilidade de entrega ponta a ponta
- Maturar a camada Skills para profundidade operacional completa
- Ativar o pipeline de extração de skills → revisão → vinculação de capacidades

---

## Como Continuar com Segurança Após Sprint 200

1. Leia **este README** para fronteiras canônicas e invariantes
2. Use **ARCHITECTURE.md** para contexto estrutural, o modelo de fronteiras do produto e o modelo de roles/superfícies
3. Use **GOVERNANCE.md** para módulos Agent OS, contratos e referência de governança
4. Implemente trabalho futuro **sprint por sprint** com revisão humana
5. **Não** colapse a arquitetura interna e a jornada do usuário na mesma superfície
6. **Não** reabra casualmente o canon completo (Sprints 1–200) sem revisão deliberada
7. Camadas internas são suporte de bastidores — a superfície padrão do produto é a jornada do usuário

---

## Taxonomia de Status de Sprint

| Status | Significado |
|--------|-------------|
| `complete` | Implementado e verificado |
| `planned` | Próximo na fila, escopo definido, pronto para implementação |
| `committed` | Parte do arco futuro comprometido, objetivos definidos |
| `reserved` | Direção estratégica definida, intencionalmente leve |
| `frozen` | Explicitamente adiado, não agendado |

### Fronteiras Canônicas Atuais

- **Sprints 1–200** = canon completo (Foundation até Bloco AP)

---

## Invariantes

- **advisory-first** — todas as saídas de inteligência são recomendações
- **governança antes de autonomia** — aprovação humana para mudanças estruturais
- **rollback em todo lugar** — toda mudança preserva capacidade de rollback
- **adaptação limitada** — todo aprendizado dentro de envelopes declarados
- **aprovação humana para mudança estrutural** — nenhuma mutação autônoma de arquitetura
- **isolamento de tenant** — todos os dados com escopo por organization_id com RLS
- **nenhuma mutação autônoma de arquitetura** — famílias de mutação proibidas impostas

---

## Onde Cada Mudança Deve Ir?

| Tipo de mudança | Documento alvo |
|-----------------|----------------|
| Camada, container ou componente adicionado | `ARCHITECTURE.md` |
| Módulo, contrato ou evento Agent OS adicionado | `GOVERNANCE.md` |
| Estrutura de documentação ou fronteiras canônicas mudaram | `README.md` |

---

## Protocolo de Manutenção

1. **Quando a estrutura do sistema ou camadas arquiteturais ativas mudam:** atualizar `ARCHITECTURE.md`
2. **Quando o inventário de módulos Agent OS, contratos ou referências operacionais mudam:** atualizar `GOVERNANCE.md`
3. **Quando a estrutura de documentação, fronteiras canônicas ou taxonomia de status mudam:** atualizar `README.md`

---

## Regras de Normalização

- Cada documento tem uma única fronteira de autoridade
- Se um fato tem um único dono canônico, outros documentos podem **resumir ou referenciar** mas não devem **redefinir**
- Definições de camadas arquiteturais são canônicas em `ARCHITECTURE.md` apenas
- Especificações de módulos/contratos são canônicas em `GOVERNANCE.md` apenas
- Resumos derivados são permitidos quando claramente referenciando a fonte canônica

/**
 * Copilot Drawer Content Registry
 *
 * Centralized content for the contextual copilot drawer.
 * Extends the existing PageGuidanceContract with richer,
 * role-specific drawer content.
 *
 * Canon invariants preserved:
 *   - advisory-first
 *   - governance before autonomy
 *   - human approval for structural change
 */

import type { CopilotDrawerContent } from "./types";

// ─── Product Surface ──────────────────────────────────────────────────────

const PRODUCT_COPILOT: CopilotDrawerContent[] = [
  {
    key: "dashboard",
    default: {
      summary: {
        pt: "O Dashboard mostra uma visão consolidada do progresso das suas iniciativas, métricas de entrega e status geral da plataforma. Aqui você acompanha a jornada da ideia ao software deployado.",
        en: "The Dashboard shows a consolidated view of your initiative progress, delivery metrics, and overall platform status. Here you track the journey from idea to deployed software.",
      },
      nextAction: {
        pt: "Crie uma nova iniciativa ou acompanhe o progresso de uma existente.",
        en: "Create a new initiative or track progress on an existing one.",
      },
      nextActionReason: {
        pt: "A jornada começa com uma ideia — transforme-a em software deliverável.",
        en: "The journey starts with an idea — turn it into deliverable software.",
      },
      ignoreForNow: {
        pt: "Se todas as suas iniciativas estão progredindo normalmente, não há ação urgente aqui.",
        en: "If all your initiatives are progressing normally, no urgent action is needed here.",
      },
      suggestedActions: [
        { label: { pt: "Criar iniciativa", en: "Create initiative" }, route: "/builder/initiatives", icon: "Lightbulb" },
        { label: { pt: "Ver jornada", en: "View journey" }, route: "/builder/journey", icon: "Map" },
      ],
    },
  },
  {
    key: "journey",
    default: {
      summary: {
        pt: "A Jornada é o caminho guiado da ideia ao software implantado. Cada etapa representa uma fase do pipeline governado: descoberta, arquitetura, engenharia, validação e deploy.",
        en: "The Journey is the guided path from idea to deployed software. Each stage represents a phase of the governed pipeline: discovery, architecture, engineering, validation, and deploy.",
      },
      nextAction: {
        pt: "Revise o resumo do estágio atual antes de aprovar a próxima transição.",
        en: "Review the current stage summary before approving the next transition.",
      },
      nextActionReason: {
        pt: "Transições de estágio são governadas — revisar antes de avançar garante qualidade.",
        en: "Stage transitions are governed — reviewing before advancing ensures quality.",
      },
      approvalExplanation: {
        pt: "Algumas transições de estágio podem exigir aprovação humana. O sistema indicará quando isso for necessário.",
        en: "Some stage transitions may require human approval. The system will indicate when this is needed.",
      },
      ignoreForNow: {
        pt: "Se sua iniciativa está em estágio intermediário com tudo progredindo normalmente, você pode verificar novamente depois.",
        en: "If your initiative is in a mid-stage with everything progressing normally, you can check back later.",
      },
      suggestedActions: [
        { label: { pt: "Ver iniciativas", en: "View initiatives" }, route: "/builder/initiatives", icon: "Layers" },
      ],
    },
  },
  {
    key: "onboarding",
    default: {
      summary: {
        pt: "O Onboarding guia você pelos passos iniciais para configurar sua organização e criar sua primeira iniciativa. Siga o fluxo sugerido para começar rapidamente.",
        en: "Onboarding guides you through initial steps to set up your organization and create your first initiative. Follow the suggested flow to get started quickly.",
      },
      nextAction: {
        pt: "Complete os passos de configuração e lance sua primeira ideia.",
        en: "Complete the setup steps and launch your first idea.",
      },
      nextActionReason: {
        pt: "Uma vez configurado, o pipeline governado cuidará do resto.",
        en: "Once set up, the governed pipeline will take care of the rest.",
      },
      ignoreForNow: {
        pt: "Se já completou o onboarding, vá direto ao Dashboard ou Iniciativas.",
        en: "If you've already completed onboarding, go directly to Dashboard or Initiatives.",
      },
      suggestedActions: [
        { label: { pt: "Ir ao Início", en: "Go to Home" }, route: "/builder/dashboard", icon: "BarChart3" },
      ],
    },
  },
  {
    key: "initiatives",
    default: {
      summary: {
        pt: "Iniciativas são o coração da plataforma: cada uma representa uma ideia sendo transformada em software através do pipeline governado. Você pode criar, acompanhar, aprovar e revisar artefatos.",
        en: "Initiatives are the core of the platform: each one represents an idea being transformed into software through the governed pipeline. You can create, track, approve, and review artifacts.",
      },
      nextAction: {
        pt: "Revise artefatos gerados ou aprove a próxima transição de estágio.",
        en: "Review generated artifacts or approve the next stage transition.",
      },
      nextActionReason: {
        pt: "Artefatos pendentes de revisão podem bloquear o avanço do pipeline.",
        en: "Artifacts pending review may block pipeline progress.",
      },
      approvalExplanation: {
        pt: "Transições críticas do pipeline (ex: avançar para deploy) exigem aprovação humana. Isso garante governança e qualidade.",
        en: "Critical pipeline transitions (e.g. advancing to deploy) require human approval. This ensures governance and quality.",
      },
      ignoreForNow: {
        pt: "Se não tem novas ideias e todas as iniciativas estão em dia, nenhuma ação é necessária agora.",
        en: "If you have no new ideas and all initiatives are up to date, no action is needed now.",
      },
      suggestedActions: [
        { label: { pt: "Nova iniciativa", en: "New initiative" }, route: "/builder/initiatives", icon: "Lightbulb" },
        { label: { pt: "Ver jornada", en: "View journey" }, route: "/builder/journey", icon: "Map" },
        { label: { pt: "Deployments", en: "Deployments" }, route: "/builder/delivery", icon: "Rocket" },
      ],
    },
  },
  {
    key: "deployments",
    default: {
      summary: {
        pt: "Deployments mostra os artefatos publicados: repositórios, URLs de acesso e status de publicação. É o resultado final da jornada de cada iniciativa.",
        en: "Deployments shows published artifacts: repositories, access URLs, and publication status. It is the final result of each initiative's journey.",
      },
      nextAction: {
        pt: "Compartilhe a URL do deploy ou inicie uma nova iniciativa.",
        en: "Share the deploy URL or start a new initiative.",
      },
      ignoreForNow: {
        pt: "Se nenhuma iniciativa chegou ao estágio de deploy, esta área ficará vazia por enquanto.",
        en: "If no initiative has reached the deploy stage, this area will be empty for now.",
      },
      suggestedActions: [
        { label: { pt: "Iniciativas", en: "Initiatives" }, route: "/builder/initiatives", icon: "Layers" },
      ],
    },
  },
];

// ─── Workspace Governance Surface ─────────────────────────────────────────

const WORKSPACE_COPILOT: CopilotDrawerContent[] = [
  {
    key: "adoption",
    default: {
      summary: {
        pt: "Rastreia se as iniciativas entregues estão realmente sendo usadas. Identifica clusters de fricção e sinais de adoção fraca.",
        en: "Tracks whether delivered initiatives are actually being used. Identifies friction clusters and weak adoption signals.",
      },
      nextAction: {
        pt: "Inspecione a iniciativa com menor score de adoção primeiro.",
        en: "Inspect the lowest-adoption initiative first.",
      },
      nextActionReason: {
        pt: "Engajamento baixo indica que a entrega pode precisar de ajustes ou comunicação.",
        en: "Low engagement indicates the delivery may need adjustments or communication.",
      },
      ignoreForNow: {
        pt: "Se o foco atual é na execução do pipeline e não na pós-entrega, pode ignorar por agora.",
        en: "If the current focus is on pipeline execution rather than post-delivery, you can ignore this for now.",
      },
      suggestedActions: [
        { label: { pt: "Evidências", en: "Evidence" }, route: "/owner/improvement-ledger", icon: "FileSearch" },
        { label: { pt: "Candidatos", en: "Candidates" }, route: "/owner/improvement-candidates", icon: "Sparkles" },
      ],
    },
    roleOverrides: {
      operator: {
        nextAction: {
          pt: "Analise clusters de fricção e implemente melhorias baseadas nos sinais detectados.",
          en: "Analyze friction clusters and implement improvements based on detected signals.",
        },
        whyNow: {
          pt: "Algumas iniciativas mostram engajamento baixo — vale investigar padrões de fricção.",
          en: "Some initiatives show low engagement — worth investigating friction patterns.",
        },
      },
    },
  },
  {
    key: "evidence",
    default: {
      summary: {
        pt: "Coleta sinais operacionais, falhas e eventos notáveis que justificam melhorias futuras. É a base factual para decisões de governança.",
        en: "Collects operational signals, failures, and notable events that justify future improvements. It is the factual basis for governance decisions.",
      },
      nextAction: {
        pt: "Revise recomendações baseadas nas evidências coletadas.",
        en: "Review recommendations based on collected evidence.",
      },
      nextActionReason: {
        pt: "Evidências não revisadas podem conter sinais importantes para prevenção de problemas.",
        en: "Unreviewed evidence may contain important signals for problem prevention.",
      },
      ignoreForNow: {
        pt: "Se você está no início da configuração do produto, evidências ainda serão escassas.",
        en: "If you're early in product setup, evidence will still be scarce.",
      },
      suggestedActions: [
        { label: { pt: "Candidatos", en: "Candidates" }, route: "/owner/improvement-candidates", icon: "Sparkles" },
        { label: { pt: "Benchmarks", en: "Benchmarks" }, route: "/owner/improvement-benchmarks", icon: "FlaskConical" },
      ],
    },
  },
  {
    key: "candidates",
    default: {
      summary: {
        pt: "Propostas de melhoria geradas pelo sistema que precisam de revisão humana antes de serem ativadas. Cada candidato foi destilado a partir de evidências operacionais.",
        en: "System-generated improvement proposals that need human review before activation. Each candidate was distilled from operational evidence.",
      },
      nextAction: {
        pt: "Ative regras aprovadas ou solicite mais evidências para candidatos incertos.",
        en: "Activate approved rules or request more evidence for uncertain candidates.",
      },
      approvalExplanation: {
        pt: "Candidatos de regras exigem aprovação humana antes de serem ativados. Isso preserva governança e previne mudanças não supervisionadas.",
        en: "Rule candidates require human approval before activation. This preserves governance and prevents unsupervised changes.",
      },
      ignoreForNow: {
        pt: "Se não há candidatos pendentes de revisão, nenhuma ação é necessária.",
        en: "If there are no candidates pending review, no action is needed.",
      },
      suggestedActions: [
        { label: { pt: "Evidências", en: "Evidence" }, route: "/owner/improvement-ledger", icon: "FileSearch" },
        { label: { pt: "Benchmarks", en: "Benchmarks" }, route: "/owner/improvement-benchmarks", icon: "FlaskConical" },
      ],
    },
  },
  {
    key: "benchmarks",
    default: {
      summary: {
        pt: "Métricas comparativas de desempenho do pipeline e dos agentes. Candidatos aprovados passam por benchmark governado antes de promoção.",
        en: "Comparative performance metrics for the pipeline and agents. Approved candidates go through governed benchmarking before promotion.",
      },
      nextAction: {
        pt: "Ajuste estratégias com base nos benchmarks observados.",
        en: "Adjust strategies based on observed benchmarks.",
      },
      nextActionReason: {
        pt: "Benchmarks maduros informam quais melhorias devem ser promovidas e quais rejeitadas.",
        en: "Mature benchmarks inform which improvements should be promoted and which rejected.",
      },
      ignoreForNow: {
        pt: "Se o volume de execuções ainda é baixo, benchmarks significativos ainda estão se formando.",
        en: "If execution volume is still low, meaningful benchmarks are still forming.",
      },
      suggestedActions: [
        { label: { pt: "Candidatos", en: "Candidates" }, route: "/owner/improvement-candidates", icon: "Sparkles" },
      ],
    },
  },
  {
    key: "extensions",
    default: {
      summary: {
        pt: "Gerencie extensões da plataforma: marketplace, confiança e capacidades de terceiros. Extensões ampliam as funcionalidades do workspace.",
        en: "Manage platform extensions: marketplace, trust, and third-party capabilities. Extensions expand workspace functionality.",
      },
      nextAction: {
        pt: "Teste extensões instaladas em um ambiente controlado antes de ativá-las.",
        en: "Test installed extensions in a controlled environment before activating them.",
      },
      approvalExplanation: {
        pt: "Extensões de terceiros devem ser revisadas antes de ativação em produção. O sistema de trust scores ajuda a avaliar a confiabilidade.",
        en: "Third-party extensions should be reviewed before production activation. The trust score system helps evaluate reliability.",
      },
      ignoreForNow: {
        pt: "Se as capacidades atuais atendem suas necessidades, não é necessário instalar extensões agora.",
        en: "If current capabilities meet your needs, no need to install extensions now.",
      },
      suggestedActions: [
        { label: { pt: "Governança de Capacidades", en: "Capability Governance" }, route: "/capability-governance", icon: "Shield" },
      ],
    },
    roleOverrides: {
      platform_admin: {
        summary: {
          pt: "Gestão governada de extensões com controle de compatibilidade, rollback e verificação de segurança em nível de plataforma.",
          en: "Governed extension management with compatibility control, rollback, and platform-level security verification.",
        },
        approvalExplanation: {
          pt: "Ativação de extensões de plataforma exige aprovação administrativa. Mudanças afetam todos os tenants.",
          en: "Platform extension activation requires administrative approval. Changes affect all tenants.",
        },
      },
    },
  },
];

// ─── Platform Governance Surface ──────────────────────────────────────────

const PLATFORM_COPILOT: CopilotDrawerContent[] = [
  {
    key: "observability",
    default: {
      summary: {
        pt: "Monitoramento central do sistema: custos por modelo, performance, taxas de reparo, prevenção e eventos em tempo real.",
        en: "Central system monitoring: costs by model, performance, repair rates, prevention, and real-time events.",
      },
      nextAction: {
        pt: "Investigue anomalias ou otimize custos com base nos dados observados.",
        en: "Investigate anomalies or optimize costs based on observed data.",
      },
      nextActionReason: {
        pt: "Anomalias não investigadas podem indicar problemas de roteamento ou desperdício de recursos.",
        en: "Uninvestigated anomalies may indicate routing issues or resource waste.",
      },
      ignoreForNow: {
        pt: "Se tudo está operando normalmente e não há alertas, a observabilidade pode ser consultada periodicamente.",
        en: "If everything is running normally with no alerts, observability can be checked periodically.",
      },
      suggestedActions: [
        { label: { pt: "Roteamento IA", en: "AI Routing" }, route: "/agent-routing", icon: "Route" },
        { label: { pt: "Auditoria", en: "Audit" }, route: "/audit", icon: "Shield" },
      ],
    },
  },
  {
    key: "routing",
    default: {
      summary: {
        pt: "Mostra como a plataforma escolhe caminhos de execução internos: seleção de modelos, providers, tasks e lógica de fallback.",
        en: "Shows how the platform chooses internal execution paths: model selection, providers, tasks, and fallback logic.",
      },
      nextAction: {
        pt: "Revise a distribuição de providers e ajuste thresholds se necessário.",
        en: "Review provider distribution and adjust thresholds if needed.",
      },
      nextActionReason: {
        pt: "Roteamento impacta diretamente custo, confiança e comportamento de fallback.",
        en: "Routing directly impacts cost, confidence, and fallback behavior.",
      },
      approvalExplanation: {
        pt: "Revisão de operador/admin é apropriada ao alterar políticas de roteamento. Mudanças afetam toda a execução do pipeline.",
        en: "Operator/admin review is appropriate when changing routing policies. Changes affect all pipeline execution.",
      },
      ignoreForNow: {
        pt: "Se o roteamento está funcionando normalmente sem anomalias de custo, não é necessário ajustar agora.",
        en: "If routing is working normally without cost anomalies, no adjustment is needed now.",
      },
      suggestedActions: [
        { label: { pt: "Observabilidade", en: "Observability" }, route: "/observability", icon: "Activity" },
        { label: { pt: "Governança", en: "Governance" }, route: "/capability-governance", icon: "Shield" },
      ],
    },
  },
  {
    key: "audit",
    default: {
      summary: {
        pt: "Registro completo de todas as ações do sistema: decisões de governança, aprovações, mudanças de estado e eventos de pipeline.",
        en: "Complete record of all system actions: governance decisions, approvals, state changes, and pipeline events.",
      },
      nextAction: {
        pt: "Documente achados e ajuste políticas com base nos eventos auditados.",
        en: "Document findings and adjust policies based on audited events.",
      },
      ignoreForNow: {
        pt: "Se não há investigações ou auditorias em andamento, a trilha pode ser consultada sob demanda.",
        en: "If there are no ongoing investigations or audits, the trail can be queried on demand.",
      },
      suggestedActions: [
        { label: { pt: "Observabilidade", en: "Observability" }, route: "/observability", icon: "Activity" },
      ],
    },
  },
  {
    key: "capability-governance",
    default: {
      summary: {
        pt: "Gestão de capacidades da plataforma: seleção de agentes, níveis de confiança, políticas de autonomia e evolução governada.",
        en: "Platform capability management: agent selection, trust levels, autonomy policies, and governed evolution.",
      },
      nextAction: {
        pt: "Revise recomendações dos meta-agentes e aplique ajustes aprovados.",
        en: "Review meta-agent recommendations and apply approved adjustments.",
      },
      approvalExplanation: {
        pt: "Mudanças em políticas de agentes exigem aprovação administrativa. Nenhuma mutação autônoma de capacidades é permitida.",
        en: "Changes to agent policies require administrative approval. No autonomous capability mutation is allowed.",
      },
      ignoreForNow: {
        pt: "Se as políticas atuais de governança estão funcionando adequadamente, ajustes podem esperar.",
        en: "If current governance policies are working adequately, adjustments can wait.",
      },
      suggestedActions: [
        { label: { pt: "Extensões", en: "Extensions" }, route: "/extensions", icon: "Package" },
        { label: { pt: "Roteamento", en: "Routing" }, route: "/agent-routing", icon: "Route" },
      ],
    },
  },
  {
    key: "platform-extensions",
    default: {
      summary: {
        pt: "Gestão governada de extensões de plataforma: ativação, rollback e verificação de compatibilidade com controle administrativo.",
        en: "Governed platform extension management: activation, rollback, and compatibility verification with administrative control.",
      },
      nextAction: {
        pt: "Revise extensões pendentes de aprovação e verifique compatibilidade.",
        en: "Review extensions pending approval and verify compatibility.",
      },
      approvalExplanation: {
        pt: "Ativação de extensões de plataforma exige aprovação administrativa. Toda extensão pode ser revertida (rollback).",
        en: "Platform extension activation requires administrative approval. Every extension can be rolled back.",
      },
      ignoreForNow: {
        pt: "Se nenhuma extensão está pendente de ativação ou revisão, esta área pode esperar.",
        en: "If no extension is pending activation or review, this area can wait.",
      },
    },
  },
];

// ─── Lookup ───────────────────────────────────────────────────────────────

const ALL_COPILOT = [...PRODUCT_COPILOT, ...WORKSPACE_COPILOT, ...PLATFORM_COPILOT];

export function getCopilotContent(key: string): CopilotDrawerContent | undefined {
  return ALL_COPILOT.find((c) => c.key === key);
}

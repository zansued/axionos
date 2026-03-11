/**
 * Governance Mentor Mode — Centralized Content Registry
 *
 * Each entry maps to a page key and provides structured governance
 * decision-support content for platform_admin / platform_reviewer roles.
 *
 * All recommendations are advisory-only.
 */

import type { GovernanceMentorContent } from "./governance-mentor-types";

const MENTOR_CONTENT: Record<string, GovernanceMentorContent> = {
  routing: {
    key: "routing",
    decisionType: {
      pt: "Revisão de Política de Roteamento",
      en: "Routing Policy Review",
    },
    summary: {
      pt: "Avalia como o AxionOS seleciona caminhos de execução (modelos, provedores, tarefas) e se a política vigente é coerente com os objetivos de custo, confiança e resiliência.",
      en: "Evaluates how AxionOS selects execution paths (models, providers, tasks) and whether the current policy aligns with cost, confidence, and resilience objectives.",
    },
    whyNow: {
      pt: "Decisões de roteamento afetam diretamente custo operacional, latência e qualidade de saída. Revisão periódica é necessária para evitar drift de política.",
      en: "Routing decisions directly affect operational cost, latency, and output quality. Periodic review is necessary to prevent policy drift.",
    },
    riskLevel: "medium",
    blastRadius: "platform",
    rollbackPosture: "clear",
    recommendation: "approve_with_caution",
    recommendationReason: {
      pt: "A política atual está funcionando dentro de parâmetros aceitáveis, mas variações de carga podem expor fragilidades no fallback.",
      en: "Current policy is operating within acceptable parameters, but load variations may expose fallback fragilities.",
    },
    confidence: 0.75,
    uncertainties: [
      {
        pt: "Impacto de custo do fallback sob alta carga ainda não foi benchmarkado.",
        en: "Fallback cost impact under high load has not been benchmarked yet.",
      },
      {
        pt: "Latência de provedores secundários em horários de pico não foi validada recentemente.",
        en: "Secondary provider latency during peak hours has not been recently validated.",
      },
    ],
    tradeoffs: [
      {
        label: { pt: "Velocidade vs Segurança", en: "Speed vs Safety" },
        sideA: { pt: "Roteamento rápido reduz latência", en: "Fast routing reduces latency" },
        sideB: { pt: "Pode pular verificações de qualidade", en: "May skip quality checks" },
      },
      {
        label: { pt: "Custo vs Confiança", en: "Cost vs Confidence" },
        sideA: { pt: "Provedores baratos reduzem custo", en: "Cheaper providers reduce cost" },
        sideB: { pt: "Podem ter menor confiabilidade", en: "May have lower reliability" },
      },
    ],
    suggestedActions: [
      { label: { pt: "Inspecionar decisões recentes", en: "Inspect recent decisions" }, route: "/owner/agent-routing", icon: "Search" },
      { label: { pt: "Abrir benchmarks", en: "Open benchmarks" }, route: "/owner/improvement-benchmarks", icon: "BarChart3" },
      { label: { pt: "Revisar trilha de auditoria", en: "Review audit trail" }, route: "/owner/audit", icon: "FileText" },
    ],
  },

  "capability-governance": {
    key: "capability-governance",
    decisionType: {
      pt: "Alteração de Nível de Confiança de Capability",
      en: "Capability Trust Level Change",
    },
    summary: {
      pt: "Avalia propostas de mudança no nível de confiança, ativação ou escopo de capabilities registradas na plataforma.",
      en: "Evaluates proposals to change trust level, activation, or scope of capabilities registered on the platform.",
    },
    whyNow: {
      pt: "Mudanças em trust level afetam quais agentes podem executar quais tarefas. Revisão é obrigatória antes de promoção ou restrição.",
      en: "Trust level changes affect which agents can execute which tasks. Review is mandatory before promotion or restriction.",
    },
    riskLevel: "high",
    blastRadius: "platform",
    rollbackPosture: "partial",
    recommendation: "needs_evidence",
    recommendationReason: {
      pt: "Evidência operacional insuficiente para justificar promoção de trust level. Recomenda-se coleta de mais sinais antes de aprovar.",
      en: "Insufficient operational evidence to justify trust level promotion. More signal collection is recommended before approval.",
    },
    confidence: 0.55,
    uncertainties: [
      {
        pt: "Impacto em workflows dependentes não foi totalmente mapeado.",
        en: "Impact on dependent workflows has not been fully mapped.",
      },
      {
        pt: "Histórico de execução para esta capability é limitado.",
        en: "Execution history for this capability is limited.",
      },
      {
        pt: "Efeito cascata sobre roteamento e fallback não é claro.",
        en: "Cascading effect on routing and fallback is unclear.",
      },
    ],
    tradeoffs: [
      {
        label: { pt: "Flexibilidade vs Controle", en: "Flexibility vs Control" },
        sideA: { pt: "Trust alto permite uso mais amplo", en: "High trust allows broader usage" },
        sideB: { pt: "Reduz pontos de verificação de segurança", en: "Reduces safety checkpoints" },
      },
    ],
    suggestedActions: [
      { label: { pt: "Ver detalhes da capability", en: "View capability details" }, route: "/capability-governance", icon: "Shield" },
      { label: { pt: "Solicitar mais evidência", en: "Request more evidence" }, route: "/evidence", icon: "FileSearch" },
      { label: { pt: "Enviar para benchmark", en: "Send to benchmark" }, route: "/benchmarks", icon: "BarChart3" },
    ],
  },

  audit: {
    key: "audit",
    decisionType: {
      pt: "Revisão de Trilha de Auditoria",
      en: "Audit Trail Review",
    },
    summary: {
      pt: "Revisão de eventos registrados na trilha de auditoria para identificar anomalias, violações de política ou padrões operacionais relevantes.",
      en: "Review of events recorded in the audit trail to identify anomalies, policy violations, or relevant operational patterns.",
    },
    whyNow: {
      pt: "A trilha de auditoria é a base para decisões de governança informadas. Revisão regular previne acumulação de riscos não detectados.",
      en: "The audit trail is the foundation for informed governance decisions. Regular review prevents accumulation of undetected risks.",
    },
    riskLevel: "low",
    blastRadius: "local",
    rollbackPosture: "clear",
    recommendation: "approve",
    recommendationReason: {
      pt: "Nenhuma anomalia crítica detectada nos registros recentes. Revisão de rotina é segura.",
      en: "No critical anomalies detected in recent records. Routine review is safe.",
    },
    confidence: 0.85,
    uncertainties: [
      {
        pt: "Eventos de alta frequência podem mascarar padrões sutis.",
        en: "High-frequency events may mask subtle patterns.",
      },
    ],
    suggestedActions: [
      { label: { pt: "Filtrar por severidade", en: "Filter by severity" }, route: "/audit", icon: "Filter" },
      { label: { pt: "Exportar relatório", en: "Export report" }, icon: "Download" },
    ],
  },

  observability: {
    key: "observability",
    decisionType: {
      pt: "Revisão de Saúde Operacional",
      en: "Operational Health Review",
    },
    summary: {
      pt: "Avalia métricas de performance, custo, qualidade e padrões de erro para determinar se a plataforma está operando dentro de parâmetros aceitáveis.",
      en: "Evaluates performance, cost, quality, and error pattern metrics to determine if the platform is operating within acceptable parameters.",
    },
    whyNow: {
      pt: "Observabilidade contínua é essencial para detectar degradação antes que se torne crítica. Sinais atuais indicam área estável com pontos de atenção.",
      en: "Continuous observability is essential to detect degradation before it becomes critical. Current signals indicate a stable area with attention points.",
    },
    riskLevel: "low",
    blastRadius: "platform",
    rollbackPosture: "clear",
    recommendation: "approve",
    recommendationReason: {
      pt: "Métricas dentro de limites operacionais. Nenhuma ação corretiva urgente necessária.",
      en: "Metrics within operational limits. No urgent corrective action needed.",
    },
    confidence: 0.82,
    uncertainties: [
      {
        pt: "Tendências de custo de longo prazo precisam de análise mais profunda.",
        en: "Long-term cost trends need deeper analysis.",
      },
    ],
    tradeoffs: [
      {
        label: { pt: "Granularidade vs Overhead", en: "Granularity vs Overhead" },
        sideA: { pt: "Mais métricas dão visibilidade", en: "More metrics give visibility" },
        sideB: { pt: "Aumentam custo de coleta e ruído", en: "Increase collection cost and noise" },
      },
    ],
    suggestedActions: [
      { label: { pt: "Ver painel de performance", en: "View performance panel" }, route: "/observability", icon: "Activity" },
      { label: { pt: "Inspecionar padrões de erro", en: "Inspect error patterns" }, route: "/observability", icon: "AlertTriangle" },
    ],
  },

  extensions: {
    key: "extensions",
    decisionType: {
      pt: "Revisão de Extensão de Plataforma",
      en: "Platform Extension Review",
    },
    summary: {
      pt: "Avalia extensões propostas, ativas ou em revisão na plataforma. Extensões podem alterar comportamento de execução, roteamento ou governança.",
      en: "Evaluates proposed, active, or under-review extensions on the platform. Extensions may alter execution behavior, routing, or governance.",
    },
    whyNow: {
      pt: "Extensões modificam o comportamento do sistema. Revisão rigorosa é necessária antes de ativação em ambiente de produção.",
      en: "Extensions modify system behavior. Rigorous review is necessary before activation in production environment.",
    },
    riskLevel: "high",
    blastRadius: "platform",
    rollbackPosture: "partial",
    recommendation: "approve_with_caution",
    recommendationReason: {
      pt: "Extensões em revisão passaram por validação básica, mas impacto em cenários de borda não foi totalmente verificado.",
      en: "Extensions under review passed basic validation, but edge-case impact has not been fully verified.",
    },
    confidence: 0.65,
    uncertainties: [
      {
        pt: "Compatibilidade com extensões existentes não foi totalmente testada.",
        en: "Compatibility with existing extensions has not been fully tested.",
      },
      {
        pt: "Impacto em performance sob carga não foi benchmarkado.",
        en: "Performance impact under load has not been benchmarked.",
      },
    ],
    tradeoffs: [
      {
        label: { pt: "Conveniência vs Governança", en: "Convenience vs Governance" },
        sideA: { pt: "Ativação rápida acelera valor", en: "Quick activation accelerates value" },
        sideB: { pt: "Pode introduzir riscos não avaliados", en: "May introduce unevaluated risks" },
      },
    ],
    suggestedActions: [
      { label: { pt: "Revisar detalhes da extensão", en: "Review extension details" }, route: "/extensions", icon: "Puzzle" },
      { label: { pt: "Verificar postura de rollback", en: "Check rollback posture" }, icon: "RotateCcw" },
      { label: { pt: "Inspecionar auditoria", en: "Inspect audit" }, route: "/audit", icon: "FileText" },
    ],
  },

  benchmarks: {
    key: "benchmarks",
    decisionType: {
      pt: "Revisão de Benchmark Operacional",
      en: "Operational Benchmark Review",
    },
    summary: {
      pt: "Avalia benchmarks ativos e propostos que definem linhas de base para performance, qualidade e custo de operações da plataforma.",
      en: "Evaluates active and proposed benchmarks that define baselines for platform operations performance, quality, and cost.",
    },
    whyNow: {
      pt: "Benchmarks desatualizados podem levar a decisões baseadas em linhas de base incorretas. Revisão regular garante calibração.",
      en: "Outdated benchmarks may lead to decisions based on incorrect baselines. Regular review ensures calibration.",
    },
    riskLevel: "medium",
    blastRadius: "tenant",
    rollbackPosture: "clear",
    recommendation: "approve",
    recommendationReason: {
      pt: "Benchmarks atuais são consistentes com dados operacionais recentes. Aprovação segura para manutenção de referência.",
      en: "Current benchmarks are consistent with recent operational data. Safe to approve for reference maintenance.",
    },
    confidence: 0.80,
    uncertainties: [
      {
        pt: "Novos padrões de uso podem invalidar benchmarks em breve.",
        en: "New usage patterns may invalidate benchmarks soon.",
      },
    ],
    suggestedActions: [
      { label: { pt: "Comparar com período anterior", en: "Compare with previous period" }, route: "/benchmarks", icon: "GitCompare" },
      { label: { pt: "Ver candidatos associados", en: "View associated candidates" }, route: "/candidates", icon: "ListChecks" },
    ],
  },

  candidates: {
    key: "candidates",
    decisionType: {
      pt: "Revisão de Candidatos a Melhoria",
      en: "Improvement Candidates Review",
    },
    summary: {
      pt: "Avalia candidatos de melhoria identificados pelo sistema, verificando se possuem evidência suficiente e risco aceitável para promoção.",
      en: "Evaluates improvement candidates identified by the system, verifying if they have sufficient evidence and acceptable risk for promotion.",
    },
    whyNow: {
      pt: "Candidatos pendentes acumulam debt de decisão. Revisão oportuna mantém o pipeline de melhoria saudável.",
      en: "Pending candidates accumulate decision debt. Timely review keeps the improvement pipeline healthy.",
    },
    riskLevel: "medium",
    blastRadius: "tenant",
    rollbackPosture: "clear",
    recommendation: "approve_with_caution",
    recommendationReason: {
      pt: "Candidatos com maior evidência podem ser promovidos. Candidatos com evidência fraca devem ser devolvidos para benchmarking.",
      en: "Candidates with strong evidence may be promoted. Candidates with weak evidence should be returned for benchmarking.",
    },
    confidence: 0.70,
    uncertainties: [
      {
        pt: "Prioridade relativa entre candidatos concorrentes não está clara.",
        en: "Relative priority among competing candidates is unclear.",
      },
      {
        pt: "Impacto combinado de múltiplas aprovações simultâneas não foi avaliado.",
        en: "Combined impact of multiple simultaneous approvals has not been assessed.",
      },
    ],
    suggestedActions: [
      { label: { pt: "Ordenar por evidência", en: "Sort by evidence" }, route: "/candidates", icon: "ArrowUpDown" },
      { label: { pt: "Enviar fracos para benchmark", en: "Send weak ones to benchmark" }, route: "/benchmarks", icon: "BarChart3" },
      { label: { pt: "Revisar evidência associada", en: "Review associated evidence" }, route: "/evidence", icon: "FileSearch" },
    ],
  },
};

export function getGovernanceMentorContent(pageKey: string): GovernanceMentorContent | undefined {
  return MENTOR_CONTENT[pageKey];
}

export function hasGovernanceMentorContent(pageKey: string): boolean {
  return pageKey in MENTOR_CONTENT;
}

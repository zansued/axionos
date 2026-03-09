/**
 * Contextual Guidance — Page Guidance Contracts
 *
 * Single source of truth for all area-level guidance data.
 * Organized by surface: Product, Workspace Governance, Platform Governance.
 */

import type { PageGuidanceContract } from "./types";

// ─── Product Surface ──────────────────────────────────────────────────────

export const PRODUCT_GUIDANCE: PageGuidanceContract[] = [
  {
    key: "dashboard",
    title: { pt: "Dashboard", en: "Dashboard" },
    description: {
      pt: "Visão geral do progresso das suas iniciativas, métricas de entrega e status da plataforma.",
      en: "Overview of your initiative progress, delivery metrics, and platform status.",
    },
    audience: { pt: "Todos os usuários", en: "All users" },
    surface: "product",
    actions: [
      { pt: "Ver KPIs de entrega", en: "View delivery KPIs" },
      { pt: "Acompanhar jornada da ideia ao deploy", en: "Track idea-to-deploy journey" },
      { pt: "Navegar para iniciativas ativas", en: "Navigate to active initiatives" },
    ],
    whenRelevant: {
      pt: "Sempre que quiser um panorama rápido do estado atual das suas entregas.",
      en: "Whenever you want a quick overview of your current delivery state.",
    },
    whenIgnorable: {
      pt: "Se você já sabe exatamente qual iniciativa ou etapa quer acompanhar.",
      en: "If you already know exactly which initiative or stage you want to track.",
    },
    nextStep: {
      pt: "Criar uma nova iniciativa ou acompanhar uma existente.",
      en: "Create a new initiative or track an existing one.",
    },
    approvalPosture: "none",
  },
  {
    key: "journey",
    title: { pt: "Jornada", en: "Journey" },
    description: {
      pt: "Visualização guiada da jornada da ideia ao software implantado, com status de cada etapa.",
      en: "Guided visualization of the idea-to-deployed-software journey with stage status.",
    },
    audience: { pt: "Todos os usuários", en: "All users" },
    surface: "product",
    actions: [
      { pt: "Ver progresso por estágio", en: "View progress by stage" },
      { pt: "Entender o que vem a seguir", en: "Understand what comes next" },
    ],
    whenRelevant: {
      pt: "Quando quiser entender em que ponto da jornada sua iniciativa está.",
      en: "When you want to understand where your initiative stands in the journey.",
    },
    whenIgnorable: {
      pt: "Se já está acompanhando o pipeline diretamente na área de Iniciativas.",
      en: "If you're already tracking the pipeline directly in the Initiatives area.",
    },
    nextStep: {
      pt: "Avançar a iniciativa para o próximo estágio ou revisar artefatos gerados.",
      en: "Advance the initiative to the next stage or review generated artifacts.",
    },
    approvalPosture: "optional",
    approvalHint: {
      pt: "Algumas transições de estágio podem exigir aprovação humana antes de avançar.",
      en: "Some stage transitions may require human approval before advancing.",
    },
  },
  {
    key: "onboarding",
    title: { pt: "Onboarding", en: "Onboarding" },
    description: {
      pt: "Guia interativo para configurar sua organização e criar sua primeira iniciativa.",
      en: "Interactive guide to set up your organization and create your first initiative.",
    },
    audience: { pt: "Novos usuários", en: "New users" },
    surface: "product",
    actions: [
      { pt: "Completar passos de configuração", en: "Complete setup steps" },
      { pt: "Criar primeira iniciativa", en: "Create first initiative" },
    ],
    whenRelevant: {
      pt: "Na primeira vez que acessar a plataforma ou quando quiser rever a configuração inicial.",
      en: "The first time you access the platform or when you want to review initial setup.",
    },
    whenIgnorable: {
      pt: "Se já completou o onboarding e tem iniciativas ativas.",
      en: "If you've already completed onboarding and have active initiatives.",
    },
    nextStep: {
      pt: "Acessar o Dashboard ou criar sua primeira iniciativa.",
      en: "Access the Dashboard or create your first initiative.",
    },
    approvalPosture: "none",
  },
  {
    key: "initiatives",
    title: { pt: "Iniciativas", en: "Initiatives" },
    description: {
      pt: "Gerencie suas iniciativas: da ideia ao software entregue, com pipeline governado e aprovação humana.",
      en: "Manage your initiatives: from idea to delivered software, with governed pipeline and human approval.",
    },
    audience: { pt: "Todos os usuários", en: "All users" },
    surface: "product",
    actions: [
      { pt: "Criar nova iniciativa", en: "Create new initiative" },
      { pt: "Executar estágios do pipeline", en: "Run pipeline stages" },
      { pt: "Aprovar ou rejeitar artefatos", en: "Approve or reject artifacts" },
      { pt: "Acompanhar progresso e métricas", en: "Track progress and metrics" },
    ],
    whenRelevant: {
      pt: "Sempre que quiser transformar uma ideia em software ou acompanhar entregas em andamento.",
      en: "Whenever you want to turn an idea into software or track ongoing deliveries.",
    },
    whenIgnorable: {
      pt: "Se não tem nenhuma ideia nova e todas as iniciativas estão em dia.",
      en: "If you don't have any new ideas and all initiatives are up to date.",
    },
    nextStep: {
      pt: "Revisar artefatos gerados ou aprovar a próxima transição de estágio.",
      en: "Review generated artifacts or approve the next stage transition.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Transições críticas do pipeline exigem aprovação humana antes de avançar.",
      en: "Critical pipeline transitions require human approval before advancing.",
    },
  },
  {
    key: "deployments",
    title: { pt: "Deployments", en: "Deployments" },
    description: {
      pt: "Visualize e gerencie artefatos publicados: repositórios, deploys e URLs de acesso.",
      en: "View and manage published artifacts: repositories, deploys, and access URLs.",
    },
    audience: { pt: "Todos os usuários", en: "All users" },
    surface: "product",
    actions: [
      { pt: "Ver URLs de deploy", en: "View deploy URLs" },
      { pt: "Acessar repositórios gerados", en: "Access generated repositories" },
      { pt: "Verificar status de publicação", en: "Check publication status" },
    ],
    whenRelevant: {
      pt: "Quando uma iniciativa chegou ao estágio de deploy e você quer acessar o resultado.",
      en: "When an initiative reached the deploy stage and you want to access the result.",
    },
    whenIgnorable: {
      pt: "Se nenhuma iniciativa está no estágio de deploy ainda.",
      en: "If no initiative is at the deploy stage yet.",
    },
    nextStep: {
      pt: "Compartilhar a URL do deploy ou iniciar uma nova iniciativa.",
      en: "Share the deploy URL or start a new initiative.",
    },
    approvalPosture: "none",
  },
];

// ─── Workspace Governance Surface ─────────────────────────────────────────

export const WORKSPACE_GUIDANCE: PageGuidanceContract[] = [
  {
    key: "adoption",
    title: { pt: "Adoção", en: "Adoption" },
    description: {
      pt: "Análise de adoção e fricção na jornada do usuário dentro da plataforma.",
      en: "Adoption analysis and friction tracking in the user journey within the platform.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Analisar clusters de fricção", en: "Analyze friction clusters" },
      { pt: "Revisar eventos de jornada", en: "Review journey events" },
    ],
    whenRelevant: {
      pt: "Quando quiser entender como os usuários estão progredindo na plataforma.",
      en: "When you want to understand how users are progressing in the platform.",
    },
    whenIgnorable: {
      pt: "Se o foco atual é na execução do pipeline, não na adoção.",
      en: "If the current focus is on pipeline execution, not adoption.",
    },
    nextStep: {
      pt: "Implementar melhorias com base nos sinais de fricção detectados.",
      en: "Implement improvements based on detected friction signals.",
    },
    approvalPosture: "none",
  },
  {
    key: "evidence",
    title: { pt: "Evidências", en: "Evidence" },
    description: {
      pt: "Base de evidências que fundamentam decisões de governança, aprendizado e roteamento.",
      en: "Evidence base supporting governance decisions, learning, and routing.",
    },
    audience: { pt: "Operadores e revisores", en: "Operators and reviewers" },
    surface: "workspace",
    actions: [
      { pt: "Inspecionar evidências de decisão", en: "Inspect decision evidence" },
      { pt: "Rastrear linhagem de artefatos", en: "Track artifact lineage" },
    ],
    whenRelevant: {
      pt: "Quando quiser entender por que uma decisão de governança foi tomada.",
      en: "When you want to understand why a governance decision was made.",
    },
    whenIgnorable: {
      pt: "Se não há decisões pendentes de revisão.",
      en: "If there are no pending decisions to review.",
    },
    nextStep: {
      pt: "Revisar recomendações baseadas nas evidências coletadas.",
      en: "Review recommendations based on collected evidence.",
    },
    approvalPosture: "optional",
  },
  {
    key: "candidates",
    title: { pt: "Candidatos", en: "Candidates" },
    description: {
      pt: "Regras de prevenção candidatas e propostas geradas pelo sistema para revisão humana.",
      en: "Candidate prevention rules and system-generated proposals for human review.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Revisar candidatos de regras", en: "Review rule candidates" },
      { pt: "Aprovar ou rejeitar propostas", en: "Approve or reject proposals" },
    ],
    whenRelevant: {
      pt: "Quando o sistema gerou novas propostas que precisam de revisão humana.",
      en: "When the system generated new proposals that need human review.",
    },
    whenIgnorable: {
      pt: "Se não há candidatos pendentes de revisão.",
      en: "If there are no candidates pending review.",
    },
    nextStep: {
      pt: "Ativar regras aprovadas ou solicitar mais evidências.",
      en: "Activate approved rules or request more evidence.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Candidatos de regras exigem aprovação humana antes de serem ativados.",
      en: "Rule candidates require human approval before activation.",
    },
  },
  {
    key: "benchmarks",
    title: { pt: "Benchmarks", en: "Benchmarks" },
    description: {
      pt: "Métricas comparativas de desempenho do pipeline e dos agentes ao longo do tempo.",
      en: "Comparative performance metrics of the pipeline and agents over time.",
    },
    audience: { pt: "Operadores", en: "Operators" },
    surface: "workspace",
    actions: [
      { pt: "Comparar métricas entre períodos", en: "Compare metrics across periods" },
      { pt: "Identificar tendências de melhoria", en: "Identify improvement trends" },
    ],
    whenRelevant: {
      pt: "Quando quiser avaliar se o sistema está melhorando ao longo do tempo.",
      en: "When you want to assess whether the system is improving over time.",
    },
    whenIgnorable: {
      pt: "Se o volume de execuções ainda é baixo para gerar benchmarks significativos.",
      en: "If the execution volume is still too low to generate meaningful benchmarks.",
    },
    nextStep: {
      pt: "Ajustar estratégias com base nos benchmarks observados.",
      en: "Adjust strategies based on observed benchmarks.",
    },
    approvalPosture: "none",
  },
  {
    key: "extensions",
    title: { pt: "Extensões", en: "Extensions" },
    description: {
      pt: "Gestão de extensões da plataforma: marketplace, confiança e capacidades de terceiros.",
      en: "Platform extension management: marketplace, trust, and third-party capabilities.",
    },
    audience: { pt: "Administradores", en: "Administrators" },
    surface: "workspace",
    actions: [
      { pt: "Instalar ou remover extensões", en: "Install or remove extensions" },
      { pt: "Revisar trust scores", en: "Review trust scores" },
    ],
    whenRelevant: {
      pt: "Quando quiser expandir as capacidades da plataforma com novos módulos.",
      en: "When you want to expand platform capabilities with new modules.",
    },
    whenIgnorable: {
      pt: "Se as capacidades atuais atendem suas necessidades.",
      en: "If current capabilities meet your needs.",
    },
    nextStep: {
      pt: "Testar extensões instaladas em um ambiente controlado.",
      en: "Test installed extensions in a controlled environment.",
    },
    approvalPosture: "recommended",
    approvalHint: {
      pt: "Extensões de terceiros devem ser revisadas antes de ativação em produção.",
      en: "Third-party extensions should be reviewed before production activation.",
    },
  },
];

// ─── Platform Governance Surface ──────────────────────────────────────────

export const PLATFORM_GUIDANCE: PageGuidanceContract[] = [
  {
    key: "observability",
    title: { pt: "Observabilidade", en: "Observability" },
    description: {
      pt: "Monitoramento central do sistema: custos, performance, qualidade, reparos e prevenção.",
      en: "Central system monitoring: costs, performance, quality, repairs, and prevention.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "platform",
    actions: [
      { pt: "Monitorar custos por modelo e estágio", en: "Monitor costs by model and stage" },
      { pt: "Analisar taxas de reparo e prevenção", en: "Analyze repair and prevention rates" },
      { pt: "Inspecionar eventos em tempo real", en: "Inspect real-time events" },
    ],
    whenRelevant: {
      pt: "Quando quiser entender a saúde operacional da plataforma.",
      en: "When you want to understand the operational health of the platform.",
    },
    whenIgnorable: {
      pt: "Se tudo está funcionando normalmente e não há alertas.",
      en: "If everything is running normally and there are no alerts.",
    },
    nextStep: {
      pt: "Investigar anomalias ou otimizar custos com base nos dados observados.",
      en: "Investigate anomalies or optimize costs based on observed data.",
    },
    approvalPosture: "none",
  },
  {
    key: "routing",
    title: { pt: "Roteamento IA", en: "AI Routing" },
    description: {
      pt: "Política canônica de roteamento de modelos IA: DeepSeek para economia, OpenAI para confiança.",
      en: "Canonical AI model routing policy: DeepSeek for economy, OpenAI for confidence.",
    },
    audience: { pt: "Administradores da plataforma", en: "Platform administrators" },
    surface: "platform",
    actions: [
      { pt: "Inspecionar matriz de roteamento", en: "Inspect routing matrix" },
      { pt: "Revisar triggers de fallback", en: "Review fallback triggers" },
      { pt: "Ajustar limites de escalação premium", en: "Adjust premium escalation limits" },
    ],
    whenRelevant: {
      pt: "Quando quiser otimizar custos de IA ou investigar falhas de roteamento.",
      en: "When you want to optimize AI costs or investigate routing failures.",
    },
    whenIgnorable: {
      pt: "Se o roteamento está funcionando normalmente sem anomalias de custo.",
      en: "If routing is working normally without cost anomalies.",
    },
    nextStep: {
      pt: "Revisar distribuição de providers e ajustar thresholds se necessário.",
      en: "Review provider distribution and adjust thresholds if needed.",
    },
    approvalPosture: "none",
  },
  {
    key: "audit",
    title: { pt: "Auditoria", en: "Audit" },
    description: {
      pt: "Registro completo de todas as ações do sistema: decisões, aprovações, mudanças e eventos.",
      en: "Complete record of all system actions: decisions, approvals, changes, and events.",
    },
    audience: { pt: "Administradores e revisores", en: "Administrators and reviewers" },
    surface: "platform",
    actions: [
      { pt: "Buscar eventos de auditoria", en: "Search audit events" },
      { pt: "Rastrear decisões de governança", en: "Track governance decisions" },
    ],
    whenRelevant: {
      pt: "Quando precisar rastrear uma decisão ou investigar um evento do sistema.",
      en: "When you need to trace a decision or investigate a system event.",
    },
    whenIgnorable: {
      pt: "Se não há investigações ou auditorias em andamento.",
      en: "If there are no ongoing investigations or audits.",
    },
    nextStep: {
      pt: "Documentar achados e ajustar políticas com base nos eventos auditados.",
      en: "Document findings and adjust policies based on audited events.",
    },
    approvalPosture: "none",
  },
  {
    key: "capability-governance",
    title: { pt: "Governança de Capacidades", en: "Capability Governance" },
    description: {
      pt: "Gestão de capacidades do Agent OS: seleção, confiança, políticas e evolução de agentes.",
      en: "Agent OS capability management: selection, trust, policies, and agent evolution.",
    },
    audience: { pt: "Administradores da plataforma", en: "Platform administrators" },
    surface: "platform",
    actions: [
      { pt: "Revisar níveis de confiança dos agentes", en: "Review agent trust levels" },
      { pt: "Ajustar políticas de autonomia", en: "Adjust autonomy policies" },
      { pt: "Gerenciar evolução de capacidades", en: "Manage capability evolution" },
    ],
    whenRelevant: {
      pt: "Quando quiser ajustar como os agentes são selecionados e governados.",
      en: "When you want to adjust how agents are selected and governed.",
    },
    whenIgnorable: {
      pt: "Se as políticas atuais de governança estão funcionando bem.",
      en: "If current governance policies are working well.",
    },
    nextStep: {
      pt: "Revisar recomendações dos meta-agentes e aplicar ajustes aprovados.",
      en: "Review meta-agent recommendations and apply approved adjustments.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Mudanças em políticas de agentes exigem aprovação administrativa.",
      en: "Changes to agent policies require administrative approval.",
    },
  },
  {
    key: "platform-extensions",
    title: { pt: "Extensões da Plataforma", en: "Platform Extensions" },
    description: {
      pt: "Gestão governada de extensões de plataforma: ativação, rollback e verificação de compatibilidade.",
      en: "Governed platform extension management: activation, rollback, and compatibility verification.",
    },
    audience: { pt: "Administradores da plataforma", en: "Platform administrators" },
    surface: "platform",
    actions: [
      { pt: "Ativar ou desativar extensões", en: "Activate or deactivate extensions" },
      { pt: "Reverter extensões com problemas", en: "Roll back problematic extensions" },
      { pt: "Verificar compatibilidade", en: "Check compatibility" },
    ],
    whenRelevant: {
      pt: "Quando quiser gerenciar extensões com controle de risco e governança.",
      en: "When you want to manage extensions with risk control and governance.",
    },
    whenIgnorable: {
      pt: "Se nenhuma extensão está pendente de ativação ou revisão.",
      en: "If no extension is pending activation or review.",
    },
    nextStep: {
      pt: "Revisar extensões pendentes de aprovação e verificar compatibilidade.",
      en: "Review extensions pending approval and verify compatibility.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Ativação de extensões de plataforma exige aprovação administrativa.",
      en: "Platform extension activation requires administrative approval.",
    },
  },
  {
    key: "playbooks",
    title: { pt: "Doutrina & Playbooks", en: "Doctrine & Playbooks" },
    description: {
      pt: "Orientação institucional sintetizada a partir de memória acumulada: playbooks, heurísticas e doutrinas governáveis.",
      en: "Synthesized institutional guidance from accumulated memory: playbooks, heuristics, and governable doctrines.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Revisar playbooks ativos", en: "Review active playbooks" },
      { pt: "Inspecionar linhagem de memórias", en: "Inspect memory lineage" },
      { pt: "Aprovar ou arquivar doutrinas", en: "Approve or archive doctrines" },
    ],
    whenRelevant: {
      pt: "Quando quiser entender lições recorrentes e orientação operacional consolidada.",
      en: "When you want to understand recurring lessons and consolidated operational guidance.",
    },
    whenIgnorable: {
      pt: "Se o sistema ainda está acumulando memória e poucos padrões foram consolidados.",
      en: "If the system is still accumulating memory and few patterns have been consolidated.",
    },
    nextStep: {
      pt: "Revisar doutrinas pendentes e ativar playbooks de alta confiança.",
      en: "Review pending doctrines and activate high-confidence playbooks.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Doutrinas exigem revisão humana antes de serem ativadas.",
      en: "Doctrines require human review before activation.",
    },
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────

const ALL_GUIDANCE = [...PRODUCT_GUIDANCE, ...WORKSPACE_GUIDANCE, ...PLATFORM_GUIDANCE];

export function getGuidanceForPage(key: string): PageGuidanceContract | undefined {
  return ALL_GUIDANCE.find((g) => g.key === key);
}

export function getGuidanceForSurface(surface: string): PageGuidanceContract[] {
  return ALL_GUIDANCE.filter((g) => g.surface === surface);
}

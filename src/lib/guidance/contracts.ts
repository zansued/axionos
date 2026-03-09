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
  {
    key: "bounded-operations",
    title: { pt: "Operações Autônomas Limitadas", en: "Bounded Operations" },
    description: {
      pt: "Operações autônomas seguras e repetíveis sob governança explícita, visibilidade e postura de rollback.",
      en: "Safe, repeatable autonomous operations under explicit governance, visibility, and rollback posture.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Revisar operações executadas e bloqueadas", en: "Review executed and blocked operations" },
      { pt: "Inspecionar postura de autonomia", en: "Inspect autonomy posture" },
      { pt: "Executar rollback quando necessário", en: "Execute rollback when needed" },
    ],
    whenRelevant: {
      pt: "Quando quiser monitorar operações automatizadas e garantir que permanecem dentro dos limites.",
      en: "When you want to monitor automated operations and ensure they remain within bounds.",
    },
    whenIgnorable: {
      pt: "Se não há operações autônomas pendentes ou em execução.",
      en: "If there are no pending or executing autonomous operations.",
    },
    nextStep: {
      pt: "Revisar operações bloqueadas e ajustar regras de autonomia.",
      en: "Review blocked operations and adjust autonomy rules.",
    },
    approvalPosture: "optional",
  },
  {
    key: "decision-engine",
    title: { pt: "Motor de Decisão Institucional", en: "Decision Engine" },
    description: {
      pt: "Suporte a decisões institucional usando memória, doutrina, resultados e sinais de governança para recomendações consistentes.",
      en: "Institutional decision support using memory, doctrine, outcomes, and governance signals for consistent recommendations.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Revisar recomendações pendentes", en: "Review pending recommendations" },
      { pt: "Inspecionar sinais contribuintes e trade-offs", en: "Inspect contributing signals and trade-offs" },
      { pt: "Aceitar, rejeitar, adiar ou escalar decisões", en: "Accept, reject, defer, or escalate decisions" },
    ],
    whenRelevant: {
      pt: "Quando houver recomendações de decisão pendentes baseadas em inteligência institucional.",
      en: "When there are pending decision recommendations based on institutional intelligence.",
    },
    whenIgnorable: {
      pt: "Se não há decisões pendentes de revisão.",
      en: "If there are no decisions pending review.",
    },
    nextStep: {
      pt: "Revisar decisões de alta confiança e resolver decisões escaladas.",
      en: "Review high-confidence decisions and resolve escalated decisions.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Decisões sensíveis e estruturais exigem aprovação humana explícita.",
      en: "Sensitive and structural decisions require explicit human approval.",
    },
  },
  {
    key: "doctrine-adaptation",
    title: { pt: "Adaptação Doutrinária", en: "Doctrine Adaptation" },
    description: {
      pt: "Adapte doutrinas operacionais por contexto institucional. Avalie compatibilidade, detecte drift e preserve princípios centrais.",
      en: "Adapt operational doctrines by institutional context. Evaluate compatibility, detect drift, and preserve core principles.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Avaliar compatibilidade doutrinária por contexto", en: "Evaluate doctrine compatibility by context" },
      { pt: "Visualizar matriz de adaptação", en: "View adaptation matrix" },
      { pt: "Monitorar eventos de drift doutrinário", en: "Monitor doctrine drift events" },
      { pt: "Inspecionar explicações de adaptação", en: "Inspect adaptation explanations" },
    ],
    whenRelevant: {
      pt: "Quando o sistema opera em múltiplos contextos institucionais com doutrinas que podem precisar de adaptação.",
      en: "When the system operates across multiple institutional contexts with doctrines that may need adaptation.",
    },
    whenIgnorable: {
      pt: "Se há apenas um contexto operacional ativo.",
      en: "If there is only one active operational context.",
    },
    nextStep: {
      pt: "Revisar avaliações conflitantes e resolver eventos de drift abertos.",
      en: "Review conflicting evaluations and resolve open drift events.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Adaptações de doutrinas centrais ou imutáveis exigem revisão humana.",
      en: "Adaptations of core or immutable doctrines require human review.",
    },
  },
  {
    key: "institutional-conflicts",
    title: { pt: "Conflitos Institucionais", en: "Institutional Conflicts" },
    description: {
      pt: "Detecte, classifique e resolva conflitos entre políticas, doutrinas, jurisdições e prioridades institucionais.",
      en: "Detect, classify, and resolve conflicts between policies, doctrines, jurisdictions, and institutional priorities.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Visualizar conflitos abertos e triados", en: "View open and triaged conflicts" },
      { pt: "Analisar caminhos de resolução sugeridos", en: "Analyze suggested resolution paths" },
      { pt: "Comparar com precedentes institucionais", en: "Compare with institutional precedents" },
      { pt: "Escalar conflitos severos", en: "Escalate severe conflicts" },
    ],
    whenRelevant: {
      pt: "Quando há conflitos institucionais detectados ou tensões entre políticas e doutrinas.",
      en: "When institutional conflicts are detected or tensions exist between policies and doctrines.",
    },
    whenIgnorable: {
      pt: "Se não há conflitos abertos.",
      en: "If there are no open conflicts.",
    },
    nextStep: {
      pt: "Triar conflitos detectados e gerar caminhos de resolução.",
      en: "Triage detected conflicts and generate resolution paths.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Conflitos severos ou estruturais exigem aprovação humana para resolução.",
      en: "Severe or structural conflicts require human approval for resolution.",
    },
  },
  {
    key: "federated-boundaries",
    title: { pt: "Fronteiras Federadas", en: "Federated Boundaries" },
    description: {
      pt: "Controle o que atravessa fronteiras entre domínios, tenants e unidades — com políticas, transformações e explicabilidade.",
      en: "Control what crosses boundaries between domains, tenants, and units — with policies, transformations, and explainability.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Visualizar mapa de fronteiras federadas", en: "View federated boundary map" },
      { pt: "Analisar decisões de transferência", en: "Analyze transfer decisions" },
      { pt: "Detectar violações de fronteira", en: "Detect boundary violations" },
      { pt: "Verificar padrões compartilhados", en: "Check shared patterns" },
    ],
    whenRelevant: {
      pt: "Quando há necessidade de cooperação controlada entre domínios ou tenants.",
      en: "When controlled cooperation between domains or tenants is needed.",
    },
    whenIgnorable: {
      pt: "Se opera em domínio único sem federação.",
      en: "If operating in a single domain without federation.",
    },
    nextStep: {
      pt: "Modelar fronteiras e definir políticas de transferência.",
      en: "Model boundaries and define transfer policies.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Transferências entre fronteiras controladas ou hard exigem revisão.",
      en: "Transfers across controlled or hard boundaries require review.",
    },
  },
  {
    key: "resilience-continuity",
    title: { pt: "Resiliência & Continuidade", en: "Resilience & Continuity" },
    description: {
      pt: "Mapeie fragilidades institucionais, planeje continuidade e governe resiliência operacional.",
      en: "Map institutional fragilities, plan continuity, and govern operational resilience.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Mapear ativos críticos e dependências", en: "Map critical assets and dependencies" },
      { pt: "Medir resiliência por domínio", en: "Measure resilience by domain" },
      { pt: "Gerenciar planos de continuidade", en: "Manage continuity plans" },
      { pt: "Acompanhar incidentes e cobertura", en: "Track incidents and coverage" },
    ],
    whenRelevant: {
      pt: "Quando há necessidade de avaliar fragilidade institucional ou planejar resposta a disrupções.",
      en: "When institutional fragility assessment or disruption response planning is needed.",
    },
    whenIgnorable: {
      pt: "Se a postura de resiliência é nominal e não há incidentes abertos.",
      en: "If resilience posture is nominal and no incidents are open.",
    },
    nextStep: {
      pt: "Mapear ativos críticos e definir planos de continuidade.",
      en: "Map critical assets and define continuity plans.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Ativação de planos de continuidade para disrupções críticas exige aprovação humana.",
      en: "Activation of continuity plans for critical disruptions requires human approval.",
    },
  },
  {
    key: "memory-constitution",
    title: { pt: "Constituição de Memória", en: "Memory Constitution" },
    description: {
      pt: "Governe o que a instituição deve lembrar, pode esquecer, deve preservar e pode reconstruir.",
      en: "Govern what the institution must remember, may forget, must preserve, and can reconstruct.",
    },
    audience: { pt: "Operadores e administradores", en: "Operators and administrators" },
    surface: "workspace",
    actions: [
      { pt: "Classificar ativos de memória institucional", en: "Classify institutional memory assets" },
      { pt: "Gerenciar políticas de retenção", en: "Manage retention policies" },
      { pt: "Monitorar eventos de perda de memória", en: "Monitor memory loss events" },
      { pt: "Inspecionar caminhos de reconstrução", en: "Inspect reconstruction paths" },
    ],
    whenRelevant: {
      pt: "Quando há risco de amnésia institucional ou necessidade de governar retenção de conhecimento.",
      en: "When institutional amnesia risk exists or knowledge retention governance is needed.",
    },
    whenIgnorable: {
      pt: "Se a postura de memória é saudável e não há eventos de perda.",
      en: "If memory posture is healthy and no loss events exist.",
    },
    nextStep: {
      pt: "Classificar memórias críticas e definir políticas de retenção.",
      en: "Classify critical memories and define retention policies.",
    },
    approvalPosture: "required",
    approvalHint: {
      pt: "Exclusão de memória crítica ou precedente protegido exige revisão humana.",
      en: "Deletion of critical memory or protected precedent requires human review.",
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

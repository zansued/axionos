import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Database, BookOpen, Search, Activity, Zap, Eye, GitBranch,
  Shield, Brain, Download, Scale, Route, HeartPulse,
  Library, Lightbulb, ShieldCheck, Target, Boxes, UserCheck,
} from "lucide-react";
import { useCanonIntelligence } from "@/hooks/useCanonIntelligence";
import { useCanonStewardship } from "@/hooks/useCanonStewardship";
import { useCanonRuntime } from "@/hooks/useCanonRuntime";
import { useCanonLearning } from "@/hooks/useCanonLearning";
import { useCanonPipeline } from "@/hooks/useCanonPipeline";

import { PatternLibraryTab } from "@/components/canon-intelligence/PatternLibraryTab";
import { QueryConsoleTab } from "@/components/canon-intelligence/QueryConsoleTab";
import { UsageAnalyticsTab } from "@/components/canon-intelligence/UsageAnalyticsTab";
import { ApplicationsTab } from "@/components/canon-intelligence/ApplicationsTab";
import { RetrievalExplorerTab } from "@/components/canon-intelligence/RetrievalExplorerTab";
import { CanonGraphTab } from "@/components/canon-intelligence/CanonGraphTab";
import { CanonGovernanceTab } from "@/components/canon-intelligence/CanonGovernanceTab";
import { OperationalLearningTab } from "@/components/canon-intelligence/OperationalLearningTab";
import { CanonIngestionPanel } from "@/components/canon-intelligence/CanonIngestionPanel";
import { RepoTrustTab } from "@/components/canon-intelligence/RepoTrustTab";
import { KnowledgeLineageTab } from "@/components/canon-intelligence/KnowledgeLineageTab";
import { KnowledgeRenewalTab } from "@/components/canon-intelligence/KnowledgeRenewalTab";
import { SkillExtractionTab } from "@/components/canon-intelligence/SkillExtractionTab";
import { SkillReviewTab } from "@/components/canon-intelligence/SkillReviewTab";
import { CapabilityBindingTab } from "@/components/canon-intelligence/CapabilityBindingTab";
import { SkillRuntimeTab } from "@/components/canon-intelligence/SkillRuntimeTab";
import { LifecycleHealthCheck } from "@/components/canon-intelligence/LifecycleHealthCheck";
import { HumanReviewTab } from "@/components/canon-intelligence/HumanReviewTab";

/* ──────────────── Definições de seções ──────────────── */

const SECTIONS = [
  {
    key: "knowledge",
    label: "Biblioteca de Conhecimento",
    icon: Library,
    description: "Explore e pesquise os padrões, regras e inteligência arquitetural conhecidos pelo sistema.",
    defaultTab: "library",
    tabs: [
      { value: "library", label: "Biblioteca de Padrões", icon: BookOpen },
      { value: "query", label: "Console de Consulta", icon: Search },
      { value: "graph", label: "Grafo Canon", icon: GitBranch },
    ],
  },
  {
    key: "ingestion",
    label: "Ingestão & Aprendizado",
    icon: Lightbulb,
    description: "Observe como novos conhecimentos entram no sistema e como sinais operacionais geram aprendizado.",
    defaultTab: "ingestion-agent",
    tabs: [
      { value: "ingestion-agent", label: "Agente de Ingestão", icon: Download },
      { value: "learning", label: "Aprendizado Operacional", icon: Brain },
      { value: "trust", label: "Confiança de Repo", icon: Scale },
    ],
  },
  {
    key: "governance",
    label: "Governança & Confiança",
    icon: ShieldCheck,
    description: "Revise, valide, rastreie e mantenha o ciclo de vida do conhecimento canônico.",
    defaultTab: "governance-tab",
    tabs: [
      { value: "governance-tab", label: "Governança", icon: Shield },
      { value: "human-review", label: "Revisão Humana", icon: UserCheck },
      { value: "lineage", label: "Linhagem", icon: Route },
      { value: "renewal", label: "Renovação", icon: HeartPulse },
    ],
  },
  {
    key: "skills",
    label: "Pipeline de Skills",
    icon: Boxes,
    description: "Extraia, revise e governe skills de engenharia derivadas do conhecimento canônico.",
    defaultTab: "extraction",
    tabs: [
      { value: "extraction", label: "Extração", icon: Boxes },
      { value: "review", label: "Revisão de Skills", icon: Shield },
      { value: "bindings", label: "Vínculo de Capacidades", icon: Route },
      { value: "runtime", label: "Uso em Runtime", icon: Zap },
    ],
  },
  {
    key: "application",
    label: "Aplicação de Conhecimento",
    icon: Target,
    description: "Acompanhe como o conhecimento é recuperado, aplicado e se produz resultados bem-sucedidos.",
    defaultTab: "retrieval",
    tabs: [
      { value: "retrieval", label: "Explorador de Recuperação", icon: Eye },
      { value: "analytics", label: "Análise de Uso", icon: Activity },
      { value: "applications", label: "Aplicações", icon: Zap },
    ],
  },
] as const;

/* ──────────────── Tooltips das métricas ──────────────── */

const METRIC_TOOLTIPS: Record<string, string> = {
  "Entradas Canon": "Total de entradas de conhecimento canônico registradas no sistema.",
  "Ativas": "Entradas atualmente aprovadas e utilizadas ativamente pelos agentes.",
  "Candidatas": "Candidatas a conhecimento aguardando revisão ou promoção.",
  "Deprecadas": "Entradas marcadas como deprecadas e não mais utilizadas ativamente.",
  "Aplicações": "Vezes que o conhecimento canônico foi aplicado durante a execução de agentes. (Passivo — populado por telemetria de runtime)",
  "Sessões": "Sessões de recuperação onde agentes consultaram conhecimento canônico. (Passivo — populado por telemetria de runtime)",
  "Fila de Aprendizado": "Candidatas de aprendizado pendentes ainda não revisadas.",
  "Top Agente": "Tipo de agente com mais sessões de recuperação. (Passivo — populado por telemetria de runtime)",
};

/* ──────────────── Componente principal ──────────────── */

export default function CanonIntelligenceDashboard() {
  const intel = useCanonIntelligence();
  const stewardship = useCanonStewardship();
  const runtime = useCanonRuntime();
  const learning = useCanonLearning();

  const [activeSection, setActiveSection] = useState<string>("knowledge");
  const [activeTabOverride, setActiveTabOverride] = useState<string | null>(null);

  const pipeline = useCanonPipeline();
  const pStats = pipeline.stats;

  const activeEntries = stewardship.library.filter(
    (e: any) => e.lifecycle_status === "approved"
  );
  const deprecatedEntries = stewardship.library.filter(
    (e: any) => e.lifecycle_status === "deprecated"
  );
  const pendingLearning = learning.candidates.filter(
    (c: any) => c.review_status === "pending" && !c.noise_suppressed
  );

  const agentCounts = new Map<string, number>();
  runtime.sessions.forEach((s: any) => {
    const a = s.agent_type || "unknown";
    agentCounts.set(a, (agentCounts.get(a) || 0) + 1);
  });
  const topAgent = [...agentCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const metrics = [
    { value: stewardship.library.length, label: "Entradas Canon" },
    { value: activeEntries.length, label: "Ativas", accent: true },
    { value: intel.candidates.length, label: "Candidatas" },
    { value: deprecatedEntries.length, label: "Deprecadas", warn: deprecatedEntries.length > 0 },
    { value: runtime.analytics.totalApplications, label: "Aplicações", passive: true },
    { value: runtime.analytics.totalSessions, label: "Sessões", passive: true },
    { value: pendingLearning.length, label: "Fila de Aprendizado", accent: true },
    { value: topAgent ? topAgent[1] : 0, label: topAgent ? topAgent[0] : "Top Agente", passive: true },
  ];

  /* ── Renderizador de conteúdo de aba ── */
  function renderTabContent(tabValue: string) {
    switch (tabValue) {
      case "library":
        return <PatternLibraryTab library={stewardship.library} loading={stewardship.loading} />;
      case "query":
        return <QueryConsoleTab library={stewardship.library} />;
      case "graph":
        return (
          <CanonGraphTab
            library={stewardship.library}
            supersessions={stewardship.supersessions}
            conflicts={stewardship.conflicts}
          />
        );
      case "ingestion-agent":
        return (
          <CanonIngestionPanel
            sources={intel.sources}
            syncRuns={intel.syncRuns}
            onRefresh={() => { intel.refetch(); stewardship.refetch(); }}
            onNavigateToHumanReview={() => {
              setActiveSection("governance");
              setActiveTabOverride("human-review");
            }}
          />
        );
      case "learning":
        return (
          <OperationalLearningTab
            candidates={learning.candidates}
            signals={learning.signals}
            failurePatterns={learning.failurePatterns}
            refactorPatterns={learning.refactorPatterns}
            successPatterns={learning.successPatterns}
            validationPatterns={learning.validationPatterns}
            loading={learning.loading}
          />
        );
      case "trust":
        return <RepoTrustTab />;
      case "governance-tab":
        return (
          <CanonGovernanceTab
            library={stewardship.library}
            reviews={stewardship.reviews}
            conflicts={stewardship.conflicts}
            supersessions={stewardship.supersessions}
            candidates={intel.candidates}
          />
        );
      case "human-review":
        return <HumanReviewTab />;
      case "lineage":
        return <KnowledgeLineageTab />;
      case "renewal":
        return <KnowledgeRenewalTab />;
      case "extraction":
        return <SkillExtractionTab />;
      case "review":
        return <SkillReviewTab />;
      case "bindings":
        return <CapabilityBindingTab />;
      case "runtime":
        return <SkillRuntimeTab />;
      case "retrieval":
        return <RetrievalExplorerTab sessions={runtime.sessions} feedback={runtime.feedback} />;
      case "analytics":
        return (
          <UsageAnalyticsTab
            sessions={runtime.sessions}
            applications={runtime.applications}
            feedback={runtime.feedback}
            analytics={runtime.analytics}
          />
        );
      case "applications":
        return <ApplicationsTab applications={runtime.applications} sessions={runtime.sessions} />;
      default:
        return null;
    }
  }

  const currentSection = SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0];

  return (
    <AppShell>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-5">
          {/* ── Cabeçalho ── */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <Database className="h-6 w-6 text-primary" />
              Hub de Inteligência Canon
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Centro de controle de conhecimento — explore, aprenda, governe e observe a inteligência de implementação
            </p>
          </div>

          {/* ── Métricas do Dashboard ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {metrics.map((m) => (
              <TopMetric key={m.label} {...m} />
            ))}
          </div>

          {/* ── Seletor de Seção ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  onClick={() => { setActiveSection(section.key); setActiveTabOverride(null); }}
                  className={`text-left rounded-xl border p-4 transition-all duration-200 ${
                    isActive
                      ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10 ring-1 ring-primary/20"
                      : "border-border/30 bg-card/40 hover:bg-card/60 hover:border-border/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`p-1.5 rounded-lg ${isActive ? "bg-primary/15" : "bg-muted/30"}`}>
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {section.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2">
                    {section.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* ── Conteúdo da Seção Ativa ── */}
          <Card className="border-border/30 bg-card/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <currentSection.icon className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{currentSection.label}</CardTitle>
                  <CardDescription className="text-xs">{currentSection.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs
                defaultValue={activeTabOverride && activeSection === currentSection.key ? activeTabOverride : currentSection.defaultTab}
                key={activeTabOverride ? `${currentSection.key}-${activeTabOverride}` : currentSection.key}
                onValueChange={() => setActiveTabOverride(null)}
                className="space-y-4"
              >
                <TabsList className="bg-muted/20 border border-border/20 h-auto gap-0.5 p-1">
                  {currentSection.tabs.map((tab) => {
                    const TabIcon = tab.icon;
                    return (
                      <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5">
                        <TabIcon className="h-3.5 w-3.5" />
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {currentSection.tabs.map((tab) => (
                  <TabsContent key={tab.value} value={tab.value}>
                    {renderTabContent(tab.value)}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* ── Verificação de Saúde do Ciclo de Vida ── */}
          {activeSection === "governance" && <LifecycleHealthCheck />}
        </div>
      </TooltipProvider>
    </AppShell>
  );
}

/* ──────────────── TopMetric com Tooltip ──────────────── */

function TopMetric({ value, label, accent, warn, passive }: { value: number; label: string; accent?: boolean; warn?: boolean; passive?: boolean }) {
  const color = warn ? "text-amber-400" : accent ? "text-primary" : passive ? "text-muted-foreground" : "text-foreground";
  const tooltip = METRIC_TOOLTIPS[label] || `Valor atual para ${label}`;
  const isPassiveEmpty = passive && value === 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={`border-border/30 bg-card/40 hover:bg-card/60 transition-colors cursor-default ${passive ? "opacity-60" : ""}`}>
          <CardContent className="pt-3.5 pb-2.5 text-center">
            {isPassiveEmpty ? (
              <p className="text-[10px] text-muted-foreground/50 italic leading-tight mt-1">Sem telemetria</p>
            ) : (
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            )}
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
              {passive && "⏸ "}{label}
            </p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

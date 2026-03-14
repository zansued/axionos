import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Database, BookOpen, Search, Activity, Zap, Eye, GitBranch,
  Shield, Brain, Download, Scale, Route, HeartPulse,
  Library, Lightbulb, ShieldCheck, Target, Boxes,
} from "lucide-react";
import { useCanonIntelligence } from "@/hooks/useCanonIntelligence";
import { useCanonStewardship } from "@/hooks/useCanonStewardship";
import { useCanonRuntime } from "@/hooks/useCanonRuntime";
import { useCanonLearning } from "@/hooks/useCanonLearning";

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

/* ──────────────── Section definitions ──────────────── */

const SECTIONS = [
  {
    key: "knowledge",
    label: "Knowledge Library",
    icon: Library,
    description: "Explore and search the system's known patterns, rules, and architectural intelligence.",
    defaultTab: "library",
    tabs: [
      { value: "library", label: "Pattern Library", icon: BookOpen },
      { value: "query", label: "Query Console", icon: Search },
      { value: "graph", label: "Canon Graph", icon: GitBranch },
    ],
  },
  {
    key: "ingestion",
    label: "Knowledge Ingestion & Learning",
    icon: Lightbulb,
    description: "Observe how new knowledge enters the system and how operational signals produce learning.",
    defaultTab: "ingestion-agent",
    tabs: [
      { value: "ingestion-agent", label: "Ingestion Agent", icon: Download },
      { value: "learning", label: "Operational Learning", icon: Brain },
      { value: "trust", label: "Repo Trust", icon: Scale },
    ],
  },
  {
    key: "governance",
    label: "Governance & Trust",
    icon: ShieldCheck,
    description: "Review, validate, trace, and maintain the lifecycle of canonical knowledge.",
    defaultTab: "governance-tab",
    tabs: [
      { value: "governance-tab", label: "Governance", icon: Shield },
      { value: "lineage", label: "Lineage", icon: Route },
      { value: "renewal", label: "Renewal", icon: HeartPulse },
    ],
  },
  {
    key: "skills",
    label: "Skills Pipeline",
    icon: Boxes,
    description: "Extract, review, and govern engineering skills derived from canonical knowledge.",
    defaultTab: "extraction",
    tabs: [
      { value: "extraction", label: "Extraction", icon: Boxes },
      { value: "review", label: "Skill Review", icon: Shield },
    ],
  },
  {
    key: "application",
    label: "Knowledge Application",
    icon: Target,
    description: "Track how knowledge is retrieved, applied, and whether it produces successful outcomes.",
    defaultTab: "retrieval",
    tabs: [
      { value: "retrieval", label: "Retrieval Explorer", icon: Eye },
      { value: "analytics", label: "Usage Analytics", icon: Activity },
      { value: "applications", label: "Applications", icon: Zap },
    ],
  },
] as const;

/* ──────────────── Metric tooltips ──────────────── */

const METRIC_TOOLTIPS: Record<string, string> = {
  "Canon Entries": "Total canonical knowledge entries registered in the system.",
  Active: "Entries currently approved and actively used by agents.",
  Candidates: "Knowledge candidates awaiting review or promotion.",
  Deprecated: "Entries marked as deprecated and no longer actively used.",
  Applications: "Times canonical knowledge was applied during agent execution.",
  Sessions: "Retrieval sessions where agents consulted canonical knowledge.",
  "Learning Queue": "Pending learning candidates not yet reviewed.",
  "Top Agent": "Agent type with the most retrieval sessions.",
};

/* ──────────────── Main component ──────────────── */

export default function CanonIntelligenceDashboard() {
  const intel = useCanonIntelligence();
  const stewardship = useCanonStewardship();
  const runtime = useCanonRuntime();
  const learning = useCanonLearning();

  const [activeSection, setActiveSection] = useState<string>("knowledge");

  const activeEntries = stewardship.library.filter(
    (e: any) => e.lifecycle_status === "approved" || e.lifecycle_status === "active"
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
    { value: stewardship.library.length, label: "Canon Entries" },
    { value: activeEntries.length, label: "Active", accent: true },
    { value: intel.candidates.length, label: "Candidates" },
    { value: deprecatedEntries.length, label: "Deprecated", warn: deprecatedEntries.length > 0 },
    { value: runtime.analytics.totalApplications, label: "Applications", accent: true },
    { value: runtime.analytics.totalSessions, label: "Sessions" },
    { value: pendingLearning.length, label: "Learning Queue", accent: true },
    { value: topAgent ? topAgent[1] : 0, label: topAgent ? topAgent[0] : "Top Agent" },
  ];

  /* ── Tab content renderer ── */
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
      case "lineage":
        return <KnowledgeLineageTab />;
      case "renewal":
        return <KnowledgeRenewalTab />;
      case "extraction":
        return <SkillExtractionTab />;
      case "review":
        return <SkillReviewTab />;
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
          {/* ── Header ── */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <Database className="h-6 w-6 text-primary" />
              Canon Intelligence Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Knowledge control center — explore, learn, govern, and observe implementation intelligence
            </p>
          </div>

          {/* ── Dashboard Metrics ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {metrics.map((m) => (
              <TopMetric key={m.label} {...m} />
            ))}
          </div>

          {/* ── Section Selector ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
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

          {/* ── Active Section Content ── */}
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
              <Tabs defaultValue={currentSection.defaultTab} key={currentSection.key} className="space-y-4">
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
        </div>
      </TooltipProvider>
    </AppShell>
  );
}

/* ──────────────── TopMetric with Tooltip ──────────────── */

function TopMetric({ value, label, accent, warn }: { value: number; label: string; accent?: boolean; warn?: boolean }) {
  const color = warn ? "text-amber-400" : accent ? "text-primary" : "text-foreground";
  const tooltip = METRIC_TOOLTIPS[label] || `Current value for ${label}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="border-border/30 bg-card/40 hover:bg-card/60 transition-colors cursor-default">
          <CardContent className="pt-3.5 pb-2.5 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">{label}</p>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

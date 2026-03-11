import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, BookOpen, Search, Activity, Zap, Eye, GitBranch, Shield, Brain } from "lucide-react";
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

export default function CanonIntelligenceDashboard() {
  const intel = useCanonIntelligence();
  const stewardship = useCanonStewardship();
  const runtime = useCanonRuntime();
  const learning = useCanonLearning();

  const activeEntries = stewardship.library.filter((e: any) => e.lifecycle_status === "approved" || e.lifecycle_status === "active");
  const deprecatedEntries = stewardship.library.filter((e: any) => e.lifecycle_status === "deprecated");
  const pendingLearning = learning.candidates.filter((c: any) => c.review_status === "pending" && !c.noise_suppressed);

  // Top agents
  const agentCounts = new Map<string, number>();
  runtime.sessions.forEach((s: any) => {
    const a = s.agent_type || "unknown";
    agentCounts.set(a, (agentCounts.get(a) || 0) + 1);
  });
  const topAgent = [...agentCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <AppShell>
      <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <Database className="h-6 w-6 text-primary" />
              Canon Intelligence Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              The cognitive layer of AxionOS — explore, govern, and observe implementation intelligence
            </p>
          </div>

          {/* Top Dashboard Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <TopMetric value={stewardship.library.length} label="Canon Entries" />
            <TopMetric value={activeEntries.length} label="Active" accent />
            <TopMetric value={intel.candidates.length} label="Candidates" />
            <TopMetric value={deprecatedEntries.length} label="Deprecated" warn={deprecatedEntries.length > 0} />
            <TopMetric value={runtime.analytics.totalApplications} label="Applications" accent />
            <TopMetric value={runtime.analytics.totalSessions} label="Sessions" />
            <TopMetric value={pendingLearning.length} label="Learning Queue" accent />
            <TopMetric value={topAgent ? topAgent[1] : 0} label={topAgent ? topAgent[0] : "Top Agent"} />
          </div>

          {/* Primary Tabs */}
          <Tabs defaultValue="library" className="space-y-4">
            <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
              <TabsTrigger value="library" className="text-xs gap-1.5"><BookOpen className="h-3.5 w-3.5" />Pattern Library</TabsTrigger>
              <TabsTrigger value="query" className="text-xs gap-1.5"><Search className="h-3.5 w-3.5" />Query Console</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" />Usage Analytics</TabsTrigger>
              <TabsTrigger value="applications" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" />Applications</TabsTrigger>
              <TabsTrigger value="retrieval" className="text-xs gap-1.5"><Eye className="h-3.5 w-3.5" />Retrieval Explorer</TabsTrigger>
              <TabsTrigger value="graph" className="text-xs gap-1.5"><GitBranch className="h-3.5 w-3.5" />Canon Graph</TabsTrigger>
              <TabsTrigger value="governance" className="text-xs gap-1.5"><Shield className="h-3.5 w-3.5" />Governance</TabsTrigger>
              <TabsTrigger value="learning" className="text-xs gap-1.5"><Brain className="h-3.5 w-3.5" />Operational Learning</TabsTrigger>
            </TabsList>

            <TabsContent value="library">
              <PatternLibraryTab library={stewardship.library} loading={stewardship.loading} />
            </TabsContent>

            <TabsContent value="query">
              <QueryConsoleTab library={stewardship.library} />
            </TabsContent>

            <TabsContent value="analytics">
              <UsageAnalyticsTab
                sessions={runtime.sessions}
                applications={runtime.applications}
                feedback={runtime.feedback}
                analytics={runtime.analytics}
              />
            </TabsContent>

            <TabsContent value="applications">
              <ApplicationsTab applications={runtime.applications} sessions={runtime.sessions} />
            </TabsContent>

            <TabsContent value="retrieval">
              <RetrievalExplorerTab sessions={runtime.sessions} feedback={runtime.feedback} />
            </TabsContent>

            <TabsContent value="graph">
              <CanonGraphTab
                library={stewardship.library}
                supersessions={stewardship.supersessions}
                conflicts={stewardship.conflicts}
              />
            </TabsContent>

            <TabsContent value="governance">
              <CanonGovernanceTab
                library={stewardship.library}
                reviews={stewardship.reviews}
                conflicts={stewardship.conflicts}
                supersessions={stewardship.supersessions}
                candidates={intel.candidates}
              />
            </TabsContent>

            <TabsContent value="learning">
              <OperationalLearningTab
                candidates={learning.candidates}
                signals={learning.signals}
                failurePatterns={learning.failurePatterns}
                refactorPatterns={learning.refactorPatterns}
                successPatterns={learning.successPatterns}
                validationPatterns={learning.validationPatterns}
                loading={learning.loading}
              />
            </TabsContent>
          </Tabs>
      </div>
    </AppShell>
  );
}

function TopMetric({ value, label, accent, warn }: { value: number; label: string; accent?: boolean; warn?: boolean }) {
  const color = warn ? "text-amber-400" : accent ? "text-primary" : "text-foreground";
  return (
    <Card className="border-border/30 bg-card/40 hover:bg-card/60 transition-colors">
      <CardContent className="pt-3.5 pb-2.5 text-center">
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">{label}</p>
      </CardContent>
    </Card>
  );
}

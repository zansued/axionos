import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeartPulse, ListChecks, TrendingUp, BarChart3, Settings, Activity, GitBranch } from "lucide-react";
import { useKnowledgeRenewal } from "@/hooks/useKnowledgeRenewal";
import { KnowledgeHealthCards } from "@/components/knowledge-health/KnowledgeHealthCards";
import { RenewalQueueTable } from "@/components/knowledge-health/RenewalQueueTable";
import { ConfidenceTimeline } from "@/components/knowledge-health/ConfidenceTimeline";
import { HealthBreakdown } from "@/components/knowledge-health/HealthBreakdown";
import { AutomationControls } from "@/components/knowledge-health/AutomationControls";
import { ThroughputMetrics } from "@/components/knowledge-health/ThroughputMetrics";
import { GovernanceBridgePanel } from "@/components/knowledge-health/GovernanceBridgePanel";
import { Button } from "@/components/ui/button";

export default function KnowledgeHealthDashboard() {
  const renewal = useKnowledgeRenewal();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <HeartPulse className="h-6 w-6 text-primary" />
              Saúde do Conhecimento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitore a saúde do conhecimento institucional, pipelines de renovação e ponte de governança
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => renewal.scanTriggers.mutate()}
            disabled={renewal.scanTriggers.isPending}
          >
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            {renewal.scanTriggers.isPending ? "Escaneando…" : "Escanear Gatilhos"}
          </Button>
        </div>

        <KnowledgeHealthCards
          triggers={renewal.triggers}
          workflows={renewal.workflows}
          proposals={renewal.proposals}
          history={renewal.history}
        />

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="queue" className="text-xs gap-1.5"><ListChecks className="h-3.5 w-3.5" />Renewal Queue</TabsTrigger>
            <TabsTrigger value="bridge" className="text-xs gap-1.5"><GitBranch className="h-3.5 w-3.5" />Governance Bridge</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Confidence Timeline</TabsTrigger>
            <TabsTrigger value="breakdown" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Health Breakdown</TabsTrigger>
            <TabsTrigger value="throughput" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" />Throughput</TabsTrigger>
            <TabsTrigger value="automation" className="text-xs gap-1.5"><Settings className="h-3.5 w-3.5" />Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <RenewalQueueTable
              triggers={renewal.triggers}
              workflows={renewal.workflows}
              proposals={renewal.proposals}
              onStartRevalidation={(triggerId, mode) => renewal.startRevalidation.mutate({ triggerId, mode })}
            />
          </TabsContent>

          <TabsContent value="bridge">
            <GovernanceBridgePanel
              bridges={renewal.bridges}
              onDecide={(bridgeId, decision, notes) => renewal.decideBridge.mutate({ bridgeId, decision, notes })}
              onBackPropagate={(bridgeId) => renewal.backPropagate.mutate({ bridgeId })}
              deciding={renewal.decideBridge.isPending}
              propagating={renewal.backPropagate.isPending}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <ConfidenceTimeline history={renewal.history} />
          </TabsContent>

          <TabsContent value="breakdown">
            <HealthBreakdown triggers={renewal.triggers} workflows={renewal.workflows} />
          </TabsContent>

          <TabsContent value="throughput">
            <ThroughputMetrics
              triggers={renewal.triggers}
              workflows={renewal.workflows}
              history={renewal.history}
            />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationControls />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useGovernanceInsightsData } from "@/hooks/useGovernanceInsightsData";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, XCircle } from "lucide-react";

import { SystemHealthOverview } from "@/components/governance-insights/SystemHealthOverview";
import { ActionExecutionInsights } from "@/components/governance-insights/ActionExecutionInsights";
import { AgentPerformanceInsights } from "@/components/governance-insights/AgentPerformanceInsights";
import { CanonUsageInsights } from "@/components/governance-insights/CanonUsageInsights";
import { PolicyImpactInsights } from "@/components/governance-insights/PolicyImpactInsights";
import { RecoveryInsights, ReadinessInsights } from "@/components/governance-insights/RecoveryAndReadinessInsights";
import { LearningSignalsSummary } from "@/components/governance-insights/LearningSignalsSummary";
import { EvolutionProposalsPanel } from "@/components/governance-insights/EvolutionProposalsPanel";
import { FrictionPatternsPanel } from "@/components/governance-insights/FrictionPatternsPanel";

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-10 w-80 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-border/30">
      <CardContent className="p-12 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Governance Data Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Governance insights will appear as the system processes actions, generates learning signals,
          and creates tuning proposals. Data may be partial during early operation.
        </p>
      </CardContent>
    </Card>
  );
}

export default function GovernanceInsights() {
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filters = {
    ...(stageFilter !== "all" ? { stage: stageFilter } : {}),
    ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
  };

  const { data, isLoading, isError } = useGovernanceInsightsData(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const isEmpty = data &&
    data.systemHealth.totalActions === 0 &&
    data.proposals.totalProposals === 0 &&
    data.learningSignals.total === 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Governance Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Strategic governance intelligence — system behavior, friction patterns, evolution proposals, and operational evidence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="architecture">Architecture</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
                <SelectItem value="deploy">Deploy</SelectItem>
                <SelectItem value="runtime">Runtime</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <LoadingState />}

        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm text-destructive">Failed to load governance insights. Data may be partially available.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && isEmpty && <EmptyState />}

        {data && !isEmpty && (
          <>
            {/* System Health */}
            <SystemHealthOverview data={data.systemHealth} />

            {/* Tabbed Sections */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="bg-secondary/50 flex-wrap h-auto p-1">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">Action Execution</TabsTrigger>
                <TabsTrigger value="agents" className="text-xs">Agent Performance</TabsTrigger>
                <TabsTrigger value="canon" className="text-xs">Canon Usage</TabsTrigger>
                <TabsTrigger value="policy" className="text-xs">Policy Impact</TabsTrigger>
                <TabsTrigger value="proposals" className="text-xs">Evolution Proposals</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RecoveryInsights data={data.recovery} />
                  <ReadinessInsights data={data.readiness} />
                </div>
                <LearningSignalsSummary data={data.learningSignals} />
                <FrictionPatternsPanel patterns={data.frictionPatterns} />
              </TabsContent>

              {/* Action Execution Tab */}
              <TabsContent value="actions">
                <ActionExecutionInsights data={data.actionExecution} />
              </TabsContent>

              {/* Agent Performance Tab */}
              <TabsContent value="agents">
                <AgentPerformanceInsights data={data.agentPerformance} />
              </TabsContent>

              {/* Canon Usage Tab */}
              <TabsContent value="canon">
                <CanonUsageInsights data={data.canonUsage} />
              </TabsContent>

              {/* Policy Impact Tab */}
              <TabsContent value="policy">
                <PolicyImpactInsights data={data.policyImpact} />
              </TabsContent>

              {/* Evolution Proposals Tab */}
              <TabsContent value="proposals">
                <EvolutionProposalsPanel data={data.proposals} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

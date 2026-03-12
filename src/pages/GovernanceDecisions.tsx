import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useGovernanceDecisionsData, type DecisionFilters, type DecisionStatus, type ProposalSource, type RiskLevel } from "@/hooks/useGovernanceDecisionsData";
import { DecisionOverviewHeader } from "@/components/governance-decisions/DecisionOverviewHeader";
import { DecisionQueueTable } from "@/components/governance-decisions/DecisionQueueTable";
import { ProposalReviewPanel } from "@/components/governance-decisions/ProposalReviewPanel";
import { DecisionHistoryPanel } from "@/components/governance-decisions/DecisionHistoryPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, XCircle } from "lucide-react";

export default function GovernanceDecisions() {
  const [filters, setFilters] = useState<DecisionFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useGovernanceDecisionsData(filters);

  const selectedProposal = data?.proposals.find(p => p.id === selectedId) ?? null;

  const updateFilter = (key: keyof DecisionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              Governance Decisions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Formal review and decisioning for system evolution proposals. Every decision is explicit and auditable.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filters.proposalType || "all"} onValueChange={v => updateFilter("proposalType", v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="canon_evolution">Canon</SelectItem>
                <SelectItem value="policy_tuning">Policy</SelectItem>
                <SelectItem value="agent_selection_tuning">Agent Selection</SelectItem>
                <SelectItem value="readiness_tuning">Readiness</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={v => updateFilter("status", v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_review">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.riskLevel || "all"} onValueChange={v => updateFilter("riskLevel", v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
            <Skeleton className="h-96 rounded-lg" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm text-destructive">Failed to load governance decision data.</p>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {data && (
          <>
            <DecisionOverviewHeader overview={data.overview} />

            <Tabs defaultValue="queue" className="space-y-4">
              <TabsList className="bg-secondary/50 h-9 p-0.5">
                <TabsTrigger value="queue" className="text-xs">Decision Queue</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">Decision History</TabsTrigger>
              </TabsList>

              <TabsContent value="queue">
                <div className={`grid gap-4 ${selectedProposal ? "grid-cols-1 lg:grid-cols-[1fr_420px]" : "grid-cols-1"}`}>
                  <DecisionQueueTable
                    proposals={data.proposals}
                    onSelect={setSelectedId}
                    selectedId={selectedId}
                  />

                  {selectedProposal && (
                    <div className="border border-border/30 rounded-lg p-4 bg-card/80">
                      <ProposalReviewPanel
                        proposal={selectedProposal}
                        onClose={() => setSelectedId(null)}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history">
                <DecisionHistoryPanel proposals={data.allProposals} />
              </TabsContent>
            </Tabs>

            {/* Empty state */}
            {data.proposals.length === 0 && data.allProposals.length === 0 && (
              <Card className="border-border/30">
                <CardContent className="p-12 text-center">
                  <Scale className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Governance Proposals Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Governance proposals will appear here as the system generates evolution recommendations from operational evidence.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

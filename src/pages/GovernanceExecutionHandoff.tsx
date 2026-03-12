import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useGovernanceHandoffData, type HandoffFilters } from "@/hooks/useGovernanceHandoffData";
import { type HandoffPackage, type HandoffStatus, HANDOFF_STATUS_DEFINITIONS } from "@/lib/governance-handoff-state-machine";
import { HandoffOverviewHeader } from "@/components/governance-handoff/HandoffOverviewHeader";
import { HandoffEligibilityQueue } from "@/components/governance-handoff/HandoffEligibilityQueue";
import { HandoffWorkspacePanel } from "@/components/governance-handoff/HandoffWorkspacePanel";
import { HandoffHistoryPanel } from "@/components/governance-handoff/HandoffHistoryPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, XCircle } from "lucide-react";

export default function GovernanceExecutionHandoff() {
  const [filters, setFilters] = useState<HandoffFilters>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useGovernanceHandoffData(filters);

  const selectedHandoff = data?.handoffs.find((h) => h.handoffId === selectedId) ?? null;

  const updateFilter = (key: keyof HandoffFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value === "all" ? undefined : value }));
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
              Governance Execution Handoff
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Formal handoff preparation for governance-approved proposals. Approval ≠ implementation.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filters.proposalType || "all"} onValueChange={(v) => updateFilter("proposalType", v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="canon_evolution">Canon</SelectItem>
                <SelectItem value="policy_tuning">Policy</SelectItem>
                <SelectItem value="agent_selection_tuning">Agent Selection</SelectItem>
                <SelectItem value="readiness_tuning">Readiness</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.riskLevel || "all"} onValueChange={(v) => updateFilter("riskLevel", v)}>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
            <Skeleton className="h-96 rounded-lg" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm text-destructive">Failed to load handoff data.</p>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {data && (
          <>
            <HandoffOverviewHeader overview={data.overview} />

            <Tabs defaultValue="queue" className="space-y-4">
              <TabsList className="bg-secondary/50 h-9 p-0.5">
                <TabsTrigger value="queue" className="text-xs">Handoff Queue</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">Handoff History</TabsTrigger>
              </TabsList>

              <TabsContent value="queue">
                <div className={`grid gap-4 ${selectedHandoff ? "grid-cols-1 lg:grid-cols-[1fr_480px]" : "grid-cols-1"}`}>
                  <HandoffEligibilityQueue
                    handoffs={data.handoffs}
                    onSelect={setSelectedId}
                    selectedId={selectedId}
                  />
                  {selectedHandoff && (
                    <div className="border border-border/30 rounded-lg p-4 bg-card/80 overflow-hidden">
                      <HandoffWorkspacePanel
                        handoff={selectedHandoff}
                        onClose={() => setSelectedId(null)}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history">
                <HandoffHistoryPanel handoffs={data.allHandoffs} />
              </TabsContent>
            </Tabs>

            {data.handoffs.length === 0 && data.allHandoffs.length === 0 && (
              <Card className="border-border/30">
                <CardContent className="p-12 text-center">
                  <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Handoff-Eligible Proposals</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Approved governance proposals will appear here when ready for downstream execution handoff.
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

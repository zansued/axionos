import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MOCK_APPLICATIONS, MOCK_OVERVIEW, APPLICATION_STATUS_DEFS, type ApplicationStatus } from "@/lib/governance-change-application-types";
import { ApplicationTrackingOverviewHeader } from "@/components/governance-application/ApplicationTrackingOverviewHeader";
import { ApplicationTrackingQueue } from "@/components/governance-application/ApplicationTrackingQueue";
import { ChangeApplicationSummaryPanel } from "@/components/governance-application/ChangeApplicationSummaryPanel";
import { ApplicationLifecycleTimeline } from "@/components/governance-application/ApplicationLifecycleTimeline";
import { ScopeCompliancePanel } from "@/components/governance-application/ScopeCompliancePanel";
import { ChangeOutcomeObservationPanel } from "@/components/governance-application/ChangeOutcomeObservationPanel";
import { ApplicationRisksAlertsPanel } from "@/components/governance-application/ApplicationRisksAlertsPanel";
import { RollbackGovernanceInterventionPanel } from "@/components/governance-application/RollbackGovernanceInterventionPanel";
import { ApplicationAuditTrail } from "@/components/governance-application/ApplicationAuditTrail";
import { FollowUpGovernanceLoopPanel } from "@/components/governance-application/FollowUpGovernanceLoopPanel";
import { ApplicationHistoryPanel } from "@/components/governance-application/ApplicationHistoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Crosshair, X } from "lucide-react";

export default function GovernanceChangeApplicationTracking() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = MOCK_APPLICATIONS.filter((a) => {
    if (statusFilter !== "all" && a.applicationStatus !== statusFilter) return false;
    if (riskFilter !== "all" && a.riskLevel !== riskFilter) return false;
    if (typeFilter !== "all" && a.proposalType !== typeFilter) return false;
    return true;
  });

  const selected = MOCK_APPLICATIONS.find((a) => a.applicationId === selectedId) ?? null;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Crosshair className="h-6 w-6 text-primary" />
              Governance Change Application Tracking
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Downstream application lifecycle for governance-approved changes. Oversight, not execution.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="canon_evolution">Canon</SelectItem>
                <SelectItem value="policy_tuning">Policy</SelectItem>
                <SelectItem value="agent_selection_tuning">Agent Selection</SelectItem>
                <SelectItem value="readiness_tuning">Readiness</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(APPLICATION_STATUS_DEFS).map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview */}
        <ApplicationTrackingOverviewHeader overview={MOCK_OVERVIEW} />

        {/* Tabs: Queue + Detail vs History */}
        <Tabs defaultValue="tracking" className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="tracking" className="text-xs">Active Tracking</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">Application History</TabsTrigger>
          </TabsList>

          <TabsContent value="tracking" className="space-y-4">
            <ApplicationTrackingQueue applications={filtered} onSelect={setSelectedId} selectedId={selectedId} />

            {/* Detail workspace */}
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selected.applicationId} — {selected.changeTitle}
                  </h2>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedId(null)}>
                    <X className="h-3 w-3" /> Close
                  </Button>
                </div>

                <ChangeApplicationSummaryPanel application={selected} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ApplicationLifecycleTimeline events={selected.timelineEvents} />
                  <ScopeCompliancePanel application={selected} />
                </div>

                <ChangeOutcomeObservationPanel observations={selected.outcomeObservations} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ApplicationRisksAlertsPanel alerts={selected.alerts} />
                  <RollbackGovernanceInterventionPanel application={selected} />
                </div>

                <ApplicationAuditTrail entries={selected.auditHistory} />

                <FollowUpGovernanceLoopPanel
                  followUpActions={selected.followUpActions}
                  linkedFollowUpProposalIds={selected.linkedFollowUpProposalIds}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <ApplicationHistoryPanel applications={MOCK_APPLICATIONS} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

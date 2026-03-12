import { Card, CardContent } from "@/components/ui/card";
import type { DecisionOverview } from "@/hooks/useGovernanceDecisionsData";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Hourglass, FileSearch, PenLine, ShieldAlert } from "lucide-react";

interface Props { overview: DecisionOverview }

const cards = [
  { key: "pending", label: "Pending Review", icon: Clock, color: "text-yellow-500" },
  { key: "inReview", label: "In Review", icon: FileSearch, color: "text-blue-400" },
  { key: "approvedThisPeriod", label: "Approved (7d)", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "rejectedThisPeriod", label: "Rejected (7d)", icon: XCircle, color: "text-destructive" },
  { key: "deferred", label: "Deferred", icon: Hourglass, color: "text-muted-foreground" },
  { key: "highRiskPending", label: "High-Risk Pending", icon: ShieldAlert, color: "text-orange-500" },
] as const;

export function DecisionOverviewHeader({ overview }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          const value = overview[c.key as keyof DecisionOverview];
          return (
            <Card key={c.key} className="border-border/30 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${c.color}`} />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{value}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {(overview.oldestPendingDays > 0 || overview.awaitingEvidence > 0 || overview.needsRevision > 0) && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
          {overview.oldestPendingDays > 0 && (
            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /> Oldest pending: {overview.oldestPendingDays}d</span>
          )}
          {overview.awaitingEvidence > 0 && (
            <span className="flex items-center gap-1"><FileSearch className="h-3 w-3 text-blue-400" /> Awaiting evidence: {overview.awaitingEvidence}</span>
          )}
          {overview.needsRevision > 0 && (
            <span className="flex items-center gap-1"><PenLine className="h-3 w-3 text-orange-400" /> Needs revision: {overview.needsRevision}</span>
          )}
        </div>
      )}
    </div>
  );
}

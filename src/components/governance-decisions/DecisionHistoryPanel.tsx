import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GovernanceProposal, DecisionStatus } from "@/hooks/useGovernanceDecisionsData";
import { format } from "date-fns";
import { History } from "lucide-react";

interface Props {
  proposals: GovernanceProposal[];
}

const statusLabels: Record<DecisionStatus, string> = {
  pending_review: "Pending",
  in_review: "In Review",
  awaiting_evidence: "Awaiting Evidence",
  deferred: "Deferred",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs Revision",
};

const statusColors: Record<string, string> = {
  approved: "text-emerald-400",
  rejected: "text-destructive",
  deferred: "text-muted-foreground",
};

export function DecisionHistoryPanel({ proposals }: Props) {
  const decided = proposals.filter(p =>
    p.status === "approved" || p.status === "rejected" || p.status === "deferred"
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (decided.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No decided proposals yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" /> Decision History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/20">
          {decided.slice(0, 20).map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.source.replace(/_/g, " ")} · {format(new Date(p.updatedAt), "MMM d, yyyy")}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[p.status] || ""}`}>
                {statusLabels[p.status]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type HandoffPackage, HANDOFF_STATUS_DEFINITIONS } from "@/lib/governance-handoff-state-machine";
import { format } from "date-fns";
import { History } from "lucide-react";

interface Props {
  handoffs: HandoffPackage[];
}

const statusColors: Record<string, string> = {
  released: "text-emerald-400",
  acknowledged_downstream: "text-primary",
  blocked: "text-destructive",
  cancelled: "text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  canon_evolution: "Canon",
  policy_tuning: "Policy",
  agent_selection_tuning: "Agent Selection",
  readiness_tuning: "Readiness",
};

export function HandoffHistoryPanel({ handoffs }: Props) {
  const historied = handoffs
    .filter((h) => ["released", "acknowledged_downstream", "blocked", "cancelled"].includes(h.handoffStatus))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (historied.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No handoff history yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" /> Handoff History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/20">
          {historied.slice(0, 30).map((h) => (
            <div key={h.handoffId} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{h.proposalTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {typeLabels[h.proposalType] || h.proposalType} · {h.targetWorkflow} · {format(new Date(h.updatedAt), "MMM d, yyyy")}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[h.handoffStatus] || ""}`}>
                {HANDOFF_STATUS_DEFINITIONS[h.handoffStatus].label}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

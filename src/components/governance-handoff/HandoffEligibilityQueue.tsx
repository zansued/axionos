import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type HandoffPackage, type HandoffStatus, HANDOFF_STATUS_DEFINITIONS } from "@/lib/governance-handoff-state-machine";
import { format } from "date-fns";

interface Props {
  handoffs: HandoffPackage[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const statusColors: Record<HandoffStatus, string> = {
  awaiting_preparation: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  in_preparation: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  awaiting_validation: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  ready_for_release: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  released: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  acknowledged_downstream: "bg-primary/15 text-primary border-primary/30",
};

const typeLabels: Record<string, string> = {
  canon_evolution: "Canon",
  policy_tuning: "Policy",
  agent_selection_tuning: "Agent Selection",
  readiness_tuning: "Readiness",
};

const riskColors: Record<string, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-muted-foreground",
};

export function HandoffEligibilityQueue({ handoffs, onSelect, selectedId }: Props) {
  if (handoffs.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No handoff-eligible proposals match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="text-xs w-[200px]">Title</TableHead>
            <TableHead className="text-xs w-[90px]">Type</TableHead>
            <TableHead className="text-xs w-[130px]">Handoff Status</TableHead>
            <TableHead className="text-xs w-[80px] text-center">Risk</TableHead>
            <TableHead className="text-xs w-[140px]">Target Workflow</TableHead>
            <TableHead className="text-xs w-[90px]">Approved</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {handoffs.map((h) => (
            <TableRow
              key={h.handoffId}
              onClick={() => onSelect(h.handoffId)}
              className={`cursor-pointer transition-colors border-border/20 ${selectedId === h.handoffId ? "bg-primary/5" : ""}`}
            >
              <TableCell className="text-sm font-medium truncate max-w-[200px]">{h.proposalTitle}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-normal">{typeLabels[h.proposalType] || h.proposalType}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] font-normal ${statusColors[h.handoffStatus]}`}>
                  {HANDOFF_STATUS_DEFINITIONS[h.handoffStatus].label}
                </Badge>
              </TableCell>
              <TableCell className={`text-center text-xs font-medium uppercase ${riskColors[h.riskLevel] || ""}`}>
                {h.riskLevel}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">{h.targetWorkflow}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(h.approvedAt), "MMM d")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

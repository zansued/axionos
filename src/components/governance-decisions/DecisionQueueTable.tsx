import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { GovernanceProposal, DecisionStatus, ProposalSource, RiskLevel } from "@/hooks/useGovernanceDecisionsData";
import { format } from "date-fns";

interface Props {
  proposals: GovernanceProposal[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const statusColors: Record<DecisionStatus, string> = {
  pending_review: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  in_review: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  awaiting_evidence: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  deferred: "bg-muted text-muted-foreground border-border",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  needs_revision: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const statusLabels: Record<DecisionStatus, string> = {
  pending_review: "Pending",
  in_review: "In Review",
  awaiting_evidence: "Awaiting Evidence",
  deferred: "Deferred",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs Revision",
};

const sourceLabels: Record<ProposalSource, string> = {
  canon_evolution: "Canon",
  policy_tuning: "Policy",
  agent_selection_tuning: "Agent Selection",
  readiness_tuning: "Readiness",
};

const riskColors: Record<RiskLevel, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-muted-foreground",
};

export function DecisionQueueTable({ proposals, onSelect, selectedId }: Props) {
  if (proposals.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No proposals match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/40">
            <TableHead className="text-xs w-[200px]">Title</TableHead>
            <TableHead className="text-xs w-[100px]">Type</TableHead>
            <TableHead className="text-xs w-[100px]">Status</TableHead>
            <TableHead className="text-xs w-[80px] text-center">Confidence</TableHead>
            <TableHead className="text-xs w-[80px] text-center">Risk</TableHead>
            <TableHead className="text-xs w-[80px] text-center">Evidence</TableHead>
            <TableHead className="text-xs w-[100px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map(p => (
            <TableRow
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`cursor-pointer transition-colors border-border/20 ${selectedId === p.id ? "bg-primary/5" : ""}`}
            >
              <TableCell className="text-sm font-medium truncate max-w-[200px]">{p.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-normal">{sourceLabels[p.source]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-[10px] font-normal ${statusColors[p.status]}`}>
                  {statusLabels[p.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-center text-xs">{(p.confidenceScore * 100).toFixed(0)}%</TableCell>
              <TableCell className={`text-center text-xs font-medium uppercase ${riskColors[p.severity]}`}>
                {p.severity}
              </TableCell>
              <TableCell className="text-center">
                <div className="w-full bg-secondary/50 rounded-full h-1.5 mx-auto max-w-[60px]">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${p.evidenceCompleteness * 100}%` }}
                  />
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(p.createdAt), "MMM d")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

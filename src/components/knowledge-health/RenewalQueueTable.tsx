import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play } from "lucide-react";

interface Props {
  triggers: any[];
  workflows: any[];
  proposals: any[];
  onStartRevalidation: (triggerId: string, mode?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  acknowledged: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-primary/20 text-primary border-primary/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  dismissed: "bg-muted text-muted-foreground border-border",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
  escalated: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function RenewalQueueTable({ triggers, workflows, proposals, onStartRevalidation }: Props) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTrigger, setFilterTrigger] = useState<string>("all");

  const workflowMap = useMemo(() => {
    const map = new Map<string, any>();
    workflows.forEach((w: any) => map.set(w.trigger_id, w));
    return map;
  }, [workflows]);

  const proposalMap = useMemo(() => {
    const map = new Map<string, any>();
    proposals.forEach((p: any) => { if (p.workflow_id) map.set(p.workflow_id, p); });
    return map;
  }, [proposals]);

  const rows = useMemo(() => {
    return triggers
      .filter((t: any) => filterStatus === "all" || t.status === filterStatus)
      .filter((t: any) => filterTrigger === "all" || t.trigger_type === filterTrigger)
      .sort((a: any, b: any) => (b.strength || 0) - (a.strength || 0));
  }, [triggers, filterStatus, filterTrigger]);

  const triggerTypes = [...new Set(triggers.map((t: any) => t.trigger_type))];

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Renewal Queue</CardTitle>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTrigger} onValueChange={setFilterTrigger}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Triggers</SelectItem>
                {triggerTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No renewal triggers found.</p>
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Target</TableHead>
                  <TableHead className="text-xs">Trigger</TableHead>
                  <TableHead className="text-xs">Strength</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Workflow</TableHead>
                  <TableHead className="text-xs">Proposal</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t: any) => {
                  const wf = workflowMap.get(t.id);
                  const prop = wf ? proposalMap.get(wf.id) : null;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-mono truncate max-w-[120px]" title={t.target_entry_id}>
                        {t.target_type}/{t.target_entry_id?.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{t.trigger_type?.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(t.strength || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{((t.strength || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_COLORS[t.status] || ""}`}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {wf ? (
                          <Badge className={`text-[10px] ${STATUS_COLORS[wf.status] || ""}`}>{wf.status}</Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prop ? (
                          <Badge variant="outline" className="text-[10px]">{prop.status}</Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.status === "pending" && !wf && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => onStartRevalidation(t.id)}>
                            <Play className="h-3 w-3 mr-1" />Start
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

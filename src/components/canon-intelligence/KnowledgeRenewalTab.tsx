import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKnowledgeRenewal } from "@/hooks/useKnowledgeRenewal";
import { Activity, ArrowRight, HeartPulse } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  in_progress: "bg-primary/20 text-primary",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-destructive/20 text-destructive",
};

export function KnowledgeRenewalTab() {
  const renewal = useKnowledgeRenewal();
  const navigate = useNavigate();

  const pendingTriggers = renewal.triggers.filter((t: any) => t.status === "pending").length;
  const activeWorkflows = renewal.workflows.filter((w: any) => w.status === "in_progress").length;
  const recentHistory = [...renewal.history]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Knowledge Renewal Overview</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => renewal.scanTriggers.mutate()} disabled={renewal.scanTriggers.isPending}>
            <Activity className="h-3 w-3 mr-1" />Scan
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/owner/knowledge-health")}>
            Full Dashboard <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Card className="border-border/30 bg-card/40"><CardContent className="pt-3.5 pb-2.5 text-center">
          <p className={`text-xl font-bold ${pendingTriggers > 0 ? "text-amber-500" : "text-foreground"}`}>{pendingTriggers}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Pending Triggers</p>
        </CardContent></Card>
        <Card className="border-border/30 bg-card/40"><CardContent className="pt-3.5 pb-2.5 text-center">
          <p className={`text-xl font-bold ${activeWorkflows > 0 ? "text-primary" : "text-foreground"}`}>{activeWorkflows}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Active Workflows</p>
        </CardContent></Card>
        <Card className="border-border/30 bg-card/40"><CardContent className="pt-3.5 pb-2.5 text-center">
          <p className="text-xl font-bold text-foreground">{renewal.proposals.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Proposals</p>
        </CardContent></Card>
        <Card className="border-border/30 bg-card/40"><CardContent className="pt-3.5 pb-2.5 text-center">
          <p className="text-xl font-bold text-foreground">{renewal.history.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">History Events</p>
        </CardContent></Card>
      </div>

      {recentHistory.length > 0 && (
        <Card className="border-border/30">
          <CardHeader className="pb-2"><CardTitle className="text-xs">Recent Renewal Events</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {recentHistory.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[9px] ${STATUS_COLORS[h.event_type] || "bg-muted text-muted-foreground"}`}>
                    {h.event_type?.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-muted-foreground truncate max-w-[200px]">{h.summary || h.target_entry_id?.substring(0, 12)}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

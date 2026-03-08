import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProductOpportunityPortfolio } from "@/hooks/useProductOpportunityPortfolio";
import { CheckCircle, XCircle, Clock, Eye, AlertTriangle, TrendingUp } from "lucide-react";

const STATE_COLORS: Record<string, string> = {
  candidate: "bg-muted text-muted-foreground",
  ranked: "bg-blue-500/20 text-blue-400",
  promoted: "bg-emerald-500/20 text-emerald-400",
  deferred: "bg-yellow-500/20 text-yellow-400",
  rejected: "bg-destructive/20 text-destructive",
  monitor: "bg-cyan-500/20 text-cyan-400",
  split: "bg-orange-500/20 text-orange-400",
  merge_candidate: "bg-purple-500/20 text-purple-400",
  archived: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  open: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-cyan-500/20 text-cyan-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
  dismissed: "bg-muted text-muted-foreground",
  helpful: "bg-emerald-500/20 text-emerald-400",
  neutral: "bg-muted text-muted-foreground",
  harmful: "bg-destructive/20 text-destructive",
  inconclusive: "bg-yellow-500/20 text-yellow-400",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-destructive/20 text-destructive",
};

export function ProductOpportunityPortfolioDashboard() {
  const { overview, portfolios, rankedItems, conflicts, decisions, outcomes, reviewDecision } = useProductOpportunityPortfolio();
  const ov = overview.data as any;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Product Opportunity Portfolio Governance</h2>
        <p className="text-sm text-muted-foreground">Govern product opportunities as a ranked, conflict-aware portfolio</p>
      </div>

      {/* Overview Cards */}
      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_portfolios}</div><div className="text-xs text-muted-foreground">Portfolios</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{ov.total_items}</div><div className="text-xs text-muted-foreground">Items</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-400">{ov.promoted}</div><div className="text-xs text-muted-foreground">Promoted</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-yellow-400">{ov.deferred}</div><div className="text-xs text-muted-foreground">Deferred</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-cyan-400">{ov.monitoring}</div><div className="text-xs text-muted-foreground">Monitoring</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-orange-400">{ov.open_conflicts}</div><div className="text-xs text-muted-foreground">Conflicts</div></CardContent></Card>
          <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{ov.pending_decisions}</div><div className="text-xs text-muted-foreground">Pending</div></CardContent></Card>
        </div>
      )}

      {/* Ranked Opportunities */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Ranked Opportunities</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px]">
            {Array.isArray(rankedItems.data) && rankedItems.data.length > 0 ? (
              <div className="space-y-2">
                {(rankedItems.data as any[]).slice(0, 20).map((item: any, idx: number) => (
                  <div key={item.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                        <Badge className={STATE_COLORS[item.governance_state] || ""}>{item.governance_state}</Badge>
                        <span className="text-sm font-medium">Priority: {Number(item.portfolio_priority_score || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Value: {Number(item.expected_value_score || 0).toFixed(2)}</span>
                        <span>Conf: {Number(item.confidence_score || 0).toFixed(2)}</span>
                        <span>Fit: {Number(item.strategic_fit_score || 0).toFixed(2)}</span>
                        <span>Feasibility: {Number(item.feasibility_score || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 text-xs">
                      {Number(item.conflict_score || 0) > 0.3 && (
                        <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Conflict
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No opportunities ranked yet.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Conflicts */}
      {Array.isArray(conflicts.data) && conflicts.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Conflicts & Overlaps</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(conflicts.data as any[]).slice(0, 10).map((c: any) => (
                <div key={c.id} className="border rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={SEVERITY_COLORS[c.severity] || ""}>{c.severity}</Badge>
                    <Badge className={STATE_COLORS[c.status] || ""}>{c.status}</Badge>
                    <span className="text-sm">{c.conflict_type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decisions */}
      {Array.isArray(decisions.data) && decisions.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Decision Review Queue</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(decisions.data as any[]).slice(0, 15).map((d: any) => (
                <div key={d.id} className="border rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={STATE_COLORS[d.decision_status] || ""}>{d.decision_status}</Badge>
                    <span className="text-sm font-medium">{d.decision_type}</span>
                    {d.rationale && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{d.rationale}</span>}
                  </div>
                  {d.decision_status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => reviewDecision.mutate({ decision_id: d.id, status: "approved" })}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => reviewDecision.mutate({ decision_id: d.id, status: "rejected" })}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => reviewDecision.mutate({ decision_id: d.id, status: "deferred" })}>
                        <Clock className="h-3 w-3 mr-1" /> Defer
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outcomes */}
      {Array.isArray(outcomes.data) && outcomes.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Outcome Validation</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(outcomes.data as any[]).slice(0, 10).map((o: any) => (
                <div key={o.id} className="border rounded p-2 flex items-center gap-3">
                  <Badge className={STATE_COLORS[o.outcome_status] || ""}>{o.outcome_status}</Badge>
                  <span className="text-xs">Quality: {Number(o.portfolio_decision_quality_score || 0).toFixed(2)}</span>
                  <span className="text-xs">Accuracy: {Number(o.portfolio_outcome_accuracy_score || 0).toFixed(2)}</span>
                  {o.false_positive_flag && <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">False Positive</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

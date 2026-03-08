import { useOrg } from "@/contexts/OrgContext";
import { useConvergenceGovernance } from "@/hooks/useConvergenceGovernance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, CheckCircle, XCircle, Clock, Activity, BarChart3, Eye, FileCheck, ArrowUpRight, Trash2 } from "lucide-react";

export function ConvergenceGovernanceDashboard() {
  const { currentOrg } = useOrg();
  const { overview, reviewQueue, outcomes } = useConvergenceGovernance(currentOrg?.id);

  const ov = overview.data || {};
  const queue = reviewQueue.data?.queue || [];
  const out = outcomes.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Convergence Governance
        </h2>
        <p className="text-sm text-muted-foreground">Governed lifecycle for convergence promotion, merge, retention, deprecation, and retirement decisions.</p>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <MetricCard label="Pending Cases" value={ov.pending_cases ?? 0} icon={Clock} />
        <MetricCard label="Approved" value={ov.approved_decisions ?? 0} icon={CheckCircle} />
        <MetricCard label="Rejected" value={ov.rejected_decisions ?? 0} icon={XCircle} />
        <MetricCard label="Hit Rate" value={formatPct(ov.hit_rate)} icon={Activity} />
        <MetricCard label="Avg Accuracy" value={formatPct(ov.avg_accuracy)} icon={BarChart3} />
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="decisions">Recent Decisions</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Pending Governance Cases</CardTitle></CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <p className="text-xs text-muted-foreground">No pending governance cases. Build cases from convergence candidates to populate the queue.</p>
              ) : (
                <div className="space-y-3">
                  {queue.map((c: any) => (
                    <div key={c.id} className="border border-border/30 rounded-md p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {c.proposed_action === "promote_shared" && <ArrowUpRight className="h-3 w-3 text-primary" />}
                          {c.proposed_action === "retire" && <Trash2 className="h-3 w-3 text-destructive" />}
                          <Badge variant="outline" className="text-xs">{c.proposed_action}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-xs">{c.convergence_domain}</Badge>
                          <Badge variant={c.review_status === "pending" ? "outline" : "secondary"} className="text-xs">{c.review_status}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div>Promo: {formatPct(c.promotion_readiness_score)}</div>
                        <div>Retire: {formatPct(c.retirement_readiness_score)}</div>
                        <div>Confidence: {formatPct(c.confidence_score)}</div>
                        <div>Fragmentation: {formatPct(c.fragmentation_risk_score)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck className="h-4 w-4" /> Recent Decisions</CardTitle></CardHeader>
            <CardContent>
              {(ov.recent_decisions || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No convergence decisions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(ov.recent_decisions || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between text-sm border border-border/20 rounded p-2">
                      <span>{d.approved_action || "—"}</span>
                      <Badge variant={d.decision_status === "approved" ? "secondary" : d.decision_status === "rejected" ? "destructive" : "outline"} className="text-xs">{d.decision_status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes">
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Outcome Validation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex flex-col"><span className="text-muted-foreground">Hit Rate</span><span className="font-medium">{formatPct(out.hit_rate)}</span></div>
                <div className="flex flex-col"><span className="text-muted-foreground">Helpful</span><span className="font-medium text-primary">{out.helpful_count ?? 0}</span></div>
                <div className="flex flex-col"><span className="text-muted-foreground">Harmful</span><span className="font-medium text-destructive">{out.harmful_count ?? 0}</span></div>
              </div>
              {(out.outcomes || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No governance outcomes recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(out.outcomes || []).slice(0, 5).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-sm border border-border/20 rounded p-2">
                      <div className="flex flex-col">
                        <span>Accuracy: {formatPct(o.outcome_accuracy_score)}</span>
                        <span className="text-xs text-muted-foreground">Simplification: {formatNum(o.realized_simplification_gain)} / {formatNum(o.expected_simplification_gain)}</span>
                      </div>
                      <Badge variant={o.outcome_status === "helpful" ? "secondary" : o.outcome_status === "harmful" ? "destructive" : "outline"} className="text-xs">{o.outcome_status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="bg-card/80 border-border/50">
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPct(v: any): string {
  if (v === undefined || v === null) return "—";
  return `${(Number(v) * 100).toFixed(1)}%`;
}

function formatNum(v: any): string {
  if (v === undefined || v === null) return "—";
  return Number(v).toFixed(4);
}

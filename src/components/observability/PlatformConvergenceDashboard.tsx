import { useOrg } from "@/contexts/OrgContext";
import { usePlatformConvergence } from "@/hooks/usePlatformConvergence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Merge, TrendingDown, ShieldAlert, Target, Activity, BarChart3, Eye, GitMerge, Layers } from "lucide-react";

export function PlatformConvergenceDashboard() {
  const { currentOrg } = useOrg();
  const { overview, recommendations, outcomes } = usePlatformConvergence(currentOrg?.id);

  const ov = overview.data || {};
  const recs = recommendations.data?.recommendations || [];
  const out = outcomes.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Merge className="h-5 w-5 text-primary" />
          Platform Convergence
        </h2>
        <p className="text-sm text-muted-foreground">Advisory-first convergence across architecture modes, strategies, and local specializations.</p>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MetricCard label="Avg Divergence" value={formatPct(ov.avg_divergence_score)} icon={TrendingDown} />
        <MetricCard label="Avg Specialization" value={formatPct(ov.avg_specialization_score)} icon={Target} />
        <MetricCard label="Avg Fragmentation Risk" value={formatPct(ov.avg_fragmentation_risk)} icon={ShieldAlert} />
        <MetricCard label="Open Recommendations" value={ov.open_recommendations ?? 0} icon={Activity} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/80 border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Convergence Posture</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Profiles</span><span>{ov.total_profiles ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Signals</span><span>{ov.total_signals ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Open Candidates</span><span>{ov.open_candidates ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Recent Outcomes</span><span>{ov.recent_outcomes ?? 0}</span></div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Divergence Hotspots</CardTitle></CardHeader>
              <CardContent>
                {(ov.divergence_hotspots || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No divergence hotspots detected.</p>
                ) : (
                  <div className="space-y-1">
                    {(ov.divergence_hotspots || []).map(([domain, count]: [string, number], i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{domain}</span>
                        <Badge variant="secondary" className="text-xs">{count} signals</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="candidates">
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GitMerge className="h-4 w-4" /> Convergence Candidates</CardTitle></CardHeader>
            <CardContent>
              {(ov.top_candidates || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No convergence candidates detected. Run scope analysis to generate candidates.</p>
              ) : (
                <div className="space-y-3">
                  {(ov.top_candidates || []).map((c: any) => (
                    <div key={c.id} className="border border-border/30 rounded-md p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{c.candidate_type}</Badge>
                        <Badge variant="secondary" className="text-xs">{c.convergence_domain}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Merge Safety: {formatPct(c.merge_safety_score)}</div>
                        <div>Expected Value: {Number(c.convergence_expected_value || 0).toFixed(4)}</div>
                        <div>Priority: {formatPct(c.convergence_priority_score)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="bg-card/80 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Recommendation Queue</CardTitle></CardHeader>
            <CardContent>
              {recs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No open convergence recommendations.</p>
              ) : (
                <div className="space-y-3">
                  {recs.map((r: any) => (
                    <div key={r.id} className="border border-border/30 rounded-md p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.recommendation_type}</span>
                        <div className="flex gap-1">
                          <Badge variant={r.safety_class === "advisory_only" ? "secondary" : "destructive"} className="text-xs">{r.safety_class}</Badge>
                          <Badge variant="outline" className="text-xs">{r.status}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Priority: {formatPct(r.priority_score)}</div>
                        <div>Confidence: {formatPct(r.confidence_score)}</div>
                        <div>Domain: {r.convergence_domain}</div>
                      </div>
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
                <div className="flex flex-col"><span className="text-muted-foreground">Helpful</span><span className="font-medium text-green-500">{out.helpful_count ?? 0}</span></div>
                <div className="flex flex-col"><span className="text-muted-foreground">Harmful</span><span className="font-medium text-destructive">{out.harmful_count ?? 0}</span></div>
              </div>
              {(out.outcomes || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No convergence outcomes recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(out.outcomes || []).slice(0, 5).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-sm border border-border/20 rounded p-2">
                      <span>{o.action_taken}</span>
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

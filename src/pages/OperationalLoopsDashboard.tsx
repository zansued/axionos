import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Activity, BarChart3, Scale } from "lucide-react";
import { useMultiLoopOrchestrator } from "@/hooks/useMultiLoopOrchestrator";

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  degraded: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  paused: "bg-muted text-muted-foreground border-border",
};

const LOOP_LABELS: Record<string, string> = {
  execution: "Execution Loop",
  repair: "Repair Loop",
  learning: "Learning Loop",
  canon_evolution: "Canon Evolution Loop",
  coordination: "Coordination Loop",
};

export default function OperationalLoopsDashboard() {
  const { loops, healthReport, metrics, loading, listLoops, evaluateHealth, rebalance, fetchMetrics } = useMultiLoopOrchestrator();

  useEffect(() => {
    listLoops();
    fetchMetrics();
  }, [listLoops, fetchMetrics]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Operational Loops</h1>
            <p className="text-sm text-muted-foreground">Multi-loop governance orchestration</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={evaluateHealth} disabled={loading}>
              <Activity className="h-4 w-4 mr-1" /> Evaluate Health
            </Button>
            <Button variant="outline" size="sm" onClick={rebalance} disabled={loading}>
              <Scale className="h-4 w-4 mr-1" /> Rebalance
            </Button>
            <Button variant="outline" size="sm" onClick={() => { listLoops(); fetchMetrics(); }} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Metrics summary */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2"><CardDescription>Active Loops</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{metrics.total_loops}</div></CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2"><CardDescription>Avg Priority</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{metrics.average_priority}</div></CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2"><CardDescription>Imbalanced</CardDescription></CardHeader>
              <CardContent>
                <Badge variant={metrics.imbalance.imbalanced ? "destructive" : "secondary"}>
                  {metrics.imbalance.imbalanced ? "Yes" : "No"}
                </Badge>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2"><CardDescription>Health Distribution</CardDescription></CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(metrics.health_distribution).map(([h, c]) => (
                    <Badge key={h} className={HEALTH_COLORS[h] || ""}>
                      {h}: {c}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loop list */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Loop Registry</CardTitle>
            <CardDescription>All operational loops and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            {loops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No loops registered. Click "Evaluate Health" to initialize.</p>
            ) : (
              <div className="space-y-4">
                {loops.map((loop) => (
                  <div key={loop.loop_id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-foreground">{LOOP_LABELS[loop.loop_type] || loop.loop_type}</span>
                        <Badge className={HEALTH_COLORS[loop.loop_health] || ""}>{loop.loop_health}</Badge>
                        <Badge variant="outline">{loop.loop_status}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">Priority</span>
                        <Progress value={Number(loop.loop_priority) * 100} className="h-2 w-32" />
                        <span className="text-xs font-mono text-muted-foreground">{Number(loop.loop_priority).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">Last: {new Date(loop.last_activity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health report */}
        {healthReport.length > 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Health Evaluation Report</CardTitle>
              <CardDescription>Latest health assessment results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {healthReport.map((r) => (
                  <div key={r.loop_type} className="flex items-center justify-between p-3 rounded border border-border/30">
                    <span className="font-medium text-sm text-foreground">{LOOP_LABELS[r.loop_type] || r.loop_type}</span>
                    <div className="flex items-center gap-3">
                      <Badge className={HEALTH_COLORS[r.evaluated_health] || ""}>{r.evaluated_health}</Badge>
                      {r.needs_update && <span className="text-xs text-amber-400">updated</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOrg } from "@/contexts/OrgContext";
import { useOrganismConsole } from "@/hooks/useOrganismConsole";
import {
  Activity, Brain, HeartPulse, Repeat, Timer, Route, Eye, TrendingUp,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  D: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  F: "bg-destructive/20 text-destructive border-destructive/30",
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: "text-emerald-400",
  degraded: "text-yellow-400",
  critical: "text-destructive",
};

const PIE_COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(45, 93%, 47%)", "hsl(280, 68%, 60%)"];

export default function OrganismConsoleDashboard() {
  const { currentOrg } = useOrg();
  const { overview, metrics } = useOrganismConsole(currentOrg?.id ?? null);

  const ov = overview.data;
  const met = metrics.data;

  const health = ov?.health;
  const loops = ov?.loops;
  const activeCycle = ov?.active_cycle;
  const memory = ov?.memory;
  const posture = ov?.posture;
  const routing = ov?.routing;

  const memoryPieData = memory?.by_type
    ? Object.entries(memory.by_type).map(([name, value]) => ({ name, value }))
    : [];

  const loopPriorities = met?.loop_priorities || [];

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Organism Console</h1>
            <p className="text-sm text-muted-foreground">
              Unified operational view of all adaptive subsystems
            </p>
          </div>

          {/* Top Row: Health + Posture + Active Cycle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* System Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" /> System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-3xl font-bold">
                    {health ? `${(health.overall_score * 100).toFixed(1)}%` : "—"}
                  </p>
                  {health?.grade && (
                    <Badge className={`text-lg px-3 ${GRADE_COLORS[health.grade] || ""}`}>
                      {health.grade}
                    </Badge>
                  )}
                </div>
                <Progress value={(health?.overall_score ?? 0) * 100} className="h-2" />
              </CardContent>
            </Card>

            {/* Operational Posture */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Operational Posture
                </CardTitle>
              </CardHeader>
              <CardContent>
                {posture ? (
                  <>
                    <p className="text-2xl font-bold capitalize">{posture.current_posture}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {(Number(posture.confidence) * 100).toFixed(0)}%
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No posture data</p>
                )}
              </CardContent>
            </Card>

            {/* Active Cycle */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="h-4 w-4" /> Active Cycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeCycle ? (
                  <>
                    <p className="text-2xl font-bold capitalize">
                      {activeCycle.cycle_type?.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Posture: {activeCycle.active_posture}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No active cycle</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mid Row: Loops + Memory + Routing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Operational Loops */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Repeat className="h-4 w-4" /> Operational Loops
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-2xl font-bold">{loops?.active ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loops?.healthy ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Healthy</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{loops?.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
                {loopPriorities.length > 0 && (
                  <div className="space-y-1">
                    {loopPriorities.map((lp: any) => (
                      <div key={lp.type} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{lp.type}</span>
                        <span className={HEALTH_COLORS[lp.health] || "text-muted-foreground"}>
                          {lp.health}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Memory Layers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" /> Memory Layers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold">{memory?.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total Memories</p>
                  </div>
                  {memoryPieData.length > 0 && (
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie data={memoryPieData} dataKey="value" cx="50%" cy="50%" outerRadius={40} strokeWidth={0}>
                          {memoryPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {memoryPieData.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {memoryPieData.map((d, i) => (
                      <Badge key={d.name} variant="outline" className="text-xs">
                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {d.name}: {d.value as number}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Adaptive Routing */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Route className="h-4 w-4" /> Adaptive Routing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{routing?.profiles_count ?? 0}</p>
                <p className="text-xs text-muted-foreground mb-2">Active Profiles</p>
                {routing?.profiles?.slice(0, 3).map((p: any) => (
                  <div key={p.profile_id} className="flex items-center justify-between text-xs border-t border-border pt-1 mt-1">
                    <span className="truncate max-w-[120px]">{p.domain_id}</span>
                    <Badge variant="outline" className="text-xs">{p.validation_depth}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Health Metrics Breakdown */}
          {health?.metrics?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Health Metric Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {health.metrics.map((m: any) => (
                    <div key={m.metric_type} className="text-center p-3 rounded-lg border border-border bg-muted/20">
                      <p className="text-xs text-muted-foreground capitalize mb-1">
                        {m.metric_type?.replace(/_/g, " ")}
                      </p>
                      <p className="text-lg font-bold">{(Number(m.metric_value) * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.metric_trend}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!overview.data && !overview.isLoading && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No organism data available. Run health evaluations and operational cycles to populate this console.
              </CardContent>
            </Card>
          )}
      </div>
    </AppShell>
  );
}

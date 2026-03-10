import { AppLayout } from "@/components/AppLayout";
import { useOperationalCycles } from "@/hooks/useOperationalCycles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Square, RefreshCw, Timer, Activity, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CYCLE_TYPES = [
  { value: "exploration_window", label: "Exploration" },
  { value: "stabilization_window", label: "Stabilization" },
  { value: "recovery_window", label: "Recovery" },
  { value: "hardening_cycle", label: "Hardening" },
];

export default function OperationalCyclesDashboard() {
  const { cycles, cyclesLoading, metrics, metricsLoading, startCycle, evaluateCycle, endCycle } = useOperationalCycles();

  const activeCycle = metrics?.active_cycle;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Operational Cycles</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Rhythm and recovery cycles for systemic stability
            </p>
          </div>
          <div className="flex gap-2">
            {activeCycle ? (
              <>
                <Button variant="outline" onClick={() => evaluateCycle.mutate()} disabled={evaluateCycle.isPending}>
                  {evaluateCycle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Evaluate
                </Button>
                <Button variant="destructive" onClick={() => endCycle.mutate({})} disabled={endCycle.isPending}>
                  {endCycle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
                  End Cycle
                </Button>
              </>
            ) : (
              <Button onClick={() => startCycle.mutate({})} disabled={startCycle.isPending}>
                {startCycle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Start Cycle
              </Button>
            )}
          </div>
        </div>

        {/* Active cycle card */}
        {activeCycle && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Active Cycle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <Badge variant="default">{activeCycle.cycle_type.replace(/_/g, " ")}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Posture: </span>
                  <Badge variant="secondary">{activeCycle.active_posture}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Started: </span>
                  <span className="text-foreground">{formatDistanceToNow(new Date(activeCycle.cycle_start), { addSuffix: true })}</span>
                </div>
                {activeCycle.cycle_metrics?.cycle_health && (
                  <div>
                    <span className="text-muted-foreground">Health: </span>
                    <Badge variant={activeCycle.cycle_metrics.cycle_health === "healthy" ? "secondary" : activeCycle.cycle_metrics.cycle_health === "stressed" ? "destructive" : "default"}>
                      {activeCycle.cycle_metrics.cycle_health}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics summary */}
        {!metricsLoading && metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Cycles" value={metrics.total_cycles} icon={<Timer className="h-4 w-4 text-muted-foreground" />} />
            <MetricCard title="Completed" value={metrics.completed_count} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
            <MetricCard title="Avg Duration" value={`${metrics.average_duration_hours}h`} icon={<Activity className="h-4 w-4 text-muted-foreground" />} />
            <MetricCard title="Active" value={metrics.active_cycle ? "Yes" : "No"} icon={<Play className="h-4 w-4 text-primary" />} />
          </div>
        )}

        {/* Cycle type distribution */}
        {metrics?.cycle_type_distribution && Object.keys(metrics.cycle_type_distribution).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cycle Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(metrics.cycle_type_distribution as Record<string, number>).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type.replace(/_/g, " ")}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick start buttons */}
        {!activeCycle && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Start Specific Cycle</CardTitle>
              <CardDescription>Choose a cycle type or let the system auto-detect from posture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CYCLE_TYPES.map((ct) => (
                  <Button key={ct.value} variant="outline" size="sm" onClick={() => startCycle.mutate({ cycle_type: ct.value })} disabled={startCycle.isPending}>
                    {ct.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cycle history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cycle History</CardTitle>
            <CardDescription>Recent operational cycles</CardDescription>
          </CardHeader>
          <CardContent>
            {cyclesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : cycles.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No cycles recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {cycles.map((c: any) => (
                  <CycleRow key={c.cycle_id} cycle={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function CycleRow({ cycle }: { cycle: any }) {
  const isActive = cycle.status === "active";
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-foreground">{cycle.cycle_type.replace(/_/g, " ")}</span>
        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">{cycle.status}</Badge>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>Posture: {cycle.active_posture}</span>
        <span>Started: {formatDistanceToNow(new Date(cycle.cycle_start), { addSuffix: true })}</span>
        {cycle.cycle_end && <span>Duration: {Math.round((new Date(cycle.cycle_end).getTime() - new Date(cycle.cycle_start).getTime()) / (1000 * 60 * 60) * 10) / 10}h</span>}
      </div>
    </div>
  );
}

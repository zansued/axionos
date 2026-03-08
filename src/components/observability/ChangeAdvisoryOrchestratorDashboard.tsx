import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChangeAdvisoryOrchestrator } from "@/hooks/useChangeAdvisoryOrchestrator";
import { Loader2, AlertTriangle, CheckCircle, Clock, BarChart3, Layers, GitBranch, Shield } from "lucide-react";

export function ChangeAdvisoryOrchestratorDashboard() {
  const { overview, signals, agendas, health } = useChangeAdvisoryOrchestrator();

  if (overview.isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const ov = overview.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Change Advisory Orchestrator</h2>
        <p className="text-sm text-muted-foreground">Unified architecture change sequencing and prioritization</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        <MetricCard icon={BarChart3} label="Total Signals" value={ov.total_signals ?? 0} />
        <MetricCard icon={CheckCircle} label="Active Signals" value={ov.active_signals ?? 0} />
        <MetricCard icon={Layers} label="Total Agendas" value={ov.total_agendas ?? 0} />
        <MetricCard icon={CheckCircle} label="Accepted" value={ov.accepted_agendas ?? 0} />
        <MetricCard icon={BarChart3} label="Avg Health" value={ov.avg_health ?? "—"} />
        <MetricCard icon={Clock} label="Reviews" value={ov.total_reviews ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Signals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" /> Advisory Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {signals.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !signals.data?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No advisory signals yet</p>
              ) : (
                <div className="space-y-2">
                  {(signals.data as any[]).slice(0, 20).map((s: any) => (
                    <div key={s.id} className="p-2 rounded-md bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{s.signal_source}</span>
                        <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.signal_type} → {s.target_scope}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Agendas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4" /> Change Agendas</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {agendas.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !agendas.data?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No change agendas yet</p>
              ) : (
                <div className="space-y-2">
                  {(agendas.data as any[]).slice(0, 20).map((a: any) => (
                    <div key={a.id} className="p-2 rounded-md bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{a.agenda_name}</span>
                        <Badge variant={a.status === "accepted" ? "default" : "outline"} className="text-[10px]">{a.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Scope: {a.agenda_scope} | Health: {a.agenda_health_score ?? "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Health + Safety */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Agenda Health</CardTitle>
          </CardHeader>
          <CardContent>
            {health.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : health.data?.health_score != null ? (
              <div className="text-center py-4">
                <span className="text-3xl font-bold">{health.data.health_score}</span>
                <p className="text-xs text-muted-foreground mt-1">Latest accepted agenda health score</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No accepted agenda</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Safety Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {["Cannot mutate topology directly", "Cannot alter governance/billing", "All outputs advisory-first", "Cannot auto-approve migrations", "Cannot auto-execute changes"].map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
                  <span className="text-muted-foreground">{s}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

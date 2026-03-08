import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlatformStabilizationV2 } from "@/hooks/usePlatformStabilizationV2";
import { Loader2, AlertTriangle, CheckCircle, Shield, BarChart3, Layers, Activity, Lock } from "lucide-react";

export function PlatformStabilizationV2Dashboard() {
  const { overview, signals, envelopes, health } = usePlatformStabilizationV2();

  if (overview.isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const ov = overview.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Platform Self-Stabilization v2</h2>
        <p className="text-sm text-muted-foreground">Multi-layer instability detection, correlation and bounded containment</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-7">
        <MetricCard icon={BarChart3} label="Total Signals" value={ov.total_signals ?? 0} />
        <MetricCard icon={AlertTriangle} label="Critical" value={ov.critical_signals ?? 0} highlight={ov.critical_signals > 0} />
        <MetricCard icon={Activity} label="Unstable" value={ov.unstable_signals ?? 0} />
        <MetricCard icon={Lock} label="Active Envelopes" value={ov.active_envelopes ?? 0} />
        <MetricCard icon={Layers} label="Outcomes" value={ov.total_outcomes ?? 0} />
        <MetricCard icon={CheckCircle} label="Helpful" value={ov.helpful_outcomes ?? 0} />
        <MetricCard icon={AlertTriangle} label="Rollbacks" value={ov.total_rollbacks ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Stability Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {signals.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !signals.data?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No stability v2 signals yet</p>
              ) : (
                <div className="space-y-2">
                  {(signals.data as any[]).slice(0, 20).map((s: any) => (
                    <div key={s.id} className="p-2 rounded-md bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{s.signal_key}</span>
                        <div className="flex gap-1">
                          <Badge variant={s.severity === "critical" ? "destructive" : "outline"} className="text-[10px]">{s.severity}</Badge>
                          <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.signal_family} | Layers: {(s.source_layers || []).join(", ")}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4" /> Stabilization Envelopes</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {envelopes.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !envelopes.data?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No envelopes yet</p>
              ) : (
                <div className="space-y-2">
                  {(envelopes.data as any[]).slice(0, 20).map((e: any) => (
                    <div key={e.id} className="p-2 rounded-md bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{e.envelope_name}</span>
                        <Badge variant={e.status === "active" ? "default" : "outline"} className="text-[10px]">{e.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Scope: {e.target_scope} | Mode: {e.activation_mode}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Health</CardTitle>
          </CardHeader>
          <CardContent>
            {health.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Signals: <span className="font-bold">{health.data?.total_signals ?? 0}</span></div>
                <div>Critical: <span className="font-bold">{health.data?.critical ?? 0}</span></div>
                <div>Unstable: <span className="font-bold">{health.data?.unstable ?? 0}</span></div>
                <div>Active Envelopes: <span className="font-bold">{health.data?.active_envelopes ?? 0}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Safety Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {["Cannot mutate topology directly", "Cannot alter governance/billing", "Cannot override tenant isolation", "Cannot impose permanent freezes without review", "All outputs bounded and reversible"].map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
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

function MetricCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: any; highlight?: boolean }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${highlight ? "text-destructive" : "text-muted-foreground"}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold ${highlight ? "text-destructive" : ""}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlatformStabilization } from "@/hooks/usePlatformStabilization";
import { Shield, AlertTriangle, Activity, RotateCcw, CheckCircle, XCircle, RefreshCw, Gauge, Layers, Eye } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-green-500/20 text-green-400",
  watch: "bg-yellow-500/20 text-yellow-400",
  unstable: "bg-orange-500/20 text-orange-400",
  critical: "bg-destructive/20 text-destructive",
  open: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-yellow-500/20 text-yellow-400",
  applied: "bg-green-500/20 text-green-400",
  rolled_back: "bg-orange-500/20 text-orange-400",
  rejected: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  helpful: "bg-green-500/20 text-green-400",
  neutral: "bg-muted text-muted-foreground",
  harmful: "bg-destructive/20 text-destructive",
  inconclusive: "bg-yellow-500/20 text-yellow-400",
};

export function PlatformStabilizationDashboard() {
  const {
    overview, signals, actions, safeModeProfiles,
    recompute, reviewAction, applyStabilization, rollbackStabilization, rejectAction,
  } = usePlatformStabilization();

  const ov = overview.data;
  const scores = ov?.scores;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Platform Self-Stabilization
          </h2>
          <p className="text-muted-foreground text-sm">Drift detection, oscillation suppression, bounded stabilization</p>
        </div>
        <Button size="sm" onClick={() => recompute.mutate({})} disabled={recompute.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recompute
        </Button>
      </div>

      {/* Scores Overview */}
      {scores && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <ScoreCard label="Stability Index" value={scores.platform_stability_index} />
          <ScoreCard label="Volatility" value={scores.adaptation_volatility_index} invert />
          <ScoreCard label="Portfolio Churn" value={scores.portfolio_churn_index} invert />
          <ScoreCard label="Oscillation" value={scores.oscillation_index} invert />
          <ScoreCard label="Recovery Eff." value={scores.recovery_efficiency_index} />
          <ScoreCard label="Stabilization Prec." value={scores.stabilization_precision_index} />
        </div>
      )}

      {/* Signal Summary */}
      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <StatCard label="Healthy Signals" value={ov.healthy_signals} color="text-green-400" />
          <StatCard label="Watch Signals" value={ov.watch_signals} color="text-yellow-400" />
          <StatCard label="Unstable" value={ov.unstable_signals} color="text-orange-400" />
          <StatCard label="Critical" value={ov.critical_signals} color="text-destructive" />
          <StatCard label="Open Actions" value={ov.open_actions} color="text-blue-400" />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="signals">
        <TabsList>
          <TabsTrigger value="signals" className="gap-1"><Activity className="h-3 w-3" /> Signals</TabsTrigger>
          <TabsTrigger value="actions" className="gap-1"><Layers className="h-3 w-3" /> Actions</TabsTrigger>
          <TabsTrigger value="safe-modes" className="gap-1"><Shield className="h-3 w-3" /> Safe Modes</TabsTrigger>
          <TabsTrigger value="outcomes" className="gap-1"><Gauge className="h-3 w-3" /> Outcomes</TabsTrigger>
          <TabsTrigger value="rollbacks" className="gap-1"><RotateCcw className="h-3 w-3" /> Rollbacks</TabsTrigger>
        </TabsList>

        {/* Signals */}
        <TabsContent value="signals" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Stability Signals</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(signals.data?.signals || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No stability signals registered.</p>
                ) : (
                  <div className="space-y-2">
                    {(signals.data?.signals || []).map((s: any) => (
                      <div key={s.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{s.signal_key}</p>
                          <p className="text-xs text-muted-foreground">{s.signal_family} • {s.scope_type}</p>
                        </div>
                        <Badge className={STATUS_COLORS[s.status] || ""}>{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions */}
        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Stabilization Actions</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(actions.data?.actions || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No stabilization actions.</p>
                ) : (
                  <div className="space-y-3">
                    {(actions.data?.actions || []).map((a: any) => (
                      <div key={a.id} className="p-3 rounded-lg border bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{a.action_type}</p>
                            <p className="text-xs text-muted-foreground">{a.action_mode} • {new Date(a.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge className={STATUS_COLORS[a.status] || ""}>{a.status}</Badge>
                        </div>
                        {(a.status === "open" || a.status === "reviewed") && (
                          <div className="flex gap-2">
                            {a.status === "open" && (
                              <Button size="sm" variant="outline" onClick={() => reviewAction.mutate(a.id)}>
                                <Eye className="h-3 w-3 mr-1" /> Review
                              </Button>
                            )}
                            <Button size="sm" variant="default" onClick={() => applyStabilization.mutate(a.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Apply
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => rejectAction.mutate(a.id)}>
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                        {a.status === "applied" && (
                          <Button size="sm" variant="outline" onClick={() => rollbackStabilization.mutate({ action_id: a.id })}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safe Modes */}
        <TabsContent value="safe-modes" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Safe Mode Profiles</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(safeModeProfiles.data?.profiles || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No safe mode profiles configured.</p>
                ) : (
                  <div className="space-y-2">
                    {(safeModeProfiles.data?.profiles || []).map((p: any) => (
                      <div key={p.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.profile_name}</p>
                          <p className="text-xs text-muted-foreground">{p.profile_scope} • {p.activation_mode}</p>
                        </div>
                        <Badge className={STATUS_COLORS[p.status] || ""}>{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcomes */}
        <TabsContent value="outcomes" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Stabilization Outcomes</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(ov?.recent_outcomes || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No outcomes recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(ov?.recent_outcomes || []).map((o: any) => (
                      <div key={o.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <p className="text-sm">{o.stabilization_action_id?.slice(0, 8)}...</p>
                        <Badge className={STATUS_COLORS[o.outcome_status] || ""}>{o.outcome_status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rollbacks */}
        <TabsContent value="rollbacks" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Stabilization Rollbacks</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(ov?.recent_rollbacks || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No rollbacks.</p>
                ) : (
                  <div className="space-y-2">
                    {(ov?.recent_rollbacks || []).map((r: any) => (
                      <div key={r.id} className="p-3 rounded-lg border bg-card">
                        <p className="text-sm font-medium">{r.rollback_mode}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreCard({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const displayVal = Math.round(value * 100);
  const isGood = invert ? displayVal < 30 : displayVal > 70;
  const isBad = invert ? displayVal > 60 : displayVal < 40;
  const color = isGood ? "text-green-400" : isBad ? "text-destructive" : "text-yellow-400";

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{displayVal}%</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

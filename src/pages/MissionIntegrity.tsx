import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, Activity, HeartPulse, Eye, RefreshCw } from "lucide-react";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("mission-integrity-drift-prevention", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

function ScoreBar({ label, value, color = "bg-primary" }: { label: string; value: number; color?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={styles[severity] || styles.low}>{severity}</Badge>;
}

export default function MissionIntegrity() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({ queryKey: ["mission-integrity-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const evaluations = useQuery({ queryKey: ["mission-integrity-evals", orgId], queryFn: () => invokeEngine(orgId!, "evaluate"), enabled: !!orgId });
  const driftEvents = useQuery({ queryKey: ["mission-integrity-drift", orgId], queryFn: () => invokeEngine(orgId!, "drift_events"), enabled: !!orgId });
  const recommendations = useQuery({ queryKey: ["mission-integrity-recs", orgId], queryFn: () => invokeEngine(orgId!, "recommendations"), enabled: !!orgId });

  const o = overview.data;
  const evals = evaluations.data?.evaluations || [];
  const drifts = driftEvents.data?.drift_events || [];
  const recs = recommendations.data?.recommendations || [];

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-primary" />
            Mission Integrity & Drift Prevention
          </h1>
          <p className="text-muted-foreground mt-1">
            Continuous evaluation of whether the institution remains aligned with its core mission, identity, and normative direction.
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Avg Alignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{o ? `${Math.round(o.avg_alignment_score * 100)}%` : "—"}</div>
              <ScoreBar label="Alignment" value={o?.avg_alignment_score || 0} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Avg Erosion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{o ? `${Math.round(o.avg_erosion_score * 100)}%` : "—"}</div>
              <ScoreBar label="Erosion Risk" value={o?.avg_erosion_score || 0} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Drift Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{o?.total_drift_events ?? "—"}</div>
              <p className="text-xs text-muted-foreground">{o?.unresolved_drift ?? 0} unresolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Corrections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{o?.active_recommendations ?? "—"}</div>
              <p className="text-xs text-muted-foreground">{o?.total_recommendations ?? 0} total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="alignment" className="space-y-4">
          <TabsList>
            <TabsTrigger value="alignment">Alignment vs Drift</TabsTrigger>
            <TabsTrigger value="drift">Drift Events</TabsTrigger>
            <TabsTrigger value="corrections">Corrections</TabsTrigger>
          </TabsList>

          {/* Alignment vs Drift Matrix */}
          <TabsContent value="alignment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alignment vs Drift Matrix</CardTitle>
                <CardDescription>Compares alignment, adaptation, drift risk, and erosion for each evaluated subject.</CardDescription>
              </CardHeader>
              <CardContent>
                {evals.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No evaluations yet. Subjects must be evaluated to populate this matrix.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Subject</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">Domain</th>
                          <th className="text-center py-2 px-3 text-muted-foreground font-medium">Alignment</th>
                          <th className="text-center py-2 px-3 text-muted-foreground font-medium">Adaptation</th>
                          <th className="text-center py-2 px-3 text-muted-foreground font-medium">Drift Risk</th>
                          <th className="text-center py-2 px-3 text-muted-foreground font-medium">Erosion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evals.slice(0, 20).map((ev: any) => (
                          <tr key={ev.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-3 font-medium">{ev.mission_integrity_subjects?.title || "—"}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline">{ev.mission_integrity_subjects?.domain || "—"}</Badge>
                            </td>
                            <td className="text-center py-2 px-3">
                              <span className={`font-mono text-xs ${Number(ev.alignment_score) >= 0.7 ? "text-green-400" : Number(ev.alignment_score) >= 0.4 ? "text-yellow-400" : "text-destructive"}`}>
                                {Math.round(Number(ev.alignment_score) * 100)}%
                              </span>
                            </td>
                            <td className="text-center py-2 px-3">
                              <span className="font-mono text-xs">{Math.round(Number(ev.adaptation_score) * 100)}%</span>
                            </td>
                            <td className="text-center py-2 px-3">
                              <span className={`font-mono text-xs ${Number(ev.drift_risk_score) >= 0.5 ? "text-destructive" : Number(ev.drift_risk_score) >= 0.3 ? "text-yellow-400" : "text-green-400"}`}>
                                {Math.round(Number(ev.drift_risk_score) * 100)}%
                              </span>
                            </td>
                            <td className="text-center py-2 px-3">
                              <span className={`font-mono text-xs ${Number(ev.erosion_score) >= 0.4 ? "text-destructive" : Number(ev.erosion_score) >= 0.2 ? "text-yellow-400" : "text-green-400"}`}>
                                {Math.round(Number(ev.erosion_score) * 100)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drift Events */}
          <TabsContent value="drift" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mission Drift Events</CardTitle>
                <CardDescription>Detected instances where operational or strategic activity diverges from mission direction.</CardDescription>
              </CardHeader>
              <CardContent>
                {drifts.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No drift events detected.</p>
                ) : (
                  <div className="space-y-3">
                    {drifts.slice(0, 15).map((d: any) => (
                      <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityBadge severity={d.severity} />
                            <Badge variant="outline">{d.drift_type}</Badge>
                            {!d.resolved_at && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Unresolved</Badge>}
                          </div>
                          <p className="text-sm">{d.event_summary}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {d.mission_integrity_subjects?.title} · {d.mission_integrity_subjects?.domain}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Corrections */}
          <TabsContent value="corrections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Correction Recommendations</CardTitle>
                <CardDescription>Advisory-first recommendations for mission realignment and drift correction.</CardDescription>
              </CardHeader>
              <CardContent>
                {recs.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No correction recommendations pending.</p>
                ) : (
                  <div className="space-y-3">
                    {recs.slice(0, 15).map((r: any) => (
                      <div key={r.id} className="p-3 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={
                            r.correction_priority === "critical" ? "bg-destructive/20 text-destructive border-destructive/30" :
                            r.correction_priority === "high" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                            "bg-muted text-muted-foreground border-border"
                          }>{r.correction_priority}</Badge>
                          <Badge variant="outline">{r.recommendation_type}</Badge>
                          {r.active && <Eye className="h-3 w-3 text-primary" />}
                        </div>
                        <p className="text-sm">{r.recommendation_summary}</p>
                        <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {r.mission_integrity_subjects?.title} · {r.mission_integrity_subjects?.domain}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

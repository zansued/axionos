import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, Activity, Eye, Lock, TrendingDown, Layers, ShieldAlert } from "lucide-react";
import { useKernelIntegrity } from "@/hooks/useKernelIntegrity";

const PROTECTED_DOMAINS = [
  { name: "Deterministic Execution Kernel", level: "absolute", icon: Activity },
  { name: "Governance Invariants", level: "absolute", icon: Shield },
  { name: "Approval Boundaries", level: "absolute", icon: Lock },
  { name: "Rollback Guarantees", level: "absolute", icon: Shield },
  { name: "Tenant Isolation", level: "absolute", icon: Lock },
  { name: "Plan/Billing Enforcement", level: "absolute", icon: Shield },
  { name: "Hard Safety Constraints", level: "absolute", icon: ShieldAlert },
  { name: "Canon Integrity Principles", level: "protected", icon: Eye },
];

function PostureIndicator({ posture }: { posture: string }) {
  const config: Record<string, { color: string; label: string }> = {
    healthy: { color: "bg-emerald-500", label: "Healthy" },
    stable: { color: "bg-blue-500", label: "Stable" },
    degrading: { color: "bg-amber-500", label: "Degrading" },
    critical: { color: "bg-destructive", label: "Critical" },
  };
  const c = config[posture] || config.healthy;
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${c.color} animate-pulse`} />
      <span className="text-sm font-semibold">{c.label}</span>
    </div>
  );
}

function ScoreCard({ label, value, inverted }: { label: string; value: number; inverted?: boolean }) {
  const pct = Math.round(value * 100);
  const color = inverted
    ? pct > 60 ? "text-destructive" : pct > 30 ? "text-amber-500" : "text-emerald-500"
    : pct > 60 ? "text-emerald-500" : pct > 30 ? "text-amber-500" : "text-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={`font-mono font-bold ${color}`}>{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

export default function KernelIntegrityGuard() {
  const { latestSnapshot, corrosionSignals, bloatIndicators, driftCases, reviews, actions, loading } = useKernelIntegrity();

  const health = latestSnapshot?.overall_health_score ?? 0;
  const posture = health > 0.7 ? "healthy" : health > 0.5 ? "stable" : health > 0.3 ? "degrading" : "critical";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Kernel Integrity Guard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Protect kernel identity, detect corrosion, bloat, and existential drift
              </p>
            </div>
            {latestSnapshot && <PostureIndicator posture={posture} />}
          </div>

          {/* Kernel Posture Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Overall Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{Math.round((latestSnapshot?.overall_health_score ?? 0) * 100)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Corrosion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-amber-500">{corrosionSignals.length}</div>
                <p className="text-xs text-muted-foreground">active signals</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1"><Layers className="h-3 w-3" /> Bloat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">{bloatIndicators.length}</div>
                <p className="text-xs text-muted-foreground">indicators</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Drift Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-destructive">{driftCases.length}</div>
                <p className="text-xs text-muted-foreground">detected</p>
              </CardContent>
            </Card>
          </div>

          {/* Score breakdown */}
          {latestSnapshot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Kernel Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScoreCard label="Legibility" value={Number(latestSnapshot.legibility_score)} />
                <ScoreCard label="Governance Integrity" value={Number(latestSnapshot.governance_integrity_score)} />
                <ScoreCard label="Architectural Coherence" value={Number(latestSnapshot.architectural_coherence_score)} />
                <ScoreCard label="Bloat" value={Number(latestSnapshot.bloat_score)} inverted />
                <ScoreCard label="Corrosion" value={Number(latestSnapshot.corrosion_score)} inverted />
                <ScoreCard label="Existential Drift" value={Number(latestSnapshot.existential_drift_score)} inverted />
                <ScoreCard label="Mutation Pressure" value={Number(latestSnapshot.mutation_pressure_score)} inverted />
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="domains">
            <TabsList>
              <TabsTrigger value="domains">Protected Domains</TabsTrigger>
              <TabsTrigger value="corrosion">Corrosion Signals</TabsTrigger>
              <TabsTrigger value="bloat">Bloat Indicators</TabsTrigger>
              <TabsTrigger value="drift">Existential Drift</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="domains">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Protected Kernel Domains</CardTitle>
                  <CardDescription>Core domains that cannot be mutated without extraordinary review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PROTECTED_DOMAINS.map((d) => (
                      <div key={d.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                        <d.icon className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{d.name}</p>
                        </div>
                        <Badge variant={d.level === "absolute" ? "destructive" : "secondary"} className="text-[10px]">
                          {d.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="corrosion">
              <Card>
                <CardHeader><CardTitle className="text-sm">Corrosion Signals</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {corrosionSignals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No corrosion signals detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {corrosionSignals.map((s: any) => (
                          <div key={s.id} className="p-3 rounded-lg border border-border space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{s.signal_type}</span>
                              <Badge variant={s.severity === "critical" ? "destructive" : s.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">{s.severity}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                            <div className="text-xs font-mono">Score: {Math.round(Number(s.corrosion_score) * 100)}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bloat">
              <Card>
                <CardHeader><CardTitle className="text-sm">Architectural Bloat Indicators</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {bloatIndicators.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bloat indicators detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {bloatIndicators.map((b: any) => (
                          <div key={b.id} className="p-3 rounded-lg border border-border space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{b.indicator_type}</span>
                              <span className="text-xs font-mono">Bloat: {Math.round(Number(b.bloat_score) * 100)}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{b.description}</p>
                            <p className="text-xs text-primary">{b.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drift">
              <Card>
                <CardHeader><CardTitle className="text-sm">Existential Drift Cases</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {driftCases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No existential drift detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {driftCases.map((d: any) => (
                          <div key={d.id} className="p-3 rounded-lg border border-border space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{d.drift_type}</span>
                              <Badge variant={d.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">{d.severity}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{d.description}</p>
                            <p className="text-xs">Violated: {d.violated_principle}</p>
                            <p className="text-xs text-primary">{d.remediation_path}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions">
              <Card>
                <CardHeader><CardTitle className="text-sm">Protection Actions</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {actions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No protection actions proposed.</p>
                    ) : (
                      <div className="space-y-3">
                        {actions.map((a: any) => (
                          <div key={a.id} className="p-3 rounded-lg border border-border space-y-1">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px]">{a.action_type}</Badge>
                              <Badge variant={a.priority === "critical" ? "destructive" : a.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{a.priority}</Badge>
                            </div>
                            <p className="text-sm">{a.description}</p>
                            <p className="text-xs text-muted-foreground">Target: {a.target_domain} | Status: {a.status}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardHeader><CardTitle className="text-sm">Kernel Protection Reviews</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {reviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No kernel reviews submitted.</p>
                    ) : (
                      <div className="space-y-3">
                        {reviews.map((r: any) => (
                          <div key={r.id} className="p-3 rounded-lg border border-border space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{r.review_type} review</span>
                              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                            </div>
                            <p className="text-xs">Posture: {r.overall_posture} | Scope: {r.review_scope}</p>
                            {r.review_notes && <p className="text-xs text-muted-foreground">{r.review_notes}</p>}
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
      </SidebarInset>
    </SidebarProvider>
  );
}

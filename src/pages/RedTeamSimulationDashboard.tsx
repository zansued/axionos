import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Target, Play, AlertTriangle, Search, ClipboardCheck, Loader2 } from "lucide-react";
import {
  useRedTeamOverview,
  useRedTeamExercises,
  useRedTeamScenarios,
  useRedTeamRuns,
  useRedTeamFindings,
  useRedTeamReviews,
  useRunSimulation,
} from "@/hooks/useRedTeamSimulation";

const SCENARIO_TYPES = [
  { value: "invalid_contract_input_pressure", label: "Contract Input Pressure" },
  { value: "repeated_validation_bypass_attempt", label: "Validation Bypass Attempt" },
  { value: "permission_boundary_probe", label: "Permission Boundary Probe" },
  { value: "unsafe_tool_action_request", label: "Unsafe Tool Action" },
  { value: "noisy_runtime_signal_flood", label: "Signal Flood" },
  { value: "retrieval_context_poisoning_simulation", label: "Retrieval Poisoning" },
  { value: "tenant_boundary_scope_check", label: "Tenant Boundary Check" },
  { value: "deployment_hardening_stress_case", label: "Deployment Stress" },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-primary/20 text-primary border-primary/30",
  none: "bg-muted text-muted-foreground border-border",
};

export default function RedTeamSimulationDashboard() {
  const [tab, setTab] = useState("exercises");
  const [selectedScenario, setSelectedScenario] = useState(SCENARIO_TYPES[0].value);
  const [simResult, setSimResult] = useState<any>(null);

  const overview = useRedTeamOverview();
  const exercises = useRedTeamExercises();
  const scenarios = useRedTeamScenarios();
  const runs = useRedTeamRuns();
  const findings = useRedTeamFindings();
  const reviews = useRedTeamReviews();
  const runSim = useRunSimulation();

  const stats = overview.data ?? { total_exercises: 0, total_runs: 0, total_findings: 0, pending_reviews: 0 };

  const handleRunSimulation = async () => {
    try {
      const result = await runSim.mutateAsync({ scenario_type: selectedScenario });
      setSimResult(result);
      setTab("runs");
    } catch (e) {
      console.error("Simulation failed", e);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-destructive" />
              Red Team Simulation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Governed adversarial simulation — sandbox-only, bounded, defensive-purpose
            </p>
          </div>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            Sandbox Mode
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border bg-card"><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Exercises</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.total_exercises}</div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Simulation Runs</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.total_runs}</div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Findings</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.total_findings}</div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending Reviews</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.pending_reviews}</div>
          </CardContent></Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="exercises"><Target className="h-3.5 w-3.5 mr-1" />Exercises</TabsTrigger>
            <TabsTrigger value="scenarios"><Search className="h-3.5 w-3.5 mr-1" />Scenario Catalog</TabsTrigger>
            <TabsTrigger value="runs"><Play className="h-3.5 w-3.5 mr-1" />Simulation Runs</TabsTrigger>
            <TabsTrigger value="findings"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Fragility Findings</TabsTrigger>
            <TabsTrigger value="reviews"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Breach Review</TabsTrigger>
          </TabsList>

          {/* Exercises */}
          <TabsContent value="exercises" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Red Team Exercises</CardTitle></CardHeader>
              <CardContent>
                {exercises.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                ) : (exercises.data?.exercises?.length ?? 0) === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No exercises yet. Run a simulation to generate your first exercise.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exercises.data.exercises.map((ex: any) => (
                      <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <div className="text-sm font-medium text-foreground">{ex.exercise_name}</div>
                          <div className="text-xs text-muted-foreground">{ex.target_surface} · {ex.threat_domain}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={SEVERITY_COLORS[ex.severity_summary] ?? SEVERITY_COLORS.none}>
                            {ex.severity_summary}
                          </Badge>
                          <Badge variant="outline">{ex.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scenario Catalog */}
          <TabsContent value="scenarios" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm">Run Bounded Simulation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Scenario Type</label>
                    <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCENARIO_TYPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleRunSimulation}
                    disabled={runSim.isPending}
                    className="bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                  >
                    {runSim.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    Run Simulation
                  </Button>
                </div>

                {simResult && (
                  <Card className="border-border bg-muted/20">
                    <CardContent className="pt-4 space-y-3">
                      <div className="text-sm font-medium text-foreground">Simulation Result</div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">Fragility Score</div>
                          <div className="text-lg font-bold text-foreground">{simResult.fragility?.score ?? 0}/100</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Label</div>
                          <Badge variant="outline" className={SEVERITY_COLORS[simResult.fragility?.label] ?? SEVERITY_COLORS.none}>
                            {simResult.fragility?.label ?? "unknown"}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Breach</div>
                          <Badge variant="outline" className={simResult.breach?.breach_detected ? SEVERITY_COLORS.critical : SEVERITY_COLORS.none}>
                            {simResult.breach?.breach_detected ? "DETECTED" : "None"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><span className="text-foreground font-medium">Simulated:</span> {simResult.explanation?.what_was_simulated}</p>
                        <p><span className="text-foreground font-medium">Resisted:</span> {simResult.explanation?.what_resisted}</p>
                        <p><span className="text-foreground font-medium">Failed:</span> {simResult.explanation?.what_failed}</p>
                        <p><span className="text-foreground font-medium">Fragile:</span> {simResult.explanation?.what_was_fragile}</p>
                        <p><span className="text-foreground font-medium">Follow-up:</span> {simResult.explanation?.recommended_followup}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2 pt-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Available Scenarios</div>
                  {SCENARIO_TYPES.map((s) => (
                    <div key={s.value} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div>
                        <div className="text-sm font-medium text-foreground">{s.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">{s.value}</div>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">sandbox</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulation Runs */}
          <TabsContent value="runs" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Simulation Runs</CardTitle></CardHeader>
              <CardContent>
                {runs.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                ) : (runs.data?.runs?.length ?? 0) === 0 ? (
                  <div className="text-center py-8">
                    <Play className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No simulation runs yet. Use the Scenario Catalog to run your first simulation.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {runs.data.runs.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <div className="text-sm font-medium text-foreground">{r.run_label}</div>
                          <div className="text-xs text-muted-foreground">
                            Resisted: {r.resisted_count} · Failed: {r.failed_count} · Fragile: {r.fragile_count}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.breach_detected && <Badge variant="outline" className={SEVERITY_COLORS.critical}>Breach</Badge>}
                          <Badge variant="outline">{r.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fragility Findings */}
          <TabsContent value="findings" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Fragility Findings</CardTitle></CardHeader>
              <CardContent>
                {findings.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                ) : (findings.data?.findings?.length ?? 0) === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No findings yet. Run simulations to generate findings.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {findings.data.findings.map((f: any) => (
                      <div key={f.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-foreground">{f.title}</div>
                          <Badge variant="outline" className={SEVERITY_COLORS[f.severity] ?? SEVERITY_COLORS.none}>{f.severity}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{f.description}</div>
                        {f.recommended_followup && (
                          <div className="text-xs text-primary">→ {f.recommended_followup}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breach Review */}
          <TabsContent value="reviews" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Breach Review Queue</CardTitle></CardHeader>
              <CardContent>
                {reviews.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                ) : (reviews.data?.reviews?.length ?? 0) === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No items in review queue. Breach findings will appear here for review.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviews.data.reviews.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <div className="text-sm font-medium text-foreground">{r.review_type}</div>
                          <div className="text-xs text-muted-foreground">{r.review_notes || "Pending review"}</div>
                        </div>
                        <Badge variant="outline" className={r.status === "pending" ? SEVERITY_COLORS.medium : SEVERITY_COLORS.none}>
                          {r.status}
                        </Badge>
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

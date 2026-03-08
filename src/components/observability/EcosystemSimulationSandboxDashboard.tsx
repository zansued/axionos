import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Beaker, Shield, AlertTriangle, Activity, BarChart3, FileCheck, Zap } from "lucide-react";
import { useEcosystemSimulationSandbox } from "@/hooks/useEcosystemSimulationSandbox";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function EcosystemSimulationSandboxDashboard() {
  const { overview, scenarios, runs, policyConflicts, blastRadius, outcomes } = useEcosystemSimulationSandbox();
  const ov = overview.data as Record<string, any> | null;
  const scens = (scenarios.data as any)?.scenarios || [];
  const simRuns = (runs.data as any)?.runs || [];
  const conflicts = (policyConflicts.data as any)?.conflicts || [];
  const estimates = (blastRadius.data as any)?.estimates || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Beaker className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Ecosystem Simulation & Sandbox</h2>
          <p className="text-sm text-muted-foreground">
            Governed sandbox simulation — advisory-first, no live activation
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-blue-500/30 text-blue-400">Sandbox Only</Badge>
      </div>

      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <StatCard label="Scenarios" value={ov.total_scenarios ?? 0} />
          <StatCard label="Runs" value={ov.total_runs ?? 0} />
          <StatCard label="Conflicts" value={ov.total_conflicts ?? 0} />
          <StatCard label="Blast Estimates" value={ov.total_blast_estimates ?? 0} />
          <StatCard label="Outcomes" value={ov.total_outcomes ?? 0} />
        </div>
      )}

      <Tabs defaultValue="scenarios">
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="scenarios" className="text-xs gap-1"><Beaker className="h-3 w-3" /> Scenarios</TabsTrigger>
          <TabsTrigger value="runs" className="text-xs gap-1"><Activity className="h-3 w-3" /> Runs</TabsTrigger>
          <TabsTrigger value="conflicts" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Conflicts</TabsTrigger>
          <TabsTrigger value="blast" className="text-xs gap-1"><Zap className="h-3 w-3" /> Blast Radius</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="mt-4 space-y-3">
          {scens.length === 0 ? (
            <EmptyState icon={Beaker} text="No sandbox scenarios defined." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {scens.slice(0, 20).map((s: any) => (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{s.scenario_name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{s.capability_name} · {s.capability_domain} · {s.exposure_class}</p>
                    <p className="text-xs text-muted-foreground">Actor: {s.simulated_actor_type} · Trust: {s.simulated_trust_tier}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricBar label="Readiness" value={s.simulation_readiness_score} />
                      <MetricBar label="Safety" value={s.sandbox_safety_score} />
                    </div>
                    <SignalBadge signal={s.activation_readiness_signal} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="runs" className="mt-4 space-y-3">
          {simRuns.length === 0 ? (
            <EmptyState icon={Activity} text="No simulation runs recorded." />
          ) : (
            <div className="space-y-2">
              {simRuns.slice(0, 20).map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{r.ecosystem_sandbox_scenarios?.scenario_name || "Unknown"}</p>
                      <StatusBadge status={r.run_status} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <MetricPill label="Policy" value={r.policy_conflict_score} />
                      <MetricPill label="Trust" value={r.trust_failure_score} />
                      <MetricPill label="Blast" value={r.blast_radius_score} />
                      <MetricPill label="Rollback" value={r.rollback_viability_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="mt-4 space-y-3">
          {conflicts.length === 0 ? (
            <EmptyState icon={AlertTriangle} text="No policy conflicts simulated." />
          ) : (
            <div className="space-y-2">
              {conflicts.slice(0, 20).map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{c.description || c.conflict_type}</p>
                      <p className="text-xs text-muted-foreground">{c.ecosystem_sandbox_scenarios?.scenario_name} · {c.severity}</p>
                    </div>
                    <SeverityBadge severity={c.severity} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blast" className="mt-4 space-y-3">
          {estimates.length === 0 ? (
            <EmptyState icon={Zap} text="No blast radius estimates." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {estimates.slice(0, 20).map((e: any) => (
                <Card key={e.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold text-sm">{e.ecosystem_sandbox_scenarios?.scenario_name || "Scenario"}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricPill label="Blast" value={e.blast_radius_score} />
                      <MetricPill label="Rollback" value={e.rollback_viability_score} />
                      <MetricPill label="Contain" value={e.containment_quality_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outcomes" className="mt-4 space-y-3">
          {outs.length === 0 ? (
            <EmptyState icon={FileCheck} text="No simulation outcomes recorded." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.recommendation_type} · {o.ecosystem_sandbox_scenarios?.scenario_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Quality: {((o.recommendation_quality_score || 0) * 100).toFixed(0)}% · FP Risk: {((o.false_positive_activation_risk_score || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <StatusBadge status={o.outcome_status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    ready: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    running: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    pending: "bg-muted text-muted-foreground",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
    archived: "bg-muted text-muted-foreground",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    moderate: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  };
  return <Badge className={`text-[10px] ${styles[severity] || "bg-muted text-muted-foreground"}`}>{severity}</Badge>;
}

function SignalBadge({ signal }: { signal: string }) {
  const styles: Record<string, string> = {
    simulation_ready: "bg-green-500/20 text-green-400 border-green-500/30",
    conditional: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    not_ready: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge className={`text-[10px] ${styles[signal] || "bg-muted text-muted-foreground"}`}>{signal}</Badge>;
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono">{((value || 0) * 100).toFixed(0)}%</span>
      </div>
      <Progress value={(value || 0) * 100} className="h-1.5" />
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="font-mono text-xs">{((value || 0) * 100).toFixed(0)}%</p>
    </div>
  );
}

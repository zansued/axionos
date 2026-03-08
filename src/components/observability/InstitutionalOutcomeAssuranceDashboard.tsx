import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, BarChart3, AlertTriangle, Layers, FileSearch, FileCheck } from "lucide-react";
import { useInstitutionalOutcomeAssurance } from "@/hooks/useInstitutionalOutcomeAssurance";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function InstitutionalOutcomeAssuranceDashboard() {
  const { overview, models, assessments, drift, signals, reviews, outcomes } = useInstitutionalOutcomeAssurance();
  const ov = overview.data as Record<string, any> | null;
  const mods = (models.data as any)?.models || [];
  const assts = (assessments.data as any)?.assessments || [];
  const vars = (drift.data as any)?.variances || [];
  const sigs = (signals.data as any)?.signals || [];
  const revs = (reviews.data as any)?.reviews || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Institutional Outcome Assurance</h2>
          <p className="text-sm text-muted-foreground">Verifying platform outcomes — advisory-first, governance-first</p>
        </div>
        <Badge variant="outline" className="ml-auto border-emerald-500/30 text-emerald-400">Assurance First</Badge>
      </div>

      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <StatCard label="Models" value={ov.total_models ?? 0} />
          <StatCard label="Assessments" value={ov.total_assessments ?? 0} />
          <StatCard label="Variances" value={ov.total_variances ?? 0} />
          <StatCard label="High Variance" value={ov.high_variance_count ?? 0} />
          <StatCard label="Reviews" value={ov.total_reviews ?? 0} />
          <StatCard label="Pending" value={ov.pending_reviews ?? 0} />
        </div>
      )}

      <Tabs defaultValue="assessments">
        <TabsList className="grid w-full grid-cols-6 h-9">
          <TabsTrigger value="assessments" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Assessments</TabsTrigger>
          <TabsTrigger value="drift" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Drift</TabsTrigger>
          <TabsTrigger value="cross-layer" className="text-xs gap-1"><Layers className="h-3 w-3" /> Cross-Layer</TabsTrigger>
          <TabsTrigger value="remediation" className="text-xs gap-1"><FileSearch className="h-3 w-3" /> Remediation</TabsTrigger>
          <TabsTrigger value="models" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> Models</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="mt-4 space-y-3">
          {assts.length === 0 ? (
            <EmptyState icon={BarChart3} text="No outcome assessments yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assts.slice(0, 20).map((a: any) => (
                <Card key={a.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{a.institutional_outcome_models?.outcome_model_name || a.outcome_domain}</p>
                      <Badge className="text-[10px] bg-muted">{a.outcome_scope_type}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <MetricBar label="Expected" value={a.expected_outcome_score} />
                      <MetricBar label="Realized" value={a.realized_outcome_score} />
                      <MetricBar label="Variance" value={a.outcome_variance_score} warn />
                      <MetricBar label="Confidence" value={a.assurance_confidence_score} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricBar label="Evidence" value={a.evidence_density_score} />
                      <MetricBar label="Stability" value={a.stability_score} />
                      <MetricBar label="Drift" value={a.drift_score} warn />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drift" className="mt-4 space-y-3">
          {vars.length === 0 ? (
            <EmptyState icon={AlertTriangle} text="No outcome variances detected." />
          ) : (
            <div className="space-y-2">
              {vars.slice(0, 20).map((v: any) => (
                <Card key={v.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{v.outcome_domain} — {v.variance_type}</p>
                      <p className="text-xs text-muted-foreground">{v.rationale || 'No rationale'}</p>
                      <p className="text-xs text-muted-foreground">Recurrence: {v.recurrence_count}</p>
                    </div>
                    <div className="flex gap-2">
                      <MetricPill label="Drift" value={v.drift_score} />
                      <MetricPill label="Fragility" value={v.fragility_score} />
                      <MetricPill label="Priority" value={v.remediation_priority_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cross-layer" className="mt-4 space-y-3">
          {sigs.length === 0 ? (
            <EmptyState icon={Layers} text="No cross-layer assurance signals." />
          ) : (
            <div className="space-y-2">
              {sigs.slice(0, 20).map((s: any) => (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{s.signal_layer} — {s.signal_type}</p>
                    </div>
                    <div className="flex gap-2">
                      <MetricPill label="Assurance" value={s.cross_layer_assurance_score} />
                      <MetricPill label="Stability" value={s.stability_score} />
                      <MetricPill label="Evidence" value={s.evidence_density_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="remediation" className="mt-4 space-y-3">
          {revs.length === 0 ? (
            <EmptyState icon={FileSearch} text="No remediation reviews." />
          ) : (
            <div className="space-y-2">
              {revs.slice(0, 20).map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{r.institutional_outcome_assessments?.outcome_domain || 'Assessment'}</p>
                      <p className="text-xs text-muted-foreground">{r.review_notes || 'No notes'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.recommendation_status} />
                      <StatusBadge status={r.review_status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="models" className="mt-4 space-y-3">
          {mods.length === 0 ? (
            <EmptyState icon={ShieldCheck} text="No outcome models defined." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {mods.slice(0, 20).map((m: any) => (
                <Card key={m.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{m.outcome_model_name}</p>
                      <Badge className="text-[10px] bg-muted">{m.outcome_domain}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Scope: {m.outcome_scope_type} · Status: {m.status}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outcomes" className="mt-4 space-y-3">
          {outs.length === 0 ? (
            <EmptyState icon={FileCheck} text="No assurance outcomes recorded." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.outcome_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Accuracy: {((o.assurance_outcome_accuracy_score || 0) * 100).toFixed(0)}% · Readiness: {((o.bounded_remediation_readiness_score || 0) * 100).toFixed(0)}%
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
    stable: "bg-green-500/20 text-green-400 border-green-500/30",
    monitor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    needs_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high_variance: "bg-red-500/20 text-red-400 border-red-500/30",
    remediation_candidate: "bg-red-500/20 text-red-400 border-red-500/30",
    pending: "bg-muted text-muted-foreground",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
    reviewed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function MetricBar({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  const pct = (value || 0) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className={`text-[10px] font-mono ${warn && pct > 40 ? 'text-yellow-400' : ''}`}>{pct.toFixed(0)}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
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

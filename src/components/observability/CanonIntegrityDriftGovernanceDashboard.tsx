import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, Shield, Layers, FileSearch, FileCheck } from "lucide-react";
import { useCanonIntegrityDriftGovernance } from "@/hooks/useCanonIntegrityDriftGovernance";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function CanonIntegrityDriftGovernanceDashboard() {
  const { overview, models, assessments, drift, signals, reviews, outcomes } = useCanonIntegrityDriftGovernance();
  const ov = overview.data as Record<string, any> | null;
  const mods = (models.data as any)?.models || [];
  const assts = (assessments.data as any)?.assessments || [];
  const drfts = (drift.data as any)?.drifts || [];
  const sigs = (signals.data as any)?.signals || [];
  const revs = (reviews.data as any)?.reviews || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Canon Integrity & Drift Governance</h2>
          <p className="text-sm text-muted-foreground">Verifying platform faithfulness to canonical architecture and principles</p>
        </div>
        <Badge variant="outline" className="ml-auto border-sky-500/30 text-sky-400">Integrity First</Badge>
      </div>

      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <StatCard label="Models" value={ov.total_models ?? 0} />
          <StatCard label="Assessments" value={ov.total_assessments ?? 0} />
          <StatCard label="Drift Events" value={ov.total_drift_events ?? 0} />
          <StatCard label="High Severity" value={ov.high_severity_drifts ?? 0} />
          <StatCard label="Reviews" value={ov.total_reviews ?? 0} />
          <StatCard label="Pending" value={ov.pending_reviews ?? 0} />
        </div>
      )}

      <Tabs defaultValue="conformance">
        <TabsList className="grid w-full grid-cols-6 h-9">
          <TabsTrigger value="conformance" className="text-xs gap-1"><Shield className="h-3 w-3" /> Conformance</TabsTrigger>
          <TabsTrigger value="drift" className="text-xs gap-1"><FileText className="h-3 w-3" /> Drift</TabsTrigger>
          <TabsTrigger value="signals" className="text-xs gap-1"><Layers className="h-3 w-3" /> Signals</TabsTrigger>
          <TabsTrigger value="remediation" className="text-xs gap-1"><FileSearch className="h-3 w-3" /> Remediation</TabsTrigger>
          <TabsTrigger value="models" className="text-xs gap-1"><BookOpen className="h-3 w-3" /> Models</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="conformance" className="mt-4 space-y-3">
          {assts.length === 0 ? (
            <EmptyState icon={Shield} text="No conformance assessments yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assts.slice(0, 20).map((a: any) => (
                <Card key={a.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{a.canon_integrity_models?.canonical_source_name || a.integrity_domain}</p>
                      <Badge className="text-[10px] bg-muted">{a.integrity_scope_type}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricBar label="Conformance" value={a.conformance_score} />
                      <MetricBar label="Drift" value={a.drift_score} warn />
                      <MetricBar label="Inconsistency" value={a.inconsistency_score} warn />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricBar label="Principles" value={a.principle_alignment_score} />
                      <MetricBar label="Boundaries" value={a.mutation_boundary_integrity_score} />
                      <MetricBar label="Cross-Doc" value={a.cross_doc_consistency_score} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricBar label="Arch Align" value={a.architecture_canon_alignment_score} />
                      <MetricBar label="Gov Align" value={a.governance_canon_alignment_score} />
                      <MetricBar label="Op Conform" value={a.operational_conformance_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drift" className="mt-4 space-y-3">
          {drfts.length === 0 ? (
            <EmptyState icon={FileText} text="No canon drift events detected." />
          ) : (
            <div className="space-y-2">
              {drfts.slice(0, 20).map((d: any) => (
                <Card key={d.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{d.integrity_domain} — {d.drift_type}</p>
                      <p className="text-xs text-muted-foreground">{d.description || d.principle_violated || 'No description'}</p>
                      <p className="text-xs text-muted-foreground">Recurrence: {d.recurrence_count}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <MetricPill label="Drift" value={d.drift_score} />
                      <SeverityBadge severity={d.severity} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="signals" className="mt-4 space-y-3">
          {sigs.length === 0 ? (
            <EmptyState icon={Layers} text="No conformance signals." />
          ) : (
            <div className="space-y-2">
              {sigs.slice(0, 20).map((s: any) => (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <p className="text-sm">{s.signal_layer} — {s.signal_type}</p>
                    <div className="flex gap-2">
                      <MetricPill label="Conform" value={s.conformance_score} />
                      <MetricPill label="Principles" value={s.principle_alignment_score} />
                      <MetricPill label="Boundaries" value={s.mutation_boundary_integrity_score} />
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
                      <p className="text-sm">{r.canon_integrity_assessments?.integrity_domain || 'Assessment'}</p>
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
            <EmptyState icon={BookOpen} text="No integrity models defined." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {mods.slice(0, 20).map((m: any) => (
                <Card key={m.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{m.canonical_source_name}</p>
                      <Badge className="text-[10px] bg-muted">{m.integrity_domain}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Type: {m.canonical_source_type} · Status: {m.status}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outcomes" className="mt-4 space-y-3">
          {outs.length === 0 ? (
            <EmptyState icon={FileCheck} text="No integrity outcomes recorded." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.outcome_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Accuracy: {((o.canon_outcome_accuracy_score || 0) * 100).toFixed(0)}% · Readiness: {((o.bounded_alignment_readiness_score || 0) * 100).toFixed(0)}%
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
    aligned: "bg-green-500/20 text-green-400 border-green-500/30",
    monitor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    investigate_drift: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    review_boundary: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    needs_canon_review: "bg-red-500/20 text-red-400 border-red-500/30",
    align_docs: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    pending: "bg-muted text-muted-foreground",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
    reviewed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
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

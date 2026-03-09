import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Activity, HeartPulse, Eye, RefreshCw, PlayCircle, ShieldAlert, Info, Clock } from "lucide-react";
import { toast } from "sonner";
import { PostureBadge, SeverityBadge, CrossSprintSignalCard, AdminCreateDialog, ScoreBar, ScoringTransparencyCard, CausalModifierCard } from "@/components/block-w/BlockWShared";
import { BlockWConstitutionManager, MISSION_CONSTITUTION_FIELDS } from "@/components/block-w/BlockWConstitutionManager";
import { BlockWSubjectManager } from "@/components/block-w/BlockWSubjectManager";
import { BlockWHistoryChart, BlockWSnapshotComparison } from "@/components/block-w/BlockWHistoryChart";

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

export default function MissionIntegrity() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  const overview = useQuery({ queryKey: ["mission-integrity-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const evaluations = useQuery({ queryKey: ["mission-integrity-evals", orgId], queryFn: () => invokeEngine(orgId!, "evaluate"), enabled: !!orgId });
  const driftEvents = useQuery({ queryKey: ["mission-integrity-drift", orgId], queryFn: () => invokeEngine(orgId!, "drift_events"), enabled: !!orgId });
  const recommendations = useQuery({ queryKey: ["mission-integrity-recs", orgId], queryFn: () => invokeEngine(orgId!, "recommendations"), enabled: !!orgId });
  const snapshots = useQuery({ queryKey: ["mission-integrity-snapshots", orgId], queryFn: () => invokeEngine(orgId!, "snapshots"), enabled: !!orgId });
  const explain = useQuery({ queryKey: ["mission-integrity-explain", orgId], queryFn: () => invokeEngine(orgId!, "explain"), enabled: !!orgId });
  const crossSignals = useQuery({ queryKey: ["mission-integrity-signals", orgId], queryFn: () => invokeEngine(orgId!, "cross_sprint_signals"), enabled: !!orgId });
  const constitutionsQ = useQuery({ queryKey: ["mission-integrity-constitutions", orgId], queryFn: () => invokeEngine(orgId!, "constitutions"), enabled: !!orgId });
  const subjectsAllQ = useQuery({ queryKey: ["mission-integrity-subjects-all", orgId], queryFn: () => invokeEngine(orgId!, "subjects_all"), enabled: !!orgId });
  const historyQ = useQuery({ queryKey: ["mission-integrity-history", orgId], queryFn: () => invokeEngine(orgId!, "evaluation_history"), enabled: !!orgId });

  const o = overview.data;
  const evals = evaluations.data?.evaluations || [];
  const drifts = driftEvents.data?.drift_events || [];
  const recs = recommendations.data?.recommendations || [];
  const snaps = snapshots.data?.snapshots || [];
  const expl = explain.data;
  const signals = crossSignals.data;
  const constitutions = constitutionsQ.data?.constitutions || [];
  const allSubjects = subjectsAllQ.data?.subjects || [];
  const history = historyQ.data?.history || [];

  function refreshAll() {
    ["overview", "evals", "drift", "recs", "snapshots", "explain", "signals", "constitutions", "subjects-all", "history"].forEach(k =>
      queryClient.invalidateQueries({ queryKey: [`mission-integrity-${k}`] }));
  }

  async function runEvaluation() {
    if (!orgId) return;
    setRunning(true);
    try {
      const res = await invokeEngine(orgId, "run_evaluation");
      if (res?.error) { toast.error(res.error); } else {
        setEvalResult(res);
        toast.success(`Evaluated ${res?.total_evaluated || 0} subjects. ${res?.total_drift_events_generated || 0} drift events, ${res?.total_corrections_generated || 0} corrections.`);
        refreshAll();
      }
    } catch (err: any) { toast.error(err.message || "Evaluation failed"); }
    finally { setRunning(false); }
  }

  async function createSubject(values: Record<string, string>) {
    if (!orgId) return;
    const { error } = await supabase.from("mission_integrity_subjects").insert([{
      organization_id: orgId, title: values.title,
      subject_code: values.title.toLowerCase().replace(/\s+/g, "_").slice(0, 30),
      subject_type: values.subject_type || "initiative", domain: values.domain || "general",
      summary: values.summary || "", active: true, subject_ref: "{}",
    }]);
    if (error) toast.error(error.message);
    else { toast.success("Subject created"); refreshAll(); }
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <HeartPulse className="h-6 w-6 text-primary" /> Mission Integrity & Drift Prevention
            </h1>
            <p className="text-muted-foreground mt-1">Continuous evaluation of mission alignment, identity, and normative direction.</p>
          </div>
          <div className="flex gap-2">
            <AdminCreateDialog title="Add Mission Subject" fields={[
              { name: "title", label: "Title", type: "text", required: true, placeholder: "e.g. Public Service Commitment" },
              { name: "subject_type", label: "Type", type: "select", options: [
                { value: "initiative", label: "Initiative" }, { value: "policy", label: "Policy" },
                { value: "commitment", label: "Commitment" }, { value: "program", label: "Program" },
              ] },
              { name: "domain", label: "Domain", type: "select", options: [
                { value: "general", label: "General" }, { value: "governance", label: "Governance" },
                { value: "mission", label: "Mission" }, { value: "identity", label: "Identity" },
              ] },
              { name: "summary", label: "Summary", type: "textarea", placeholder: "Describe the subject…" },
            ]} onSubmit={createSubject} />
            <Button onClick={runEvaluation} disabled={running} className="gap-2">
              <PlayCircle className="h-4 w-4" /> {running ? "Evaluating…" : "Run Evaluation"}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4" /> Avg Alignment</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{o ? `${Math.round(o.avg_alignment_score * 100)}%` : "—"}</div><ScoreBar label="Alignment" value={o?.avg_alignment_score || 0} /></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Avg Erosion</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{o ? `${Math.round(o.avg_erosion_score * 100)}%` : "—"}</div><ScoreBar label="Erosion Risk" value={o?.avg_erosion_score || 0} dangerous /></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Drift Events</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{o?.total_drift_events ?? "—"}</div><p className="text-xs text-muted-foreground">{o?.unresolved_drift ?? 0} unresolved</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Corrections</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{o?.active_recommendations ?? "—"}</div><p className="text-xs text-muted-foreground">{o?.total_recommendations ?? 0} total</p></CardContent></Card>
        </div>

        {o?.protected_commitments?.length > 0 && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Protected Commitments</CardTitle></CardHeader>
            <CardContent><div className="flex flex-wrap gap-2">{o.protected_commitments.map((c: string, i: number) => (
              <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/20">{c}</Badge>
            ))}</div></CardContent></Card>
        )}

        {evalResult?.explanation && (
          <Card className="border-primary/30 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Latest Evaluation Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">Posture: <span className="capitalize">{evalResult.explanation.overall_posture}</span></p>
              <p className="text-sm text-muted-foreground">{evalResult.explanation.health_summary}</p>
              <p className="text-sm text-muted-foreground">{evalResult.explanation.drift_summary}</p>
            </CardContent></Card>
        )}

        <Tabs defaultValue="alignment" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="alignment">Alignment vs Drift</TabsTrigger>
            <TabsTrigger value="drift">Drift Events</TabsTrigger>
            <TabsTrigger value="corrections">Corrections</TabsTrigger>
            <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="alignment" className="space-y-4">
            <Card><CardHeader><CardTitle>Alignment vs Drift Matrix</CardTitle></CardHeader>
              <CardContent>
                {evals.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">No evaluations yet.</p> : (
                  <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Subject</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">Alignment</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">Drift Risk</th>
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">Erosion</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Posture</th>
                    </tr></thead>
                    <tbody>{evals.slice(0, 30).map((ev: any) => (
                      <tr key={ev.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium">{ev.mission_integrity_subjects?.title || "—"}</td>
                        <td className="text-center py-2 px-3"><span className="font-mono text-xs">{Math.round(Number(ev.alignment_score) * 100)}%</span></td>
                        <td className="text-center py-2 px-3"><span className={`font-mono text-xs ${Number(ev.drift_risk_score) >= 0.5 ? "text-destructive" : ""}`}>{Math.round(Number(ev.drift_risk_score) * 100)}%</span></td>
                        <td className="text-center py-2 px-3"><span className={`font-mono text-xs ${Number(ev.erosion_score) >= 0.4 ? "text-destructive" : ""}`}>{Math.round(Number(ev.erosion_score) * 100)}%</span></td>
                        <td className="py-2 px-3"><PostureBadge posture={ev.posture || "unknown"} /></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                )}
              </CardContent></Card>
          </TabsContent>

          <TabsContent value="drift" className="space-y-4">
            <Card><CardHeader><CardTitle>Mission Drift Events</CardTitle></CardHeader>
              <CardContent>{drifts.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">No drift events detected.</p> : (
                <div className="space-y-3">{drifts.slice(0, 20).map((d: any) => (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"><div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={d.severity} />
                      <Badge variant="outline">{d.drift_type}</Badge>
                      {!d.resolved_at && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Unresolved</Badge>}
                    </div>
                    <p className="text-sm">{d.event_summary}</p>
                  </div></div>
                ))}</div>
              )}</CardContent></Card>
          </TabsContent>

          <TabsContent value="corrections" className="space-y-4">
            <Card><CardHeader><CardTitle>Correction Recommendations</CardTitle></CardHeader>
              <CardContent>{recs.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">No corrections pending.</p> : (
                <div className="space-y-3">{recs.slice(0, 20).map((r: any) => (
                  <div key={r.id} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={r.correction_priority} />
                      <Badge variant="outline">{r.recommendation_type}</Badge>
                    </div>
                    <p className="text-sm">{r.recommendation_summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>
                  </div>
                ))}</div>
              )}</CardContent></Card>
          </TabsContent>

          <TabsContent value="snapshots" className="space-y-4">
            <BlockWSnapshotComparison
              title="Mission Integrity Snapshots"
              snapshots={snaps}
              scoreKeys={[
                { key: "mission_health_score", label: "Mission Health" },
                { key: "drift_density_score", label: "Drift Density", dangerous: true },
                { key: "correction_readiness_score", label: "Correction Readiness" },
              ]}
            />
            {snaps.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No snapshots yet. Run an evaluation to generate one.</CardContent></Card>}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <BlockWHistoryChart
              title="Mission Integrity Trend"
              description="Alignment, drift risk, and erosion over evaluation cycles."
              data={history}
              metrics={[
                { key: "alignment", label: "Alignment", color: "hsl(142, 71%, 45%)" },
                { key: "drift_risk", label: "Drift Risk", color: "hsl(38, 92%, 50%)", dangerous: true },
                { key: "erosion", label: "Erosion", color: "hsl(0, 84%, 60%)", dangerous: true },
              ]}
            />
          </TabsContent>

          <TabsContent value="governance" className="space-y-4">
            {orgId && (
              <>
                <BlockWConstitutionManager
                  tableName="mission_constitutions"
                  sprintLabel="Mission"
                  orgId={orgId}
                  constitutions={constitutions}
                  loading={constitutionsQ.isLoading}
                  onRefresh={refreshAll}
                  fields={MISSION_CONSTITUTION_FIELDS}
                  extraDefaults={{ created_by: "system" }}
                />
                <BlockWSubjectManager
                  tableName="mission_integrity_subjects"
                  label="Manage Mission Subjects"
                  subjects={allSubjects}
                  loading={subjectsAllQ.isLoading}
                  onRefresh={refreshAll}
                  fields={[
                    { name: "title", label: "Title", type: "text" },
                    { name: "subject_type", label: "Type", type: "select", options: [
                      { value: "initiative", label: "Initiative" }, { value: "policy", label: "Policy" },
                      { value: "commitment", label: "Commitment" }, { value: "program", label: "Program" },
                    ] },
                    { name: "domain", label: "Domain", type: "select", options: [
                      { value: "general", label: "General" }, { value: "governance", label: "Governance" },
                      { value: "mission", label: "Mission" }, { value: "identity", label: "Identity" },
                    ] },
                    { name: "summary", label: "Summary", type: "textarea" },
                  ]}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="integration">
            <div className="space-y-4">
              <CausalModifierCard modifiers={signals?.causal_modifiers || []} title="Sprint 108 + 110 → 109: Tradeoff & Simulation Influence" />
              {signals?.tradeoff_pressure && (
                <CrossSprintSignalCard title="Tradeoff Pressure (Sprint 108 → 109)" signals={[
                  { label: "Avg Compromise Risk", value: signals.tradeoff_pressure.avg_compromise_risk },
                  { label: "Avg Reversibility", value: signals.tradeoff_pressure.avg_reversibility },
                  { label: "Hidden Sacrifice", value: signals.tradeoff_pressure.has_hidden_sacrifice ? "Detected" : "No", severity: signals.tradeoff_pressure.has_hidden_sacrifice ? "high" : "low" },
                ]} relatedRoute="/tradeoff-arbitration" relatedLabel="View Tradeoffs" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

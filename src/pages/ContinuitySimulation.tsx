import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, AlertTriangle, Activity, Shield, Eye, Layers, Play, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PostureBadge, SeverityBadge, CrossSprintSignalCard, AdminCreateDialog, ScoreBar, ScoringTransparencyCard, CausalModifierCard } from "@/components/block-w/BlockWShared";
import { BlockWConstitutionManager, SIMULATION_CONSTITUTION_FIELDS } from "@/components/block-w/BlockWConstitutionManager";
import { BlockWSubjectManager } from "@/components/block-w/BlockWSubjectManager";
import { BlockWHistoryChart, BlockWSnapshotComparison } from "@/components/block-w/BlockWHistoryChart";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("civilizational-continuity-simulation-layer", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

function FutureStateBadge({ state }: { state: string }) {
  return <PostureBadge posture={state} />;
}

export default function ContinuitySimulation() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const overview = useQuery({ queryKey: ["continuity-sim-overview", orgId], queryFn: () => invokeEngine(orgId, "overview"), enabled: !!orgId });
  const simulate = useQuery({ queryKey: ["continuity-sim-runs", orgId], queryFn: () => invokeEngine(orgId, "simulate"), enabled: !!orgId });
  const stress = useQuery({ queryKey: ["continuity-sim-stress", orgId], queryFn: () => invokeEngine(orgId, "stress_points"), enabled: !!orgId });
  const snapshots = useQuery({ queryKey: ["continuity-sim-snapshots", orgId], queryFn: () => invokeEngine(orgId, "snapshots"), enabled: !!orgId });
  const recommendations = useQuery({ queryKey: ["continuity-sim-recs", orgId], queryFn: () => invokeEngine(orgId, "recommendations"), enabled: !!orgId });
  const explain = useQuery({ queryKey: ["continuity-sim-explain", orgId], queryFn: () => invokeEngine(orgId, "explain"), enabled: !!orgId });
  const crossSignals = useQuery({ queryKey: ["continuity-sim-signals", orgId], queryFn: () => invokeEngine(orgId, "cross_sprint_signals"), enabled: !!orgId });
  const constitutionsQ = useQuery({ queryKey: ["continuity-sim-constitutions", orgId], queryFn: () => invokeEngine(orgId, "constitutions"), enabled: !!orgId });
  const subjectsAllQ = useQuery({ queryKey: ["continuity-sim-subjects-all", orgId], queryFn: () => invokeEngine(orgId, "subjects_all"), enabled: !!orgId });
  const scenariosAllQ = useQuery({ queryKey: ["continuity-sim-scenarios-all", orgId], queryFn: () => invokeEngine(orgId, "scenarios_all"), enabled: !!orgId });
  const historyQ = useQuery({ queryKey: ["continuity-sim-history", orgId], queryFn: () => invokeEngine(orgId, "simulation_history"), enabled: !!orgId });

  function refreshAll() {
    ["overview", "runs", "stress", "snapshots", "recs", "explain", "signals", "constitutions", "subjects-all", "scenarios-all", "history"].forEach(k =>
      qc.invalidateQueries({ queryKey: [`continuity-sim-${k}`] }));
  }

  async function runSimulation() {
    setRunning(true);
    try {
      await invokeEngine(orgId, "run_simulation");
      toast.success("Simulation completed");
      refreshAll();
    } catch (e: any) { toast.error(e.message || "Simulation failed"); }
    finally { setRunning(false); }
  }

  async function createScenario(values: Record<string, string>) {
    if (!orgId) return;
    const { error } = await supabase.from("simulation_scenarios").insert({
      organization_id: orgId, scenario_name: values.scenario_name,
      scenario_code: values.scenario_name.toLowerCase().replace(/\s+/g, "_").slice(0, 30),
      scenario_type: values.scenario_type || "regulatory_shift",
      description: values.description || "", severity_level: values.severity_level || "medium",
      active: true, scenario_params: {},
    });
    if (error) toast.error(error.message);
    else { toast.success("Scenario created"); refreshAll(); }
  }

  async function createSubject(values: Record<string, string>) {
    if (!orgId) return;
    const { error } = await supabase.from("simulation_subjects").insert([{
      organization_id: orgId, title: values.title,
      subject_code: values.title.toLowerCase().replace(/\s+/g, "_").slice(0, 30),
      subject_type: values.subject_type || "institution",
      summary: values.summary || "", active: true, subject_ref: "{}",
    }]);
    if (error) toast.error(error.message);
    else { toast.success("Subject created"); refreshAll(); }
  }

  const data = overview.data;
  const runs = simulate.data?.runs || [];
  const stressPoints = stress.data?.stress_points || [];
  const snaps = snapshots.data?.snapshots || [];
  const recs = recommendations.data?.recommendations || [];
  const explanations = explain.data?.explanations || [];
  const signals = crossSignals.data;
  const constitutions = constitutionsQ.data?.constitutions || [];
  const allSubjects = subjectsAllQ.data?.subjects || [];
  const allScenarios = scenariosAllQ.data?.scenarios || [];
  const history = historyQ.data?.history || [];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" /> Continuity Simulation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Long-horizon institutional continuity simulation</p>
          </div>
          <div className="flex gap-2">
            <AdminCreateDialog title="Add Scenario" fields={[
              { name: "scenario_name", label: "Scenario Name", type: "text", required: true, placeholder: "e.g. Budget Collapse 2028" },
              { name: "scenario_type", label: "Type", type: "select", options: [
                { value: "regulatory_shift", label: "Regulatory Shift" }, { value: "political_shift", label: "Political Shift" },
                { value: "technological_disruption", label: "Tech Disruption" }, { value: "budget_collapse", label: "Budget Collapse" },
                { value: "talent_loss", label: "Talent Loss" }, { value: "trust_erosion", label: "Trust Erosion" },
              ] },
              { name: "severity_level", label: "Severity", type: "select", options: [
                { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
                { value: "high", label: "High" }, { value: "critical", label: "Critical" },
              ] },
              { name: "description", label: "Description", type: "textarea", placeholder: "Describe the scenario…" },
            ]} onSubmit={createScenario} />
            <AdminCreateDialog title="Add Subject" fields={[
              { name: "title", label: "Title", type: "text", required: true },
              { name: "subject_type", label: "Type", type: "select", options: [
                { value: "institution", label: "Institution" }, { value: "service", label: "Service" },
                { value: "portfolio", label: "Portfolio" }, { value: "community", label: "Community" },
              ] },
              { name: "summary", label: "Summary", type: "textarea" },
            ]} onSubmit={createSubject} />
            <Button onClick={runSimulation} disabled={running || !orgId} className="gap-2">
              <Play className="h-4 w-4" /> {running ? "Running…" : "Run Simulation"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-1 text-xs"><Activity className="h-3 w-3" />Dashboard</TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-1 text-xs"><Layers className="h-3 w-3" />Scenarios</TabsTrigger>
            <TabsTrigger value="stress" className="gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Stress</TabsTrigger>
            <TabsTrigger value="futures" className="gap-1 text-xs"><Eye className="h-3 w-3" />Futures</TabsTrigger>
            <TabsTrigger value="recs" className="gap-1 text-xs"><Shield className="h-3 w-3" />Recs</TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs"><Activity className="h-3 w-3" />History</TabsTrigger>
            <TabsTrigger value="governance" className="gap-1 text-xs"><BookOpen className="h-3 w-3" />Governance</TabsTrigger>
            <TabsTrigger value="integration" className="gap-1 text-xs"><Activity className="h-3 w-3" />Integration</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Scenarios", value: data.total_scenarios },
                    { label: "Subjects", value: data.total_subjects },
                    { label: "Simulation Runs", value: data.total_runs },
                    { label: "Stress Points", value: data.total_stress_points },
                  ].map(s => (
                    <Card key={s.label}><CardContent className="pt-4">
                      <div className="text-2xl font-bold">{s.value || 0}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </CardContent></Card>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card><CardContent className="pt-4"><ScoreBar label="Avg Survivability" value={data.avg_survivability || 0} /></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{data.total_recommendations || 0}</div><div className="text-xs text-muted-foreground">Recommendations</div></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{data.total_snapshots || 0}</div><div className="text-xs text-muted-foreground">Future Snapshots</div></CardContent></Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scenarios">
            {runs.length === 0 ? <p className="text-sm text-muted-foreground">No simulation runs yet.</p> : (
              <div className="space-y-3">{runs.map((r: any) => (
                <Card key={r.id}><CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{r.simulation_scenarios?.scenario_name || "Scenario"}</div>
                      <div className="text-xs text-muted-foreground">Subject: {r.simulation_subjects?.title || "—"}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{r.simulation_scenarios?.scenario_type}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ScoreBar label="Viability" value={Number(r.viability_score) || 0} />
                    <ScoreBar label="Stress" value={Number(r.continuity_stress_score) || 0} dangerous />
                    <ScoreBar label="Identity" value={Number(r.identity_preservation_score) || 0} />
                    <ScoreBar label="Survivability" value={Number(r.survivability_score) || 0} />
                  </div>
                </CardContent></Card>
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="stress">
            {stressPoints.length === 0 ? <p className="text-sm text-muted-foreground">No stress points.</p> : (
              <div className="space-y-3">{stressPoints.map((p: any) => (
                <Card key={p.id}><CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{p.stress_type?.replace(/_/g, " ")}</span>
                    <SeverityBadge severity={p.severity} />
                  </div>
                  <p className="text-xs text-muted-foreground">{p.stress_summary}</p>
                </CardContent></Card>
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="futures">
            <BlockWSnapshotComparison
              title="Future Continuity Snapshots — Side by Side"
              snapshots={snaps.map((s: any) => ({
                ...s,
                group_label: s.simulation_scenarios?.scenario_name || "Scenario",
                survivability: Number(s.continuity_score) || 0,
              }))}
              scoreKeys={[
                { key: "continuity_score", label: "Continuity Score" },
              ]}
              groupByKey="group_label"
            />
            {snaps.length === 0 && <p className="text-sm text-muted-foreground">No future snapshots available.</p>}
          </TabsContent>

          <TabsContent value="recs">
            {recs.length === 0 ? <p className="text-sm text-muted-foreground">No recommendations.</p> : (
              <div className="space-y-3">{recs.map((r: any) => (
                <Card key={r.id}><CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.recommendation_type?.replace(/_/g, " ")}</span>
                    <SeverityBadge severity={r.mitigation_priority} />
                  </div>
                  <p className="text-xs text-muted-foreground">{r.recommendation_summary}</p>
                </CardContent></Card>
              ))}</div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <BlockWHistoryChart
              title="Simulation Trend"
              description="Survivability, identity preservation, and continuity stress over simulation cycles."
              data={history}
              metrics={[
                { key: "survivability", label: "Survivability", color: "hsl(142, 71%, 45%)" },
                { key: "identity_preservation", label: "Identity", color: "hsl(217, 91%, 60%)" },
                { key: "continuity_stress", label: "Stress", color: "hsl(0, 84%, 60%)", dangerous: true },
              ]}
            />
          </TabsContent>

          <TabsContent value="governance" className="space-y-4">
            {orgId && (
              <>
                <BlockWConstitutionManager
                  tableName="continuity_simulation_constitutions"
                  sprintLabel="Simulation"
                  orgId={orgId}
                  constitutions={constitutions}
                  loading={constitutionsQ.isLoading}
                  onRefresh={refreshAll}
                  fields={SIMULATION_CONSTITUTION_FIELDS}
                />
                <BlockWSubjectManager
                  tableName="simulation_subjects"
                  label="Manage Simulation Subjects"
                  subjects={allSubjects}
                  loading={subjectsAllQ.isLoading}
                  onRefresh={refreshAll}
                  fields={[
                    { name: "title", label: "Title", type: "text" },
                    { name: "subject_type", label: "Type", type: "select", options: [
                      { value: "institution", label: "Institution" }, { value: "service", label: "Service" },
                      { value: "portfolio", label: "Portfolio" }, { value: "community", label: "Community" },
                    ] },
                    { name: "summary", label: "Summary", type: "textarea" },
                  ]}
                />
                <BlockWSubjectManager
                  tableName="simulation_scenarios"
                  label="Manage Simulation Scenarios"
                  subjects={allScenarios}
                  loading={scenariosAllQ.isLoading}
                  onRefresh={refreshAll}
                  fields={[
                    { name: "scenario_name", label: "Name", type: "text" },
                    { name: "scenario_type", label: "Type", type: "select", options: [
                      { value: "regulatory_shift", label: "Regulatory Shift" }, { value: "budget_collapse", label: "Budget Collapse" },
                      { value: "talent_loss", label: "Talent Loss" }, { value: "trust_erosion", label: "Trust Erosion" },
                    ] },
                    { name: "severity_level", label: "Severity", type: "select", options: [
                      { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
                      { value: "high", label: "High" }, { value: "critical", label: "Critical" },
                    ] },
                    { name: "description", label: "Description", type: "textarea" },
                  ]}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="integration">
            <div className="space-y-4">
              <CausalModifierCard modifiers={signals?.causal_modifiers || []} title="Sprint 109 → 110: Mission Integrity Influence" />
              {signals?.mission_context && (
                <CrossSprintSignalCard title="Mission Context (Sprint 109 → 110)" signals={[
                  { label: "Avg Alignment", value: signals.mission_context.avg_alignment },
                  { label: "Avg Erosion", value: signals.mission_context.avg_erosion },
                  { label: "Active Erosion", value: signals.mission_context.has_active_erosion ? "Detected" : "No", severity: signals.mission_context.has_active_erosion ? "critical" : "low" },
                ]} relatedRoute="/mission-integrity" relatedLabel="View Mission Integrity" />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

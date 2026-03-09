import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FlaskConical, AlertTriangle, Activity, Shield, Eye, Layers, Radio } from "lucide-react";

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
    critical: "bg-destructive/20 text-destructive",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-green-500/20 text-green-400",
  };
  return <Badge className={styles[severity] || "bg-muted text-muted-foreground"}>{severity}</Badge>;
}

function FutureStateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    stable: "bg-green-500/20 text-green-400",
    strained: "bg-yellow-500/20 text-yellow-400",
    degraded: "bg-orange-500/20 text-orange-400",
    fragmented: "bg-destructive/20 text-destructive",
    collapsed: "bg-destructive/30 text-destructive",
    adaptive_recovery: "bg-blue-500/20 text-blue-400",
  };
  return <Badge className={styles[state] || "bg-muted text-muted-foreground"}>{state.replace(/_/g, " ")}</Badge>;
}

/* ── Dashboard ── */
function ContinuityDashboard({ data }: { data: any }) {
  if (!data) return <p className="text-sm text-muted-foreground">Loading overview…</p>;
  return (
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
        <Card><CardContent className="pt-4">
          <ScoreBar label="Avg Survivability" value={data.avg_survivability || 0} />
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{data.total_recommendations || 0}</div>
          <div className="text-xs text-muted-foreground">Recommendations</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{data.total_snapshots || 0}</div>
          <div className="text-xs text-muted-foreground">Future Snapshots</div>
        </CardContent></Card>
      </div>
    </div>
  );
}

/* ── Scenario Explorer ── */
function ScenarioExplorer({ data }: { data: any }) {
  const runs = data?.runs || [];
  if (runs.length === 0) return <p className="text-sm text-muted-foreground">No simulation runs yet.</p>;
  return (
    <div className="space-y-3">
      {runs.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{r.simulation_scenarios?.scenario_name || "Scenario"}</div>
                <div className="text-xs text-muted-foreground">Subject: {r.simulation_subjects?.title || "—"}</div>
              </div>
              <Badge variant="outline" className="text-xs">{r.simulation_scenarios?.scenario_type}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ScoreBar label="Viability" value={Number(r.viability_score) || 0} />
              <ScoreBar label="Stress" value={Number(r.continuity_stress_score) || 0} />
              <ScoreBar label="Identity" value={Number(r.identity_preservation_score) || 0} />
              <ScoreBar label="Survivability" value={Number(r.survivability_score) || 0} />
            </div>
            {r.simulation_summary && <p className="text-xs text-muted-foreground">{r.simulation_summary}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Stress Pathway Panel ── */
function StressPathwayPanel({ data }: { data: any }) {
  const points = data?.stress_points || [];
  if (points.length === 0) return <p className="text-sm text-muted-foreground">No stress points detected.</p>;
  return (
    <div className="space-y-3">
      {points.map((p: any) => (
        <Card key={p.id}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{p.stress_type?.replace(/_/g, " ")}</span>
              <SeverityBadge severity={p.severity} />
            </div>
            <p className="text-xs text-muted-foreground">{p.stress_summary}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Future State Panel ── */
function FutureStatePanel({ data }: { data: any }) {
  const snapshots = data?.snapshots || [];
  if (snapshots.length === 0) return <p className="text-sm text-muted-foreground">No future snapshots available.</p>;
  return (
    <div className="space-y-3">
      {snapshots.map((s: any) => (
        <Card key={s.id}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{s.simulation_subjects?.title || "Subject"}</span>
              <FutureStateBadge state={s.future_state_type} />
            </div>
            <div className="text-xs text-muted-foreground">Scenario: {s.simulation_scenarios?.scenario_name || "—"}</div>
            <ScoreBar label="Continuity Score" value={Number(s.continuity_score) || 0} />
            {s.snapshot_summary && <p className="text-xs text-muted-foreground">{s.snapshot_summary}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Recommendations ── */
function RecommendationsPanel({ data }: { data: any }) {
  const recs = data?.recommendations || [];
  if (recs.length === 0) return <p className="text-sm text-muted-foreground">No recommendations yet.</p>;
  return (
    <div className="space-y-3">
      {recs.map((r: any) => (
        <Card key={r.id}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{r.recommendation_type?.replace(/_/g, " ")}</span>
              <SeverityBadge severity={r.mitigation_priority} />
            </div>
            <p className="text-xs text-muted-foreground">{r.recommendation_summary}</p>
            {r.rationale && <p className="text-xs text-muted-foreground italic">{r.rationale}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function ContinuitySimulation() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const overview = useQuery({ queryKey: ["continuity-sim-overview", orgId], queryFn: () => invokeEngine(orgId, "overview"), enabled: !!orgId });
  const simulate = useQuery({ queryKey: ["continuity-sim-runs", orgId], queryFn: () => invokeEngine(orgId, "simulate"), enabled: !!orgId });
  const stress = useQuery({ queryKey: ["continuity-sim-stress", orgId], queryFn: () => invokeEngine(orgId, "stress_points"), enabled: !!orgId });
  const snapshots = useQuery({ queryKey: ["continuity-sim-snapshots", orgId], queryFn: () => invokeEngine(orgId, "snapshots"), enabled: !!orgId });
  const recommendations = useQuery({ queryKey: ["continuity-sim-recs", orgId], queryFn: () => invokeEngine(orgId, "recommendations"), enabled: !!orgId });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Continuity Simulation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Long-horizon institutional continuity simulation — model disruption, stress, and survivability
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="dashboard" className="gap-1 text-xs"><Activity className="h-3 w-3" />Dashboard</TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-1 text-xs"><Layers className="h-3 w-3" />Scenarios</TabsTrigger>
            <TabsTrigger value="stress" className="gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Stress</TabsTrigger>
            <TabsTrigger value="futures" className="gap-1 text-xs"><Eye className="h-3 w-3" />Futures</TabsTrigger>
            <TabsTrigger value="recs" className="gap-1 text-xs"><Shield className="h-3 w-3" />Recs</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><ContinuityDashboard data={overview.data} /></TabsContent>
          <TabsContent value="scenarios"><ScenarioExplorer data={simulate.data} /></TabsContent>
          <TabsContent value="stress"><StressPathwayPanel data={stress.data} /></TabsContent>
          <TabsContent value="futures"><FutureStatePanel data={snapshots.data} /></TabsContent>
          <TabsContent value="recs"><RecommendationsPanel data={recommendations.data} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

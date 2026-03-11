import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Bell, Clock, Lock, HeartPulse, BookOpen, Loader2 } from "lucide-react";
import {
  useBlueTeamOverview,
  useBlueTeamAlerts,
  useBlueTeamIncidents,
  useBlueTeamContainment,
  useBlueTeamRecovery,
  useBlueTeamRunbooks,
  useAssessIncident,
} from "@/hooks/useBlueTeamDefense";

const DETECTION_CATEGORIES = [
  "contract_anomaly", "tenant_scope_violation_attempt", "unsafe_runtime_action",
  "repeated_validation_escape", "insecure_artifact_signal", "suspicious_retrieval_context",
  "observability_gap", "degraded_recovery_posture",
];

const SEV = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-primary/20 text-primary border-primary/30",
  none: "bg-muted text-muted-foreground border-border",
} as Record<string, string>;

export default function BlueTeamDefenseDashboard() {
  const [tab, setTab] = useState("alerts");
  const [selectedCategory, setSelectedCategory] = useState(DETECTION_CATEGORIES[0]);
  const [selectedSeverity, setSelectedSeverity] = useState("medium");
  const [assessment, setAssessment] = useState<any>(null);

  const overview = useBlueTeamOverview();
  const alerts = useBlueTeamAlerts();
  const incidents = useBlueTeamIncidents();
  const containment = useBlueTeamContainment();
  const recovery = useBlueTeamRecovery();
  const runbooks = useBlueTeamRunbooks();
  const assess = useAssessIncident();

  const s = overview.data ?? { total_alerts: 0, total_incidents: 0, pending_actions: 0, open_incidents: 0 };

  const handleAssess = async () => {
    const result = await assess.mutateAsync({ incident_type: selectedCategory, severity: selectedSeverity, target_surface: "general" });
    setAssessment(result);
  };

  const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="text-center py-8"><Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">{text}</p></div>
  );

  const ListItems = ({ items, renderItem }: { items: any[]; renderItem: (i: any) => React.ReactNode }) => (
    <div className="space-y-2">{items.map(renderItem)}</div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />Blue Team Defense
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Detection, response, containment & recovery — advisory-first</p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Advisory Mode</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Alerts", value: s.total_alerts },
            { label: "Incidents", value: s.total_incidents },
            { label: "Open Incidents", value: s.open_incidents },
            { label: "Pending Actions", value: s.pending_actions },
          ].map((m) => (
            <Card key={m.label} className="border-border bg-card"><CardContent className="pt-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</div>
              <div className="text-2xl font-bold text-foreground mt-1">{m.value}</div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="alerts"><Bell className="h-3.5 w-3.5 mr-1" />Alerts</TabsTrigger>
            <TabsTrigger value="incidents"><Clock className="h-3.5 w-3.5 mr-1" />Incidents</TabsTrigger>
            <TabsTrigger value="containment"><Lock className="h-3.5 w-3.5 mr-1" />Containment</TabsTrigger>
            <TabsTrigger value="recovery"><HeartPulse className="h-3.5 w-3.5 mr-1" />Recovery</TabsTrigger>
            <TabsTrigger value="runbooks"><BookOpen className="h-3.5 w-3.5 mr-1" />Runbooks</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Assess Incident</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Detection Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{DETECTION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                    <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                      <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{["low","medium","high","critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssess} disabled={assess.isPending}>
                    {assess.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Assess
                  </Button>
                </div>
                {assessment && (
                  <Card className="border-border bg-muted/20"><CardContent className="pt-4 space-y-3">
                    <div className="text-sm font-medium text-foreground">{assessment.explanation?.summary}</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><span className="text-foreground font-medium">What happened:</span> {assessment.explanation?.what_happened}</p>
                      <p><span className="text-foreground font-medium">Response:</span> {assessment.explanation?.what_was_done}</p>
                      <p><span className="text-foreground font-medium">Posture:</span> {assessment.explanation?.current_posture}</p>
                      <p><span className="text-foreground font-medium">Next:</span> {assessment.explanation?.next_steps}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className={SEV[assessment.recovery?.recovery_readiness === "ready" ? "low" : "high"] ?? SEV.none}>
                        Recovery: {assessment.recovery?.recovery_readiness}
                      </Badge>
                      <Badge variant="outline">Posture: {assessment.recovery?.posture_score}/100</Badge>
                      <Badge variant="outline" className={SEV[assessment.containment?.advisory_only ? "none" : "high"]}>
                        {assessment.containment?.containment_type?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardContent></Card>
                )}
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Blue Team Alerts</CardTitle></CardHeader>
              <CardContent>
                {alerts.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (alerts.data?.alerts?.length ?? 0) === 0 ? <EmptyState icon={Bell} text="No alerts. Detection layer is monitoring." />
                : <ListItems items={alerts.data.alerts} renderItem={(a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div><div className="text-sm font-medium text-foreground">{a.detection_category?.replace(/_/g, " ")}</div><div className="text-xs text-muted-foreground">{a.target_surface} · {a.description?.slice(0, 80)}</div></div>
                    <Badge variant="outline" className={SEV[a.severity] ?? SEV.none}>{a.severity}</Badge>
                  </div>
                )} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Incident Timeline</CardTitle></CardHeader>
              <CardContent>
                {incidents.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (incidents.data?.incidents?.length ?? 0) === 0 ? <EmptyState icon={Clock} text="No incidents recorded." />
                : <ListItems items={incidents.data.incidents} renderItem={(i: any) => (
                  <div key={i.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{i.incident_type?.replace(/_/g, " ")}</div>
                      <div className="flex gap-2"><Badge variant="outline" className={SEV[i.severity] ?? SEV.none}>{i.severity}</Badge><Badge variant="outline">{i.response_status}</Badge></div>
                    </div>
                    <div className="text-xs text-muted-foreground">{i.anomaly_summary}</div>
                    <div className="flex gap-2">{i.containment_applied && <Badge variant="outline" className={SEV.medium}>Contained</Badge>}{i.rollback_recommended && <Badge variant="outline" className={SEV.high}>Rollback Advised</Badge>}</div>
                  </div>
                )} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="containment" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Containment Actions</CardTitle></CardHeader>
              <CardContent>
                {containment.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (containment.data?.containment?.length ?? 0) === 0 ? <EmptyState icon={Lock} text="No containment events." />
                : <ListItems items={containment.data.containment} renderItem={(c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div><div className="text-sm font-medium text-foreground">{c.containment_type?.replace(/_/g, " ")}</div><div className="text-xs text-muted-foreground">{c.description?.slice(0, 100)}</div></div>
                    <div className="flex gap-2">{c.applied ? <Badge variant="outline" className={SEV.medium}>Applied</Badge> : <Badge variant="outline">Pending</Badge>}{c.rollback_available && <Badge variant="outline" className={SEV.low}>Rollback OK</Badge>}</div>
                  </div>
                )} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recovery" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Recovery Status</CardTitle></CardHeader>
              <CardContent>
                {recovery.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (recovery.data?.recovery?.length ?? 0) === 0 ? <EmptyState icon={HeartPulse} text="No recovery flows in progress." />
                : <ListItems items={recovery.data.recovery} renderItem={(r: any) => (
                  <div key={r.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{r.recovery_type} — {r.target_surface}</div>
                      <Badge variant="outline">{r.recovery_status}</Badge>
                    </div>
                    <div className="flex gap-2">{r.rollback_executed && <Badge variant="outline" className={SEV.medium}>Rollback Executed</Badge>}{r.integrity_verified && <Badge variant="outline" className={SEV.low}>Integrity OK</Badge>}</div>
                  </div>
                )} />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runbooks" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Runbook Explorer</CardTitle></CardHeader>
              <CardContent>
                {runbooks.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (runbooks.data?.runbooks?.length ?? 0) === 0 ? <EmptyState icon={BookOpen} text="No runbooks defined yet. Runbooks will be generated from incident patterns." />
                : <ListItems items={runbooks.data.runbooks} renderItem={(rb: any) => (
                  <div key={rb.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{rb.runbook_name}</div>
                      <Badge variant="outline">{rb.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{rb.detection_category?.replace(/_/g, " ")} · Threshold: {rb.severity_threshold}</div>
                  </div>
                )} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

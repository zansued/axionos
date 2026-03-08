import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Shield, Lock, Users, Activity, AlertTriangle, BarChart3, FileCheck } from "lucide-react";
import { useLimitedMarketplacePilot } from "@/hooks/useLimitedMarketplacePilot";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function LimitedMarketplacePilotDashboard() {
  const { overview, capabilities, participants, interactions, policyEvents, outcomes } = useLimitedMarketplacePilot();
  const ov = overview.data as Record<string, any> | null;
  const caps = (capabilities.data as any)?.capabilities || [];
  const parts = (participants.data as any)?.participants || [];
  const ints = (interactions.data as any)?.interactions || [];
  const events = (policyEvents.data as any)?.events || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Limited Marketplace Pilot</h2>
          <p className="text-sm text-muted-foreground">
            Bounded pilot marketplace — governed, reversible, human-reviewed
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-orange-500/30 text-orange-400">Pilot Only</Badge>
      </div>

      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-7">
          <StatCard label="Programs" value={ov.total_programs ?? 0} />
          <StatCard label="Active Progs" value={ov.active_programs ?? 0} />
          <StatCard label="Capabilities" value={ov.active_capabilities ?? 0} />
          <StatCard label="Participants" value={ov.active_participants ?? 0} />
          <StatCard label="Interactions" value={ov.total_interactions ?? 0} />
          <StatCard label="Violations" value={ov.policy_violations ?? 0} />
          <StatCard label="Outcomes" value={ov.total_outcomes ?? 0} />
        </div>
      )}

      <Tabs defaultValue="capabilities">
        <TabsList className="grid w-full grid-cols-6 h-9">
          <TabsTrigger value="capabilities" className="text-xs gap-1"><Shield className="h-3 w-3" /> Capabilities</TabsTrigger>
          <TabsTrigger value="participants" className="text-xs gap-1"><Users className="h-3 w-3" /> Participants</TabsTrigger>
          <TabsTrigger value="interactions" className="text-xs gap-1"><Activity className="h-3 w-3" /> Interactions</TabsTrigger>
          <TabsTrigger value="policy" className="text-xs gap-1"><Lock className="h-3 w-3" /> Policy</TabsTrigger>
          <TabsTrigger value="learning" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Learning</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="capabilities" className="mt-4 space-y-3">
          {caps.length === 0 ? (
            <EmptyState icon={Shield} text="No pilot capabilities registered." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {caps.slice(0, 20).map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{c.capability_name}</p>
                      <StatusBadge status={c.pilot_capability_status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.capability_domain} · {c.exposure_class}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Eligibility:</span>
                      <Progress value={(c.pilot_capability_eligibility_score || 0) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs font-mono">{((c.pilot_capability_eligibility_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="participants" className="mt-4 space-y-3">
          {parts.length === 0 ? (
            <EmptyState icon={Users} text="No pilot participants registered." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {parts.slice(0, 20).map((p: any) => (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{p.participant_name}</p>
                      <StatusBadge status={p.participant_status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{p.participant_type} · {p.trust_tier}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <MetricPill label="Eligibility" value={p.pilot_participant_eligibility_score} />
                      <MetricPill label="Trust" value={p.trust_stability_score} />
                    </div>
                    {p.violation_count > 0 && (
                      <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">{p.violation_count} violations</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="interactions" className="mt-4 space-y-3">
          {ints.length === 0 ? (
            <EmptyState icon={Activity} text="No pilot interactions recorded." />
          ) : (
            <div className="space-y-2">
              {ints.slice(0, 20).map((i: any) => (
                <Card key={i.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{i.marketplace_pilot_capabilities?.capability_name || "Unknown"} ↔ {i.marketplace_pilot_participants?.participant_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{i.interaction_type} · Policy: {((i.policy_compliance_score || 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="flex gap-1">
                      <StatusBadge status={i.interaction_status} />
                      {Array.isArray(i.anomaly_flags) && i.anomaly_flags.length > 0 && (
                        <Badge className="text-[10px] bg-red-500/20 text-red-400">anomaly</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="policy" className="mt-4 space-y-3">
          {events.length === 0 ? (
            <EmptyState icon={Lock} text="No policy events recorded." />
          ) : (
            <div className="space-y-2">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Policy Summary</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Pass</p>
                    <p className="font-mono text-sm text-green-400">{(policyEvents.data as any)?.pass ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Warn</p>
                    <p className="font-mono text-sm text-yellow-400">{(policyEvents.data as any)?.warn ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Fail</p>
                    <p className="font-mono text-sm text-red-400">{(policyEvents.data as any)?.fail ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Violation Rate</p>
                    <p className="font-mono text-sm">{(((policyEvents.data as any)?.violation_rate ?? 0) * 100).toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>
              {events.filter((e: any) => e.policy_result === 'fail').slice(0, 10).map((e: any) => (
                <Card key={e.id} className="border-border/50 border-red-500/20">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{e.description || "Policy violation"}</p>
                      <p className="text-xs text-muted-foreground">{e.event_type} · {e.severity}</p>
                    </div>
                    <Badge className="text-[10px] bg-red-500/20 text-red-400">fail</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="learning" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pilot Learning Signals</CardTitle></CardHeader>
            <CardContent>
              {ov ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <MetricPill label="Interactions" value={null} raw={ov.total_interactions ?? 0} />
                    <MetricPill label="Violations" value={null} raw={ov.policy_violations ?? 0} />
                    <MetricPill label="Outcomes" value={null} raw={ov.total_outcomes ?? 0} />
                  </div>
                  <p className="text-xs text-muted-foreground">Pilot learnings accumulate from interaction patterns, policy compliance trends, and outcome validation. Expansion recommendations require human review.</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No pilot data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="mt-4 space-y-3">
          {outs.length === 0 ? (
            <EmptyState icon={FileCheck} text="No pilot outcomes recorded." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.recommendation_type}</p>
                      <p className="text-xs text-muted-foreground">
                        Value: {((o.pilot_value_signal_score || 0) * 100).toFixed(0)}% · Risk: {((o.pilot_risk_score || 0) * 100).toFixed(0)}% · Learning: {((o.pilot_learning_score || 0) * 100).toFixed(0)}%
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
    proposed: "bg-muted text-muted-foreground",
    eligible: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    restricted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    suspended: "bg-red-500/20 text-red-400 border-red-500/30",
    paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    rolled_back: "bg-red-500/20 text-red-400 border-red-500/30",
    archived: "bg-muted text-muted-foreground",
    recorded: "bg-muted text-muted-foreground",
    pending: "bg-muted text-muted-foreground",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function MetricPill({ label, value, raw }: { label: string; value: number | null; raw?: number }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="font-mono text-xs">{value !== null ? `${((value || 0) * 100).toFixed(0)}%` : raw ?? 0}</p>
    </div>
  );
}

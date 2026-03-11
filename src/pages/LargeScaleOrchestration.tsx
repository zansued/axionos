import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Network, AlertTriangle, Activity, ShieldCheck, GitBranch, Timer, Ban } from "lucide-react";

function OrchestrationContent() {
  const { currentOrg } = useOrg();
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["large-scale-orchestration", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("large-scale-orchestration", {
        body: { action: "overview", organization_id: currentOrg?.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 30000,
  });

  const { data: detail } = useQuery({
    queryKey: ["orchestration-detail", selectedCampaign?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("large-scale-orchestration", {
        body: { action: "campaign_detail", organization_id: currentOrg?.id, campaign_id: selectedCampaign?.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCampaign?.id && !!currentOrg?.id,
  });

  const kpis = data?.kpis || {};
  const campaigns = data?.campaigns || [];
  const syncPoints = data?.sync_points || [];
  const failures = data?.failures || [];
  const recoveries = data?.recovery_events || [];

  const kpiCards = [
    { label: "Active Campaigns", value: kpis.active_campaigns ?? 0, icon: Network, color: "text-primary" },
    { label: "Degraded", value: kpis.degraded_campaigns ?? 0, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Recovered", value: kpis.recovered_campaigns ?? 0, icon: ShieldCheck, color: "text-green-500" },
    { label: "Blocked Syncs", value: kpis.blocked_sync_points ?? 0, icon: Timer, color: "text-orange-500" },
    { label: "Aborted", value: kpis.abort_count ?? 0, icon: Ban, color: "text-destructive" },
    { label: "Recovery Rate", value: `${kpis.recovery_success_rate ?? 0}%`, icon: Activity, color: "text-muted-foreground" },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground", active: "bg-green-500/15 text-green-400",
      paused: "bg-yellow-500/15 text-yellow-400", completing: "bg-blue-500/15 text-blue-400",
      completed: "bg-green-500/15 text-green-400", degraded: "bg-orange-500/15 text-orange-400",
      aborting: "bg-red-500/15 text-red-400", aborted: "bg-red-500/15 text-red-400",
      failed: "bg-red-500/15 text-red-400", recovered: "bg-emerald-500/15 text-emerald-400",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  const severityBadge = (sev: string) => {
    const map: Record<string, string> = { low: "bg-green-500/15 text-green-400", moderate: "bg-yellow-500/15 text-yellow-400", high: "bg-orange-500/15 text-orange-400", critical: "bg-red-500/15 text-red-400" };
    return map[sev] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Resilient Large-Scale Orchestration</h1>
          <p className="text-sm text-muted-foreground mt-1">Campaign coordination, branch synchronization, failure domains, and bounded recovery.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((k) => (
            <Card key={k.label} className="border-border/50 bg-card/50">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <k.icon className={`h-5 w-5 ${k.color}`} />
                <span className="text-2xl font-bold">{k.value}</span>
                <span className="text-[11px] text-muted-foreground">{k.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="sync">Sync Points</TabsTrigger>
            <TabsTrigger value="failures">Failures</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Orchestration Campaigns</CardTitle></CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orchestration campaigns recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {campaigns.map((c: any) => (
                        <div key={c.id} onClick={() => { setSelectedCampaign(c); setDrawerOpen(true); }} className="p-3 rounded-md border border-border/40 hover:bg-muted/30 cursor-pointer flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.campaign_label}</p>
                            <p className="text-xs text-muted-foreground">{c.campaign_class} · {c.branch_completed}/{c.branch_total} branches</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.branch_failed > 0 && <span className="text-xs text-destructive">{c.branch_failed} failed</span>}
                            {c.branch_blocked > 0 && <span className="text-xs text-orange-400">{c.branch_blocked} blocked</span>}
                            <Badge variant="outline" className={`text-[10px] ${statusBadge(c.status)}`}>{c.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Synchronization Points</CardTitle></CardHeader>
              <CardContent>
                {syncPoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sync points recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {syncPoints.map((s: any) => (
                        <div key={s.id} className="p-3 rounded-md border border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{s.sync_label}</p>
                            <Badge variant="outline" className={`text-[10px] ${statusBadge(s.status)}`}>{s.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Type: {s.sync_type} · Satisfied: {s.satisfied_branches?.length || 0}/{s.required_branches?.length || 0}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failures">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Failure Events</CardTitle></CardHeader>
              <CardContent>
                {failures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No failure events recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {failures.map((f: any) => (
                        <div key={f.id} className="p-3 rounded-md border border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{f.failure_domain}</p>
                            <div className="flex gap-2">
                              <Badge variant="outline" className={`text-[10px] ${severityBadge(f.severity)}`}>{f.severity}</Badge>
                              <Badge variant="outline" className="text-[10px]">{f.containment_status}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Impact: {f.impact_scope} · {f.failure_reason}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recovery">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Recovery Events</CardTitle></CardHeader>
              <CardContent>
                {recoveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recovery events recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {recoveries.map((r: any) => (
                        <div key={r.id} className="p-3 rounded-md border border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{r.recovery_type}</p>
                            <Badge variant="outline" className={`text-[10px] ${statusBadge(r.recovery_status)}`}>{r.recovery_status}</Badge>
                          </div>
                          {r.recovery_notes && <p className="text-xs text-muted-foreground mt-1">{r.recovery_notes}</p>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Campaign Detail</SheetTitle>
          </SheetHeader>
          {selectedCampaign && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Label:</span> {selectedCampaign.campaign_label}</div>
                <div><span className="text-muted-foreground">Class:</span> {selectedCampaign.campaign_class}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={`text-[10px] ${statusBadge(selectedCampaign.status)}`}>{selectedCampaign.status}</Badge></div>
                <div><span className="text-muted-foreground">Recovery:</span> {selectedCampaign.recovery_posture}</div>
                <div><span className="text-muted-foreground">Abort:</span> {selectedCampaign.abort_posture}</div>
                <div><span className="text-muted-foreground">Branches:</span> {selectedCampaign.branch_completed}/{selectedCampaign.branch_total}</div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Branches</h4>
                {(detail?.branches || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No branches.</p>
                ) : (
                  <div className="space-y-1">
                    {(detail?.branches || []).map((b: any) => (
                      <div key={b.id} className="p-2 rounded border border-border/30 text-xs flex items-center justify-between">
                        <span><GitBranch className="inline h-3 w-3 mr-1" />{b.branch_key} ({b.branch_type})</span>
                        <Badge variant="outline" className={`text-[9px] ${statusBadge(b.status)}`}>{b.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Sync Points</h4>
                {(detail?.sync_points || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sync points.</p>
                ) : (
                  <div className="space-y-1">
                    {(detail?.sync_points || []).map((s: any) => (
                      <div key={s.id} className="p-2 rounded border border-border/30 text-xs flex items-center justify-between">
                        <span>{s.sync_label} ({s.sync_type})</span>
                        <Badge variant="outline" className={`text-[9px] ${statusBadge(s.status)}`}>{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Failures</h4>
                {(detail?.failures || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No failures recorded.</p>
                ) : (
                  <div className="space-y-1">
                    {(detail?.failures || []).map((f: any) => (
                      <div key={f.id} className="p-2 rounded border border-border/30 text-xs">
                        <span className="font-medium">{f.failure_domain}</span> · {f.severity} · {f.containment_status}
                        {f.failure_reason && <p className="text-muted-foreground mt-0.5">{f.failure_reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Recovery Events</h4>
                {(detail?.recovery_events || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recovery events.</p>
                ) : (
                  <div className="space-y-1">
                    {(detail?.recovery_events || []).map((r: any) => (
                      <div key={r.id} className="p-2 rounded border border-border/30 text-xs">
                        <span className="font-medium">{r.recovery_type}</span> · {r.recovery_status}
                        {r.recovery_notes && <p className="text-muted-foreground mt-0.5">{r.recovery_notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function LargeScaleOrchestration() {
  return (
    <AppShell>
      <OrchestrationContent />
    </AppShell>
  );
}

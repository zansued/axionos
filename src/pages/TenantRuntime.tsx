import { useEffect, useState } from "react";
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
import { Server, ShieldCheck, AlertTriangle, Activity, Scale, Layers } from "lucide-react";

function TenantRuntimeContent() {
  const { currentOrg } = useOrg();
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-runtime", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tenant-runtime", {
        body: { action: "overview", organization_id: currentOrg?.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 30000,
  });

  const { data: detail } = useQuery({
    queryKey: ["tenant-runtime-segment", selectedSegment?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tenant-runtime", {
        body: { action: "segment_detail", organization_id: currentOrg?.id, segment_id: selectedSegment?.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSegment?.id && !!currentOrg?.id,
  });

  const kpis = data?.kpis || {};
  const segments = data?.segments || [];
  const contentionEvents = data?.contention_events || [];
  const fairnessReviews = data?.fairness_reviews || [];
  const postures = data?.postures || [];

  const kpiCards = [
    { label: "Active Segments", value: kpis.active_segments ?? 0, icon: Layers, color: "text-primary" },
    { label: "Noisy Neighbors", value: kpis.noisy_neighbor_alerts ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Contention Hotspots", value: kpis.contention_hotspots ?? 0, icon: Activity, color: "text-amber-500" },
    { label: "Fairness Violations", value: kpis.fairness_violations ?? 0, icon: Scale, color: "text-orange-500" },
    { label: "High-Risk Partitions", value: kpis.high_risk_partitions ?? 0, icon: ShieldCheck, color: "text-red-500" },
    { label: "Pending Reviews", value: kpis.pending_reviews ?? 0, icon: Server, color: "text-muted-foreground" },
  ];

  const severityBadge = (sev: string) => {
    const map: Record<string, string> = { low: "bg-green-500/15 text-green-400", moderate: "bg-yellow-500/15 text-yellow-400", high: "bg-orange-500/15 text-orange-400", critical: "bg-red-500/15 text-red-400" };
    return map[sev] || "bg-muted text-muted-foreground";
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: "bg-green-500/15 text-green-400", paused: "bg-yellow-500/15 text-yellow-400", degraded: "bg-orange-500/15 text-orange-400", retired: "bg-muted text-muted-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Tenant-Isolated Scale Runtime</h1>
          <p className="text-sm text-muted-foreground mt-1">Runtime segmentation, isolation posture, contention visibility, and fairness governance.</p>
        </div>

        {/* KPIs */}
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

        <Tabs defaultValue="segments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="postures">Postures</TabsTrigger>
            <TabsTrigger value="contention">Contention</TabsTrigger>
            <TabsTrigger value="fairness">Fairness</TabsTrigger>
          </TabsList>

          <TabsContent value="segments">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Runtime Segments</CardTitle></CardHeader>
              <CardContent>
                {segments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runtime segments recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {segments.map((s: any) => (
                        <div key={s.id} onClick={() => { setSelectedSegment(s); setDrawerOpen(true); }} className="p-3 rounded-md border border-border/40 hover:bg-muted/30 cursor-pointer flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.segment_key}</p>
                            <p className="text-xs text-muted-foreground">{s.workload_class} · {s.partition_label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{s.current_concurrency}/{s.max_concurrency}</span>
                            <Badge variant="outline" className={`text-[10px] ${severityBadge(s.risk_level)}`}>{s.risk_level}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${statusBadge(s.status)}`}>{s.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="postures">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Runtime Postures</CardTitle></CardHeader>
              <CardContent>
                {postures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runtime postures recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {postures.map((p: any) => (
                        <div key={p.id} className="p-3 rounded-md border border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{p.segment_label}</p>
                            <span className="text-xs text-muted-foreground">{p.active_workload_count} workloads</span>
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">Isolation: {p.isolation_posture}</Badge>
                            <Badge variant="outline" className="text-[10px]">Fairness: {p.fairness_posture}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${severityBadge(p.contention_posture === "critical" ? "critical" : p.contention_posture === "high" ? "high" : "low")}`}>Contention: {p.contention_posture}</Badge>
                            <Badge variant="outline" className="text-[10px]">Blast: {p.blast_radius_scope}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contention">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Contention Events</CardTitle></CardHeader>
              <CardContent>
                {contentionEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contention events recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {contentionEvents.map((e: any) => (
                        <div key={e.id} className="p-3 rounded-md border border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{e.event_type}</p>
                            <div className="flex gap-2">
                              {e.noisy_neighbor_detected && <Badge variant="destructive" className="text-[10px]">Noisy Neighbor</Badge>}
                              <Badge variant="outline" className={`text-[10px] ${severityBadge(e.severity)}`}>{e.severity}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Source: {e.contention_source} · Affected: {e.affected_workloads} · Status: {e.resolution_status}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fairness">
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-base">Fairness Reviews</CardTitle></CardHeader>
              <CardContent>
                {fairnessReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fairness reviews recorded yet.</p>
                ) : (
                  <ScrollArea className="h-[420px]">
                    <div className="space-y-2">
                      {fairnessReviews.map((r: any) => (
                        <div key={r.id} className="p-3 rounded-md border border-border/40">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{r.review_type}</p>
                            <Badge variant="outline" className="text-[10px]">{r.review_status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Score: {(r.fairness_score * 100).toFixed(0)}% · Violations: {r.violations_found}</p>
                          {r.review_notes && <p className="text-xs text-muted-foreground mt-1">{r.review_notes}</p>}
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
            <SheetTitle>Segment Detail</SheetTitle>
          </SheetHeader>
          {selectedSegment && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Key:</span> {selectedSegment.segment_key}</div>
                <div><span className="text-muted-foreground">Type:</span> {selectedSegment.segment_type}</div>
                <div><span className="text-muted-foreground">Workload Class:</span> {selectedSegment.workload_class}</div>
                <div><span className="text-muted-foreground">Isolation:</span> {selectedSegment.isolation_level}</div>
                <div><span className="text-muted-foreground">Concurrency:</span> {selectedSegment.current_concurrency}/{selectedSegment.max_concurrency}</div>
                <div><span className="text-muted-foreground">Risk:</span> <Badge variant="outline" className={`text-[10px] ${severityBadge(selectedSegment.risk_level)}`}>{selectedSegment.risk_level}</Badge></div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Contention Events</h4>
                {(detail?.contention_events || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No contention events for this segment.</p>
                ) : (
                  <div className="space-y-2">
                    {(detail?.contention_events || []).map((e: any) => (
                      <div key={e.id} className="p-2 rounded border border-border/30 text-xs">
                        <span className="font-medium">{e.event_type}</span> · {e.severity} · {e.resolution_status}
                        {e.noisy_neighbor_detected && <Badge variant="destructive" className="text-[9px] ml-2">Noisy</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Fairness Reviews</h4>
                {(detail?.fairness_reviews || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No fairness reviews for this segment.</p>
                ) : (
                  <div className="space-y-2">
                    {(detail?.fairness_reviews || []).map((r: any) => (
                      <div key={r.id} className="p-2 rounded border border-border/30 text-xs">
                        <span className="font-medium">{r.review_type}</span> · Score: {(r.fairness_score * 100).toFixed(0)}% · {r.review_status}
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

export default function TenantRuntime() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <TenantRuntimeContent />
      </div>
    </SidebarProvider>
  );
}

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Globe, CheckCircle2, AlertTriangle, RotateCcw, XCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";

function useCrossRegion(orgId: string | undefined) {
  const invoke = (action: string, extra?: Record<string, unknown>) =>
    supabase.functions.invoke("cross-region-recovery", { body: { action, organization_id: orgId, ...extra } }).then(r => r.data);
  const overview = useQuery({ queryKey: ["cross-region-overview", orgId], queryFn: () => invoke("overview"), enabled: !!orgId });
  const postures = useQuery({ queryKey: ["cross-region-postures", orgId], queryFn: () => invoke("list_region_postures"), enabled: !!orgId });
  const signals = useQuery({ queryKey: ["cross-region-signals", orgId], queryFn: () => invoke("list_region_health"), enabled: !!orgId });
  return { overview, postures, signals, invoke };
}

export default function CrossRegionRecovery() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const { overview, postures, signals, invoke } = useCrossRegion(orgId);
  const ov = overview.data as Record<string, any> | null;
  const items = ((postures.data as any)?.postures || []) as any[];
  const healthSignals = ((signals.data as any)?.signals || []) as any[];
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    invoke("region_detail", { posture_id: selected.id }).then(setDetail);
  }, [selected]);

  const kpis = ov ? [
    { label: "Total Postures", value: ov.total_postures ?? 0 },
    { label: "Healthy", value: ov.healthy ?? 0, good: true },
    { label: "Degraded", value: ov.degraded ?? 0, warn: true },
    { label: "Recovering", value: ov.recovering ?? 0 },
    { label: "Recovered", value: ov.recovered ?? 0, good: true },
    { label: "Failed", value: ov.failed ?? 0, warn: true },
    { label: "Critical Signals", value: ov.critical_signals ?? 0, warn: true },
    { label: "Active Failovers", value: ov.active_failovers ?? 0 },
  ] : [];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Cross-Region Execution & Recovery</h1>
              <p className="text-sm text-muted-foreground">Governed regional resilience — recovery, failover & continuity visibility</p>
            </div>
            <Badge variant="outline" className="ml-auto border-primary/30 text-primary">Block R</Badge>
          </div>

          {kpis.length > 0 && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              {kpis.map(k => (
                <Card key={k.label} className="border-border/50">
                  <CardContent className="p-3 text-center">
                    <p className={`text-lg font-bold font-mono ${k.warn ? "text-yellow-400" : k.good ? "text-emerald-400" : ""}`}>{k.value}</p>
                    <p className="text-[10px] text-muted-foreground">{k.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs defaultValue="postures">
            <TabsList className="h-9">
              <TabsTrigger value="postures" className="text-xs">Postures</TabsTrigger>
              <TabsTrigger value="degraded" className="text-xs">Degraded</TabsTrigger>
              <TabsTrigger value="recovered" className="text-xs">Recovered</TabsTrigger>
              <TabsTrigger value="signals" className="text-xs">Health Signals</TabsTrigger>
            </TabsList>

            {["postures", "degraded", "recovered"].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-4 space-y-2">
                {items
                  .filter((p: any) => {
                    if (tab === "degraded") return p.recovery_status === "degraded" || p.recovery_status === "recovering";
                    if (tab === "recovered") return p.recovery_status === "recovered";
                    return true;
                  })
                  .slice(0, 40)
                  .map((p: any) => (
                    <Card key={p.id} className="border-border/50 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelected(p)}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <StatusIcon status={p.recovery_status} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">Region: {p.primary_region}</p>
                          <p className="text-xs text-muted-foreground">
                            Failover: {p.failover_posture} · Confidence: {((p.continuity_confidence || 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                        <RecoveryBadge status={p.recovery_status} />
                      </CardContent>
                    </Card>
                  ))}
                {items.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Globe className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No region execution postures yet.</p>
                  </div>
                )}
              </TabsContent>
            ))}

            <TabsContent value="signals" className="mt-4 space-y-2">
              {healthSignals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No health signals yet.</p>
                </div>
              ) : healthSignals.slice(0, 30).map((s: any) => (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{s.region_name} — {s.signal_type}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <SeverityBadge severity={s.severity} />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
            <SheetContent className="w-[480px] sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Region: {selected?.primary_region}
                </SheetTitle>
              </SheetHeader>
              {detail && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground text-xs">Recovery Status</span><br /><RecoveryBadge status={detail.posture?.recovery_status} /></div>
                    <div><span className="text-muted-foreground text-xs">Failover</span><br /><RecoveryBadge status={detail.posture?.failover_posture} /></div>
                    <div><span className="text-muted-foreground text-xs">Confidence</span><br /><span className="font-mono">{((detail.posture?.continuity_confidence || 0) * 100).toFixed(0)}%</span></div>
                    <div><span className="text-muted-foreground text-xs">Fallback Regions</span><br /><span className="font-mono text-xs">{JSON.stringify(detail.posture?.fallback_regions || [])}</span></div>
                  </div>

                  {detail.posture?.trade_off_notes && (
                    <Card className="border-border/50"><CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Trade-off Notes</p>
                      <p className="text-sm">{detail.posture.trade_off_notes}</p>
                    </CardContent></Card>
                  )}

                  {(detail.decisions || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Failover Decisions ({detail.decisions.length})</p>
                      <div className="space-y-1">
                        {detail.decisions.map((d: any) => (
                          <div key={d.id} className="text-xs p-2 rounded bg-muted/30 flex items-center justify-between">
                            <span>{d.from_region} → {d.to_region}: {d.decision_reason}</span>
                            <RecoveryBadge status={d.decision_status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detail.events || []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Recovery Events ({detail.events.length})</p>
                      <div className="space-y-1">
                        {detail.events.slice(0, 15).map((e: any) => (
                          <div key={e.id} className="text-xs p-2 rounded bg-muted/30">
                            <span className="font-mono">{e.event_type}</span>
                            {e.from_status && <span className="text-muted-foreground"> {e.from_status} → {e.to_status}</span>}
                            {e.reason && <p className="text-muted-foreground mt-0.5">{e.reason}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground italic">Advisory-first: cross-region recovery does not trigger autonomous structural changes.</p>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (status === "degraded") return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />;
  if (status === "recovering") return <RotateCcw className="h-4 w-4 text-blue-400 shrink-0" />;
  if (status === "recovered") return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
  return <Globe className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function RecoveryBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    degraded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    recovering: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    recovered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    none: "bg-muted text-muted-foreground",
    recommended: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    rolled_back: "bg-muted text-muted-foreground",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge className={`text-[10px] ${styles[severity] || "bg-muted text-muted-foreground"}`}>{severity}</Badge>;
}

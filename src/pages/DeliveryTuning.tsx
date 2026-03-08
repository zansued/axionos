import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Shield, Gauge, BarChart3,
} from "lucide-react";
import { useState } from "react";

async function invokeEngine(orgId: string, action: string, extra?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("delivery-tuning", {
    body: { action, organization_id: orgId, ...extra },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

const statusBadge = (s: string) => {
  switch (s) {
    case "accepted": case "trial": return "default";
    case "reviewed": return "secondary";
    case "rejected": case "dismissed": return "destructive";
    case "rolled_back": return "outline";
    default: return "outline";
  }
};

const tradeOffLabel = (t: string) => {
  switch (t) {
    case "speed_favored": return "Speed ↑";
    case "balanced": return "Balanced";
    case "reliability_favored": return "Reliability ↑";
    case "safety_first": return "Safety First";
    default: return t;
  }
};

export default function DeliveryTuning() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const overview = useQuery({ queryKey: ["dt-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const recs = useQuery({ queryKey: ["dt-list", orgId], queryFn: () => invokeEngine(orgId!, "list_tuning_recommendations"), enabled: !!orgId });
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const ov = overview.data as any;

  const openDetail = async (rec: any) => {
    setSelected(rec);
    try {
      const d = await invokeEngine(rec.organization_id, "explain_tuning", { recommendation_id: rec.id });
      setDetail(d);
    } catch { setDetail(null); }
  };

  const kpis = [
    { label: "Open", value: ov?.open ?? "—", icon: Activity, color: "text-blue-400" },
    { label: "Accepted/Trial", value: ov?.accepted ?? "—", icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Rejected", value: ov?.rejected ?? "—", icon: XCircle, color: "text-red-400" },
    { label: "High-Risk Paths", value: ov?.high_risk_paths ?? "—", icon: AlertTriangle, color: "text-orange-400" },
    { label: "Regression Hotspots", value: ov?.regression_hotspots ?? "—", icon: Shield, color: "text-red-500" },
    { label: "Postures", value: ov?.total_postures ?? "—", icon: Gauge, color: "text-purple-400" },
    { label: "Total Recs", value: ov?.total_recommendations ?? "—", icon: BarChart3, color: "text-muted-foreground" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reliability-Aware Delivery Tuning</h1>
            <p className="text-sm text-muted-foreground">Bounded tuning recommendations based on observed delivery outcomes, regressions, and risk posture.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {kpis.map((k) => (
              <Card key={k.label} className="bg-card border-border">
                <CardContent className="pt-4 pb-3 px-4 flex flex-col items-center">
                  <k.icon className={`h-5 w-5 mb-1 ${k.color}`} />
                  <span className="text-xl font-bold text-foreground">{k.value}</span>
                  <span className="text-[11px] text-muted-foreground text-center">{k.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="high_risk">High Risk</TabsTrigger>
            </TabsList>

            {["all", "open", "accepted", "high_risk"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm">Tuning Recommendations</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[420px]">
                      {(recs.data as any[])?.filter((r: any) => {
                        if (tab === "all") return true;
                        if (tab === "open") return r.status === "open";
                        if (tab === "accepted") return r.status === "accepted" || r.status === "trial";
                        if (tab === "high_risk") return r.risk_posture === "high" || r.risk_posture === "critical";
                        return true;
                      }).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => openDetail(r)}>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{r.tuning_target || r.id.slice(0, 8)}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted-foreground">{tradeOffLabel(r.trade_off_posture)}</span>
                              <span className="text-[11px] text-muted-foreground">Risk: {r.risk_posture}</span>
                              <span className="text-[11px] text-muted-foreground">Conf: {Math.round((r.confidence_score || 0) * 100)}%</span>
                            </div>
                          </div>
                          <Badge variant={statusBadge(r.status)}>{r.status}</Badge>
                        </div>
                      )) || <p className="text-sm text-muted-foreground">No tuning recommendations yet.</p>}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <Sheet open={!!selected} onOpenChange={() => { setSelected(null); setDetail(null); }}>
            <SheetContent className="w-[480px] bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">Tuning Recommendation Detail</SheetTitle>
              </SheetHeader>
              {selected && (
                <div className="mt-4 space-y-4 text-sm">
                  <div><span className="text-muted-foreground">Target:</span> <span className="text-foreground font-medium">{selected.tuning_target}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusBadge(selected.status)}>{selected.status}</Badge></div>
                  <div><span className="text-muted-foreground">Trade-off:</span> <span className="text-foreground">{tradeOffLabel(selected.trade_off_posture)}</span></div>
                  <div><span className="text-muted-foreground">Risk:</span> <span className="text-foreground">{selected.risk_posture}</span></div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Confidence</span><span className="text-foreground">{Math.round((selected.confidence_score || 0) * 100)}%</span></div>
                    <Progress value={(selected.confidence_score || 0) * 100} className="h-2" />
                  </div>
                  <div><span className="text-muted-foreground">Rationale:</span> <span className="text-foreground">{selected.reliability_rationale || "—"}</span></div>
                  <div><span className="text-muted-foreground">Expected Benefit:</span> <span className="text-foreground">{selected.expected_benefit || "—"}</span></div>
                  {selected.uncertainty_notes && (
                    <div><span className="text-muted-foreground">Uncertainty:</span> <span className="text-foreground">{selected.uncertainty_notes}</span></div>
                  )}
                  <Separator />
                  {detail?.explanation && (
                    <>
                      <p className="text-xs text-muted-foreground italic">{detail.explanation.summary}</p>
                      {detail.explanation.posture_context && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-foreground">Reliability Posture</h4>
                          <div className="text-xs text-muted-foreground">Label: {detail.explanation.posture_context.label}</div>
                          <div className="text-xs text-muted-foreground">Risk: {detail.explanation.posture_context.risk}</div>
                          <div className="flex justify-between text-xs mt-1"><span className="text-muted-foreground">Reliability</span><span>{Math.round((detail.explanation.posture_context.reliability || 0) * 100)}%</span></div>
                          <Progress value={(detail.explanation.posture_context.reliability || 0) * 100} className="h-1.5" />
                          <div className="flex justify-between text-xs mt-1"><span className="text-muted-foreground">Regression Freq</span><span>{Math.round((detail.explanation.posture_context.regression_freq || 0) * 100)}%</span></div>
                          <Progress value={(detail.explanation.posture_context.regression_freq || 0) * 100} className="h-1.5" />
                        </div>
                      )}
                    </>
                  )}
                  <Separator />
                  <div><span className="text-muted-foreground">Updated:</span> <span className="text-foreground">{new Date(selected.updated_at).toLocaleString()}</span></div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </main>
      </div>
    </SidebarProvider>
  );
}

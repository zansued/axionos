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
import { Progress } from "@/components/ui/progress";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, HelpCircle,
  TrendingUp, TrendingDown, ArrowRightLeft,
} from "lucide-react";
import { useState } from "react";

async function invokeEngine(orgId: string, action: string, extra?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("delivery-outcomes", {
    body: { action, organization_id: orgId, ...extra },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

function useDeliveryOutcomes() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const overview = useQuery({ queryKey: ["del-out-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const records = useQuery({ queryKey: ["del-out-list", orgId], queryFn: () => invokeEngine(orgId!, "list_outcome_records"), enabled: !!orgId });
  return { overview, records };
}

const statusBadge = (s: string) => {
  switch (s) {
    case "reviewed": return "default";
    case "analyzed": return "secondary";
    case "low_confidence": return "outline";
    case "dismissed": return "destructive";
    default: return "outline";
  }
};

const directionIcon = (d: string) => {
  if (d === "positive") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (d === "negative") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />;
};

export default function DeliveryOutcomes() {
  const { overview, records } = useDeliveryOutcomes();
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const ov = overview.data as any;

  const openDetail = async (rec: any) => {
    setSelected(rec);
    try {
      const d = await invokeEngine(rec.organization_id, "explain_causality", { outcome_id: rec.id });
      setDetail(d);
    } catch { setDetail(null); }
  };

  const kpis = [
    { label: "Analyzed", value: ov?.analyzed ?? "—", icon: Activity, color: "text-blue-400" },
    { label: "Reviewed", value: ov?.reviewed ?? "—", icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Low Confidence", value: ov?.low_confidence ?? "—", icon: HelpCircle, color: "text-amber-400" },
    { label: "Pending", value: ov?.pending ?? "—", icon: AlertTriangle, color: "text-orange-400" },
    { label: "Positive Factors", value: ov?.positive_factors ?? "—", icon: TrendingUp, color: "text-emerald-500" },
    { label: "Negative Factors", value: ov?.negative_factors ?? "—", icon: TrendingDown, color: "text-red-400" },
    { label: "Rollback Outcomes", value: ov?.rollback_outcomes ?? "—", icon: XCircle, color: "text-red-500" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Delivery Outcome Causality</h1>
            <p className="text-sm text-muted-foreground">Understand which decisions, patterns, and conditions are associated with delivery outcomes.</p>
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
              <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
              <TabsTrigger value="low_confidence">Low Confidence</TabsTrigger>
              <TabsTrigger value="rollback">Rollback</TabsTrigger>
            </TabsList>

            {["all", "reviewed", "low_confidence", "rollback"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm">Outcome Records</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[420px]">
                      {(records.data as any[])?.filter((r: any) => {
                        if (tab === "all") return true;
                        if (tab === "reviewed") return r.analysis_status === "reviewed";
                        if (tab === "low_confidence") return r.analysis_status === "low_confidence" || r.confidence_score < 0.4;
                        if (tab === "rollback") return r.outcome_type === "rollback";
                        return true;
                      }).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => openDetail(r)}>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{r.initiatives?.title || r.outcome_summary?.slice(0, 40) || r.id.slice(0, 8)}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted-foreground">Type: {r.outcome_type}</span>
                              <span className="text-[11px] text-muted-foreground">Confidence: {Math.round((r.confidence_score || 0) * 100)}%</span>
                            </div>
                          </div>
                          <Badge variant={statusBadge(r.analysis_status)}>{r.analysis_status}</Badge>
                        </div>
                      )) || <p className="text-sm text-muted-foreground">No outcome records yet.</p>}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <Sheet open={!!selected} onOpenChange={() => { setSelected(null); setDetail(null); }}>
            <SheetContent className="w-[480px] bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">Outcome Causality Detail</SheetTitle>
              </SheetHeader>
              {selected && (
                <div className="mt-4 space-y-4 text-sm">
                  <div><span className="text-muted-foreground">Initiative:</span> <span className="text-foreground font-medium">{selected.initiatives?.title || "—"}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{selected.outcome_type}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusBadge(selected.analysis_status)}>{selected.analysis_status}</Badge></div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Confidence</span><span className="text-foreground">{Math.round((selected.confidence_score || 0) * 100)}%</span></div>
                    <Progress value={(selected.confidence_score || 0) * 100} className="h-2" />
                  </div>
                  {selected.uncertainty_notes && (
                    <div><span className="text-muted-foreground">Uncertainty:</span> <span className="text-foreground">{selected.uncertainty_notes}</span></div>
                  )}
                  <Separator />

                  {detail?.explanation && (
                    <>
                      <p className="text-xs text-muted-foreground italic">{detail.explanation.summary}</p>
                      {detail.explanation.positive_factors?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-emerald-400 mb-1">Positive Factors</h4>
                          {detail.explanation.positive_factors.map((f: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 py-1">
                              {directionIcon("positive")}
                              <span className="text-xs text-foreground">{f.factor_label || f.factor_type}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">{Math.round(f.contribution_weight * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {detail.explanation.negative_factors?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-red-400 mb-1">Negative Factors</h4>
                          {detail.explanation.negative_factors.map((f: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 py-1">
                              {directionIcon("negative")}
                              <span className="text-xs text-foreground">{f.factor_label || f.factor_type}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">{Math.round(f.contribution_weight * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {detail.explanation.uncertain_factors?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-amber-400 mb-1">Uncertain Factors</h4>
                          {detail.explanation.uncertain_factors.map((f: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 py-1">
                              {directionIcon("uncertain")}
                              <span className="text-xs text-foreground">{f.factor_label || f.factor_type}</span>
                              {f.uncertainty_reason && <span className="text-[10px] text-muted-foreground">— {f.uncertainty_reason}</span>}
                            </div>
                          ))}
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

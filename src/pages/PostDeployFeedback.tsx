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
  Activity, AlertTriangle, CheckCircle2, Clock, Layers, Radio, ShieldAlert,
} from "lucide-react";
import { useState } from "react";

async function invokeEngine(orgId: string, action: string, extra?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("post-deploy-feedback", {
    body: { action, organization_id: orgId, ...extra },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

const severityBadge = (s: string) => {
  switch (s) {
    case "critical": return "destructive";
    case "high": return "outline";
    case "moderate": return "secondary";
    default: return "default";
  }
};

const statusBadge = (s: string) => {
  switch (s) {
    case "reviewed": return "default";
    case "classified": case "linked": case "clustered": return "secondary";
    case "dismissed": return "destructive";
    default: return "outline";
  }
};

export default function PostDeployFeedback() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const overview = useQuery({ queryKey: ["pdf-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const signals = useQuery({ queryKey: ["pdf-list", orgId], queryFn: () => invokeEngine(orgId!, "list_feedback_signals"), enabled: !!orgId });
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const ov = overview.data as any;

  const openDetail = async (sig: any) => {
    setSelected(sig);
    try {
      const d = await invokeEngine(sig.organization_id, "explain_feedback_signal", { signal_id: sig.id });
      setDetail(d);
    } catch { setDetail(null); }
  };

  const kpis = [
    { label: "Total Signals", value: ov?.total_signals ?? "—", icon: Activity, color: "text-blue-400" },
    { label: "Critical", value: ov?.critical ?? "—", icon: ShieldAlert, color: "text-red-500" },
    { label: "High", value: ov?.high ?? "—", icon: AlertTriangle, color: "text-orange-400" },
    { label: "Pending", value: ov?.pending ?? "—", icon: Clock, color: "text-amber-400" },
    { label: "Reviewed", value: ov?.reviewed ?? "—", icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Clusters", value: ov?.clusters ?? "—", icon: Layers, color: "text-purple-400" },
    { label: "Critical Clusters", value: ov?.critical_clusters ?? "—", icon: Radio, color: "text-red-400" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Post-Deploy Feedback</h1>
            <p className="text-sm text-muted-foreground">Assimilate post-deploy operational signals into governed learning and delivery optimization.</p>
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
              <TabsTrigger value="critical">Critical</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            </TabsList>

            {["all", "critical", "pending", "reviewed"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm">Feedback Signals</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[420px]">
                      {(signals.data as any[])?.filter((s: any) => {
                        if (tab === "all") return true;
                        if (tab === "critical") return s.severity === "critical" || s.severity === "high";
                        if (tab === "pending") return s.assimilation_status === "pending";
                        if (tab === "reviewed") return s.assimilation_status === "reviewed";
                        return true;
                      }).map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => openDetail(s)}>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{s.signal_summary?.slice(0, 50) || s.signal_type}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant={severityBadge(s.severity)} className="text-[10px] h-4">{s.severity}</Badge>
                              <span className="text-[11px] text-muted-foreground">{s.impact_area}</span>
                              <span className="text-[11px] text-muted-foreground">{s.initiatives?.title || ""}</span>
                            </div>
                          </div>
                          <Badge variant={statusBadge(s.assimilation_status)}>{s.assimilation_status}</Badge>
                        </div>
                      )) || <p className="text-sm text-muted-foreground">No feedback signals yet.</p>}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <Sheet open={!!selected} onOpenChange={() => { setSelected(null); setDetail(null); }}>
            <SheetContent className="w-[480px] bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">Feedback Signal Detail</SheetTitle>
              </SheetHeader>
              {selected && (
                <div className="mt-4 space-y-4 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground font-medium">{selected.signal_type}</span></div>
                  <div><span className="text-muted-foreground">Severity:</span> <Badge variant={severityBadge(selected.severity)}>{selected.severity}</Badge></div>
                  <div><span className="text-muted-foreground">Impact:</span> <span className="text-foreground">{selected.impact_area}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusBadge(selected.assimilation_status)}>{selected.assimilation_status}</Badge></div>
                  <Separator />
                  <div><span className="text-muted-foreground">Summary:</span> <span className="text-foreground">{selected.signal_summary || "—"}</span></div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Reliability Relevance</span><span className="text-foreground">{Math.round((selected.reliability_relevance || 0) * 100)}%</span></div>
                    <Progress value={(selected.reliability_relevance || 0) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Adoption Relevance</span><span className="text-foreground">{Math.round((selected.adoption_relevance || 0) * 100)}%</span></div>
                    <Progress value={(selected.adoption_relevance || 0) * 100} className="h-2" />
                  </div>
                  <Separator />
                  {detail?.explanation && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground italic">{detail.explanation.why}</p>
                      {detail.explanation.linked_contexts?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-foreground mb-1">Linked Contexts</h4>
                          {detail.explanation.linked_contexts.map((l: any, i: number) => (
                            <div key={i} className="text-xs text-muted-foreground py-0.5">
                              {l.link_target_type} — relevance: {Math.round((l.relevance_score || 0) * 100)}%
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Separator />
                  <div><span className="text-muted-foreground">Created:</span> <span className="text-foreground">{new Date(selected.created_at).toLocaleString()}</span></div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </main>
      </div>
    </SidebarProvider>
  );
}

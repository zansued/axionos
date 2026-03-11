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
import { ShieldCheck, AlertTriangle, XCircle, Eye, TrendingUp, ArrowDownCircle, Lock } from "lucide-react";
import { useState } from "react";

async function invokeEngine(orgId: string, action: string, extra?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("marketplace-outcomes", {
    body: { action, organization_id: orgId, ...extra },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

function useMarketplaceOutcomes() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const overview = useQuery({ queryKey: ["mkt-out-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const outcomes = useQuery({ queryKey: ["mkt-out-list", orgId], queryFn: () => invokeEngine(orgId!, "list_marketplace_outcomes"), enabled: !!orgId });
  return { overview, outcomes };
}

const standingColor = (s: string) => {
  switch (s) {
    case "high_confidence": return "default";
    case "visible": return "secondary";
    case "restricted": case "downgraded": return "outline";
    case "suspended": return "destructive";
    default: return "outline";
  }
};

export default function MarketplaceOutcomes() {
  const { overview, outcomes } = useMarketplaceOutcomes();
  const [selected, setSelected] = useState<any>(null);
  const ov = overview.data as any;

  const kpis = [
    { label: "High Confidence", value: ov?.high_confidence ?? "—", icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Visible", value: ov?.visible ?? "—", icon: Eye, color: "text-blue-400" },
    { label: "Restricted", value: ov?.restricted ?? "—", icon: Lock, color: "text-amber-400" },
    { label: "Downgraded", value: ov?.downgraded ?? "—", icon: ArrowDownCircle, color: "text-orange-400" },
    { label: "Suspended", value: ov?.suspended ?? "—", icon: XCircle, color: "text-red-400" },
    { label: "High Risk", value: ov?.high_risk ?? "—", icon: AlertTriangle, color: "text-red-500" },
    { label: "Critical Signals", value: ov?.critical_signals ?? "—", icon: TrendingUp, color: "text-purple-400" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marketplace Outcomes</h1>
            <p className="text-sm text-muted-foreground">Outcome-aware capability marketplace — governed standing, health, and risk posture.</p>
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
              <TabsTrigger value="high_confidence">High Confidence</TabsTrigger>
              <TabsTrigger value="at_risk">At Risk</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
            </TabsList>

            {["all", "high_confidence", "at_risk", "suspended"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle className="text-sm">Capability Outcome Postures</CardTitle></CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[420px]">
                      {(outcomes.data as any[])?.filter((o: any) => {
                        if (tab === "all") return true;
                        if (tab === "high_confidence") return o.standing === "high_confidence";
                        if (tab === "at_risk") return o.risk_posture === "high" || o.risk_posture === "critical" || o.standing === "restricted" || o.standing === "downgraded";
                        if (tab === "suspended") return o.standing === "suspended";
                        return true;
                      }).map((o: any) => (
                        <div key={o.id} className="flex items-center justify-between py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 px-2 rounded" onClick={() => setSelected(o)}>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{o.capability_packages?.package_name || o.capability_package_id?.slice(0, 8)}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted-foreground">Health: {Math.round((o.health_score || 0) * 100)}%</span>
                              <span className="text-[11px] text-muted-foreground">Rel: {Math.round((o.reliability_score || 0) * 100)}%</span>
                              <span className="text-[11px] text-muted-foreground">Risk: {o.risk_posture}</span>
                            </div>
                          </div>
                          <Badge variant={standingColor(o.standing)}>{o.standing}</Badge>
                        </div>
                      )) || <p className="text-sm text-muted-foreground">No outcome postures yet.</p>}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
            <SheetContent className="w-[440px] bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">Outcome Posture Detail</SheetTitle>
              </SheetHeader>
              {selected && (
                <div className="mt-4 space-y-4 text-sm">
                  <div><span className="text-muted-foreground">Capability:</span> <span className="text-foreground font-medium">{selected.capability_packages?.package_name || "—"}</span></div>
                  <div><span className="text-muted-foreground">Standing:</span> <Badge variant={standingColor(selected.standing)}>{selected.standing}</Badge></div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Health</span><span className="text-foreground">{Math.round((selected.health_score || 0) * 100)}%</span></div>
                    <Progress value={(selected.health_score || 0) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Reliability</span><span className="text-foreground">{Math.round((selected.reliability_score || 0) * 100)}%</span></div>
                    <Progress value={(selected.reliability_score || 0) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Compatibility</span><span className="text-foreground">{Math.round((selected.compatibility_confidence || 0) * 100)}%</span></div>
                    <Progress value={(selected.compatibility_confidence || 0) * 100} className="h-2" />
                  </div>
                  <Separator />
                  <div><span className="text-muted-foreground">Risk Posture:</span> <span className="text-foreground">{selected.risk_posture}</span></div>
                  <div><span className="text-muted-foreground">Rollback Readiness:</span> <span className="text-foreground">{selected.rollback_readiness}</span></div>
                  <div><span className="text-muted-foreground">Review Summary:</span> <span className="text-foreground">{selected.review_summary || "—"}</span></div>
                  <Separator />
                  <div><span className="text-muted-foreground">Updated:</span> <span className="text-foreground">{new Date(selected.updated_at).toLocaleString()}</span></div>
                </div>
              )}
            </SheetContent>
          </Sheet>
      </div>
    </AppShell>
  );
}

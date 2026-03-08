import { useState } from "react";
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
import { FlaskConical, AlertTriangle, HelpCircle, Archive, Rocket, Lightbulb } from "lucide-react";

function HypothesesContent() {
  const { currentOrg } = useOrg();
  const [selected, setSelected] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["architecture-hypotheses", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("architecture-hypotheses", {
        body: { action: "overview", organization_id: currentOrg?.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 30000,
  });

  const { data: detail } = useQuery({
    queryKey: ["hypothesis-detail", selected?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("architecture-hypotheses", {
        body: { action: "hypothesis_detail", organization_id: currentOrg?.id, hypothesis_id: selected?.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selected?.id && !!currentOrg?.id,
  });

  const kpis = data?.kpis || {};
  const hypotheses = data?.hypotheses || [];

  const kpiCards = [
    { label: "Total", value: kpis.total ?? 0, icon: Lightbulb, color: "text-primary" },
    { label: "Candidates", value: kpis.candidates ?? 0, icon: FlaskConical, color: "text-blue-400" },
    { label: "High Risk", value: kpis.high_risk ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Low Confidence", value: kpis.low_confidence ?? 0, icon: HelpCircle, color: "text-amber-500" },
    { label: "Sim. Ready", value: kpis.simulation_ready ?? 0, icon: Rocket, color: "text-green-500" },
    { label: "Archived", value: kpis.archived ?? 0, icon: Archive, color: "text-muted-foreground" },
  ];

  const riskBadge = (r: string) => {
    const m: Record<string, string> = { low: "bg-green-500/15 text-green-400", moderate: "bg-yellow-500/15 text-yellow-400", high: "bg-orange-500/15 text-orange-400", critical: "bg-red-500/15 text-red-400" };
    return m[r] || "bg-muted text-muted-foreground";
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { candidate: "bg-blue-500/15 text-blue-400", under_review: "bg-yellow-500/15 text-yellow-400", accepted: "bg-green-500/15 text-green-400", rejected: "bg-red-500/15 text-red-400", archived: "bg-muted text-muted-foreground", simulation_ready: "bg-emerald-500/15 text-emerald-400" };
    return m[s] || "bg-muted text-muted-foreground";
  };

  const filterHypotheses = (filter: string) => {
    switch (filter) {
      case "candidates": return hypotheses.filter((h: any) => h.review_status === "candidate");
      case "high_risk": return hypotheses.filter((h: any) => h.risk_posture === "high" || h.risk_posture === "critical");
      case "low_conf": return hypotheses.filter((h: any) => h.confidence_score < 0.4);
      case "sim_ready": return hypotheses.filter((h: any) => h.simulation_ready);
      default: return hypotheses;
    }
  };

  const renderList = (items: any[]) => (
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground">No hypotheses in this view.</p>
    ) : (
      <ScrollArea className="h-[420px]">
        <div className="space-y-2">
          {items.map((h: any) => (
            <div key={h.id} onClick={() => { setSelected(h); setDrawerOpen(true); }} className="p-3 rounded-md border border-border/40 hover:bg-muted/30 cursor-pointer">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{h.proposed_idea || "Untitled hypothesis"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{h.hypothesis_type} · {h.target_area}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{(h.confidence_score * 100).toFixed(0)}%</span>
                  <Badge variant="outline" className={`text-[10px] ${riskBadge(h.risk_posture)}`}>{h.risk_posture}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${statusBadge(h.review_status)}`}>{h.review_status}</Badge>
                </div>
              </div>
              {h.problem_statement && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{h.problem_statement}</p>}
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Architecture Hypothesis Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Evidence-linked architectural hypotheses for governed research and review. Hypotheses are NOT approved direction.</p>
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

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="high_risk">High Risk</TabsTrigger>
            <TabsTrigger value="low_conf">Low Confidence</TabsTrigger>
            <TabsTrigger value="sim_ready">Sim. Ready</TabsTrigger>
          </TabsList>

          {["all", "candidates", "high_risk", "low_conf", "sim_ready"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card className="border-border/50">
                <CardHeader><CardTitle className="text-base">Hypotheses</CardTitle></CardHeader>
                <CardContent>{renderList(filterHypotheses(tab))}</CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Hypothesis Detail</SheetTitle></SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> {selected.hypothesis_type}</div>
                <div><span className="text-muted-foreground">Target:</span> {selected.target_area}</div>
                <div><span className="text-muted-foreground">Problem:</span> {selected.problem_statement || "—"}</div>
                <div><span className="text-muted-foreground">Idea:</span> {selected.proposed_idea || "—"}</div>
                <div><span className="text-muted-foreground">Benefit:</span> {selected.expected_benefit || "—"}</div>
                <div className="flex gap-2">
                  <Badge variant="outline" className={`text-[10px] ${riskBadge(selected.risk_posture)}`}>Risk: {selected.risk_posture}</Badge>
                  <Badge variant="outline" className="text-[10px]">Uncertainty: {selected.uncertainty_posture}</Badge>
                  <Badge variant="outline" className="text-[10px]">Confidence: {(selected.confidence_score * 100).toFixed(0)}%</Badge>
                </div>
                {selected.simulation_ready && <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">Simulation Ready</Badge>}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Evidence</h4>
                {(detail?.evidence || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No evidence linked.</p>
                ) : (
                  <div className="space-y-1">
                    {(detail?.evidence || []).map((e: any) => (
                      <div key={e.id} className="p-2 rounded border border-border/30 text-xs">
                        <span className="font-medium">{e.evidence_type}</span> · {e.evidence_strength} · {e.evidence_source}
                        {e.evidence_summary && <p className="text-muted-foreground mt-0.5">{e.evidence_summary}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Reviews</h4>
                {(detail?.reviews || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No reviews yet.</p>
                ) : (
                  <div className="space-y-1">
                    {(detail?.reviews || []).map((r: any) => (
                      <div key={r.id} className="p-2 rounded border border-border/30 text-xs">
                        <Badge variant="outline" className={`text-[9px] ${statusBadge(r.review_status)}`}>{r.review_status}</Badge>
                        {r.review_notes && <p className="text-muted-foreground mt-0.5">{r.review_notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                {(detail?.tags || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tags.</p>
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {(detail?.tags || []).map((t: any) => (
                      <Badge key={t.id} variant="outline" className="text-[10px]">{t.tag_key}: {t.tag_value}</Badge>
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

export default function ArchitectureHypotheses() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <HypothesesContent />
      </div>
    </SidebarProvider>
  );
}

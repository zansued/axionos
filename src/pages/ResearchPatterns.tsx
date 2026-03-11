import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Network, Eye, AlertTriangle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";

function invoke(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("research-patterns", {
    body: { action, organization_id: orgId, ...params },
  });
}

const CLASS_COLORS: Record<string, string> = {
  recurring_risk: "bg-destructive/20 text-destructive",
  anti_pattern: "bg-destructive/20 text-destructive",
  recurring_opportunity: "bg-green-500/20 text-green-400",
  best_practice: "bg-green-500/20 text-green-400",
  structural_tension: "bg-yellow-500/20 text-yellow-400",
  abstraction_candidate: "bg-blue-500/20 text-blue-400",
};

const CONF_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  moderate: "bg-yellow-500/20 text-yellow-400",
  high: "bg-green-500/20 text-green-400",
  very_high: "bg-blue-500/20 text-blue-400",
};

const GEN_COLORS: Record<string, string> = {
  narrow: "bg-muted text-muted-foreground",
  context_specific: "bg-yellow-500/20 text-yellow-400",
  bounded_general: "bg-blue-500/20 text-blue-400",
  broad: "bg-green-500/20 text-green-400",
};

function PatternCard({ p, onClick }: { p: any; onClick: () => void }) {
  return (
    <div
      className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-card/50 cursor-pointer hover:bg-accent/10 transition-colors"
      onClick={onClick}
    >
      <div className="space-y-1 flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{p.pattern_name}</div>
        <div className="text-xs text-muted-foreground truncate">{p.recurring_theme || "No theme recorded"}</div>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          <Badge className={`text-xs ${CLASS_COLORS[p.pattern_class] || "bg-muted text-muted-foreground"}`}>
            {p.pattern_class}
          </Badge>
          <Badge className={`text-xs ${CONF_COLORS[p.confidence_posture] || ""}`}>
            {p.confidence_posture} conf
          </Badge>
          <Badge className={`text-xs ${GEN_COLORS[p.generalization_posture] || ""}`}>
            {p.generalization_posture}
          </Badge>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="ml-2 shrink-0">
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function ResearchPatterns() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const [selectedPattern, setSelectedPattern] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const overview = useQuery({
    queryKey: ["research-patterns-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "overview");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const patterns = useQuery({
    queryKey: ["research-patterns-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "list_patterns");
      if (error) throw error;
      return data;
    },
  });

  const detail = useQuery({
    queryKey: ["research-pattern-detail", selectedPattern?.id],
    enabled: !!selectedPattern?.id && !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "pattern_detail", { pattern_id: selectedPattern.id });
      if (error) throw error;
      return data;
    },
  });

  const openDetail = (p: any) => {
    setSelectedPattern(p);
    setDrawerOpen(true);
  };

  const ov = overview.data;
  const allPatterns: any[] = patterns.data?.patterns || [];

  const TAB_FILTERS: Record<string, (p: any) => boolean> = {
    all: () => true,
    risk: (p) => p.pattern_class === "recurring_risk" || p.pattern_class === "anti_pattern",
    opportunity: (p) => p.pattern_class === "recurring_opportunity" || p.pattern_class === "best_practice",
    tension: (p) => p.pattern_class === "structural_tension",
    high_confidence: (p) => p.confidence_posture === "high" || p.confidence_posture === "very_high",
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              Cross-Context Pattern Synthesis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Abstracted recurring patterns from bounded research — isolation-safe, advisory-only
            </p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Patterns", value: ov?.total || 0 },
              { label: "High Confidence", value: ov?.high_confidence || 0 },
              { label: "Low Generalization", value: ov?.low_generalization || 0 },
              { label: "Risk Classes", value: ov?.recurring_risk_classes || 0 },
              { label: "Opportunity Classes", value: ov?.recurring_opportunity_classes || 0 },
              { label: "Review Backlog", value: ov?.review_backlog || 0 },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{k.value}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="risk">Recurring Risks</TabsTrigger>
              <TabsTrigger value="opportunity">Opportunities</TabsTrigger>
              <TabsTrigger value="tension">Structural Tensions</TabsTrigger>
              <TabsTrigger value="high_confidence">High Confidence</TabsTrigger>
            </TabsList>

            {(["all", "risk", "opportunity", "tension", "high_confidence"] as const).map((tab) => {
              const filtered = allPatterns.filter(TAB_FILTERS[tab]);
              return (
                <TabsContent key={tab} value={tab}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        {tab === "all" && "All Synthesized Patterns"}
                        {tab === "risk" && "Recurring Risk Classes"}
                        {tab === "opportunity" && "Recurring Opportunity Classes"}
                        {tab === "tension" && "Structural Tensions"}
                        {tab === "high_confidence" && "High-Confidence Patterns"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[420px]">
                        {filtered.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No patterns in this category.</p>
                        ) : (
                          <div className="space-y-3">
                            {filtered.map((p: any) => (
                              <PatternCard key={p.id} p={p} onClick={() => openDetail(p)} />
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          {/* Detail Drawer */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent className="w-full sm:max-w-xl overflow-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  {selectedPattern?.pattern_name || "Pattern Detail"}
                </SheetTitle>
              </SheetHeader>

              {detail.isLoading && (
                <div className="flex justify-center mt-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              )}

              {detail.data?.pattern && (
                <div className="space-y-4 mt-4">
                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={`text-xs ${CLASS_COLORS[detail.data.pattern.pattern_class] || ""}`}>
                      {detail.data.pattern.pattern_class}
                    </Badge>
                    <Badge className={`text-xs ${CONF_COLORS[detail.data.pattern.confidence_posture] || ""}`}>
                      {detail.data.pattern.confidence_posture} confidence
                    </Badge>
                    <Badge className={`text-xs ${GEN_COLORS[detail.data.pattern.generalization_posture] || ""}`}>
                      {detail.data.pattern.generalization_posture}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {detail.data.pattern.abstraction_level}
                    </Badge>
                  </div>

                  {/* Theme */}
                  {detail.data.pattern.recurring_theme && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Recurring Theme</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{detail.data.pattern.recurring_theme}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Sanitized description */}
                  {detail.data.pattern.sanitized_description && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Abstracted Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{detail.data.pattern.sanitized_description}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Opportunity & Risk summaries */}
                  <div className="grid grid-cols-1 gap-3">
                    {detail.data.pattern.opportunity_summary && (
                      <Card className="border-green-500/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-medium text-green-400">Opportunity Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{detail.data.pattern.opportunity_summary}</p>
                        </CardContent>
                      </Card>
                    )}
                    {detail.data.pattern.risk_summary && (
                      <Card className="border-destructive/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-medium text-destructive">Risk Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{detail.data.pattern.risk_summary}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Contributors */}
                  {(detail.data.contributors || []).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium">Contributing Evidence Classes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {detail.data.contributors.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded border border-border/50">
                            <Badge variant="outline">{c.contributor_type}</Badge>
                            <span className="text-muted-foreground">strength: {((c.contribution_strength || 0) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Risk Notes */}
                  {(detail.data.risk_notes || []).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-400" /> Synthesis Risk Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {detail.data.risk_notes.map((r: any) => (
                          <div key={r.id} className="p-2 rounded border border-border/50 space-y-1">
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">{r.risk_type}</Badge>
                              <Badge className={`text-xs ${r.risk_severity === "critical" ? "bg-destructive/20 text-destructive" : r.risk_severity === "high" ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}`}>
                                {r.risk_severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{r.risk_description}</p>
                            {r.mitigation_notes && (
                              <p className="text-xs text-muted-foreground/70 italic">{r.mitigation_notes}</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Reviews */}
                  {(detail.data.reviews || []).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium">Reviews</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {detail.data.reviews.map((r: any) => (
                          <div key={r.id} className="p-2 rounded border border-border/50 text-xs space-y-1">
                            <Badge variant="outline">{r.review_status}</Badge>
                            {r.review_notes && <p className="text-muted-foreground">{r.review_notes}</p>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Isolation + governance guarantee */}
                  <div className="text-xs text-muted-foreground p-3 rounded-lg border border-border/50 bg-muted/20 space-y-1">
                    <div className="flex items-center gap-1 text-primary">
                      <ShieldCheck className="h-3 w-3" /> Isolation & Governance
                    </div>
                    <p>This pattern is synthesized from abstracted research outputs. No tenant-identifying information is exposed or retained.</p>
                    <p>Synthesized patterns are advisory. They do not represent approved architectural direction and cannot directly trigger architecture changes.</p>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </main>
      </div>
    </SidebarProvider>
  );
}

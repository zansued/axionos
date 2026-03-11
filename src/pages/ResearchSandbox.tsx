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
import { FlaskConical, Beaker, AlertTriangle, CheckCircle2, XCircle, HelpCircle, Eye } from "lucide-react";
import { AppShell } from "@/components/AppShell";

function invoke(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("research-sandbox", {
    body: { action, organization_id: orgId, ...params },
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    ready: "bg-blue-500/20 text-blue-400",
    running: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-green-500/20 text-green-400",
    inconclusive: "bg-orange-500/20 text-orange-400",
    failed: "bg-destructive/20 text-destructive",
    archived: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
}

function UncertaintyBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    low: "bg-green-500/20 text-green-400",
    moderate: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    very_high: "bg-destructive/20 text-destructive",
  };
  return <Badge variant="outline" className={map[level] || ""}>{level} uncertainty</Badge>;
}

export default function ResearchSandbox() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const overview = useQuery({
    queryKey: ["research-sandbox-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "overview");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const campaigns = useQuery({
    queryKey: ["research-sandbox-campaigns", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "list_campaigns");
      if (error) throw error;
      return data;
    },
  });

  const detail = useQuery({
    queryKey: ["research-sandbox-detail", selectedCampaign?.id],
    enabled: !!selectedCampaign?.id && !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "campaign_detail", { campaign_id: selectedCampaign.id });
      if (error) throw error;
      return data;
    },
  });

  const openDetail = (c: any) => {
    setSelectedCampaign(c);
    setDrawerOpen(true);
  };

  const ov = overview.data;
  const allCampaigns = campaigns.data?.campaigns || [];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Beaker className="h-6 w-6 text-primary" />
              Simulated Evolution Campaigns
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sandbox-bounded architecture hypothesis evaluation — no production mutation
            </p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Campaigns", value: ov?.campaign_count || 0 },
              { label: "Completed", value: ov?.completed || 0 },
              { label: "Running", value: ov?.running || 0 },
              { label: "Inconclusive", value: ov?.inconclusive || 0 },
              { label: "Failed", value: ov?.failed || 0 },
              { label: "High Uncertainty", value: ov?.high_uncertainty || 0 },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <div className="text-xs text-muted-foreground">{kpi.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="running">Running</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="inconclusive">Inconclusive</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            {["all", "running", "completed", "inconclusive", "failed"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FlaskConical className="h-4 w-4" />
                      {tab === "all" ? "All Campaigns" : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Campaigns`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {allCampaigns.filter((c: any) => tab === "all" || c.evaluation_status === tab).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No campaigns in this category.</p>
                      ) : (
                        <div className="space-y-3">
                          {allCampaigns
                            .filter((c: any) => tab === "all" || c.evaluation_status === tab)
                            .map((c: any) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 cursor-pointer hover:bg-accent/10 transition-colors"
                                onClick={() => openDetail(c)}
                              >
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{c.campaign_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Scope: {c.research_scope} · Scenario: {c.scenario_type}
                                  </div>
                                  <div className="flex gap-2 mt-1 flex-wrap">
                                    <StatusBadge status={c.evaluation_status} />
                                    <UncertaintyBadge level={c.uncertainty_posture} />
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="ml-2">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Detail Drawer */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent className="w-full sm:max-w-xl overflow-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-primary" />
                  {selectedCampaign?.campaign_name || "Campaign Detail"}
                </SheetTitle>
              </SheetHeader>

              {detail.data?.campaign && (
                <div className="space-y-4 mt-4">
                  <div className="flex gap-2 flex-wrap">
                    <StatusBadge status={detail.data.campaign.evaluation_status} />
                    <UncertaintyBadge level={detail.data.campaign.uncertainty_posture} />
                    <Badge variant="outline" className="text-xs">{detail.data.campaign.scenario_type}</Badge>
                  </div>

                  {/* Baseline */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Baseline Reference</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(detail.data.campaign.baseline_reference, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Simulated Change */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground">Simulated Change Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(detail.data.campaign.simulated_change_model, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Metrics */}
                  {(detail.data.metrics || []).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium">Simulation Metrics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {detail.data.metrics.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded border border-border/50">
                            <div>
                              <span className="font-medium">{m.metric_name}</span>
                              <span className="text-muted-foreground ml-2">({m.metric_domain})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{m.baseline_value} → {m.simulated_value}</span>
                              {m.delta_direction === "gain" && (
                                <Badge className="bg-green-500/20 text-green-400 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />+{m.delta}
                                </Badge>
                              )}
                              {m.delta_direction === "regression" && (
                                <Badge className="bg-destructive/20 text-destructive text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />{m.delta}
                                </Badge>
                              )}
                              {m.delta_direction === "neutral" && (
                                <Badge variant="outline" className="text-xs">
                                  <HelpCircle className="h-3 w-3 mr-1" />neutral
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Results */}
                  {(detail.data.results || []).length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium">Comparison Results</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {detail.data.results.map((r: any) => (
                          <div key={r.id} className="p-2 rounded border border-border/50 space-y-1">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">{r.result_type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                conf: {((r.confidence_score || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                            {(r.gains || []).length > 0 && (
                              <div className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {(r.gains as any[]).length} gain(s) detected
                              </div>
                            )}
                            {(r.regressions || []).length > 0 && (
                              <div className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {(r.regressions as any[]).length} regression(s) detected
                              </div>
                            )}
                            {(r.inconclusive_areas || []).length > 0 && (
                              <div className="text-xs text-orange-400 flex items-center gap-1">
                                <HelpCircle className="h-3 w-3" />
                                {(r.inconclusive_areas as any[]).length} inconclusive area(s)
                              </div>
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
                        {detail.data.reviews.map((rv: any) => (
                          <div key={rv.id} className="p-2 rounded border border-border/50 text-xs space-y-1">
                            <Badge variant="outline">{rv.review_status}</Badge>
                            {rv.review_notes && <p className="text-muted-foreground">{rv.review_notes}</p>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Governance notice */}
                  <div className="text-xs text-muted-foreground p-3 rounded-lg border border-border/50 bg-muted/20">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    This simulation is sandbox-bounded. No production architecture was or will be modified.
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

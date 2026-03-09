import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useAdoptionIntelligence } from "@/hooks/useAdoptionIntelligence";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, AlertTriangle, CheckCircle2, Users, BarChart3, Target } from "lucide-react";
import { PageGuidanceShell } from "@/components/guidance";

export default function AdoptionIntelligence() {
  const { overview } = useAdoptionIntelligence();
  const items = overview.data ?? [];

  const avgAdoption = items.length > 0 ? items.reduce((s: number, i: any) => s + (i.adoption_score ?? 0), 0) / items.length : 0;
  const strongCount = items.filter((i: any) => i.signal_label === "Strong Success").length;
  const atRiskCount = items.filter((i: any) => i.signal_label === "At Risk").length;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="p-6 space-y-6">
            <PageGuidanceShell pageKey="adoption" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Adoption Intelligence</h1>
              <p className="text-muted-foreground">Customer success signals, journey adoption, and friction analysis.</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="funnel">Journey Funnel</TabsTrigger>
                <TabsTrigger value="signals">Success Signals</TabsTrigger>
                <TabsTrigger value="friction">Friction & Intervention</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Avg Adoption</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{(avgAdoption * 100).toFixed(0)}%</div>
                      <Progress value={avgAdoption * 100} className="mt-2 h-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1"><Users className="h-3 w-3" /> Initiatives</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{items.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Strong Success</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">{strongCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> At Risk</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">{atRiskCount}</div>
                    </CardContent>
                  </Card>
                </div>

                {items.length === 0 && !overview.isLoading && (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">No adoption data yet. Create initiatives to start tracking.</CardContent></Card>
                )}

                {items.map((item: any) => (
                  <Card key={item.initiative_id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{item.initiative_id?.slice(0, 8)}...</CardTitle>
                        <Badge variant={item.signal_label === "Strong Success" ? "default" : item.signal_label === "At Risk" ? "destructive" : "secondary"}>
                          {item.signal_label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Milestone</span>
                          <div className="font-medium text-foreground">{(item.milestone_completion_score * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Adoption</span>
                          <div className="font-medium text-foreground">{(item.adoption_score * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stage</span>
                          <div className="font-medium text-foreground">{item.stage_status}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="funnel" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Journey Adoption Funnel</CardTitle>
                    <CardDescription>Stage-by-stage progression across all initiatives</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {["idea", "discovery", "architecture", "engineering", "validation", "deploy", "handoff"].map((stage) => {
                      const count = items.filter((i: any) => {
                        const stages = ["draft", "discovering", "architecting", "engineering", "validating", "deploying", "deployed"];
                        const idx = stages.indexOf(i.stage_status);
                        const stageIdx = ["idea", "discovery", "architecture", "engineering", "validation", "deploy", "handoff"].indexOf(stage);
                        return idx >= stageIdx;
                      }).length;
                      const pct = items.length > 0 ? (count / items.length) * 100 : 0;
                      return (
                        <div key={stage} className="flex items-center gap-3 py-2">
                          <div className="w-28 text-sm capitalize text-foreground">{stage}</div>
                          <Progress value={pct} className="flex-1 h-3" />
                          <div className="w-16 text-right text-sm text-muted-foreground">{count} ({pct.toFixed(0)}%)</div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="signals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Customer Success Signals</CardTitle>
                    <CardDescription>Meaningful success signals across the journey</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {items.length === 0
                      ? "No signals yet."
                      : `${strongCount} initiative(s) showing strong success, ${atRiskCount} at risk. Average adoption: ${(avgAdoption * 100).toFixed(0)}%.`}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="friction" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Friction & Intervention</CardTitle>
                    <CardDescription>Friction clusters and recommended interventions</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {atRiskCount === 0
                      ? "No significant friction detected."
                      : `${atRiskCount} initiative(s) at risk. Review stalled stages and pending approvals.`}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

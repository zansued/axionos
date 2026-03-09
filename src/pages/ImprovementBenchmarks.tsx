import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageIntroCard } from "@/components/guidance";
import { usePageGuidance } from "@/hooks/usePageGuidance";
import { useOrg } from "@/contexts/OrgContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FlaskConical, TrendingUp, TrendingDown, ShieldCheck, Clock, CheckCircle2,
  XCircle, AlertTriangle, Archive, Minus, BarChart3, Activity,
} from "lucide-react";

// Mock data for operator surface
const mockBenchmarks = [
  { id: "br-1", candidate_title: "Validation retry strategy candidate", candidate_type: "repair_strategy", status: "completed", risk_posture: "low", stability_signal: "stable", recommendation_summary: "Candidate shows 12.3% improvement. Recommended for review.", gain_detected: true, regression_detected: false, created_at: "2026-03-08T10:00:00Z" },
  { id: "br-2", candidate_title: "Extension compat check rule", candidate_type: "compatibility_rule", status: "completed", risk_posture: "high", stability_signal: "unstable", recommendation_summary: "Regression detected — NOT recommended for promotion.", gain_detected: false, regression_detected: true, created_at: "2026-03-08T09:00:00Z" },
  { id: "br-3", candidate_title: "Prompt fallback guideline", candidate_type: "prompt_process_guideline", status: "running", risk_posture: "unknown", stability_signal: "pending", recommendation_summary: "", gain_detected: false, regression_detected: false, created_at: "2026-03-08T11:00:00Z" },
  { id: "br-4", candidate_title: "Deploy blocker pattern", candidate_type: "validation_rule", status: "queued", risk_posture: "unknown", stability_signal: "pending", recommendation_summary: "", gain_detected: false, regression_detected: false, created_at: "2026-03-08T11:30:00Z" },
];

const mockDecisions = [
  { id: "pd-1", candidate_title: "Validation retry strategy", decision: "promoted", decision_reason: "Strong evidence of 12% improvement across 3 runs.", created_at: "2026-03-08T12:00:00Z" },
  { id: "pd-2", candidate_title: "Extension compat check", decision: "rejected", decision_reason: "Regression in stability metrics.", created_at: "2026-03-08T12:30:00Z" },
  { id: "pd-3", candidate_title: "Operator playbook suggestion", decision: "deferred", decision_reason: "Needs more evidence from production.", created_at: "2026-03-07T15:00:00Z" },
];

const statusColors: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  running: "bg-primary/20 text-primary",
  completed: "bg-accent/20 text-accent-foreground",
  failed: "bg-destructive/20 text-destructive",
};

const decisionColors: Record<string, string> = {
  promoted: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
  deferred: "bg-yellow-500/20 text-yellow-400",
  archived: "bg-muted text-muted-foreground",
  pending: "bg-primary/20 text-primary",
};

const riskIcons: Record<string, typeof ShieldCheck> = {
  low: ShieldCheck,
  moderate: AlertTriangle,
  high: XCircle,
  unknown: Minus,
};

export default function ImprovementBenchmarks() {
  const [selectedBenchmark, setSelectedBenchmark] = useState<typeof mockBenchmarks[0] | null>(null);
  const [activeTab, setActiveTab] = useState("benchmarks");

  const totalRuns = mockBenchmarks.length;
  const completedRuns = mockBenchmarks.filter(b => b.status === "completed").length;
  const passRate = completedRuns > 0 ? Math.round((mockBenchmarks.filter(b => b.gain_detected && !b.regression_detected).length / completedRuns) * 100) : 0;
  const highRisk = mockBenchmarks.filter(b => b.risk_posture === "high").length;
  const promoted = mockDecisions.filter(d => d.decision === "promoted").length;
  const reviewBacklog = mockBenchmarks.filter(b => b.status === "completed" && b.risk_posture !== "high").length;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sandbox Benchmarking & Promotion</h1>
              <p className="text-sm text-muted-foreground mt-1">Governed benchmarking of improvement candidates with human-reviewed promotion decisions.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FlaskConical className="h-3.5 w-3.5" /> Total Runs</div>
                  <div className="text-2xl font-bold text-foreground">{totalRuns}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="h-3.5 w-3.5" /> Pass Rate</div>
                  <div className="text-2xl font-bold text-foreground">{passRate}%</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><XCircle className="h-3.5 w-3.5" /> High Risk</div>
                  <div className="text-2xl font-bold text-destructive">{highRisk}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="h-3.5 w-3.5" /> Promoted</div>
                  <div className="text-2xl font-bold text-green-400">{promoted}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-3.5 w-3.5" /> Review Backlog</div>
                  <div className="text-2xl font-bold text-foreground">{reviewBacklog}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Activity className="h-3.5 w-3.5" /> Completed</div>
                  <div className="text-2xl font-bold text-foreground">{completedRuns}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="benchmarks">Benchmark Runs</TabsTrigger>
                <TabsTrigger value="decisions">Promotion Decisions</TabsTrigger>
              </TabsList>

              <TabsContent value="benchmarks" className="space-y-3 mt-4">
                {mockBenchmarks.map((b) => {
                  const RiskIcon = riskIcons[b.risk_posture] || Minus;
                  return (
                    <Card key={b.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedBenchmark(b)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{b.candidate_title}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">{b.candidate_type}</Badge>
                              <Badge className={statusColors[b.status]}>{b.status}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {b.gain_detected && <TrendingUp className="h-4 w-4 text-green-400" />}
                            {b.regression_detected && <TrendingDown className="h-4 w-4 text-destructive" />}
                            <RiskIcon className="h-4 w-4" />
                          </div>
                        </div>
                        {b.recommendation_summary && (
                          <p className="mt-2 text-xs text-muted-foreground">{b.recommendation_summary}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="decisions" className="space-y-3 mt-4">
                {mockDecisions.map((d) => (
                  <Card key={d.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{d.candidate_title}</div>
                          <p className="text-xs text-muted-foreground">{d.decision_reason}</p>
                        </div>
                        <Badge className={decisionColors[d.decision]}>{d.decision}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Detail Drawer */}
          <Sheet open={!!selectedBenchmark} onOpenChange={() => setSelectedBenchmark(null)}>
            <SheetContent className="w-full sm:max-w-lg bg-background border-border">
              <SheetHeader>
                <SheetTitle className="text-foreground">Benchmark Detail</SheetTitle>
                <SheetDescription className="text-muted-foreground">Inspect benchmark results, metrics comparison, and governance posture.</SheetDescription>
              </SheetHeader>
              {selectedBenchmark && (
                <ScrollArea className="h-[calc(100vh-10rem)] mt-4">
                  <div className="space-y-4 pr-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Candidate</h4>
                      <p className="text-sm text-muted-foreground">{selectedBenchmark.candidate_title}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{selectedBenchmark.candidate_type}</Badge>
                    </div>
                    <Separator className="bg-border" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Status</span>
                        <Badge className={`block mt-1 w-fit ${statusColors[selectedBenchmark.status]}`}>{selectedBenchmark.status}</Badge>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Risk Posture</span>
                        <Badge className={`block mt-1 w-fit ${selectedBenchmark.risk_posture === "high" ? "bg-destructive/20 text-destructive" : selectedBenchmark.risk_posture === "low" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>{selectedBenchmark.risk_posture}</Badge>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Stability</span>
                        <p className="text-sm text-foreground mt-1">{selectedBenchmark.stability_signal}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Gain Detected</span>
                        <p className="text-sm text-foreground mt-1">{selectedBenchmark.gain_detected ? "Yes ✅" : "No"}</p>
                      </div>
                    </div>
                    <Separator className="bg-border" />

                    {/* Mock metric comparison */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Metric Comparison</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Success Rate</span>
                          <span className="text-foreground">0.72 → 0.81 <span className="text-green-400">(+12.5%)</span></span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Stability Score</span>
                          <span className="text-foreground">0.88 → 0.86 <span className="text-yellow-400">(-2.3%)</span></span>
                        </div>
                      </div>
                    </div>
                    <Separator className="bg-border" />

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Recommendation</h4>
                      <p className="text-sm text-muted-foreground">{selectedBenchmark.recommendation_summary || "Pending benchmark completion."}</p>
                    </div>
                    <Separator className="bg-border" />

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Governance</h4>
                      <p className="text-xs text-muted-foreground">Promotion requires explicit human approval. No autonomous mutation is permitted. Rollback posture: available.</p>
                    </div>

                    {selectedBenchmark.status === "completed" && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="default" className="text-xs">Approve Promotion</Button>
                        <Button size="sm" variant="destructive" className="text-xs">Reject</Button>
                        <Button size="sm" variant="outline" className="text-xs">Defer</Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </SheetContent>
          </Sheet>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

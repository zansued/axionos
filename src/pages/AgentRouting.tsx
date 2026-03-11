import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageGuidanceShell } from "@/components/guidance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Route, ShieldCheck, AlertTriangle, XCircle, Minus, BarChart3, Activity,
  Flag, ArrowRightLeft, CheckCircle2, TrendingDown, GitBranch,
} from "lucide-react";

const mockDecisions = [
  { id: "rd-1", pipeline_stage: "generating_ui", task_type: "code_generation", chosen_capability: "ui_generation_v2", confidence_score: 0.87, risk_posture: "low", routing_reason: "Selected ui_generation_v2 with suitability 0.87 (risk: 0.12)", status: "decided", fallback_count: 2, created_at: "2026-03-08T14:00:00Z" },
  { id: "rd-2", pipeline_stage: "synthesizing_logic", task_type: "business_logic", chosen_capability: "logic_synth_standard", confidence_score: 0.72, risk_posture: "moderate", routing_reason: "Selected logic_synth_standard with suitability 0.72 (risk: 0.31)", status: "decided", fallback_count: 1, created_at: "2026-03-08T13:30:00Z" },
  { id: "rd-3", pipeline_stage: "generating_api", task_type: "api_generation", chosen_capability: "api_gen_rest", confidence_score: 0.91, risk_posture: "low", routing_reason: "Selected api_gen_rest with suitability 0.91 (risk: 0.08)", status: "decided", fallback_count: 3, created_at: "2026-03-08T13:00:00Z" },
  { id: "rd-4", pipeline_stage: "validating", task_type: "static_analysis", chosen_capability: "deep_static_v1", confidence_score: 0.55, risk_posture: "high", routing_reason: "Selected deep_static_v1 — limited alternatives, high failure rate context", status: "flagged", fallback_count: 0, created_at: "2026-03-08T12:00:00Z" },
  { id: "rd-5", pipeline_stage: "repairing", task_type: "build_repair", chosen_capability: "repair_router_v2", confidence_score: 0.79, risk_posture: "low", routing_reason: "Selected repair_router_v2 with evidence-backed suitability", status: "decided", fallback_count: 2, created_at: "2026-03-08T11:00:00Z" },
];

const mockCandidates = [
  { capability_key: "ui_generation_v2", suitability_score: 0.87, risk_score: 0.12, selected: true, rejection_reason: null },
  { capability_key: "ui_generation_v1", suitability_score: 0.71, risk_score: 0.18, selected: false, rejection_reason: "Outranked (suitability: 0.71 < 0.87)" },
  { capability_key: "ui_generation_experimental", suitability_score: 0.63, risk_score: 0.42, selected: false, rejection_reason: "High risk score (0.42)" },
];

const riskColors: Record<string, string> = {
  low: "bg-green-500/20 text-green-400",
  moderate: "bg-yellow-500/20 text-yellow-400",
  high: "bg-destructive/20 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  decided: "bg-accent/20 text-accent-foreground",
  flagged: "bg-destructive/20 text-destructive",
  escalated: "bg-yellow-500/20 text-yellow-400",
};

export default function AgentRouting() {
  const [selectedDecision, setSelectedDecision] = useState<typeof mockDecisions[0] | null>(null);
  const [activeTab, setActiveTab] = useState("decisions");

  const total = mockDecisions.length;
  const flagged = mockDecisions.filter(d => d.status === "flagged").length;
  const highRisk = mockDecisions.filter(d => d.risk_posture === "high").length;
  const avgConfidence = Math.round((mockDecisions.reduce((s, d) => s + d.confidence_score, 0) / total) * 100);
  const fallbackRate = Math.round((mockDecisions.filter(d => d.fallback_count === 0).length / total) * 100);

  return (
    <AppShell>
      <div className="space-y-6">
            <PageGuidanceShell pageKey="routing" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agent Routing & Arbitration</h1>
              <p className="text-sm text-muted-foreground mt-1">Context-aware capability routing decisions with explainability, fallback paths, and governance audit.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ArrowRightLeft className="h-3.5 w-3.5" /> Total Decisions</div>
                  <div className="text-2xl font-bold text-foreground">{total}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="h-3.5 w-3.5" /> Avg Confidence</div>
                  <div className="text-2xl font-bold text-foreground">{avgConfidence}%</div>
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
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Flag className="h-3.5 w-3.5" /> Flagged</div>
                  <div className="text-2xl font-bold text-destructive">{flagged}</div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingDown className="h-3.5 w-3.5" /> No Fallback</div>
                  <div className="text-2xl font-bold text-foreground">{fallbackRate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="decisions">Routing Decisions</TabsTrigger>
                <TabsTrigger value="patterns">Failure Patterns</TabsTrigger>
              </TabsList>

              <TabsContent value="decisions" className="space-y-3 mt-4">
                {mockDecisions.map((d) => (
                  <Card key={d.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedDecision(d)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground flex items-center gap-2">
                            <Route className="h-4 w-4 text-muted-foreground" />
                            {d.chosen_capability}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{d.pipeline_stage}</Badge>
                            <Badge variant="outline" className="text-xs">{d.task_type}</Badge>
                            <Badge className={statusColors[d.status]}>{d.status}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Confidence</div>
                            <div className="text-sm font-semibold text-foreground">{(d.confidence_score * 100).toFixed(0)}%</div>
                          </div>
                          <Badge className={riskColors[d.risk_posture]}>{d.risk_posture}</Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{d.routing_reason}</p>
                      {d.fallback_count > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                          <GitBranch className="h-3 w-3" /> {d.fallback_count} fallback path{d.fallback_count > 1 ? "s" : ""} available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="patterns" className="mt-4">
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Failure Concentration by Routing Path</h3>
                    <div className="space-y-2">
                      {[
                        { stage: "validating / static_analysis", rate: 45 },
                        { stage: "repairing / build_repair", rate: 22 },
                        { stage: "generating_ui / code_generation", rate: 8 },
                      ].map((p) => (
                        <div key={p.stage} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{p.stage}</span>
                            <span className="text-foreground">{p.rate}% failure</span>
                          </div>
                          <Progress value={p.rate} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

          {/* Detail Drawer */}
          <Sheet open={!!selectedDecision} onOpenChange={() => setSelectedDecision(null)}>
            <SheetContent className="w-full sm:max-w-lg bg-background border-border">
              <SheetHeader>
                <SheetTitle className="text-foreground">Routing Decision Detail</SheetTitle>
                <SheetDescription className="text-muted-foreground">Why this agent/capability was selected, alternatives considered, and governance posture.</SheetDescription>
              </SheetHeader>
              {selectedDecision && (
                <ScrollArea className="h-[calc(100vh-10rem)] mt-4">
                  <div className="space-y-4 pr-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Chosen Capability</h4>
                      <p className="text-sm text-foreground">{selectedDecision.chosen_capability}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{selectedDecision.pipeline_stage}</Badge>
                        <Badge variant="outline" className="text-xs">{selectedDecision.task_type}</Badge>
                      </div>
                    </div>
                    <Separator className="bg-border" />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Confidence</span>
                        <p className="text-lg font-bold text-foreground">{(selectedDecision.confidence_score * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Risk Posture</span>
                        <Badge className={`block mt-1 w-fit ${riskColors[selectedDecision.risk_posture]}`}>{selectedDecision.risk_posture}</Badge>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Fallback Paths</span>
                        <p className="text-sm text-foreground">{selectedDecision.fallback_count}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Status</span>
                        <Badge className={`block mt-1 w-fit ${statusColors[selectedDecision.status]}`}>{selectedDecision.status}</Badge>
                      </div>
                    </div>
                    <Separator className="bg-border" />

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Routing Reason</h4>
                      <p className="text-sm text-muted-foreground">{selectedDecision.routing_reason}</p>
                    </div>
                    <Separator className="bg-border" />

                    {/* Candidate comparison */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Candidate Comparison</h4>
                      <div className="space-y-2">
                        {mockCandidates.map((c, i) => (
                          <div key={i} className={`p-2 rounded border text-xs ${c.selected ? "border-primary/40 bg-primary/5" : "border-border/50"}`}>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-foreground flex items-center gap-1">
                                {c.selected && <CheckCircle2 className="h-3 w-3 text-primary" />}
                                {c.capability_key}
                              </span>
                              <span className="text-muted-foreground">
                                suit: {c.suitability_score} / risk: {c.risk_score}
                              </span>
                            </div>
                            {c.rejection_reason && <p className="text-muted-foreground mt-1">{c.rejection_reason}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator className="bg-border" />

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Governance</h4>
                      <p className="text-xs text-muted-foreground">Routing decisions are auditable and bounded. No autonomous architecture mutation. Human review required for structural changes.</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="destructive" className="text-xs"><Flag className="h-3 w-3 mr-1" /> Flag Bad Route</Button>
                      <Button size="sm" variant="outline" className="text-xs"><GitBranch className="h-3 w-3 mr-1" /> Recommend Fallback</Button>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </SheetContent>
          </Sheet>
      </div>
    </AppShell>
  );
}

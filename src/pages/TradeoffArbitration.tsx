import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Scale, ShieldAlert, ArrowRightLeft, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, RotateCcw, Eye, TrendingUp, TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──
interface Overview {
  constitutions: number;
  dimensions: number;
  active_subjects: number;
  open_events: number;
  active_recommendations: number;
}

interface Dimension {
  id: string;
  dimension_code: string;
  dimension_name: string;
  dimension_type: string;
  description: string;
}

interface ArbitrationEvent {
  id: string;
  arbitration_type: string;
  severity: string;
  affected_dimensions: string[];
  event_summary: string;
  created_at: string;
  tradeoff_subjects?: { title: string; subject_type: string; domain: string };
}

interface Recommendation {
  id: string;
  recommendation_type: string;
  recommendation_summary: string;
  preserved_values: string[];
  sacrificed_values: string[];
  rationale: string;
  tradeoff_subjects?: { title: string; subject_type: string; domain: string };
}

interface EvalResult {
  evaluated_subjects: number;
  events_generated: number;
  recommendations_generated: number;
  evaluations: Array<{
    subject: string;
    net_posture: string;
    risk_level: string;
    reversibility: string;
    gains: number;
    sacrifices: number;
  }>;
  explanations: Array<{
    subject_title: string;
    net_posture: string;
    risk_level: string;
    reversibility_label: string;
    gains_summary: string;
    sacrifices_summary: string;
    institutional_advisory: string;
  }>;
}

// ── Helpers ──
function invoke(action: string, orgId: string, extra?: Record<string, unknown>) {
  return supabase.functions.invoke("institutional-tradeoff-arbitration-system", {
    body: { action, organization_id: orgId, ...extra },
  });
}

const riskColor: Record<string, string> = {
  acceptable: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  elevated: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  unacceptable: "bg-destructive/20 text-destructive border-destructive/30",
};

const postureColor: Record<string, string> = {
  net_positive: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  balanced: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  net_sacrifice: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  hidden_sacrifice: "bg-destructive/20 text-destructive border-destructive/30",
};

// ── Page ──
export default function TradeoffArbitration() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const [tab, setTab] = useState("dashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [events, setEvents] = useState<ArbitrationEvent[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    try {
      const [ov, dim, ev, rec] = await Promise.all([
        invoke("overview", orgId),
        invoke("dimensions", orgId),
        invoke("arbitration_events", orgId),
        invoke("recommendations", orgId),
      ]);
      if (ov.data) setOverview(ov.data);
      if (dim.data?.dimensions) setDimensions(dim.data.dimensions);
      if (ev.data?.events) setEvents(ev.data.events);
      if (rec.data?.recommendations) setRecommendations(rec.data.recommendations);
    } catch { toast.error("Failed to load tradeoff data"); }
    setLoading(false);
  }

  async function runEvaluation() {
    if (!orgId) return;
    setEvaluating(true);
    try {
      const { data, error } = await invoke("evaluate", orgId);
      if (error) throw error;
      setEvalResult(data);
      toast.success(`Evaluated ${data.evaluated_subjects} subjects`);
      load();
    } catch { toast.error("Evaluation failed"); }
    setEvaluating(false);
  }

  useEffect(() => { load(); }, [orgId]);

  const Skel = () => <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" /> Institutional Tradeoff Arbitration
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Make sacrifices visible. Govern what is gained and what is given up.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={runEvaluation} disabled={evaluating || !orgId}>
              <ArrowRightLeft className={`h-4 w-4 mr-1 ${evaluating ? "animate-spin" : ""}`} />
              {evaluating ? "Evaluating…" : "Run Arbitration"}
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="matrix">Gain / Sacrifice</TabsTrigger>
            <TabsTrigger value="events">Arbitration Events</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard" className="space-y-4">
            {loading ? <Skel /> : (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Constitutions", val: overview?.constitutions ?? 0, icon: Scale },
                    { label: "Dimensions", val: overview?.dimensions ?? 0, icon: ArrowRightLeft },
                    { label: "Active Subjects", val: overview?.active_subjects ?? 0, icon: Eye },
                    { label: "Open Events", val: overview?.open_events ?? 0, icon: ShieldAlert },
                    { label: "Recommendations", val: overview?.active_recommendations ?? 0, icon: CheckCircle2 },
                  ].map((c) => (
                    <Card key={c.label} className="border-border/50">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{c.label}</span>
                          <c.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold mt-1">{c.val}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Evaluation results */}
                {evalResult && (
                  <Card className="border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Latest Arbitration Results</CardTitle>
                      <CardDescription>
                        {evalResult.evaluated_subjects} subjects · {evalResult.events_generated} events · {evalResult.recommendations_generated} recommendations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-3">
                          {evalResult.explanations?.map((ex, i) => (
                            <Card key={i} className="border-border/40">
                              <CardContent className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{ex.subject_title}</span>
                                  <div className="flex gap-1.5">
                                    <Badge variant="outline" className={postureColor[ex.net_posture] ?? ""}>{ex.net_posture}</Badge>
                                    <Badge variant="outline" className={riskColor[ex.risk_level] ?? ""}>{ex.risk_level}</Badge>
                                    <Badge variant="outline" className="text-xs">
                                      <RotateCcw className="h-3 w-3 mr-1" />{ex.reversibility_label}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{ex.gains_summary}</p>
                                <p className="text-xs text-muted-foreground">{ex.sacrifices_summary}</p>
                                <p className="text-xs font-medium">{ex.institutional_advisory}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ── GAIN / SACRIFICE MATRIX ── */}
          <TabsContent value="matrix" className="space-y-4">
            {evalResult?.evaluations && evalResult.evaluations.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" /> Gain vs Sacrifice Matrix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Posture</TableHead>
                          <TableHead className="text-center">Gains</TableHead>
                          <TableHead className="text-center">Sacrifices</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead>Reversibility</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evalResult.evaluations.map((ev, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{ev.subject}</TableCell>
                            <TableCell><Badge variant="outline" className={postureColor[ev.net_posture] ?? ""}>{ev.net_posture}</Badge></TableCell>
                            <TableCell className="text-center">
                              <span className="flex items-center justify-center gap-1 text-emerald-400">
                                <TrendingUp className="h-3 w-3" />{ev.gains}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="flex items-center justify-center gap-1 text-destructive">
                                <TrendingDown className="h-3 w-3" />{ev.sacrifices}
                              </span>
                            </TableCell>
                            <TableCell><Badge variant="outline" className={riskColor[ev.risk_level] ?? ""}>{ev.risk_level}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{ev.reversibility}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Run an arbitration evaluation to see the gain/sacrifice matrix.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── ARBITRATION EVENTS ── */}
          <TabsContent value="events" className="space-y-4">
            {events.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No open arbitration events.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {events.map((ev) => (
                    <Card key={ev.id} className="border-border/40">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-medium text-sm">{ev.tradeoff_subjects?.title ?? "Unknown"}</span>
                            <div className="flex gap-1.5 mt-1">
                              <Badge variant="outline" className="text-xs">{ev.tradeoff_subjects?.subject_type}</Badge>
                              <Badge variant="outline" className="text-xs">{ev.tradeoff_subjects?.domain}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className={riskColor[ev.severity] ?? ""}>{ev.severity}</Badge>
                            <Badge variant="outline" className="text-xs">{ev.arbitration_type}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{ev.event_summary}</p>
                        {ev.affected_dimensions?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {ev.affected_dimensions.map((d: string) => (
                              <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ── RECOMMENDATIONS ── */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No active recommendations.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="border-border/40">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-sm">{rec.tradeoff_subjects?.title ?? "Unknown"}</span>
                          <Badge variant="outline" className="text-xs">{rec.recommendation_type}</Badge>
                        </div>
                        <p className="text-sm">{rec.recommendation_summary}</p>
                        <p className="text-xs text-muted-foreground">{rec.rationale}</p>
                        <div className="flex gap-4 text-xs mt-1">
                          {rec.preserved_values?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-emerald-400" />
                              <span className="text-muted-foreground">Preserved: {rec.preserved_values.join(", ")}</span>
                            </div>
                          )}
                          {rec.sacrificed_values?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3 text-destructive" />
                              <span className="text-muted-foreground">Sacrificed: {rec.sacrificed_values.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ── DIMENSIONS ── */}
          <TabsContent value="dimensions" className="space-y-4">
            {dimensions.length === 0 ? <Skel /> : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Active Tradeoff Dimensions</CardTitle>
                  <CardDescription>The institutional values against which tradeoffs are evaluated.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dimensions.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.dimension_code}</TableCell>
                          <TableCell className="font-medium text-sm">{d.dimension_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{d.dimension_type}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{d.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

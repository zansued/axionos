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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Compass, Layers, AlertTriangle, ShieldAlert, Target, ArrowRightLeft,
  ChevronDown, RefreshCw, Info, TrendingUp, Clock, Shield,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──
interface Overview {
  constitutions: number;
  horizons: number;
  active_subjects: number;
  open_conflicts: number;
  active_recommendations: number;
}

interface Horizon {
  id: string;
  horizon_code: string;
  horizon_name: string;
  horizon_type: string;
  default_timeframe: string;
  description: string;
}

interface Subject {
  id: string;
  subject_code: string;
  subject_type: string;
  domain: string;
  title: string;
  summary: string;
}

interface Conflict {
  id: string;
  conflict_type: string;
  severity: string;
  affected_horizons: string[];
  event_summary: string;
  created_at: string;
  strategic_alignment_subjects?: { title: string; subject_type: string; domain: string };
}

interface Recommendation {
  id: string;
  recommendation_type: string;
  target_horizon: string;
  recommendation_summary: string;
  rationale: string;
  tradeoff_note: string;
  priority_level: string;
  strategic_alignment_subjects?: { title: string; subject_type: string; domain: string };
}

interface EvalResult {
  evaluated_subjects: number;
  conflicts_detected: number;
  recommendations_generated: number;
  evaluations: Array<{
    subject: string;
    posture: string;
    composite_alignment: number;
    composite_tension: number;
  }>;
  explanations: Array<{
    subject_title: string;
    overall_posture: string;
    composite_alignment: number;
    composite_tension: number;
    horizon_breakdown: Array<{
      horizon_type: string;
      alignment: number;
      tension: number;
      deferred_risk: number;
      support_level: string;
      narrative: string;
    }>;
    deferred_risk_summary: string;
    conflict_summary: string;
    institutional_health_narrative: string;
  }>;
}

// ── Helpers ──
async function callEngine(orgId: string, action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke("multi-horizon-strategic-alignment-engine", {
    body: { action, organization_id: orgId, ...extra },
  });
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const severityColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  moderate: "bg-accent/20 text-accent-foreground",
  high: "bg-destructive/20 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const postureColor: Record<string, string> = {
  balanced: "bg-primary/20 text-primary",
  short_biased: "bg-accent/20 text-accent-foreground",
  long_unsupported: "bg-secondary text-secondary-foreground",
  mission_eroding: "bg-destructive text-destructive-foreground",
  conflicted: "bg-destructive/20 text-destructive",
};

const priorityColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/20 text-accent-foreground",
  high: "bg-destructive/20 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const horizonIcons: Record<string, typeof Clock> = {
  short_term: Clock,
  medium_term: TrendingUp,
  long_term: Target,
  mission_continuity: Shield,
};

// ── Dashboard ──
function MultiHorizonDashboard({ overview, onEvaluate, evaluating }: {
  overview: Overview | null;
  onEvaluate: () => void;
  evaluating: boolean;
}) {
  if (!overview) return <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  const stats = [
    { label: "Constitutions", value: overview.constitutions, icon: Compass },
    { label: "Horizons", value: overview.horizons, icon: Layers },
    { label: "Active Subjects", value: overview.active_subjects, icon: Target },
    { label: "Open Conflicts", value: overview.open_conflicts, icon: AlertTriangle },
    { label: "Recommendations", value: overview.active_recommendations, icon: ArrowRightLeft },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/50 bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={onEvaluate} disabled={evaluating} size="sm" variant="outline" className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? "animate-spin" : ""}`} />
          {evaluating ? "Evaluating…" : "Run Multi-Horizon Evaluation"}
        </Button>
      </div>
    </div>
  );
}

// ── Alignment Matrix ──
function HorizonAlignmentMatrix({ evaluations }: { evaluations: EvalResult["explanations"] }) {
  if (evaluations.length === 0) {
    return (
      <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground">
        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No evaluations yet. Run an evaluation to see the alignment matrix.</p>
      </CardContent></Card>
    );
  }

  const horizonTypes = ["short_term", "medium_term", "long_term", "mission_continuity"];
  const horizonLabels: Record<string, string> = { short_term: "Short", medium_term: "Medium", long_term: "Long", mission_continuity: "Mission" };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Horizon Alignment Matrix</CardTitle>
        <CardDescription>Subject × Horizon alignment and tension scores</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Subject</TableHead>
                <TableHead className="text-center w-[80px]">Posture</TableHead>
                {horizonTypes.map((h) => (
                  <TableHead key={h} className="text-center w-[120px]">{horizonLabels[h]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((ev, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{ev.subject_title}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] ${postureColor[ev.overall_posture] ?? "bg-muted text-muted-foreground"}`}>
                      {ev.overall_posture.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  {horizonTypes.map((ht) => {
                    const hb = ev.horizon_breakdown.find((b) => b.horizon_type === ht);
                    if (!hb) return <TableCell key={ht} className="text-center text-muted-foreground">—</TableCell>;
                    const pct = Math.round(hb.alignment * 100);
                    const tensionPct = Math.round(hb.tension * 100);
                    return (
                      <TableCell key={ht} className="text-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 justify-center">
                            <Progress value={pct} className="h-1.5 w-12" />
                            <span className="text-[10px] text-foreground font-mono">{pct}%</span>
                          </div>
                          {tensionPct > 15 && (
                            <span className="text-[9px] text-destructive">⚡ {tensionPct}%</span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Temporal Conflict Panel ──
function TemporalConflictPanel({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Temporal Conflicts</CardTitle>
        <CardDescription>Events where one horizon is harming another</CardDescription>
      </CardHeader>
      <CardContent>
        {conflicts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No open conflicts.</p>
        ) : (
          <div className="space-y-2">
            {conflicts.map((c) => (
              <div key={c.id} className="border border-border/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.strategic_alignment_subjects?.title ?? "Unknown"}</span>
                  <Badge className={`text-[10px] ${severityColor[c.severity] ?? ""}`}>{c.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.event_summary}</p>
                <div className="flex gap-1 flex-wrap">
                  {(c.affected_horizons ?? []).map((h) => (
                    <Badge key={h} variant="outline" className="text-[9px]">{h.replace(/_/g, " ")}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Deferred Risk Panel ──
function DeferredRiskPanel({ evaluations }: { evaluations: EvalResult["explanations"] }) {
  const riskySubjects = evaluations.filter((ev) =>
    ev.horizon_breakdown.some((h) => h.deferred_risk > 0.3)
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Deferred Risk</CardTitle>
        <CardDescription>Actions creating future debt or erosion</CardDescription>
      </CardHeader>
      <CardContent>
        {riskySubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No significant deferred risk detected.</p>
        ) : (
          <div className="space-y-3">
            {riskySubjects.map((ev, i) => (
              <Collapsible key={i}>
                <div className="border border-border/50 rounded-lg p-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{ev.subject_title}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">{ev.deferred_risk_summary}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {ev.horizon_breakdown.filter((h) => h.deferred_risk > 0.2).map((h) => (
                        <div key={h.horizon_type} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-16">{h.horizon_type.replace(/_/g, " ")}</span>
                          <Progress value={h.deferred_risk * 100} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-mono">{Math.round(h.deferred_risk * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Explain Card ──
function HorizonExplainCard({ explanation }: { explanation: EvalResult["explanations"][0] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{explanation.subject_title}</CardTitle>
          <Badge className={`text-[10px] ${postureColor[explanation.overall_posture] ?? ""}`}>
            {explanation.overall_posture.replace(/_/g, " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{explanation.institutional_health_narrative}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Alignment</p>
            <div className="flex items-center gap-2">
              <Progress value={explanation.composite_alignment * 100} className="h-2 flex-1" />
              <span className="text-xs font-mono">{Math.round(explanation.composite_alignment * 100)}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Tension</p>
            <div className="flex items-center gap-2">
              <Progress value={explanation.composite_tension * 100} className="h-2 flex-1" />
              <span className="text-xs font-mono">{Math.round(explanation.composite_tension * 100)}%</span>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          {explanation.horizon_breakdown.map((h) => {
            const Icon = horizonIcons[h.horizon_type] ?? Layers;
            return (
              <div key={h.horizon_type} className="flex items-start gap-2 text-xs">
                <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{h.narrative}</span>
              </div>
            );
          })}
        </div>
        {explanation.conflict_summary !== "No active temporal conflicts detected." && (
          <p className="text-[10px] text-destructive">{explanation.conflict_summary}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Recommendations Panel ──
function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Horizon Recommendations</CardTitle>
        <CardDescription>Advisory actions to rebalance strategic alignment</CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active recommendations.</p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((r) => (
              <div key={r.id} className="border border-border/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.recommendation_summary}</span>
                  <Badge className={`text-[10px] ${priorityColor[r.priority_level] ?? ""}`}>{r.priority_level}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.rationale}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px]">→ {r.target_horizon.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="text-[9px]">{r.recommendation_type.replace(/_/g, " ")}</Badge>
                </div>
                {r.tradeoff_note && (
                  <p className="text-[10px] text-accent-foreground/70 italic">⚖ {r.tradeoff_note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
export default function MultiHorizonAlignment() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const [overview, setOverview] = useState<Overview | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    loadData();
  }, [orgId]);

  async function loadData() {
    if (!orgId) return;
    setLoading(true);
    try {
      const [ov, co, re] = await Promise.all([
        callEngine(orgId, "overview"),
        callEngine(orgId, "conflicts"),
        callEngine(orgId, "recommendations"),
      ]);
      setOverview(ov);
      setConflicts(co.conflicts ?? []);
      setRecommendations(re.recommendations ?? []);

      // Load persisted evaluations from DB to survive page refresh
      const { data: evals } = await supabase
        .from("horizon_alignment_evaluations")
        .select("*, strategic_alignment_subjects(title, subject_type, domain), strategic_horizons(horizon_type)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (evals && evals.length > 0) {
        // Group by subject to reconstruct explanations
        const bySubject = new Map<string, typeof evals>();
        for (const ev of evals) {
          const sid = ev.subject_id;
          if (!bySubject.has(sid)) bySubject.set(sid, []);
          bySubject.get(sid)!.push(ev);
        }

        const explanations: EvalResult["explanations"] = [];
        for (const [, group] of bySubject) {
          const first = group[0];
          const subjectTitle = (first as any).strategic_alignment_subjects?.title ?? "Unknown";
          const breakdown = group.map((g: any) => ({
            horizon_type: g.strategic_horizons?.horizon_type ?? "unknown",
            alignment: Number(g.alignment_score),
            tension: Number(g.tension_score),
            deferred_risk: Number(g.deferred_risk_score),
            support_level: g.support_level,
            narrative: `${g.strategic_horizons?.horizon_type ?? "Horizon"}: ${g.support_level} (${Math.round(Number(g.alignment_score) * 100)}%)`,
          }));

          const compositeAlignment = breakdown.reduce((a, b) => a + b.alignment, 0) / breakdown.length;
          const compositeTension = breakdown.reduce((a, b) => a + b.tension, 0) / breakdown.length;
          const posture = first.evaluation_summary?.replace("Posture: ", "") ?? "balanced";

          explanations.push({
            subject_title: subjectTitle,
            overall_posture: posture,
            composite_alignment: compositeAlignment,
            composite_tension: compositeTension,
            horizon_breakdown: breakdown,
            deferred_risk_summary: breakdown.some(b => b.deferred_risk > 0.3)
              ? `Deferred risk detected in ${breakdown.filter(b => b.deferred_risk > 0.3).map(b => b.horizon_type).join(", ")}.`
              : "No significant deferred risk.",
            conflict_summary: (co.conflicts?.length ?? 0) > 0
              ? `${co.conflicts.length} active conflict(s).`
              : "No active temporal conflicts detected.",
            institutional_health_narrative: `Subject "${subjectTitle}" has posture: ${posture.replace(/_/g, " ")}.`,
          });
        }

        setEvalResult({
          evaluated_subjects: bySubject.size,
          conflicts_detected: co.conflicts?.length ?? 0,
          recommendations_generated: re.recommendations?.length ?? 0,
          evaluations: explanations.map(e => ({
            subject: e.subject_title,
            posture: e.overall_posture,
            composite_alignment: e.composite_alignment,
            composite_tension: e.composite_tension,
          })),
          explanations,
        });
      }
    } catch (err: any) {
      console.error("Failed to load horizon data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEvaluate() {
    if (!orgId) return;
    setEvaluating(true);
    try {
      // Ensure horizons are seeded
      await callEngine(orgId, "horizons");
      const result = await callEngine(orgId, "evaluate");
      setEvalResult(result);
      toast.success(`Evaluated ${result.evaluated_subjects} subjects. ${result.conflicts_detected} conflicts, ${result.recommendations_generated} recommendations.`);
      await loadData();
    } catch (err: any) {
      toast.error("Evaluation failed: " + (err.message ?? "Unknown error"));
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
        {/* Page Guidance */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <Compass className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Multi-Horizon Strategic Alignment</p>
              <p className="text-xs text-muted-foreground">
                This engine evaluates whether operational activity aligns with short, medium, long-term, and mission continuity horizons.
                It detects when short-term efficiency undermines long-term strategy, when mission continuity is under-supported, and where temporal tradeoffs create institutional debt.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="matrix">Alignment Matrix</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="risk">Deferred Risk</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="explain">Explain</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <MultiHorizonDashboard overview={overview} onEvaluate={handleEvaluate} evaluating={evaluating} />
          </TabsContent>

          <TabsContent value="matrix">
            <HorizonAlignmentMatrix evaluations={evalResult?.explanations ?? []} />
          </TabsContent>

          <TabsContent value="conflicts">
            <TemporalConflictPanel conflicts={conflicts} />
          </TabsContent>

          <TabsContent value="risk">
            <DeferredRiskPanel evaluations={evalResult?.explanations ?? []} />
          </TabsContent>

          <TabsContent value="recommendations">
            <RecommendationsPanel recommendations={recommendations} />
          </TabsContent>

          <TabsContent value="explain">
            <div className="space-y-3">
              {evalResult?.explanations && evalResult.explanations.length > 0 ? (
                evalResult.explanations.map((ex, i) => (
                  <HorizonExplainCard key={i} explanation={ex} />
                ))
              ) : (
                <Card className="border-border/50">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Run an evaluation to see horizon alignment explanations.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

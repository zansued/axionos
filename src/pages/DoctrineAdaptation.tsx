import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";

import {
  Shield,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Layers,
  FileText,
  ArrowRightLeft,
} from "lucide-react";

interface OverviewStats {
  total_doctrines: number;
  active_doctrines: number;
  core_doctrines: number;
  total_contexts: number;
  active_contexts: number;
  total_rules: number;
  active_rules: number;
  total_evaluations: number;
  average_compatibility: number;
  result_distribution: {
    compatible: number;
    adapted: number;
    conflicting: number;
    blocked: number;
  };
  total_drift_events: number;
  open_drifts: number;
  drift_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface DriftEvent {
  id: string;
  doctrine_id: string;
  context_profile_id: string;
  drift_type: string;
  severity: string;
  drift_summary: string;
  evidence: Record<string, unknown>;
  resolution_status: string;
  created_at: string;
}

interface Evaluation {
  id: string;
  doctrine_id: string;
  context_profile_id: string;
  evaluation_result: string;
  compatibility_score: number;
  drift_risk_score: number;
  adaptation_summary: string;
  created_at: string;
}

const resultColors: Record<string, string> = {
  compatible: "bg-green-500/10 text-green-400 border-green-500/20",
  adapted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  conflicting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  blocked: "bg-red-500/10 text-red-400 border-red-500/20",
};

const severityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function DoctrineAdaptation() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEval, setSelectedEval] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const orgId = currentOrg?.id;

  useEffect(() => {
    if (!orgId) return;
    loadData();
  }, [orgId]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, evalsRes, driftsRes] = await Promise.all([
        supabase.functions.invoke("cross-context-doctrine-adaptation", {
          body: { action: "overview", organization_id: orgId },
        }),
        supabase
          .from("doctrine_adaptation_evaluations")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("doctrine_drift_events")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (statsRes.data) setStats(statsRes.data as OverviewStats);
      if (evalsRes.data) setEvaluations(evalsRes.data as unknown as Evaluation[]);
      if (driftsRes.data) setDriftEvents(driftsRes.data as unknown as DriftEvent[]);
    } catch (e) {
      console.error("Failed to load doctrine adaptation data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(evalId: string) {
    const { data } = await supabase.functions.invoke("cross-context-doctrine-adaptation", {
      body: { action: "explain", organization_id: orgId, evaluation_id: evalId },
    });
    if (data) {
      setSelectedEval(data);
      setDetailOpen(true);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PageGuidanceShell pageKey="doctrine-adaptation" />
      <div className="min-h-screen bg-background p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Doctrine Adaptation</h1>
            <p className="text-sm text-muted-foreground">
              Cross-context doctrine adaptation, evaluation matrix, and drift governance
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold text-foreground">{stats.active_doctrines}</div>
                <div className="text-xs text-muted-foreground">Active Doctrines</div>
                <div className="text-xs text-muted-foreground mt-1">{stats.core_doctrines} core</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <Layers className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                <div className="text-2xl font-bold text-foreground">{stats.active_contexts}</div>
                <div className="text-xs text-muted-foreground">Active Contexts</div>
                <div className="text-xs text-muted-foreground mt-1">{stats.active_rules} rules</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-400" />
                <div className="text-2xl font-bold text-foreground">
                  {(stats.average_compatibility * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Compatibility</div>
                <div className="text-xs text-muted-foreground mt-1">{stats.total_evaluations} evals</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-400" />
                <div className="text-2xl font-bold text-foreground">{stats.open_drifts}</div>
                <div className="text-xs text-muted-foreground">Open Drifts</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.drift_by_severity.critical + stats.drift_by_severity.high} high/critical
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Result Distribution */}
        {stats && (
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Evaluation Result Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {(["compatible", "adapted", "conflicting", "blocked"] as const).map((key) => (
                  <div key={key} className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {stats.result_distribution[key]}
                    </div>
                    <Badge variant="outline" className={resultColors[key]}>
                      {key}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="evaluations">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="evaluations">
              <FileText className="h-4 w-4 mr-1" />
              Evaluations
            </TabsTrigger>
            <TabsTrigger value="drift">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Drift Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluations">
            <Card className="border-border/50 bg-card">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {evaluations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No adaptation evaluations recorded yet.
                    </p>
                  ) : (
                    evaluations.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => openDetail(e.id)}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {e.adaptation_summary || "Evaluation"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Compatibility: {(e.compatibility_score * 100).toFixed(0)}% · Drift Risk:{" "}
                            {(e.drift_risk_score * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={resultColors[e.evaluation_result] || ""}>
                            {e.evaluation_result}
                          </Badge>
                          <Progress
                            value={e.compatibility_score * 100}
                            className="w-16 h-2"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="drift">
            <Card className="border-border/50 bg-card">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {driftEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No doctrine drift events detected.
                    </p>
                  ) : (
                    driftEvents.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={severityColors[d.severity] || ""}>
                              {d.severity}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {d.drift_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {d.drift_summary}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            d.resolution_status === "open"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              : "bg-green-500/10 text-green-400 border-green-500/20"
                          }
                        >
                          {d.resolution_status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Drawer */}
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px] bg-card border-border">
            <SheetHeader>
              <SheetTitle className="text-foreground">Adaptation Explanation</SheetTitle>
            </SheetHeader>
            {selectedEval && (
              <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                <div className="space-y-4 pr-4">
                  {/* Evaluation Overview */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Evaluation Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge
                        variant="outline"
                        className={resultColors[selectedEval.evaluation?.evaluation_result] || ""}
                      >
                        {selectedEval.evaluation?.evaluation_result}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {selectedEval.evaluation?.adaptation_summary}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Compatibility:</span>{" "}
                          <span className="text-foreground font-medium">
                            {((selectedEval.evaluation?.compatibility_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Drift Risk:</span>{" "}
                          <span className="text-foreground font-medium">
                            {((selectedEval.evaluation?.drift_risk_score || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Explanation */}
                  {selectedEval.explanation && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Explanation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div>
                          <div className="font-medium text-foreground mb-1">Core Principle</div>
                          <div className="text-muted-foreground">{selectedEval.explanation.core_principle}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground mb-1">Contextual Adaptation</div>
                          <div className="text-muted-foreground">{selectedEval.explanation.contextual_adaptation}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground mb-1">Institutional Reason</div>
                          <div className="text-muted-foreground">{selectedEval.explanation.institutional_reason}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground mb-1">Preserved Boundary</div>
                          <div className="text-muted-foreground">{selectedEval.explanation.preserved_boundary}</div>
                        </div>
                        {selectedEval.explanation.drift_warning && (
                          <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                            <span className="text-yellow-400 text-xs">{selectedEval.explanation.drift_warning}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Doctrine Info */}
                  {selectedEval.doctrine && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Doctrine</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <div className="font-medium text-foreground">{selectedEval.doctrine.doctrine_name}</div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{selectedEval.doctrine.doctrine_scope}</Badge>
                          <Badge variant="outline">{selectedEval.doctrine.immutability_level}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Context Info */}
                  {selectedEval.context && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Context Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <div className="font-medium text-foreground">{selectedEval.context.context_name}</div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{selectedEval.context.environment_type}</span>
                          <span>·</span>
                          <span>{selectedEval.context.operational_domain}</span>
                          <span>·</span>
                          <span>{selectedEval.context.regulatory_sensitivity}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Applied Rules */}
                  {selectedEval.rules && selectedEval.rules.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Applied Rules ({selectedEval.rules.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedEval.rules.map((r: any) => (
                          <div key={r.id} className="p-2 rounded border border-border/30 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{r.adaptation_type}</Badge>
                              {r.requires_review && (
                                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                  review required
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground">{r.adaptation_rule_text}</div>
                            {r.justification && (
                              <div className="text-muted-foreground mt-1 italic">↳ {r.justification}</div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* What is NOT automated */}
                  <Card className="border-border/50 border-yellow-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        What is NOT Automated
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-1">
                      <p>• Core doctrine mutation is never automated</p>
                      <p>• Structural governance overrides require human approval</p>
                      <p>• Immutable doctrine flexibilization is blocked by boundary guard</p>
                      <p>• Cross-tenant doctrine sharing without explicit federation is forbidden</p>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

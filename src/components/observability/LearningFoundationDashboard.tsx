import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";
import {
  useLearningOverview,
  useLearningRecommendations,
  useLearningStrategies,
  useLearningPredictions,
} from "@/hooks/useLearningDashboard";
import {
  Brain, TrendingUp, TrendingDown, Lightbulb, BarChart3,
  Loader2, RefreshCw, Zap, Target, AlertTriangle, Shield,
  Wrench, Sparkles, Activity, Gauge,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  prompt_outcome: "Prompt",
  repair_outcome: "Reparo",
  prevention_outcome: "Prevenção",
  routing_outcome: "Roteamento",
  generation_outcome: "Geração",
};

const TYPE_COLORS: Record<string, string> = {
  prompt_outcome: "bg-blue-500/20 text-blue-400",
  repair_outcome: "bg-orange-500/20 text-orange-400",
  prevention_outcome: "bg-green-500/20 text-green-400",
  routing_outcome: "bg-purple-500/20 text-purple-400",
  generation_outcome: "bg-primary/20 text-primary",
};

const REC_ICONS: Record<string, any> = {
  PROMPT_OPTIMIZATION: Sparkles,
  STRATEGY_RANKING_ADJUSTMENT: Wrench,
  NEW_PREVENTION_RULE: Shield,
  PIPELINE_CONFIGURATION_HINT: Activity,
};

const REC_COLORS: Record<string, string> = {
  PROMPT_OPTIMIZATION: "bg-blue-500/20 text-blue-400",
  STRATEGY_RANKING_ADJUSTMENT: "bg-orange-500/20 text-orange-400",
  NEW_PREVENTION_RULE: "bg-green-500/20 text-green-400",
  PIPELINE_CONFIGURATION_HINT: "bg-purple-500/20 text-purple-400",
};

export function LearningFoundationDashboard() {
  const { currentOrg } = useOrg();
  const [generating, setGenerating] = useState(false);

  const { data: records = [], refetch: refetchRecords } = useQuery({
    queryKey: ["learning-records", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase
        .from("learning_records")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: overview, refetch: refetchOverview } = useLearningOverview(currentOrg?.id);
  const { data: recsData, refetch: refetchRecs } = useLearningRecommendations(currentOrg?.id);
  const { data: strategiesData } = useLearningStrategies(currentOrg?.id);
  const { data: predictionsData } = useLearningPredictions(currentOrg?.id);

  const recommendations = recsData?.recommendations || [];
  const strategies = strategiesData?.strategies || [];
  const predictions = predictionsData?.predictions || [];

  const handleRunAllEngines = async () => {
    if (!currentOrg) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      const body = { organization_id: currentOrg.id, time_window_days: 30 };

      // Run all engines sequentially
      await supabase.functions.invoke("learning-foundation-engine", { body, headers });
      await supabase.functions.invoke("prompt-outcome-analyzer", { body, headers });
      await supabase.functions.invoke("strategy-performance-engine", { body, headers });
      await supabase.functions.invoke("predictive-error-engine", { body, headers });
      await supabase.functions.invoke("repair-learning-engine", { body, headers });
      await supabase.functions.invoke("learning-recommendation-engine", { body, headers });

      // Refresh all data
      refetchRecords();
      refetchOverview();
      refetchRecs();
    } catch (e) {
      console.error("Learning engines error:", e);
    } finally {
      setGenerating(false);
    }
  };

  // Legacy aggregation for foundation tab
  const typeCounts: Record<string, number> = {};
  let avgSuccess = 0, avgFailure = 0, adjustmentCount = 0;
  records.forEach((r: any) => {
    typeCounts[r.learning_type] = (typeCounts[r.learning_type] || 0) + 1;
    avgSuccess += Number(r.success_signal || 0);
    avgFailure += Number(r.failure_signal || 0);
    if (r.recommended_adjustment) adjustmentCount++;
  });
  if (records.length > 0) { avgSuccess = Math.round(avgSuccess / records.length); avgFailure = Math.round(avgFailure / records.length); }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Learning Agents v1</h2>
          <Badge variant="outline" className="text-[10px]">Sprint 12</Badge>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRunAllEngines} disabled={generating}>
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Executar Análise Completa
        </Button>
      </div>

      {/* Overview KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <MiniStat icon={BarChart3} label="Learning Records" value={overview?.learning_records_count ?? records.length} />
        <MiniStat icon={Lightbulb} label="Recomendações" value={overview?.recommendations_count ?? 0} />
        <MiniStat icon={TrendingUp} label="Melhoria Reparo" value={`${overview?.repair_improvement_rate ?? 0}%`} />
        <MiniStat icon={Sparkles} label="Sucesso Prompt" value={`${overview?.prompt_success_trend ?? avgSuccess}%`} />
        <MiniStat icon={Gauge} label="Predição Erro" value={`${overview?.error_prediction_accuracy ?? 0}%`} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recommendations">
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="recommendations" className="text-xs gap-1"><Lightbulb className="h-3 w-3" /> Recomendações</TabsTrigger>
          <TabsTrigger value="strategies" className="text-xs gap-1"><Wrench className="h-3 w-3" /> Estratégias</TabsTrigger>
          <TabsTrigger value="predictions" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Predições</TabsTrigger>
          <TabsTrigger value="weights" className="text-xs gap-1"><Target className="h-3 w-3" /> Pesos</TabsTrigger>
          <TabsTrigger value="foundation" className="text-xs gap-1"><Brain className="h-3 w-3" /> Fundação</TabsTrigger>
        </TabsList>

        {/* RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="mt-4">
          {recommendations.length === 0 ? (
            <Card className="border-border/50"><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma recomendação ainda. Execute a análise completa.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec: any) => {
                const Icon = REC_ICONS[rec.recommendation_type] || Lightbulb;
                return (
                  <Card key={rec.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-md p-2 ${REC_COLORS[rec.recommendation_type] || "bg-muted"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${REC_COLORS[rec.recommendation_type]} text-[10px]`}>{rec.recommendation_type.replace(/_/g, " ")}</Badge>
                            <Badge variant="outline" className="text-[10px]">{rec.target_component}</Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">Confiança: {Math.round(Number(rec.confidence_score) * 100)}%</span>
                          </div>
                          <p className="text-sm text-foreground">{rec.description}</p>
                          {rec.expected_improvement && (
                            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" /> {rec.expected_improvement}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* STRATEGIES */}
        <TabsContent value="strategies" className="mt-4">
          {strategies.length === 0 ? (
            <Card className="border-border/50"><CardContent className="py-8 text-center text-sm text-muted-foreground">Sem métricas de estratégia.</CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {strategies.map((s: any) => (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{s.strategy_name}</span>
                      <Badge variant={Number(s.success_rate) >= 70 ? "default" : Number(s.success_rate) >= 40 ? "secondary" : "destructive"} className="text-[10px]">
                        {s.success_rate}% sucesso
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                      <span>Tipo: {s.error_type}</span>
                      <span>Runs: {s.runs_count}</span>
                      <span>Tempo: {Math.round(Number(s.avg_resolution_time))}ms</span>
                      <span>Recorrência: {s.error_recurrence_rate}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PREDICTIONS */}
        <TabsContent value="predictions" className="mt-4">
          {predictions.length === 0 ? (
            <Card className="border-border/50"><CardContent className="py-8 text-center text-sm text-muted-foreground">Sem padrões preditivos.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {predictions.map((p: any) => (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${Number(p.probability_score) >= 0.7 ? "text-destructive" : "text-yellow-400"}`} />
                        <span className="text-sm font-medium truncate max-w-[300px]">{p.error_signature}</span>
                      </div>
                      <Badge variant={Number(p.probability_score) >= 0.7 ? "destructive" : "secondary"} className="text-[10px]">
                        {Math.round(Number(p.probability_score) * 100)}% probabilidade
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                      <span>Estágio: {p.stage_name}</span>
                      <span>Observações: {p.observations_count}</span>
                    </div>
                    {p.recommended_prevention_rule && (
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <Shield className="h-3 w-3" /> {p.recommended_prevention_rule}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* WEIGHTS */}
        <TabsContent value="weights" className="mt-4">
          {(!overview?.recent_weight_adjustments || overview.recent_weight_adjustments.length === 0) ? (
            <Card className="border-border/50"><CardContent className="py-8 text-center text-sm text-muted-foreground">Sem ajustes de peso.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {overview.recent_weight_adjustments.map((w: any, i: number) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{w.strategy_name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{Number(w.previous_weight).toFixed(3)}</span>
                        <span>→</span>
                        <span className={Number(w.current_weight) > Number(w.previous_weight) ? "text-green-400" : "text-destructive"}>
                          {Number(w.current_weight).toFixed(3)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{w.adjustment_reason}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* FOUNDATION (legacy) */}
        <TabsContent value="foundation" className="mt-4 space-y-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <MiniStat icon={BarChart3} label="Total Records" value={records.length} />
            <MiniStat icon={TrendingUp} label="Média Sucesso" value={`${avgSuccess}%`} />
            <MiniStat icon={TrendingDown} label="Média Falha" value={`${avgFailure}%`} />
            <MiniStat icon={Zap} label="Tipos Únicos" value={Object.keys(typeCounts).length} />
          </div>
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Distribuição por Tipo</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(typeCounts).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <Badge key={type} className={`${TYPE_COLORS[type] || "bg-muted"} text-xs gap-1`}>{TYPE_LABELS[type] || type}: {count}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

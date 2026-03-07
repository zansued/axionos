import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, TrendingUp, TrendingDown, Lightbulb, BarChart3,
  Loader2, RefreshCw, Zap, Target, AlertTriangle,
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

export function LearningFoundationDashboard() {
  const { currentOrg } = useOrg();
  const [generating, setGenerating] = useState(false);

  const { data: records = [], refetch } = useQuery({
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

  const handleGenerate = async () => {
    if (!currentOrg) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke("learning-foundation-engine", {
        body: { organization_id: currentOrg.id, time_window: 30 },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      refetch();
    } catch (e) {
      console.error("Learning generation error:", e);
    } finally {
      setGenerating(false);
    }
  };

  // Aggregate stats
  const typeCounts: Record<string, number> = {};
  let avgSuccess = 0;
  let avgFailure = 0;
  let adjustmentCount = 0;

  records.forEach((r: any) => {
    typeCounts[r.learning_type] = (typeCounts[r.learning_type] || 0) + 1;
    avgSuccess += Number(r.success_signal || 0);
    avgFailure += Number(r.failure_signal || 0);
    if (r.recommended_adjustment) adjustmentCount++;
  });

  if (records.length > 0) {
    avgSuccess = Math.round(avgSuccess / records.length);
    avgFailure = Math.round(avgFailure / records.length);
  }

  const topSuccessful = [...records]
    .filter((r: any) => Number(r.success_signal) >= 80)
    .slice(0, 5);

  const topFailed = [...records]
    .filter((r: any) => Number(r.failure_signal) >= 60)
    .slice(0, 5);

  const adjustments = records
    .filter((r: any) => r.recommended_adjustment && Number(r.confidence_score) >= 0.6)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Learning Foundation</h2>
          <Badge variant="outline" className="text-[10px]">Sprint 10</Badge>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Gerar Sinais
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <MiniStat icon={BarChart3} label="Total Records" value={records.length} />
        <MiniStat icon={TrendingUp} label="Média Sucesso" value={`${avgSuccess}%`} />
        <MiniStat icon={TrendingDown} label="Média Falha" value={`${avgFailure}%`} />
        <MiniStat icon={Lightbulb} label="Ajustes Sugeridos" value={adjustmentCount} />
        <MiniStat icon={Zap} label="Tipos Únicos" value={Object.keys(typeCounts).length} />
      </div>

      {/* By Type */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Distribuição por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(typeCounts).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum learning record ainda. Clique "Gerar Sinais" para agregar dados existentes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} className={`${TYPE_COLORS[type] || "bg-muted"} text-xs gap-1`}>
                  {TYPE_LABELS[type] || type}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Successful */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" /> Top Padrões de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {topSuccessful.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {topSuccessful.map((r: any) => (
                    <div key={r.id} className="rounded-md border border-border/30 bg-muted/10 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={`${TYPE_COLORS[r.learning_type]} text-[9px]`}>
                          {TYPE_LABELS[r.learning_type]}
                        </Badge>
                        <span className="text-[10px] text-green-400 font-mono">{Number(r.success_signal)}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{r.decision_taken}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">{r.stage_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Failed */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" /> Top Decisões Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {topFailed.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {topFailed.map((r: any) => (
                    <div key={r.id} className="rounded-md border border-destructive/20 bg-destructive/5 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={`${TYPE_COLORS[r.learning_type]} text-[9px]`}>
                          {TYPE_LABELS[r.learning_type]}
                        </Badge>
                        <span className="text-[10px] text-destructive font-mono">{Number(r.failure_signal)}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{r.decision_taken}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">{r.stage_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Adjustment Candidates */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-400" /> Candidatos a Ajuste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {adjustments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem ajustes sugeridos</p>
              ) : (
                <div className="space-y-2">
                  {adjustments.map((r: any) => (
                    <div key={r.id} className="rounded-md border border-yellow-500/20 bg-yellow-500/5 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className="bg-yellow-500/20 text-yellow-400 text-[9px]">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          Confiança {Math.round(Number(r.confidence_score) * 100)}%
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{r.recommended_adjustment}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{r.stage_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
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

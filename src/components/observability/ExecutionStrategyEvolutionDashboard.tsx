import { useExecutionStrategyEvolution } from "@/hooks/useExecutionStrategyEvolution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, FlaskConical, CheckCircle2, XCircle, Undo2, Play, Square, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  watch: "bg-yellow-500/20 text-yellow-400",
  frozen: "bg-blue-500/20 text-blue-300",
  deprecated: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  reviewed: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
  active_experiment: "bg-purple-500/20 text-purple-400",
  rolled_back: "bg-orange-500/20 text-orange-400",
  completed: "bg-green-500/20 text-green-400",
  paused: "bg-yellow-500/20 text-yellow-400",
};

export function ExecutionStrategyEvolutionDashboard() {
  const { overview, loading, reviewVariant, startExperiment, stopExperiment, rollbackVariant, recompute } = useExecutionStrategyEvolution();

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando estratégias...</div>;

  const data = overview || { families: [], variants: [], experiments: [], outcomes: [], summary: {} };
  const summary = data.summary || {};

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{summary.total_families || 0}</div>
            <div className="text-xs text-muted-foreground">Famílias</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{summary.active_families || 0}</div>
            <div className="text-xs text-muted-foreground">Ativas</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.total_variants || 0}</div>
            <div className="text-xs text-muted-foreground">Variantes</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{summary.active_experiments || 0}</div>
            <div className="text-xs text-muted-foreground">Experimentos</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-accent">{summary.total_outcomes || 0}</div>
            <div className="text-xs text-muted-foreground">Outcomes</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className={`h-3 w-3 mr-1 ${recompute.isPending ? "animate-spin" : ""}`} /> Recomputar
        </Button>
      </div>

      <Tabs defaultValue="families">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="families" className="text-xs">Famílias</TabsTrigger>
          <TabsTrigger value="variants" className="text-xs">Variantes</TabsTrigger>
          <TabsTrigger value="experiments" className="text-xs">Experimentos</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs">Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="families">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Famílias de Estratégia</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.families || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhuma família registrada</div>
                ) : (
                  <div className="space-y-2">
                    {data.families.map((f: any) => (
                      <div key={f.id} className="p-3 rounded-md border border-border/50 bg-background/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{f.strategy_family_name}</span>
                          <Badge className={`text-[10px] ${STATUS_COLORS[f.status] || ""}`}>{f.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">Key: {f.strategy_family_key} · Scope: {f.allowed_variant_scope} · Rollout: {f.rollout_mode}</div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Variantes de Estratégia</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.variants || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhuma variante proposta</div>
                ) : (
                  <div className="space-y-2">
                    {data.variants.map((v: any) => (
                      <div key={v.id} className="p-3 rounded-md border border-border/50 bg-background/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-[300px]">{v.hypothesis || "Sem hipótese"}</span>
                          <Badge className={`text-[10px] ${STATUS_COLORS[v.status] || ""}`}>{v.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Confiança: {((v.confidence_score || 0) * 100).toFixed(0)}% · Modo: {v.variant_mode}
                        </div>
                        {v.status === "draft" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => reviewVariant.mutate({ variantId: v.id, decision: "approve" })}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => reviewVariant.mutate({ variantId: v.id, decision: "reject" })}>
                              <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                            </Button>
                          </div>
                        )}
                        {v.status === "approved" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => startExperiment.mutate(v.id)}>
                            <FlaskConical className="h-3 w-3 mr-1" /> Iniciar Experimento
                          </Button>
                        )}
                        {v.status === "active_experiment" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs text-orange-400" onClick={() => rollbackVariant.mutate(v.id)}>
                            <Undo2 className="h-3 w-3 mr-1" /> Rollback
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Experimentos Ativos</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.experiments || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhum experimento</div>
                ) : (
                  <div className="space-y-2">
                    {data.experiments.map((e: any) => (
                      <div key={e.id} className="p-3 rounded-md border border-border/50 bg-background/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Experimento {e.id.slice(0, 8)}</span>
                          <Badge className={`text-[10px] ${STATUS_COLORS[e.status] || ""}`}>{e.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mode: {e.assignment_mode} · Cap: {JSON.stringify(e.experiment_cap)}
                        </div>
                        {e.status === "active" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => stopExperiment.mutate(e.id)}>
                            <Square className="h-3 w-3 mr-1" /> Parar
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Resultados</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.outcomes || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhum resultado registrado</div>
                ) : (
                  <div className="space-y-2">
                    {data.outcomes.map((o: any) => (
                      <div key={o.id} className="p-3 rounded-md border border-border/50 bg-background/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{o.applied_mode === "variant" ? "Variante" : "Baseline"}</span>
                          <Badge className={`text-[10px] ${
                            o.outcome_status === "helpful" ? "bg-green-500/20 text-green-400" :
                            o.outcome_status === "harmful" ? "bg-destructive/20 text-destructive" :
                            "bg-muted text-muted-foreground"
                          }`}>{o.outcome_status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

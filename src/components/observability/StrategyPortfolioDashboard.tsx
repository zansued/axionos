import { useStrategyPortfolioGovernance } from "@/hooks/useStrategyPortfolioGovernance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertTriangle, CheckCircle2, ArrowRight, BarChart3, Shield } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  watch: "bg-yellow-500/20 text-yellow-400",
  frozen: "bg-blue-500/20 text-blue-300",
  deprecated: "bg-muted text-muted-foreground",
  proposed: "bg-muted text-muted-foreground",
  experimental: "bg-purple-500/20 text-purple-400",
  degrading: "bg-orange-500/20 text-orange-400",
  archived: "bg-muted text-muted-foreground",
  open: "bg-yellow-500/20 text-yellow-400",
  reviewed: "bg-blue-500/20 text-blue-300",
  resolved: "bg-green-500/20 text-green-400",
  dismissed: "bg-muted text-muted-foreground",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-destructive/20 text-destructive",
};

export function StrategyPortfolioDashboard() {
  const { overview, loading, computeMetrics, getRecommendations, updateLifecycle } = useStrategyPortfolioGovernance();

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Carregando portfólios...</div>;

  const data = overview || { portfolios: [], members: [], metrics: [], conflicts: [], summary: {} };
  const summary = data.summary || {};

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <SummaryCard label="Portfólios" value={summary.total_portfolios || 0} color="text-primary" />
        <SummaryCard label="Ativos" value={summary.active_portfolios || 0} color="text-green-400" />
        <SummaryCard label="Membros" value={summary.total_members || 0} color="text-blue-400" />
        <SummaryCard label="Ativos" value={summary.active_members || 0} color="text-green-400" />
        <SummaryCard label="Degradando" value={summary.degrading_members || 0} color="text-orange-400" />
        <SummaryCard label="Conflitos" value={summary.open_conflicts || 0} color="text-destructive" />
      </div>

      <Tabs defaultValue="portfolios">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="portfolios" className="text-xs">Portfólios</TabsTrigger>
          <TabsTrigger value="members" className="text-xs">Membros</TabsTrigger>
          <TabsTrigger value="conflicts" className="text-xs">Conflitos</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolios">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Portfólios de Estratégia</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.portfolios || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhum portfólio registrado</div>
                ) : (
                  <div className="space-y-2">
                    {data.portfolios.map((p: any) => (
                      <div key={p.id} className="p-3 rounded-md border border-border/50 bg-background/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{p.portfolio_name}</span>
                          <Badge className={`text-[10px] ${STATUS_COLORS[p.status] || ""}`}>{p.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">Key: {p.portfolio_key}</div>
                        {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => computeMetrics.mutate(p.id)} disabled={computeMetrics.isPending}>
                            <BarChart3 className="h-3 w-3 mr-1" /> Métricas
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => getRecommendations.mutate(p.id)} disabled={getRecommendations.isPending}>
                            <RefreshCw className={`h-3 w-3 mr-1 ${getRecommendations.isPending ? "animate-spin" : ""}`} /> Recomendações
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Membros do Portfólio</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.members || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhum membro</div>
                ) : (
                  <div className="space-y-2">
                    {data.members.map((m: any) => (
                      <div key={m.id} className="p-3 rounded-md border border-border/50 bg-background/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{(m as any).execution_strategy_families?.strategy_family_name || m.strategy_family_id.slice(0, 8)}</span>
                          <Badge className={`text-[10px] ${STATUS_COLORS[m.lifecycle_status] || ""}`}>{m.lifecycle_status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Peso: {m.exposure_weight} · Perf: {m.performance_score ?? "—"} · Estab: {m.stability_score ?? "—"} · Custo: {m.cost_efficiency_score ?? "—"}
                        </div>
                        {m.lifecycle_status !== "archived" && m.lifecycle_status !== "deprecated" && (
                          <div className="flex gap-1 flex-wrap">
                            {m.lifecycle_status === "proposed" && (
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => updateLifecycle.mutate({ memberId: m.id, targetStatus: "experimental", reason: "Manual promotion" })}>
                                <ArrowRight className="h-3 w-3 mr-1" /> Experimental
                              </Button>
                            )}
                            {m.lifecycle_status === "experimental" && (
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => updateLifecycle.mutate({ memberId: m.id, targetStatus: "active", reason: "Manual promotion" })}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Ativar
                              </Button>
                            )}
                            {(m.lifecycle_status === "active" || m.lifecycle_status === "degrading") && (
                              <Button size="sm" variant="outline" className="h-6 text-xs text-orange-400" onClick={() => updateLifecycle.mutate({ memberId: m.id, targetStatus: "deprecated", reason: "Manual deprecation" })}>
                                <Shield className="h-3 w-3 mr-1" /> Depreciar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Conflitos Detectados</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.conflicts || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhum conflito aberto</div>
                ) : (
                  <div className="space-y-2">
                    {data.conflicts.map((c: any) => (
                      <div key={c.id} className="p-3 rounded-md border border-border/50 bg-background/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                            <span className="text-sm font-medium">{c.conflict_type}</span>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={`text-[10px] ${SEVERITY_COLORS[c.severity] || ""}`}>{c.severity}</Badge>
                            <Badge className={`text-[10px] ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{c.description}</div>
                        <div className="text-xs text-muted-foreground italic">Resolução: {c.recommended_resolution}</div>
                        <div className="text-xs text-muted-foreground">Confiança: {((c.confidence || 0) * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Métricas de Portfólio</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {(data.metrics || []).length === 0 ? (
                  <div className="text-center text-muted-foreground p-8 text-sm">Nenhuma métrica registrada. Clique "Métricas" em um portfólio para computar.</div>
                ) : (
                  <div className="space-y-2">
                    {data.metrics.map((m: any) => (
                      <div key={m.id} className="p-3 rounded-md border border-border/50 bg-background/30 space-y-1">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Sucesso:</span> {((m.portfolio_success_rate || 0) * 100).toFixed(1)}%</div>
                          <div><span className="text-muted-foreground">Custo:</span> {((m.portfolio_cost_efficiency || 0) * 100).toFixed(1)}%</div>
                          <div><span className="text-muted-foreground">Estabilidade:</span> {((m.portfolio_stability_index || 0) * 100).toFixed(1)}%</div>
                          <div><span className="text-muted-foreground">Concentração:</span> {((m.strategy_concentration_index || 0) * 100).toFixed(1)}%</div>
                          <div><span className="text-muted-foreground">Regressão:</span> {((m.portfolio_regression_rate || 0) * 100).toFixed(1)}%</div>
                          <div><span className="text-muted-foreground">Membros:</span> {m.member_count} ({m.active_count} ativos)</div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
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

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-3 text-center">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

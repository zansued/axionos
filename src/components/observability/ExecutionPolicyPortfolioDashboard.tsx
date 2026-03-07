import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Eye, Zap, DollarSign, BarChart3, Trophy, Layers,
} from "lucide-react";
import { useExecutionPolicyPortfolio } from "@/hooks/useExecutionPolicyPortfolio";

const LIFECYCLE_COLORS: Record<string, string> = {
  candidate: "bg-muted text-muted-foreground border-border",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  watch: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  limited: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  deprecated: "bg-destructive/20 text-destructive border-destructive/30",
};

const REC_TYPE_LABELS: Record<string, string> = {
  promote: "Promover",
  limit: "Limitar",
  deprecate: "Depreciar",
  split: "Dividir",
  merge: "Mesclar",
  reprioritize: "Repriorizar",
};

export function ExecutionPolicyPortfolioDashboard() {
  const { overview, rankings, conflicts, isLoading, error } = useExecutionPolicyPortfolio();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50 animate-pulse">
              <CardContent className="p-4"><div className="h-12 bg-muted/30 rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Erro ao carregar portfolio de políticas</p>
        </CardContent>
      </Card>
    );
  }

  const data = overview || {
    total_entries: 0, active: 0, watch: 0, limited: 0, deprecated: 0, candidate: 0,
    open_recommendations: 0, entries: [], recommendations: [], profiles: [], recent_outcomes: [],
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        <KPICard icon={Layers} label="Total Portfolio" value={data.total_entries} />
        <KPICard icon={CheckCircle} label="Ativas" value={data.active} highlight />
        <KPICard icon={Eye} label="Watch" value={data.watch} warn={data.watch > 0} />
        <KPICard icon={AlertTriangle} label="Limitadas" value={data.limited} warn={data.limited > 0} />
        <KPICard icon={XCircle} label="Deprecated" value={data.deprecated} />
        <KPICard icon={TrendingUp} label="Recomendações" value={data.open_recommendations} warn={data.open_recommendations > 0} />
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="leaderboard" className="text-xs gap-1"><Trophy className="h-3 w-3" /> Leaderboard</TabsTrigger>
          <TabsTrigger value="conflicts" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Conflitos</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs gap-1"><TrendingUp className="h-3 w-3" /> Recomendações</TabsTrigger>
          <TabsTrigger value="lifecycle" className="text-xs gap-1"><Activity className="h-3 w-3" /> Lifecycle</TabsTrigger>
        </TabsList>

        {/* LEADERBOARD */}
        <TabsContent value="leaderboard" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Portfolio Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {(!data.entries || data.entries.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma entrada no portfolio. Execute "Recomputar Portfolio" para popular.</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {[...data.entries].sort((a: any, b: any) => (b.portfolio_rank ?? 0) - (a.portfolio_rank ?? 0)).map((entry: any, i: number) => (
                      <div key={entry.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                        <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entry.execution_policy_profiles?.policy_name || entry.execution_policy_profile_id}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>rank: {entry.portfolio_rank?.toFixed(3) ?? "N/A"}</span>
                            <span>•</span>
                            <span>useful: {entry.usefulness_score?.toFixed(2) ?? "—"}</span>
                            <span>•</span>
                            <span>risk: {entry.risk_score?.toFixed(2) ?? "—"}</span>
                            <span>•</span>
                            <span>cost: {entry.cost_efficiency_score?.toFixed(2) ?? "—"}</span>
                            <span>•</span>
                            <span>quality: {entry.quality_gain_score?.toFixed(2) ?? "—"}</span>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${LIFECYCLE_COLORS[entry.lifecycle_status] || ""}`}>{entry.lifecycle_status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONFLICTS */}
        <TabsContent value="conflicts" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Conflitos Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              {(!conflicts || conflicts.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum conflito detectado</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {conflicts.map((c: any, i: number) => (
                      <div key={i} className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[10px] ${c.severity === "high" ? "border-destructive/50 text-destructive" : c.severity === "medium" ? "border-yellow-500/50 text-yellow-400" : ""}`}>
                            {c.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{c.conflict_type}</Badge>
                          <span className="text-[10px] text-muted-foreground">{c.context_class}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                        <p className="text-[10px] text-primary mt-1">{c.recommended_action}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Recomendações do Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              {(!data.recommendations || data.recommendations.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma recomendação gerada</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {data.recommendations.map((rec: any) => (
                      <div key={rec.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{REC_TYPE_LABELS[rec.recommendation_type] || rec.recommendation_type}</Badge>
                          <Badge className={`text-[10px] ${rec.status === "open" ? "bg-yellow-500/20 text-yellow-400" : rec.status === "accepted" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                            {rec.status}
                          </Badge>
                          {rec.confidence_score != null && (
                            <span className="text-[10px] text-muted-foreground">conf: {rec.confidence_score.toFixed(2)}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.recommendation_reason?.description || JSON.stringify(rec.recommendation_reason)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(rec.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIFECYCLE */}
        <TabsContent value="lifecycle" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Lifecycle Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              {(!data.entries || data.entries.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma entrada no portfolio</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {data.entries.map((entry: any) => (
                      <div key={entry.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {entry.execution_policy_profiles?.policy_name || entry.execution_policy_profile_id}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>mode: {entry.execution_policy_profiles?.policy_mode || "—"}</span>
                            <span>•</span>
                            <span>group: {entry.portfolio_group}</span>
                            <span>•</span>
                            <span>stability: {entry.stability_score?.toFixed(2) ?? "—"}</span>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${LIFECYCLE_COLORS[entry.lifecycle_status] || ""}`}>{entry.lifecycle_status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, highlight, warn }: {
  icon: any; label: string; value: number | string; highlight?: boolean; warn?: boolean;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${warn ? "text-destructive" : highlight ? "text-primary" : "text-muted-foreground"}`} />
        <div>
          <p className={`text-lg font-bold ${warn ? "text-destructive" : ""}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

import { useAgentMemoryDashboard } from "@/hooks/useAgentMemoryDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, CheckCircle, Eye, Archive, Loader2, Activity, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const MEMORY_TYPE_LABELS: Record<string, string> = {
  execution_pattern: "Execução",
  repair_pattern: "Reparo",
  validation_pattern: "Validação",
  review_pattern: "Revisão",
  failure_pattern: "Falha",
  success_pattern: "Sucesso",
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string }> = {
  active: { icon: CheckCircle, color: "text-green-400" },
  watch: { icon: Eye, color: "text-yellow-400" },
  deprecated: { icon: Archive, color: "text-muted-foreground" },
};

export function AgentMemoryDashboard() {
  const { profiles, records, activeProfiles, watchProfiles, deprecatedProfiles, byType, isLoading } = useAgentMemoryDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <KPI icon={Brain} label="Profiles Ativos" value={activeProfiles.length} />
        <KPI icon={Eye} label="Em Watch" value={watchProfiles.length} highlight={watchProfiles.length > 0} />
        <KPI icon={Archive} label="Deprecados" value={deprecatedProfiles.length} />
        <KPI icon={Activity} label="Registros" value={records.length} />
        <KPI icon={Zap} label="Tipos" value={Object.keys(byType).length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Profiles */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" /> Profiles de Memória por Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum profile de memória ainda</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {profiles.map((p: any) => {
                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.active;
                    const Icon = cfg.icon;
                    return (
                      <div key={p.id} className="flex items-start gap-2 rounded-md border border-border/30 bg-muted/10 p-3">
                        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{p.agent_type}</span>
                            <Badge variant="outline" className="text-[10px]">{p.memory_scope}</Badge>
                            {p.stage_key && <Badge variant="secondary" className="text-[10px]">{p.stage_key}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.memory_summary || "Sem resumo"}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/70">
                            <span>Confiança: {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "n/a"}</span>
                            <span>•</span>
                            <span>Suporte: {p.support_count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Memory Records */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Registros de Memória Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum registro de memória ainda</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {records.map((r: any) => (
                    <div key={r.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {MEMORY_TYPE_LABELS[r.memory_type] || r.memory_type}
                        </Badge>
                        <span className="text-xs font-medium">{r.agent_type}</span>
                        {r.stage_key && <Badge variant="secondary" className="text-[10px]">{r.stage_key}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{r.context_signature}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/70">
                        <span>Relevância: {r.relevance_score != null ? `${Math.round(r.relevance_score * 100)}%` : "n/a"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Memory by Type */}
      {Object.keys(byType).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byType).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs gap-1">
                  {MEMORY_TYPE_LABELS[type] || type}: {count as number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Watchlist */}
      {watchProfiles.length > 0 && (
        <Card className="border-yellow-500/20 border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-4 w-4" /> Watchlist de Memória
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {watchProfiles.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <Eye className="h-3 w-3 text-yellow-400" />
                  <span className="font-medium">{p.agent_type}</span>
                  <span className="text-muted-foreground">— {p.memory_summary || "Sob observação"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, highlight }: { icon: typeof Brain; label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={`border-border/50 ${highlight ? "border-yellow-500/30" : ""}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${highlight ? "text-yellow-400" : "text-primary"}`} />
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

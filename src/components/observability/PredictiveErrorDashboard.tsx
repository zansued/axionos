import { usePredictiveErrorDashboard } from "@/hooks/usePredictiveErrorDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, ShieldAlert, TrendingDown, CheckCircle, Eye, Loader2, Activity, Target } from "lucide-react";

const BAND_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "text-green-400", label: "Baixo" },
  moderate: { color: "text-yellow-400", label: "Moderado" },
  high: { color: "text-orange-400", label: "Alto" },
  critical: { color: "text-red-400", label: "Crítico" },
};

const OUTCOME_LABELS: Record<string, string> = {
  pending: "Pendente",
  helpful: "Útil",
  neutral: "Neutro",
  harmful: "Prejudicial",
  unknown: "Desconhecido",
};

export function PredictiveErrorDashboard() {
  const { assessments, actions, byBand, appliedActions, helpfulActions, falsePositives, harmfulActions, isLoading } = usePredictiveErrorDashboard();

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
        <KPI icon={Target} label="Avaliações" value={assessments.length} />
        <KPI icon={ShieldAlert} label="Alto/Crítico" value={(byBand.high || 0) + (byBand.critical || 0)} highlight={(byBand.high || 0) + (byBand.critical || 0) > 0} />
        <KPI icon={Activity} label="Ações Aplicadas" value={appliedActions.length} />
        <KPI icon={CheckCircle} label="Ações Úteis" value={helpfulActions.length} />
        <KPI icon={TrendingDown} label="Falsos Positivos" value={falsePositives.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Risk Assessments */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" /> Avaliações de Risco Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma avaliação preditiva ainda</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {assessments.map((a: any) => {
                    const band = BAND_CONFIG[a.risk_band] || BAND_CONFIG.low;
                    return (
                      <div key={a.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${band.color}`}>{band.label}</Badge>
                          <span className="text-xs font-medium">{a.stage_key}</span>
                          {a.agent_type && <Badge variant="secondary" className="text-[10px]">{a.agent_type}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/70">
                          <span>Risco: {Math.round(a.risk_score * 100)}%</span>
                          <span>Confiança: {a.confidence_score != null ? `${Math.round(a.confidence_score * 100)}%` : "n/a"}</span>
                        </div>
                        {a.predicted_failure_types?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(a.predicted_failure_types as string[]).slice(0, 3).map((t: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[9px]">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Preventive Actions */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Ações Preventivas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma ação preventiva ainda</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {actions.map((a: any) => (
                    <div key={a.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{a.action_type}</Badge>
                        <Badge variant={a.applied ? "default" : "secondary"} className="text-[10px]">
                          {a.applied ? "Aplicada" : "Recomendada"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {OUTCOME_LABELS[a.outcome_status] || a.outcome_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/70">
                        <span>Modo: {a.action_mode}</span>
                        <span>•</span>
                        <span>Stage: {a.stage_key}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      {Object.keys(byBand).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Distribuição de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(byBand).map(([band, count]) => {
                const cfg = BAND_CONFIG[band] || BAND_CONFIG.low;
                return (
                  <div key={band} className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${cfg.color}`}>{count as number}</span>
                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Harmful / FP Watchlist */}
      {(harmfulActions.length > 0 || falsePositives.length > 0) && (
        <Card className="border-yellow-500/20 border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-4 w-4" /> Watchlist — Falsos Positivos & Fricção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[...harmfulActions, ...falsePositives].slice(0, 10).map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <Eye className="h-3 w-3 text-yellow-400" />
                  <span className="font-medium">{a.action_type}</span>
                  <span className="text-muted-foreground">— {a.stage_key}</span>
                  <Badge variant="outline" className="text-[9px]">{OUTCOME_LABELS[a.outcome_status]}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, highlight }: { icon: typeof Target; label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={`border-border/50 ${highlight ? "border-orange-500/30" : ""}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${highlight ? "text-orange-400" : "text-primary"}`} />
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

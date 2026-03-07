import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, TrendingUp, AlertTriangle, Shield, Activity, Clock, DollarSign, RotateCcw } from "lucide-react";
import { useRepairOverview, useRepairProfiles, useRepairDecisions, useRepairAdjustments } from "@/hooks/useRepairIntelligence";

function StatMini({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/30 bg-muted/10 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  watch: "bg-yellow-500/20 text-yellow-400",
  deprecated: "bg-muted text-muted-foreground",
};

const OUTCOME_BADGE: Record<string, string> = {
  resolved: "bg-green-500/20 text-green-400",
  failed: "bg-destructive/20 text-destructive",
  pending: "bg-yellow-500/20 text-yellow-400",
  escalated: "bg-orange-500/20 text-orange-400",
};

export function RepairIntelligenceDashboard() {
  const { data: overview, isLoading: loadingOverview } = useRepairOverview();
  const { data: profilesData } = useRepairProfiles();
  const { data: decisionsData } = useRepairDecisions();
  const { data: adjustmentsData } = useRepairAdjustments();

  const profiles = profilesData?.profiles || [];
  const decisions = decisionsData?.decisions || [];
  const adjustments = adjustmentsData?.adjustments || [];

  if (loadingOverview) {
    return <div className="text-xs text-muted-foreground text-center py-8">Carregando Repair Intelligence...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatMini icon={Shield} label="Políticas Ativas" value={overview?.active_profiles ?? 0} />
        <StatMini icon={Activity} label="Taxa Resolução" value={`${overview?.resolution_rate ?? 0}%`} />
        <StatMini icon={TrendingUp} label="Confiança Média" value={`${((overview?.avg_confidence ?? 0) * 100).toFixed(0)}%`} />
        <StatMini icon={AlertTriangle} label="Em Vigilância" value={overview?.watch_profiles ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Policies */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" /> Políticas de Reparo Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {profiles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma política registrada</p>
              ) : (
                <div className="space-y-2">
                  {profiles.slice(0, 15).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.stage_key} → {p.preferred_strategy}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.error_signature?.slice(0, 60)}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span>✓ {p.support_count}</span>
                          <span>✗ {p.failure_count}</span>
                          <span>Conf: {((p.confidence || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${STATUS_BADGE[p.status] || ""}`}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Decisions */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Decisões Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {decisions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma decisão registrada</p>
              ) : (
                <div className="space-y-2">
                  {decisions.slice(0, 15).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{d.stage_key}: {d.selected_strategy}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span>Conf: {((d.confidence || 0) * 100).toFixed(0)}%</span>
                          {d.retry_count > 0 && <span>Retries: {d.retry_count}</span>}
                          {d.cost_usd > 0 && <span>${Number(d.cost_usd).toFixed(4)}</span>}
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${OUTCOME_BADGE[d.outcome_status] || ""}`}>{d.outcome_status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Policy Adjustments */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" /> Ajustes de Política Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {adjustments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum ajuste registrado</p>
            ) : (
              <div className="space-y-2">
                {adjustments.slice(0, 10).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{a.adjustment_type}</Badge>
                        {a.repair_policy_profiles && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {a.repair_policy_profiles.stage_key}: {a.repair_policy_profiles.preferred_strategy}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {typeof a.adjustment_reason === "object" ? (a.adjustment_reason as any)?.reason || "—" : "—"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

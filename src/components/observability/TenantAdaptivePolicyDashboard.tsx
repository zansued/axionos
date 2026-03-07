import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Globe, AlertTriangle, CheckCircle, XCircle, Eye, TrendingUp, Settings2 } from "lucide-react";
import { useTenantPolicyDashboard } from "@/hooks/useTenantPolicyDashboard";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  draft: "bg-muted text-muted-foreground",
  watch: "bg-yellow-500/20 text-yellow-400",
  deprecated: "bg-destructive/20 text-destructive",
};

const SCOPE_ICON: Record<string, typeof Building2> = {
  organization: Building2,
  workspace: Settings2,
};

const OUTCOME_ICON: Record<string, typeof CheckCircle> = {
  helpful: CheckCircle,
  harmful: XCircle,
  neutral: Eye,
  inconclusive: AlertTriangle,
};

export function TenantAdaptivePolicyDashboard() {
  const { overview, recommendations, isLoading, error } = useTenantPolicyDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center text-destructive text-sm">
          Erro ao carregar dados de tenant tuning
        </CardContent>
      </Card>
    );
  }

  const data = overview || {};
  const profiles = (data.profiles || []) as any[];
  const recentOutcomes = (data.recent_outcomes || []) as any[];
  const recs = (recommendations || []) as any[];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MiniStat icon={Building2} label="Perfis Ativos" value={data.active_profiles ?? 0} />
        <MiniStat icon={Globe} label="Org / Workspace" value={`${data.org_scoped ?? 0} / ${data.ws_scoped ?? 0}`} />
        <MiniStat icon={CheckCircle} label="Outcomes Helpful" value={data.helpful_outcomes ?? 0} accent="green" />
        <MiniStat icon={XCircle} label="Outcomes Harmful" value={data.harmful_outcomes ?? 0} accent="red" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Preference Profiles */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" /> Perfis de Preferência
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum perfil de preferência criado</p>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {profiles.map((p: any) => {
                    const ScopeIcon = SCOPE_ICON[p.preference_scope] || Globe;
                    return (
                      <div key={p.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <ScopeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{p.preference_name}</span>
                          </div>
                          <Badge className={`text-[10px] ${STATUS_STYLES[p.status] || ""}`}>{p.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>Escopo: {p.preference_scope}</span>
                          <span>Suporte: {p.support_count}</span>
                          <span>Confiança: {p.confidence_score?.toFixed(2) ?? "N/A"}</span>
                        </div>
                        {p.preferred_policy_modes && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {(p.preferred_policy_modes as string[]).map((mode: string) => (
                              <Badge key={mode} variant="outline" className="text-[10px]">{mode}</Badge>
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

        {/* Recommendations */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma recomendação pendente</p>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {recs.map((r: any) => (
                    <div key={r.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px]">{r.recommendation_type}</Badge>
                        <Badge className={`text-[10px] ${STATUS_STYLES[r.status] || "bg-muted text-muted-foreground"}`}>{r.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {r.recommendation_reason?.description || JSON.stringify(r.recommendation_reason).slice(0, 120)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Confiança: {r.confidence_score?.toFixed(2) ?? "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Outcomes */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" /> Outcomes Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOutcomes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum outcome registrado</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1.5">
                {recentOutcomes.map((o: any) => {
                  const OutcomeIcon = OUTCOME_ICON[o.outcome_status] || Eye;
                  return (
                    <div key={o.id} className="flex items-center gap-3 text-xs rounded-md border border-border/20 bg-muted/5 px-3 py-2">
                      <OutcomeIcon className={`h-3.5 w-3.5 ${o.outcome_status === "helpful" ? "text-green-400" : o.outcome_status === "harmful" ? "text-destructive" : "text-muted-foreground"}`} />
                      <span className="font-mono text-[11px]">{o.context_class}</span>
                      <Badge variant="outline" className="text-[10px]">{o.applied_mode}</Badge>
                      <Badge className={`text-[10px] ml-auto ${o.outcome_status === "helpful" ? "bg-green-500/20 text-green-400" : o.outcome_status === "harmful" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                        {o.outcome_status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Icon className={`h-4 w-4 ${accent === "green" ? "text-green-400" : accent === "red" ? "text-destructive" : "text-primary"}`} />
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

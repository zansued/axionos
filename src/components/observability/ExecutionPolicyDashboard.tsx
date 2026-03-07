import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Eye, Zap, DollarSign, Clock, BarChart3,
} from "lucide-react";
import { useExecutionPolicyDashboard } from "@/hooks/useExecutionPolicyDashboard";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  draft: "bg-muted text-muted-foreground border-border",
  watch: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  deprecated: "bg-destructive/20 text-destructive border-destructive/30",
};

const OUTCOME_COLORS: Record<string, string> = {
  helpful: "bg-green-500/20 text-green-400",
  neutral: "bg-muted text-muted-foreground",
  harmful: "bg-destructive/20 text-destructive",
  inconclusive: "bg-yellow-500/20 text-yellow-400",
};

const MODE_ICONS: Record<string, typeof Activity> = {
  balanced_default: Activity,
  high_quality: CheckCircle,
  cost_optimized: DollarSign,
  rapid_iteration: Zap,
  risk_sensitive: Shield,
  deploy_hardened: Shield,
  repair_conservative: AlertTriangle,
  validation_heavy: Eye,
};

export function ExecutionPolicyDashboard() {
  const { overview, decisions, isLoading, error } = useExecutionPolicyDashboard();
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

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
          <p className="text-sm text-muted-foreground">Erro ao carregar dados de política de execução</p>
        </CardContent>
      </Card>
    );
  }

  const data = overview || { total_profiles: 0, active: 0, draft: 0, watch: 0, deprecated: 0, helpful_outcomes: 0, harmful_outcomes: 0, total_outcomes: 0, profiles: [], recent_outcomes: [], recent_decisions: [] };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <KPICard icon={BarChart3} label="Políticas Totais" value={data.total_profiles} />
        <KPICard icon={CheckCircle} label="Ativas" value={data.active} highlight />
        <KPICard icon={Eye} label="Em Watch" value={data.watch} warn={data.watch > 0} />
        <KPICard icon={TrendingUp} label="Outcomes Helpful" value={data.helpful_outcomes} highlight />
        <KPICard icon={XCircle} label="Outcomes Harmful" value={data.harmful_outcomes} warn={data.harmful_outcomes > 0} />
      </div>

      <Tabs defaultValue="profiles">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="profiles" className="text-xs gap-1"><Shield className="h-3 w-3" /> Perfis</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><TrendingUp className="h-3 w-3" /> Outcomes</TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs gap-1"><Activity className="h-3 w-3" /> Decisões</TabsTrigger>
          <TabsTrigger value="explain" className="text-xs gap-1"><Eye className="h-3 w-3" /> Explain</TabsTrigger>
        </TabsList>

        {/* PROFILES */}
        <TabsContent value="profiles" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Execution Policy Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              {(!data.profiles || data.profiles.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma política de execução cadastrada</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {data.profiles.map((p: any) => {
                      const Icon = MODE_ICONS[p.policy_mode] || Activity;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => setSelectedPolicy(p.id)}
                        >
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.policy_name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                              <span>{p.policy_mode}</span>
                              <span>•</span>
                              <span>{p.policy_scope}</span>
                              <span>•</span>
                              <span>conf: {p.confidence_score?.toFixed(2) ?? "N/A"}</span>
                              <span>•</span>
                              <span>sup: {p.support_count}</span>
                            </div>
                          </div>
                          <Badge className={`text-[10px] ${STATUS_COLORS[p.status] || ""}`}>{p.status}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OUTCOMES */}
        <TabsContent value="outcomes" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Policy Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              {(!data.recent_outcomes || data.recent_outcomes.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum outcome registrado</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {data.recent_outcomes.map((o: any) => (
                      <div key={o.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${OUTCOME_COLORS[o.outcome_status] || ""}`}>{o.outcome_status}</Badge>
                            <span className="text-xs text-muted-foreground">{o.context_class}</span>
                            <span className="text-[10px] text-muted-foreground">{o.applied_mode}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DECISIONS */}
        <TabsContent value="decisions" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Policy Decisions (Audit Trail)</CardTitle>
            </CardHeader>
            <CardContent>
              {(!decisions || decisions.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma decisão registrada</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {decisions.map((d: any) => (
                      <div key={d.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{d.context_class}</Badge>
                          <Badge variant="outline" className="text-[10px]">{d.applied_mode}</Badge>
                          {d.checkpoint && <Badge variant="outline" className="text-[10px]">{d.checkpoint}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{d.execution_policy_profiles?.policy_name || d.execution_policy_profile_id}</p>
                        {d.reason_codes?.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">{d.reason_codes.join(", ")}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(d.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPLAIN */}
        <TabsContent value="explain" className="mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">Explainability</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPolicy ? (
                <PolicyExplainPanel policyId={selectedPolicy} />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Selecione uma política na aba Perfis para ver a explicação</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PolicyExplainPanel({ policyId }: { policyId: string }) {
  return (
    <div className="text-xs text-muted-foreground text-center py-8">
      <p>Policy ID: <code className="text-[10px]">{policyId}</code></p>
      <p className="mt-2">Acesse a API <code>execution_policy_explain</code> para detalhes completos sobre evidências, outcomes e racional da política.</p>
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

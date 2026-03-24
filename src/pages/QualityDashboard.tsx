/**
 * Sprint 217 — Quality Dashboard
 * Visibility into build success rates, top errors, deploy feedback.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Activity, Clock, DollarSign, BarChart3, Zap, Shield, RotateCcw, Rocket } from "lucide-react";
import { useQualityDashboard } from "@/hooks/useQualityDashboard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from "recharts";

const RISK_COLORS: Record<string, string> = {
  safe: "hsl(var(--success))",
  standard: "hsl(var(--primary))",
  complex: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
};

export default function QualityDashboard() {
  const { data, isLoading } = useQualityDashboard(72);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-display font-bold">Qualidade do Pipeline</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sem dados de execução ainda. Execute o pipeline para ver métricas de qualidade.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successColor = data.successRate >= 80 ? "text-green-500" : data.successRate >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Qualidade do Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Últimas 72h · {data.totalExecutions} execuções monitoradas</p>
        </div>
        <Badge variant={data.successRate >= 80 ? "default" : data.successRate >= 50 ? "secondary" : "destructive"} className="text-sm px-3 py-1">
          {data.successRate}% sucesso
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={CheckCircle2} label="Sucesso" value={String(data.succeeded)} accent="text-green-500" />
        <KPICard icon={XCircle} label="Falhas" value={String(data.failed)} accent="text-red-500" />
        <KPICard icon={Clock} label="Latência Média" value={`${data.avgLatencyMs}ms`} accent="text-blue-500" />
        <KPICard icon={DollarSign} label="Custo Total" value={`$${data.totalCostUsd}`} accent="text-amber-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Zap} label="Tokens" value={data.totalTokens.toLocaleString()} accent="text-purple-500" />
        <KPICard icon={RotateCcw} label="Retries" value={String(data.totalRetries)} accent="text-orange-500" />
        <KPICard icon={Rocket} label="Deploys" value={String(data.deploySignals.total)} accent="text-cyan-500" />
        <KPICard icon={Shield} label="Deploy OK" value={`${data.deploySignals.total > 0 ? Math.round((data.deploySignals.successful / data.deploySignals.total) * 100) : 0}%`} accent="text-green-500" />
      </div>

      {/* Timeline Chart */}
      {data.hourlyTimeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Taxa de Sucesso por Hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.hourlyTimeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(v) => v.substring(11, 16)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(val: number) => [`${val}%`, "Sucesso"]}
                  labelFormatter={(v) => v}
                />
                <Area type="monotone" dataKey="successRate" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Errors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Top Erros ({data.topErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topErrors.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum erro registrado 🎉</p>
            ) : (
              data.topErrors.map((e) => (
                <div key={e.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[200px]">{e.category}</span>
                    <span className="text-muted-foreground">{e.count}</span>
                  </div>
                  <Progress value={data.totalExecutions > 0 ? (e.count / data.totalExecutions) * 100 : 0} className="h-1.5" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Distribuição de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.riskDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados de risco</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data.riskDistribution}
                    dataKey="count"
                    nameKey="tier"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ tier, count }) => `${tier}: ${count}`}
                    labelLine={false}
                  >
                    {data.riskDistribution.map((entry) => (
                      <Cell key={entry.tier} fill={RISK_COLORS[entry.tier] || "hsl(var(--muted-foreground))"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deploy Feedback */}
      {data.deploySignals.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-cyan-500" />
              Feedback de Deploy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{data.deploySignals.successful}</p>
                <p className="text-[10px] text-muted-foreground">Sucesso</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{data.deploySignals.failed}</p>
                <p className="text-[10px] text-muted-foreground">Falha</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{data.deploySignals.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
            {data.deploySignals.topCategories.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Categorias de Falha</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.deploySignals.topCategories.map((c) => (
                    <Badge key={c.category} variant="destructive" className="text-[10px]">
                      {c.category}: {c.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Failures */}
      {data.recentFailures.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Falhas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data.recentFailures.map((f) => (
                <div key={f.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{f.file_path}</p>
                    {f.error_message && (
                      <p className="text-muted-foreground truncate mt-0.5">{f.error_message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {f.error_category && <Badge variant="outline" className="text-[9px]">{f.error_category}</Badge>}
                      <Badge variant="outline" className="text-[9px]">{f.risk_tier}</Badge>
                      <span className="text-[9px] text-muted-foreground">{new Date(f.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent} shrink-0`} />
        <div>
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

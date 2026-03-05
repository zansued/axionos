import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from "recharts";
import {
  DollarSign, TrendingUp, AlertTriangle, Clock, Layers,
} from "lucide-react";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import { useStrategicKPIs } from "@/hooks/useStrategicKPIs";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  squad_formation: "Squad",
  planning: "Planning",
  execution: "Execução",
  validation: "Validação",
  publish: "Publish",
  rework: "Rework",
  reject: "Rejeição",
};

const STAGE_COLORS: Record<string, string> = {
  discovery: "hsl(270, 60%, 60%)",
  squad_formation: "hsl(210, 100%, 52%)",
  planning: "hsl(38, 92%, 50%)",
  execution: "hsl(160, 84%, 39%)",
  validation: "hsl(200, 80%, 50%)",
  publish: "hsl(160, 60%, 45%)",
  rework: "hsl(0, 72%, 51%)",
  reject: "hsl(0, 50%, 40%)",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
  "hsl(199 89% 48%)",
  "hsl(25 95% 53%)",
];

interface Props {
  outputs: any[];
  costByAgent: { name: string; cost: number; tokens: number; count: number }[];
  costByModel: { name: string; cost: number; count: number }[];
  dailyCost: { date: string; cost: number }[];
}

export function CostsDashboard({ outputs, costByAgent, costByModel, dailyCost }: Props) {
  const { limits, currentUsage } = useOrgUsage();
  const { data: kpis } = useStrategicKPIs();

  const budget = limits?.monthly_budget_usd || 50;
  const usagePct = currentUsage ? Math.min((currentUsage.totalCost / budget) * 100, 100) : 0;
  const isOverThreshold = limits ? usagePct >= limits.alert_threshold_pct : false;
  const isOverBudget = usagePct >= 100;

  // Avg time per stage
  const avgTimePerStage = useMemo(() => {
    if (!kpis) return [];
    const stages = [
      { stage: "Discovery", time: kpis.avgDiscoveryTime },
      { stage: "Planning", time: kpis.avgPlanningTime },
      { stage: "Execução", time: kpis.avgExecutionTime },
    ].filter(s => s.time > 0);
    return stages.map(s => ({ ...s, time: Number(s.time.toFixed(1)) }));
  }, [kpis]);

  // Cost per initiative
  const costPerInitiative = kpis?.costPerInitiative || [];

  // Cost per stage
  const costPerStage = useMemo(() => {
    return (kpis?.costPerStage || []).map(s => ({
      name: STAGE_LABELS[s.stage] || s.stage,
      cost: Number(s.cost.toFixed(4)),
      count: s.count,
      fill: STAGE_COLORS[s.stage] || "hsl(215, 15%, 55%)",
    }));
  }, [kpis]);

  return (
    <div className="space-y-4">
      {/* Budget Alert Banner */}
      {(isOverThreshold || isOverBudget) && (
        <Card className={`border ${isOverBudget ? "border-destructive/50 bg-destructive/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className={`h-5 w-5 shrink-0 ${isOverBudget ? "text-destructive" : "text-yellow-400"}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${isOverBudget ? "text-destructive" : "text-yellow-400"}`}>
                {isOverBudget ? "⚠️ Budget excedido!" : "⚠️ Alerta de consumo"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOverBudget
                  ? `Consumo de $${currentUsage?.totalCost.toFixed(4)} excedeu o budget de $${budget.toFixed(2)}.${limits?.hard_limit ? " Hard limit ativo — execuções bloqueadas." : ""}`
                  : `Consumo atingiu ${usagePct.toFixed(1)}% do budget ($${currentUsage?.totalCost.toFixed(4)} de $${budget.toFixed(2)}).`}
              </p>
            </div>
            <Badge variant={isOverBudget ? "destructive" : "outline"} className={isOverBudget ? "" : "border-yellow-500/30 text-yellow-400"}>
              {usagePct.toFixed(0)}%
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Budget progress */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Budget Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={usagePct} className="h-2.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>${(currentUsage?.totalCost || 0).toFixed(4)}</span>
            <span>{usagePct.toFixed(1)}%</span>
            <span>${budget.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Daily cost + Avg time per stage */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Custo Diário (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyCost} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(4)}`, "Custo"]} />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Tempo Médio por Estágio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {avgTimePerStage.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados de tempo</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={avgTimePerStage} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}m`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} min`, "Tempo médio"]} />
                  <Bar dataKey="time" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost per initiative + Cost per stage */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Custo por Iniciativa (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costPerInitiative.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={costPerInitiative.map(i => ({
                    name: i.title.length > 18 ? i.title.slice(0, 18) + "…" : i.title,
                    cost: Number(i.cost.toFixed(4)),
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v}`, "Custo"]} />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Custo por Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {costPerStage.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={costPerStage} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v}`, "Custo"]} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {costPerStage.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost by agent + Cost by model */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Custo por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            {costByAgent.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={costByAgent.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={55} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toFixed(4)}`, "Custo"]} />
                  <Bar dataKey="cost" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Custo por Modelo</CardTitle>
          </CardHeader>
          <CardContent>
            {costByModel.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {costByModel.map((m, i) => (
                  <div key={m.name} className="flex items-center justify-between rounded-md border border-border/30 bg-muted/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs font-mono truncate max-w-[180px]">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{m.count} calls</span>
                      <span className="font-medium text-foreground">${m.cost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

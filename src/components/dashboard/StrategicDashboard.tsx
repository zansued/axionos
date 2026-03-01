import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  DollarSign, Clock, RotateCcw, AlertTriangle, Layers, TrendingUp,
  Target, Zap,
} from "lucide-react";
import type { StrategicKPIs } from "@/hooks/useStrategicKPIs";

const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const tooltipStyle = {
  backgroundColor: "hsl(225, 22%, 11%)",
  border: "1px solid hsl(225, 15%, 18%)",
  borderRadius: "8px",
  color: "hsl(210, 20%, 92%)",
  fontSize: "12px",
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

export function StrategicDashboard({ kpis }: { kpis: StrategicKPIs }) {
  const metricCards = [
    {
      title: "Custo Médio / Iniciativa",
      value: `$${kpis.avgCostPerInitiative.toFixed(4)}`,
      subtitle: `${kpis.totalInitiatives} iniciativas`,
      icon: DollarSign,
      color: "text-accent",
    },
    {
      title: "Custo Total Pipeline",
      value: `$${kpis.totalCost.toFixed(4)}`,
      subtitle: `${kpis.totalJobs} jobs executados`,
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      title: "Custo / Artefato",
      value: `$${kpis.costPerArtifact.toFixed(4)}`,
      subtitle: "média por output",
      icon: Layers,
      color: "text-info",
    },
    {
      title: "Tempo Médio Discovery",
      value: kpis.avgDiscoveryTime > 0 ? `${kpis.avgDiscoveryTime.toFixed(1)} min` : "—",
      subtitle: "por iniciativa",
      icon: Clock,
      color: "text-warning",
    },
    {
      title: "Tempo Médio Planning",
      value: kpis.avgPlanningTime > 0 ? `${kpis.avgPlanningTime.toFixed(1)} min` : "—",
      subtitle: "PRD + Arch + Stories",
      icon: Target,
      color: "text-primary",
    },
    {
      title: "Tempo Médio Execução",
      value: kpis.avgExecutionTime > 0 ? `${kpis.avgExecutionTime.toFixed(1)} min` : "—",
      subtitle: "subtasks por ciclo",
      icon: Zap,
      color: "text-success",
    },
    {
      title: "Taxa de Rework",
      value: `${kpis.reworkRate.toFixed(1)}%`,
      subtitle: "ajustes solicitados",
      icon: RotateCcw,
      color: "text-destructive",
    },
    {
      title: "Taxa de Rejeição",
      value: `${kpis.rejectionRate.toFixed(1)}%`,
      subtitle: "rollbacks no pipeline",
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  const costByStageData = kpis.costPerStage.map(s => ({
    name: STAGE_LABELS[s.stage] || s.stage,
    cost: Number(s.cost.toFixed(4)),
    count: s.count,
    fill: STAGE_COLORS[s.stage] || "hsl(215, 15%, 55%)",
  }));

  const costByInitData = kpis.costPerInitiative.map(i => ({
    name: i.title.length > 20 ? i.title.slice(0, 20) + "…" : i.title,
    cost: Number(i.cost.toFixed(4)),
    fill: "hsl(var(--primary))",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">Métricas Estratégicas</h2>
        <p className="text-xs text-muted-foreground">Dados enterprise para governança e argumentação de valor</p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {metricCards.map((card) => (
          <motion.div key={card.title} variants={item}>
            <Card className="border-border/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-3.5 w-3.5 ${card.color} shrink-0`} />
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-lg font-bold font-display">{card.value}</div>
                <p className="text-[10px] text-muted-foreground">{card.subtitle}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {costByStageData.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-base">Custo por Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={costByStageData} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [`$${value}`, "Custo"]}
                    labelFormatter={(label) => `Stage: ${label}`}
                  />
                  <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                    {costByStageData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {costByInitData.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-display text-base">Custo por Iniciativa (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={costByInitData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis type="number" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [`$${value}`, "Custo"]}
                  />
                  <Bar dataKey="cost" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

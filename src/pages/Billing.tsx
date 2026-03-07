import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  DollarSign, Zap, FileText, Cpu, AlertTriangle, Settings, TrendingUp,
  CheckCircle2, Crown, Rocket,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line,
} from "recharts";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import { useProductPlans } from "@/hooks/useProductPlans";

const tooltipStyle = {
  backgroundColor: "hsl(225, 22%, 11%)",
  border: "1px solid hsl(225, 15%, 18%)",
  borderRadius: "8px",
  color: "hsl(210, 20%, 92%)",
  fontSize: "12px",
};

const STAGE_LABELS: Record<string, string> = {
  discovery: "Discovery", squad_formation: "Squad", planning: "Planning",
  execution: "Execução", validation: "Validação", publish: "Publish",
  rework: "Rework", reject: "Rejeição",
};

const STAGE_COLORS: Record<string, string> = {
  discovery: "hsl(270, 60%, 60%)", squad_formation: "hsl(210, 100%, 52%)",
  planning: "hsl(38, 92%, 50%)", execution: "hsl(160, 84%, 39%)",
  validation: "hsl(200, 80%, 50%)", publish: "hsl(160, 60%, 45%)",
  rework: "hsl(0, 72%, 51%)", reject: "hsl(0, 50%, 40%)",
};

const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

function PlansSection() {
  const { plans, currentPlan, billingAccount, selectPlan } = useProductPlans();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = currentPlan?.id === plan.id;
        const isEnterprise = plan.plan_name === "Enterprise";

        return (
          <motion.div key={plan.id} variants={item}>
            <Card className={`border-border/50 relative h-full flex flex-col ${isCurrent ? "ring-2 ring-primary" : ""}`}>
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px]">
                  <Crown className="h-3 w-3 mr-1" /> Plano Atual
                </Badge>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg">{plan.plan_name}</CardTitle>
                <CardDescription className="text-2xl font-bold font-display">
                  {isEnterprise ? "Custom" : `$${plan.monthly_price_usd}`}
                  {!isEnterprise && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-2 flex-1">
                  <div className="text-xs text-muted-foreground space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      <span>{plan.max_initiatives_per_month >= 999999 ? "Ilimitadas" : plan.max_initiatives_per_month} iniciativas/mês</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-3 w-3" />
                      <span>{plan.max_tokens_per_month >= 999999999 ? "Custom" : `${(plan.max_tokens_per_month / 1000000).toFixed(0)}M`} tokens</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Rocket className="h-3 w-3" />
                      <span>{plan.max_deployments_per_month >= 999999 ? "Ilimitados" : plan.max_deployments_per_month} deploys/mês</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>{plan.max_parallel_runs} runs paralelos</span>
                    </div>
                  </div>

                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div className="pt-3 border-t border-border/30 space-y-1">
                      {(plan.features as string[]).map((f, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-success mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  className="mt-4 w-full"
                  variant={isCurrent ? "outline" : "default"}
                  size="sm"
                  disabled={isCurrent || selectPlan.isPending}
                  onClick={() => selectPlan.mutate(plan.id)}
                >
                  {isCurrent ? "Selecionado" : isEnterprise ? "Contatar Vendas" : "Selecionar Plano"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function Billing() {
  const { limits, currentUsage, usageLoading, history, saveLimits } = useOrgUsage();
  const { currentPlan } = useProductPlans();

  const [budget, setBudget] = useState(50);
  const [threshold, setThreshold] = useState(80);
  const [hardLimit, setHardLimit] = useState(false);

  useEffect(() => {
    if (limits) {
      setBudget(Number(limits.monthly_budget_usd));
      setThreshold(limits.alert_threshold_pct);
      setHardLimit(limits.hard_limit);
    }
  }, [limits]);

  const usagePct = currentUsage && budget > 0
    ? Math.min((currentUsage.totalCost / budget) * 100, 100)
    : 0;

  const isOverThreshold = usagePct >= threshold;
  const isOverBudget = usagePct >= 100;

  const handleSave = () => {
    saveLimits.mutate({ monthly_budget_usd: budget, alert_threshold_pct: threshold, hard_limit: hardLimit });
  };

  const costByStageData = (currentUsage?.costByStage || []).map(s => ({
    name: STAGE_LABELS[s.stage] || s.stage,
    cost: Number(s.cost.toFixed(4)),
    count: s.count,
    fill: STAGE_COLORS[s.stage] || "hsl(215, 15%, 55%)",
  }));

  const metricCards = [
    {
      title: "Custo Mês Atual",
      value: `$${(currentUsage?.totalCost || 0).toFixed(4)}`,
      subtitle: `de $${budget.toFixed(2)} budget`,
      icon: DollarSign,
      color: isOverBudget ? "text-destructive" : isOverThreshold ? "text-warning" : "text-success",
    },
    {
      title: "Jobs Executados",
      value: currentUsage?.totalJobs || 0,
      subtitle: "este mês",
      icon: Zap,
      color: "text-primary",
    },
    {
      title: "Tokens Consumidos",
      value: (currentUsage?.totalTokens || 0).toLocaleString(),
      subtitle: currentPlan ? `de ${(currentPlan.max_tokens_per_month / 1000000).toFixed(0)}M` : "este mês",
      icon: Cpu,
      color: "text-info",
    },
    {
      title: "Artefatos Gerados",
      value: currentUsage?.totalArtifacts || 0,
      subtitle: "este mês",
      icon: FileText,
      color: "text-accent",
    },
  ];

  return (
    <AppLayout>
      <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-muted-foreground mt-1">Planos, consumo, limites e histórico de gastos</p>
        </div>

        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList>
            <TabsTrigger value="usage">Consumo</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-6">
            {/* Usage gauge */}
            <motion.div variants={item}>
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    Consumo do Mês
                    {currentPlan && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        <Crown className="h-3 w-3 mr-1" /> {currentPlan.plan_name}
                      </Badge>
                    )}
                    {isOverBudget && (
                      <Badge variant="destructive" className="text-[10px]">Acima do Budget</Badge>
                    )}
                    {isOverThreshold && !isOverBudget && (
                      <Badge variant="outline" className="border-warning/50 text-warning text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Alerta
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={usagePct} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${(currentUsage?.totalCost || 0).toFixed(4)} utilizado</span>
                    <span>{usagePct.toFixed(1)}% do budget</span>
                    <span>${budget.toFixed(2)} limite</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Metric cards */}
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

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {costByStageData.length > 0 && (
                <motion.div variants={item}>
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="font-display text-base">Custo por Stage (Mês Atual)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={costByStageData} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
                          <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value}`, "Custo"]} />
                          <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                            {costByStageData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {(currentUsage?.costByDay || []).length > 0 && (
                <motion.div variants={item}>
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="font-display text-base">Custo Diário</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={currentUsage?.costByDay} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
                          <XAxis
                            dataKey="day"
                            tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
                            axisLine={false} tickLine={false}
                            tickFormatter={(v) => v.slice(5)}
                          />
                          <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value}`, "Custo"]} />
                          <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Historical */}
            {history.length > 0 && (
              <motion.div variants={item}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Histórico Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={history.map(h => ({
                        month: h.month_start.slice(0, 7),
                        cost: Number(Number(h.total_cost_usd).toFixed(4)),
                        jobs: h.total_jobs,
                      }))} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
                        <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`$${value}`, "Custo"]} />
                        <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <motion.div variants={item}>
              <h2 className="font-display text-xl font-semibold mb-4">Escolha seu Plano</h2>
              <PlansSection />
            </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <motion.div variants={item}>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" /> Configurações de Limites
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-xs">Budget Mensal (USD)</Label>
                      <Input
                        id="budget"
                        type="number"
                        min={0}
                        step={1}
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold" className="text-xs">Alerta em (%)</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min={1}
                        max={100}
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Hard Limit</Label>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch checked={hardLimit} onCheckedChange={setHardLimit} />
                        <span className="text-xs text-muted-foreground">
                          {hardLimit ? "Bloqueia execuções ao atingir budget" : "Apenas alerta"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleSave} disabled={saveLimits.isPending} size="sm">
                    {saveLimits.isPending ? "Salvando…" : "Salvar Configurações"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AppLayout>
  );
}

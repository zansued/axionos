import { useState, useEffect, useCallback, useMemo } from "react";
import { Cpu, ShieldAlert, GitBranch, Gauge, Layers, Building2, Orbit, SlidersHorizontal, FlaskConical, Anchor, Lightbulb, SearchCode, Compass, Beaker, MapIcon, Box, Target, ArrowRightLeft, Briefcase, Workflow, ShieldCheck } from "lucide-react";
import { AgentMemoryPanel } from "@/components/agents/AgentMemoryPanel";
import { CostsDashboard } from "@/components/observability/CostsDashboard";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, Radio, Users, Zap, Clock, CircleDot, Pause, Play,
  DollarSign, AlertTriangle, TrendingUp, BarChart3, Timer, Trophy, Brain, Bug, Shield, GraduationCap, FileText, Wrench,
} from "lucide-react";
import { RepairIntelligenceDashboard } from "@/components/observability/RepairIntelligenceDashboard";
import { AgentMemoryDashboard } from "@/components/observability/AgentMemoryDashboard";
import { PredictiveErrorDashboard } from "@/components/observability/PredictiveErrorDashboard";
import { ErrorPatternRadar } from "@/components/observability/ErrorPatternRadar";
import { PreventionDashboard } from "@/components/observability/PreventionDashboard";
import { LearningFoundationDashboard } from "@/components/observability/LearningFoundationDashboard";
import { EngineeringMemoryDashboard } from "@/components/observability/EngineeringMemoryDashboard";
import { MemorySummariesPanel } from "@/components/observability/MemorySummariesPanel";
import { CrossStageLearningDashboard } from "@/components/observability/CrossStageLearningDashboard";
import { ExecutionPolicyDashboard } from "@/components/observability/ExecutionPolicyDashboard";
import { ExecutionPolicyPortfolioDashboard } from "@/components/observability/ExecutionPolicyPortfolioDashboard";
import { TenantAdaptivePolicyDashboard } from "@/components/observability/TenantAdaptivePolicyDashboard";
import { PlatformIntelligenceDashboard } from "@/components/observability/PlatformIntelligenceDashboard";
import { PlatformSelfCalibrationDashboard } from "@/components/observability/PlatformSelfCalibrationDashboard";
import { ExecutionStrategyEvolutionDashboard } from "@/components/observability/ExecutionStrategyEvolutionDashboard";
import { StrategyPortfolioDashboard } from "@/components/observability/StrategyPortfolioDashboard";
import { PlatformStabilizationDashboard } from "@/components/observability/PlatformStabilizationDashboard";
import { EngineeringAdvisorDashboard } from "@/components/observability/EngineeringAdvisorDashboard";
import { SemanticRetrievalDashboard } from "@/components/observability/SemanticRetrievalDashboard";
import { DiscoveryArchitectureDashboard } from "@/components/observability/DiscoveryArchitectureDashboard";
import { ArchitectureSimulationDashboard } from "@/components/observability/ArchitectureSimulationDashboard";
import { ArchitectureChangePlanningDashboard } from "@/components/observability/ArchitectureChangePlanningDashboard";
import { ArchitectureRolloutSandboxDashboard } from "@/components/observability/ArchitectureRolloutSandboxDashboard";
import { ArchitectureRolloutPilotDashboard } from "@/components/observability/ArchitectureRolloutPilotDashboard";
import { ArchitectureMigrationDashboard } from "@/components/observability/ArchitectureMigrationDashboard";
import { ArchitecturePortfolioGovernanceDashboard } from "@/components/observability/ArchitecturePortfolioGovernanceDashboard";
import { ArchitectureFitnessDashboard } from "@/components/observability/ArchitectureFitnessDashboard";
import { ChangeAdvisoryOrchestratorDashboard } from "@/components/observability/ChangeAdvisoryOrchestratorDashboard";
import { PlatformStabilizationV2Dashboard } from "@/components/observability/PlatformStabilizationV2Dashboard";
import { TenantArchitectureModesDashboard } from "@/components/observability/TenantArchitectureModesDashboard";
import { EconomicOptimizationDashboard } from "@/components/observability/EconomicOptimizationDashboard";
import { PlatformConvergenceDashboard } from "@/components/observability/PlatformConvergenceDashboard";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

type LiveEvent = {
  id: string;
  type: "agent" | "story" | "audit";
  action: string;
  message: string;
  timestamp: string;
  severity?: string;
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

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-yellow-500/20 text-yellow-400",
  error: "bg-destructive/20 text-destructive",
  critical: "bg-destructive/20 text-destructive",
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatTimeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s atrás`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
  return `${Math.floor(diff / 3600000)}h atrás`;
}

export default function Observability() {
  const { currentOrg } = useOrg();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "error">("connecting");

  const addEvent = useCallback((event: LiveEvent) => {
    if (paused) return;
    setEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [event, ...prev].slice(0, 200);
    });
  }, [paused]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("observability-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        const row = payload.new as any;
        addEvent({ id: `audit-${row.id}`, type: "audit", action: row.action, message: row.message, timestamp: row.created_at, severity: row.severity });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, (payload) => {
        const row = (payload.new || payload.old) as any;
        addEvent({ id: `agent-${row.id}-${Date.now()}`, type: "agent", action: payload.eventType, message: `Agente "${row.name || "?"}" ${payload.eventType === "INSERT" ? "criado" : "atualizado"}`, timestamp: new Date().toISOString() });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, (payload) => {
        const row = (payload.new || payload.old) as any;
        addEvent({ id: `story-${row.id}-${Date.now()}`, type: "story", action: payload.eventType, message: `Story "${row.title || "?"}" ${payload.eventType === "INSERT" ? "criada" : "atualizada"}`, timestamp: new Date().toISOString() });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setConnectionStatus("error");
      });
    return () => { supabase.removeChannel(channel); };
  }, [addEvent]);

  // Recent audit logs
  const { data: recentLogs } = useQuery({
    queryKey: ["recent-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  useEffect(() => {
    if (recentLogs) {
      const mapped = recentLogs.map((log: any) => ({
        id: `audit-${log.id}`, type: "audit" as const, action: log.action, message: log.message, timestamp: log.created_at, severity: log.severity,
      }));
      setEvents((prev) => {
        const existing = new Set(prev.map((e) => e.id));
        const newOnes = mapped.filter((e: LiveEvent) => !existing.has(e.id));
        return [...prev, ...newOnes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
      });
    }
  }, [recentLogs]);

  // Agents with outputs for performance metrics
  const { data: agents = [] } = useQuery({
    queryKey: ["obs-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("*").eq("status", "active");
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: outputs = [] } = useQuery({
    queryKey: ["obs-outputs", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_outputs")
        .select("*, agents(name, role)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: validations = [] } = useQuery({
    queryKey: ["obs-validations", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase
        .from("validation_runs")
        .select("*, agent_outputs(organization_id, agent_id)")
        .order("executed_at", { ascending: false });
      return data?.filter((v: any) => v.agent_outputs?.organization_id === currentOrg!.id) || [];
    },
    refetchInterval: 15000,
  });

  const { data: inProgressCount = 0 } = useQuery({
    queryKey: ["obs-in-progress"],
    queryFn: async () => {
      const { count } = await supabase.from("stories").select("*", { count: "exact", head: true }).eq("status", "in_progress");
      return count ?? 0;
    },
    refetchInterval: 10000,
  });

  // ============ Computed Metrics ============

  const totalCost = useMemo(() => outputs.reduce((acc: number, o: any) => acc + Number(o.cost_estimate || 0), 0), [outputs]);
  const totalTokens = useMemo(() => outputs.reduce((acc: number, o: any) => acc + (o.tokens_used || 0), 0), [outputs]);
  const errorRate = useMemo(() => {
    if (validations.length === 0) return 0;
    const fails = validations.filter((v: any) => v.result === "fail").length;
    return Math.round((fails / validations.length) * 100);
  }, [validations]);

  // Cost per agent
  const costByAgent = useMemo(() => {
    const map = new Map<string, { name: string; cost: number; tokens: number; count: number }>();
    outputs.forEach((o: any) => {
      const name = o.agents?.name || "Desconhecido";
      const entry = map.get(name) || { name, cost: 0, tokens: 0, count: 0 };
      entry.cost += Number(o.cost_estimate || 0);
      entry.tokens += o.tokens_used || 0;
      entry.count += 1;
      map.set(name, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [outputs]);

  // Cost by model
  const costByModel = useMemo(() => {
    const map = new Map<string, { name: string; cost: number; count: number }>();
    outputs.forEach((o: any) => {
      const model = o.model_used || "unknown";
      const entry = map.get(model) || { name: model, cost: 0, count: 0 };
      entry.cost += Number(o.cost_estimate || 0);
      entry.count += 1;
      map.set(model, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [outputs]);

  // Output type distribution
  const outputsByType = useMemo(() => {
    const map = new Map<string, number>();
    const labels: Record<string, string> = { code: "Código", content: "Conteúdo", decision: "Decisão", analysis: "Análise" };
    outputs.forEach((o: any) => {
      const label = labels[o.type] || o.type;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [outputs]);

  // Validation results
  const validationStats = useMemo(() => {
    const pass = validations.filter((v: any) => v.result === "pass").length;
    const fail = validations.filter((v: any) => v.result === "fail").length;
    const pending = validations.filter((v: any) => v.result === "pending").length;
    return [
      { name: "Pass", value: pass },
      { name: "Fail", value: fail },
      { name: "Pending", value: pending },
    ].filter(d => d.value > 0);
  }, [validations]);

  // Daily cost timeline (last 7 days)
  const dailyCost = useMemo(() => {
    const days = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.set(d.toISOString().slice(0, 10), 0);
    }
    outputs.forEach((o: any) => {
      const day = o.created_at?.slice(0, 10);
      if (days.has(day)) days.set(day, (days.get(day) || 0) + Number(o.cost_estimate || 0));
    });
    return Array.from(days.entries()).map(([date, cost]) => ({
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      cost: Number(cost.toFixed(4)),
    }));
  }, [outputs]);

  // Agent performance ranking
  const agentRanking = useMemo(() => {
    return costByAgent.map((agent) => {
      const agentOutputs = outputs.filter((o: any) => (o.agents?.name || "Desconhecido") === agent.name);
      const agentValidations = validations.filter((v: any) => {
        const outputId = v.artifact_id;
        return agentOutputs.some((o: any) => o.id === outputId);
      });
      const passRate = agentValidations.length > 0
        ? Math.round((agentValidations.filter((v: any) => v.result === "pass").length / agentValidations.length) * 100)
        : 0;
      const avgTokens = agent.count > 0 ? Math.round(agent.tokens / agent.count) : 0;
      return { ...agent, passRate, avgTokens };
    });
  }, [costByAgent, outputs, validations]);

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
              <Radio className={`h-6 w-6 ${connectionStatus === "connected" ? "text-green-400 animate-pulse" : connectionStatus === "error" ? "text-destructive" : "text-yellow-400"}`} />
              Observabilidade
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Monitoramento profundo de performance, custos e qualidade</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`gap-1.5 ${connectionStatus === "connected" ? "border-green-500/30 text-green-400" : connectionStatus === "error" ? "border-destructive/30 text-destructive" : "border-yellow-500/30 text-yellow-400"}`}>
              <CircleDot className="h-3 w-3" />
              {connectionStatus === "connected" ? "Live" : connectionStatus === "error" ? "Erro" : "Conectando..."}
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPaused(!paused)}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? "Retomar" : "Pausar"}
            </Button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <StatCard icon={Users} label="Agentes Ativos" value={agents.length} />
          <StatCard icon={Zap} label="Em Progresso" value={inProgressCount} />
          <StatCard icon={BarChart3} label="Artefatos" value={outputs.length} />
          <StatCard icon={DollarSign} label="Custo Total" value={`$${totalCost.toFixed(4)}`} />
          <StatCard icon={AlertTriangle} label="Taxa de Erro" value={`${errorRate}%`} highlight={errorRate > 30} />
          <StatCard icon={Timer} label="Tokens Totais" value={totalTokens.toLocaleString()} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="performance">
          <TabsList className="grid w-full h-9" style={{ gridTemplateColumns: "repeat(36, 1fr)" }}>
            <TabsTrigger value="convergence" className="text-xs gap-1"><Merge className="h-3 w-3" /> Converge</TabsTrigger>
            <TabsTrigger value="arch-econ" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> ArchEcon</TabsTrigger>
            <TabsTrigger value="tenant-arch" className="text-xs gap-1"><Building2 className="h-3 w-3" /> TenantArch</TabsTrigger>
            <TabsTrigger value="stability-v2" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> StabilityV2</TabsTrigger>
            <TabsTrigger value="change-orch" className="text-xs gap-1"><Workflow className="h-3 w-3" /> ChangeOrch</TabsTrigger>
            <TabsTrigger value="arch-fitness" className="text-xs gap-1"><Activity className="h-3 w-3" /> ArchFitness</TabsTrigger>
            <TabsTrigger value="arch-portfolio" className="text-xs gap-1"><Briefcase className="h-3 w-3" /> ArchPortfolio</TabsTrigger>
            <TabsTrigger value="arch-migrate" className="text-xs gap-1"><ArrowRightLeft className="h-3 w-3" /> ArchMigrate</TabsTrigger>
            <TabsTrigger value="arch-pilot" className="text-xs gap-1"><Target className="h-3 w-3" /> ArchPilot</TabsTrigger>
            <TabsTrigger value="advisor" className="text-xs gap-1"><Lightbulb className="h-3 w-3" /> Advisor</TabsTrigger>
            <TabsTrigger value="arch-plan" className="text-xs gap-1"><MapIcon className="h-3 w-3" /> ArchPlan</TabsTrigger>
            <TabsTrigger value="arch-sandbox" className="text-xs gap-1"><Box className="h-3 w-3" /> ArchSandbox</TabsTrigger>
            <TabsTrigger value="arch-sim" className="text-xs gap-1"><Beaker className="h-3 w-3" /> ArchSim</TabsTrigger>
            <TabsTrigger value="arch-disc" className="text-xs gap-1"><Compass className="h-3 w-3" /> ArchDisc</TabsTrigger>
            <TabsTrigger value="sem-retr" className="text-xs gap-1"><SearchCode className="h-3 w-3" /> SemRetr</TabsTrigger>
            <TabsTrigger value="platform" className="text-xs gap-1"><Orbit className="h-3 w-3" /> PlatInt</TabsTrigger>
            <TabsTrigger value="calibration" className="text-xs gap-1"><SlidersHorizontal className="h-3 w-3" /> Calib</TabsTrigger>
            <TabsTrigger value="stability" className="text-xs gap-1"><Anchor className="h-3 w-3" /> Stability</TabsTrigger>
            <TabsTrigger value="strategy-evo" className="text-xs gap-1"><FlaskConical className="h-3 w-3" /> StratEvo</TabsTrigger>
            <TabsTrigger value="strat-portfolio" className="text-xs gap-1"><Layers className="h-3 w-3" /> StratPort</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs gap-1"><TrendingUp className="h-3 w-3" /> Perf</TabsTrigger>
            <TabsTrigger value="costs" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> Custos</TabsTrigger>
            <TabsTrigger value="quality" className="text-xs gap-1"><Trophy className="h-3 w-3" /> Quality</TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs gap-1"><Bug className="h-3 w-3" /> Patterns</TabsTrigger>
            <TabsTrigger value="prevention" className="text-xs gap-1"><Shield className="h-3 w-3" /> Prev</TabsTrigger>
            <TabsTrigger value="predictive" className="text-xs gap-1"><ShieldAlert className="h-3 w-3" /> Predict</TabsTrigger>
            <TabsTrigger value="repair" className="text-xs gap-1"><Wrench className="h-3 w-3" /> Repair</TabsTrigger>
            <TabsTrigger value="cross-stage" className="text-xs gap-1"><GitBranch className="h-3 w-3" /> X-Stage</TabsTrigger>
            <TabsTrigger value="exec-policy" className="text-xs gap-1"><Gauge className="h-3 w-3" /> ExPol</TabsTrigger>
            <TabsTrigger value="portfolio" className="text-xs gap-1"><Layers className="h-3 w-3" /> Portfolio</TabsTrigger>
            <TabsTrigger value="tenant" className="text-xs gap-1"><Building2 className="h-3 w-3" /> Tenant</TabsTrigger>
            <TabsTrigger value="learning" className="text-xs gap-1"><GraduationCap className="h-3 w-3" /> Learn</TabsTrigger>
            <TabsTrigger value="agent-memory" className="text-xs gap-1"><Cpu className="h-3 w-3" /> AgMem</TabsTrigger>
            <TabsTrigger value="memory" className="text-xs gap-1"><Brain className="h-3 w-3" /> Mem</TabsTrigger>
            <TabsTrigger value="summaries" className="text-xs gap-1"><FileText className="h-3 w-3" /> Sum</TabsTrigger>
            <TabsTrigger value="live" className="text-xs gap-1"><Radio className="h-3 w-3" /> Live</TabsTrigger>
          </TabsList>

          {/* ===== ECONOMIC OPTIMIZATION ===== */}
          <TabsContent value="arch-econ" className="mt-4">
            <EconomicOptimizationDashboard />
          </TabsContent>

          {/* ===== TENANT ARCHITECTURE MODES ===== */}
          <TabsContent value="tenant-arch" className="mt-4">
            <TenantArchitectureModesDashboard />
          </TabsContent>

          {/* ===== PLATFORM STABILIZATION V2 ===== */}
          <TabsContent value="stability-v2" className="mt-4">
            <PlatformStabilizationV2Dashboard />
          </TabsContent>

          {/* ===== ENGINEERING ADVISOR ===== */}
          <TabsContent value="advisor" className="mt-4">
            <EngineeringAdvisorDashboard />
          </TabsContent>

          {/* ===== SEMANTIC RETRIEVAL ===== */}
          <TabsContent value="sem-retr" className="mt-4">
            <SemanticRetrievalDashboard />
          </TabsContent>

          {/* ===== DISCOVERY ARCHITECTURE ===== */}
          <TabsContent value="arch-disc" className="mt-4">
            <DiscoveryArchitectureDashboard />
          </TabsContent>

          {/* ===== ARCHITECTURE SIMULATION ===== */}
          <TabsContent value="arch-sim" className="mt-4">
            <ArchitectureSimulationDashboard />
          </TabsContent>

          {/* ===== ARCHITECTURE CHANGE PLANNING ===== */}
          <TabsContent value="arch-plan" className="mt-4">
            <ArchitectureChangePlanningDashboard />
          </TabsContent>

          {/* ===== ARCHITECTURE ROLLOUT SANDBOX ===== */}
          <TabsContent value="arch-sandbox" className="mt-4">
            <ArchitectureRolloutSandboxDashboard />
          </TabsContent>

          {/* ===== ARCHITECTURE ROLLOUT PILOT ===== */}
          <TabsContent value="arch-pilot" className="mt-4">
            <ArchitectureRolloutPilotDashboard />
          </TabsContent>

          {/* ===== CHANGE ADVISORY ORCHESTRATOR ===== */}
          <TabsContent value="change-orch" className="mt-4">
            <ChangeAdvisoryOrchestratorDashboard />
          </TabsContent>

          {/* ===== ARCHITECTURE FITNESS ===== */}
          <TabsContent value="arch-fitness" className="mt-4">
            <ArchitectureFitnessDashboard />
          </TabsContent>

          {/* ===== ARCHITECTURE PORTFOLIO ===== */}
          <TabsContent value="arch-portfolio" className="mt-4">
            <ArchitecturePortfolioGovernanceDashboard />
          </TabsContent>

          {/* ===== ARCHITECTURE MIGRATION ===== */}
          <TabsContent value="arch-migrate" className="mt-4">
            <ArchitectureMigrationDashboard />
          </TabsContent>
          {/* ===== PLATFORM INTELLIGENCE ===== */}
          <TabsContent value="platform" className="mt-4">
            <PlatformIntelligenceDashboard />
          </TabsContent>

          {/* ===== PLATFORM SELF-CALIBRATION ===== */}
          <TabsContent value="calibration" className="mt-4">
            <PlatformSelfCalibrationDashboard />
          </TabsContent>

          {/* ===== EXECUTION STRATEGY EVOLUTION ===== */}
          <TabsContent value="strategy-evo" className="mt-4">
            <ExecutionStrategyEvolutionDashboard />
          </TabsContent>

          {/* ===== PLATFORM SELF-STABILIZATION ===== */}
          <TabsContent value="stability" className="mt-4">
            <PlatformStabilizationDashboard />
          </TabsContent>

          {/* ===== STRATEGY PORTFOLIO GOVERNANCE ===== */}
          <TabsContent value="strat-portfolio" className="mt-4">
            <StrategyPortfolioDashboard />
          </TabsContent>

          {/* ===== CROSS-STAGE LEARNING ===== */}
          <TabsContent value="cross-stage" className="mt-4">
            <CrossStageLearningDashboard />
          </TabsContent>

          {/* ===== EXECUTION POLICY INTELLIGENCE ===== */}
          <TabsContent value="exec-policy" className="mt-4">
            <ExecutionPolicyDashboard />
          </TabsContent>

          {/* ===== EXECUTION POLICY PORTFOLIO ===== */}
          <TabsContent value="portfolio" className="mt-4">
            <ExecutionPolicyPortfolioDashboard />
          </TabsContent>

          {/* ===== TENANT ADAPTIVE POLICY TUNING ===== */}
          <TabsContent value="tenant" className="mt-4">
            <TenantAdaptivePolicyDashboard />
          </TabsContent>

          {/* ===== PREDICTIVE ERROR DETECTION ===== */}
          <TabsContent value="predictive" className="mt-4">
            <PredictiveErrorDashboard />
          </TabsContent>

          {/* ===== AGENT MEMORY ===== */}
          <TabsContent value="agent-memory" className="mt-4">
            <AgentMemoryDashboard />
          </TabsContent>

          {/* ===== REPAIR INTELLIGENCE ===== */}
          <TabsContent value="repair" className="mt-4">
            <RepairIntelligenceDashboard />
          </TabsContent>

          {/* ===== PERFORMANCE ===== */}
          <TabsContent value="performance" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Agent Ranking */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> Ranking de Agentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agentRanking.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Sem dados de agentes</p>
                  ) : (
                    <div className="space-y-2">
                      {agentRanking.map((agent, i) => (
                        <div key={agent.name} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                          <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">@{agent.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                              <span>{agent.count} outputs</span>
                              <span>{agent.avgTokens.toLocaleString()} tokens/avg</span>
                              <span>${agent.cost.toFixed(4)}</span>
                            </div>
                          </div>
                          <Badge variant={agent.passRate >= 80 ? "default" : agent.passRate >= 50 ? "secondary" : "destructive"} className="text-[10px]">
                            {agent.passRate}% pass
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tokens by Agent Chart */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Tokens por Agente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {costByAgent.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={costByAgent.slice(0, 8)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="tokens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Output type distribution */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display">Distribuição por Tipo de Output</CardTitle>
              </CardHeader>
              <CardContent>
                {outputsByType.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={outputsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {outputsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== CUSTOS ===== */}
          <TabsContent value="costs" className="mt-4">
            <CostsDashboard
              outputs={outputs}
              costByAgent={costByAgent}
              costByModel={costByModel}
              dailyCost={dailyCost}
            />
          </TabsContent>

          {/* ===== QUALIDADE ===== */}
          <TabsContent value="quality" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Validation results pie */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> Resultados de Validação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {validationStats.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhuma validação executada</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={validationStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                          <Cell fill="hsl(142 76% 36%)" />
                          <Cell fill="hsl(0 84% 60%)" />
                          <Cell fill="hsl(38 92% 50%)" />
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Recent validations */}
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-display">Validações Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    {validations.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">Sem validações</p>
                    ) : (
                      <div className="space-y-1.5">
                        {validations.slice(0, 15).map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between rounded-md border border-border/30 bg-muted/10 p-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`h-2 w-2 rounded-full ${v.result === "pass" ? "bg-green-400" : v.result === "fail" ? "bg-destructive" : "bg-yellow-400"}`} />
                              <span className="text-xs truncate">{v.type}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                              {v.duration && <span>{v.duration}ms</span>}
                              <Badge variant={v.result === "pass" ? "default" : "destructive"} className="text-[10px]">{v.result}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== MEMORY ===== */}
          <TabsContent value="memory" className="mt-4">
            <AgentMemoryPanel />
          </TabsContent>

          {/* ===== LIVE FEED ===== */}
          <TabsContent value="live" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Feed de Eventos em Tempo Real
                  {paused && <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400">Pausado</Badge>}
                  <span className="text-[10px] text-muted-foreground font-normal ml-auto">{events.length} eventos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-3">
                  {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Radio className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Aguardando eventos...</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <AnimatePresence initial={false}>
                        {events.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/30 transition-colors"
                          >
                            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug">{event.message}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-muted-foreground font-mono">{formatTime(event.timestamp)}</span>
                                {event.severity && (
                                  <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_BADGE[event.severity] || ""}`}>{event.severity}</Badge>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PATTERNS ===== */}
          <TabsContent value="patterns" className="mt-4">
            <ErrorPatternRadar />
          </TabsContent>

          {/* ===== PREVENTION ===== */}
          <TabsContent value="prevention" className="mt-4">
            <PreventionDashboard />
          </TabsContent>

          {/* ===== LEARNING ===== */}
          <TabsContent value="learning" className="mt-4">
            <LearningFoundationDashboard />
          </TabsContent>

          {/* ===== ENGINEERING MEMORY ===== */}
          <TabsContent value="memory" className="mt-4">
            <EngineeringMemoryDashboard />
          </TabsContent>

          {/* ===== MEMORY SUMMARIES (Sprint 17) ===== */}
          <TabsContent value="summaries" className="mt-4">
            <MemorySummariesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-2.5 p-3">
        <Icon className={`h-4 w-4 shrink-0 ${highlight ? "text-destructive" : "text-primary"}`} />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-base font-bold font-display ${highlight ? "text-destructive" : ""}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

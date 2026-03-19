/**
 * CognitiveArchitectureMap — Living intelligence loop visualization.
 *
 * Shows the continuous lifecycle:
 * Conhecimento → Skills → Capacidades → Agentes → Execução → Resultados → Aprendizado
 *
 * Each node displays live metrics from the platform and links to its
 * respective dashboard for drill-down.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppShell } from "@/components/AppShell";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, Fingerprint, Bot, Zap, Target, RefreshCw,
  AlertTriangle, TrendingUp, ChevronRight, ArrowRight,
  CheckCircle2, XCircle, Clock, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Types ────────────────────────────────────────────────────────────────────

interface LayerMetrics {
  knowledge: {
    patterns: number;
    canonEntries: number;
    healthScore: number;
    portfolioEntries: number;
  };
  skills: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  capabilities: {
    total: number;
    linkedToSkills: number;
    unlinked: number;
    coverage: number;
  };
  agents: {
    total: number;
    active: number;
    avgCapabilities: number;
  };
  execution: {
    recentSubtasks: number;
    completed: number;
    failed: number;
    successRate: number;
  };
  outcomes: {
    totalOutputs: number;
    approved: number;
    rejected: number;
  };
  learning: {
    learningSignals: number;
    canonUpdates: number;
    skillExtractions: number;
  };
}

interface ArchitectureInsight {
  label: string;
  value: string;
  status: "good" | "warning" | "critical";
  detail: string;
}

// ── Data Hook ────────────────────────────────────────────────────────────────

function useCognitiveMetrics(orgId: string | null) {
  return useQuery({
    queryKey: ["cognitive-architecture-map", orgId],
    queryFn: async (): Promise<LayerMetrics> => {
      if (!orgId) throw new Error("No org");

      const sb = supabase as any;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        canonRes,
        skillsRes,
        capsRes,
        agentsRes,
        subtasksRes,
        outputsRes,
        bundlesRes,
        learningSignalsRes,
      ] = await Promise.all([
        sb.from("canon_entries").select("id, confidence_score, approval_status", { count: "exact" }).eq("organization_id", orgId),
        sb.from("engineering_skills").select("id, lifecycle_status", { count: "exact" }).eq("organization_id", orgId),
        sb.from("skill_capabilities").select("id, engineering_skill_id", { count: "exact" }).eq("organization_id", orgId),
        sb.from("agents").select("id, status", { count: "exact" }).eq("organization_id", orgId),
        // story_subtasks has NO organization_id — join through phases→stories→initiatives
        sb.from("story_subtasks")
          .select("id, status, created_at, phase:story_phases!inner(story:stories!inner(initiative:initiatives!inner(organization_id)))")
          .eq("phase.story.initiative.organization_id", orgId)
          .gte("created_at", sevenDaysAgo),
        sb.from("agent_outputs").select("id, status", { count: "exact" }).eq("organization_id", orgId),
        sb.from("skill_bundles").select("id", { count: "exact" }).eq("organization_id", orgId),
        sb.from("operational_learning_signals").select("id", { count: "exact" }).eq("organization_id", orgId),
      ]);

      const canon = canonRes.data || [];
      const skills = skillsRes.data || [];
      const caps = capsRes.data || [];
      const agents = agentsRes.data || [];
      const subtasks = subtasksRes.data || [];
      const outputs = outputsRes.data || [];

      // Knowledge
      const approvedCanon = canon.filter((c: any) => c.approval_status === "approved");
      const avgConfidence = approvedCanon.length > 0
        ? approvedCanon.reduce((sum: number, c: any) => sum + (c.confidence_score || 0), 0) / approvedCanon.length
        : 0;

      // Skills
      const approved = skills.filter((s: any) => s.lifecycle_status === "approved").length;
      const pending = skills.filter((s: any) => ["extracted", "pending_review"].includes(s.lifecycle_status)).length;
      const rejected = skills.filter((s: any) => s.lifecycle_status === "rejected").length;

      // Capabilities
      const linkedSkillIds = new Set(caps.map((c: any) => c.engineering_skill_id).filter(Boolean));
      const totalCaps = caps.length;

      // Agents
      const activeAgents = agents.filter((a: any) => a.status === "active" || !a.status).length;

      // Execution — subtasks joined through phases
      const completedSubtasks = subtasks.filter((s: any) => s.status === "completed").length;
      const failedSubtasks = subtasks.filter((s: any) => s.status === "failed").length;
      const totalSubtasks = subtasks.length;

      // Outcomes
      const approvedOutputs = outputs.filter((o: any) => o.status === "approved" || o.status === "published").length;
      const rejectedOutputs = outputs.filter((o: any) => o.status === "rejected").length;

      return {
        knowledge: {
          patterns: (bundlesRes.data || []).length,
          canonEntries: canon.length,
          healthScore: Math.round(avgConfidence * 100),
          portfolioEntries: approvedCanon.length,
        },
        skills: {
          total: skills.length,
          approved,
          pending,
          rejected,
        },
        capabilities: {
          total: totalCaps,
          linkedToSkills: linkedSkillIds.size,
          unlinked: Math.max(0, totalCaps - linkedSkillIds.size),
          coverage: totalCaps > 0 ? Math.round((linkedSkillIds.size / totalCaps) * 100) : 0,
        },
        agents: {
          total: agents.length,
          active: activeAgents,
          avgCapabilities: agents.length > 0 ? +(totalCaps / agents.length).toFixed(1) : 0,
        },
        execution: {
          recentSubtasks: totalSubtasks,
          completed: completedSubtasks,
          failed: failedSubtasks,
          successRate: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0,
        },
        outcomes: {
          totalOutputs: outputs.length,
          approved: approvedOutputs,
          rejected: rejectedOutputs,
        },
        learning: {
          learningSignals: (learningSignalsRes.data || []).length,
          canonUpdates: approvedCanon.length,
          skillExtractions: skills.length,
        },
      };
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });
}

// ── Layer Node Component ─────────────────────────────────────────────────────

interface LayerNodeProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  metrics: { label: string; value: string | number; icon?: React.ElementType }[];
  color: string;
  navigateTo: string;
  index: number;
  isLast?: boolean;
}

function LayerNode({ title, subtitle, icon: Icon, metrics, color, navigateTo, index, isLast }: LayerNodeProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
    >
      <button
        onClick={() => navigate(navigateTo)}
        className="group block w-full text-left focus:outline-none"
      >
        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full ${color}`}>
          {/* Top accent bar */}
          <div className={`h-1 w-full ${color.includes("border-blue") ? "bg-blue-500" : color.includes("border-emerald") ? "bg-emerald-500" : color.includes("border-red") ? "bg-red-500" : color.includes("border-amber") ? "bg-amber-500" : color.includes("border-violet") ? "bg-violet-500" : color.includes("border-cyan") ? "bg-cyan-500" : "bg-primary"}`} />

          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${color.includes("border-blue") ? "bg-blue-500/10 text-blue-500" : color.includes("border-emerald") ? "bg-emerald-500/10 text-emerald-500" : color.includes("border-red") ? "bg-red-500/10 text-red-500" : color.includes("border-amber") ? "bg-amber-500/10 text-amber-500" : color.includes("border-violet") ? "bg-violet-500/10 text-violet-500" : color.includes("border-cyan") ? "bg-cyan-500/10 text-cyan-500" : "bg-primary/10 text-primary"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xs font-bold truncate">{title}</CardTitle>
                <p className="text-[9px] text-muted-foreground truncate">{subtitle}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 pb-3 pt-0">
            <div className="space-y-1.5">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground truncate mr-1">{m.label}</span>
                  <span className="font-semibold tabular-nums">{m.value}</span>
                </div>
              ))}
            </div>
          </CardContent>

          {/* Hover indicator */}
          <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </div>
        </Card>
      </button>
    </motion.div>
  );
}

// ── Learning Loop Connector ──────────────────────────────────────────────────

function LearningLoopConnector() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="flex items-center justify-center mt-4 mb-2"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
        <RefreshCw className="h-3.5 w-3.5 text-primary animate-[spin_8s_linear_infinite]" />
        <span className="text-[11px] font-medium text-muted-foreground">
          Loop Contínuo de Inteligência — resultados retroalimentam o conhecimento
        </span>
        <RefreshCw className="h-3.5 w-3.5 text-primary animate-[spin_8s_linear_infinite_reverse]" />
      </div>
    </motion.div>
  );
}

// ── Insights Panel ───────────────────────────────────────────────────────────

function ArchitectureInsightsPanel({ metrics }: { metrics: LayerMetrics }) {
  const insights = useMemo((): ArchitectureInsight[] => {
    const list: ArchitectureInsight[] = [];

    const skillUtil = metrics.skills.total > 0
      ? Math.round((metrics.skills.approved / metrics.skills.total) * 100)
      : 0;
    list.push({
      label: "Taxa de Aprovação de Skills",
      value: `${skillUtil}%`,
      status: skillUtil >= 60 ? "good" : skillUtil >= 30 ? "warning" : "critical",
      detail: `${metrics.skills.approved} de ${metrics.skills.total} skills aprovadas`,
    });

    list.push({
      label: "Cobertura de Capacidades",
      value: `${metrics.capabilities.coverage}%`,
      status: metrics.capabilities.coverage >= 70 ? "good" : metrics.capabilities.coverage >= 40 ? "warning" : "critical",
      detail: `${metrics.capabilities.linkedToSkills} capacidades com suporte de skills`,
    });

    list.push({
      label: "Capacidades/Agente (média)",
      value: `${metrics.agents.avgCapabilities}`,
      status: metrics.agents.avgCapabilities >= 2 ? "good" : metrics.agents.avgCapabilities >= 1 ? "warning" : "critical",
      detail: `${metrics.capabilities.total} capacidades em ${metrics.agents.total} agentes`,
    });

    list.push({
      label: "Taxa de Sucesso de Execução",
      value: `${metrics.execution.successRate}%`,
      status: metrics.execution.successRate >= 80 ? "good" : metrics.execution.successRate >= 50 ? "warning" : "critical",
      detail: `${metrics.execution.completed} concluídas, ${metrics.execution.failed} falharam (7d)`,
    });

    list.push({
      label: "Saúde do Conhecimento",
      value: `${metrics.knowledge.healthScore}%`,
      status: metrics.knowledge.healthScore >= 60 ? "good" : metrics.knowledge.healthScore >= 40 ? "warning" : "critical",
      detail: `Confiança média de ${metrics.knowledge.portfolioEntries} entradas promovidas`,
    });

    return list;
  }, [metrics]);

  const risks = useMemo(() => {
    const warnings: { label: string; detail: string }[] = [];

    if (metrics.capabilities.unlinked > 0) {
      warnings.push({
        label: "Capacidades sem suporte de skills",
        detail: `${metrics.capabilities.unlinked} capacidades sem skills de engenharia vinculadas`,
      });
    }
    if (metrics.skills.pending > metrics.skills.approved) {
      warnings.push({
        label: "Baixa taxa de aprovação de skills",
        detail: `${metrics.skills.pending} pendentes vs ${metrics.skills.approved} aprovadas`,
      });
    }
    if (metrics.knowledge.healthScore < 50) {
      warnings.push({
        label: "Degradação da saúde do conhecimento",
        detail: `Confiança média em ${metrics.knowledge.healthScore}%`,
      });
    }
    if (metrics.agents.total > 0 && metrics.capabilities.total === 0) {
      warnings.push({
        label: "Agentes sem cobertura de capacidades",
        detail: `${metrics.agents.total} agentes mas 0 capacidades com suporte de skills`,
      });
    }

    return warnings;
  }, [metrics]);

  const statusIcon = (status: ArchitectureInsight["status"]) => {
    switch (status) {
      case "good": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "critical": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
    >
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Insights da Arquitetura</CardTitle>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Sinais automatizados de saúde do loop de inteligência
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  {statusIcon(insight.status)}
                  <span className="text-xs font-medium">{insight.label}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${
                    insight.status === "good" ? "border-emerald-500/30 text-emerald-600"
                    : insight.status === "warning" ? "border-amber-500/30 text-amber-600"
                    : "border-red-500/30 text-red-600"
                  }`}
                >
                  {insight.value}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground ml-5">{insight.detail}</p>
            </div>
          ))}

          {risks.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600">Indicadores de Risco</span>
                </div>
                <div className="space-y-1.5">
                  {risks.map((risk, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-medium">{risk.label}</p>
                        <p className="text-[10px] text-muted-foreground">{risk.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CognitiveArchitectureMap() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? null;
  const { data: metrics, isLoading } = useCognitiveMetrics(orgId);

  const layers = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        title: "Conhecimento",
        subtitle: "Memória & aprendizado",
        icon: BookOpen,
        color: "border-blue-500/40 hover:border-blue-500",
        navigateTo: "/owner/canon-intelligence",
        metrics: [
          { label: "Entradas Canon", value: metrics.knowledge.canonEntries },
          { label: "Promovidas", value: metrics.knowledge.portfolioEntries },
          { label: "Saúde", value: `${metrics.knowledge.healthScore}%` },
        ],
      },
      {
        title: "Skills",
        subtitle: "Conhecimento extraído",
        icon: Brain,
        color: "border-emerald-500/40 hover:border-emerald-500",
        navigateTo: "/owner/knowledge-portfolio",
        metrics: [
          { label: "Total", value: metrics.skills.total },
          { label: "Aprovadas", value: metrics.skills.approved },
          { label: "Pendentes", value: metrics.skills.pending },
        ],
      },
      {
        title: "Capacidades",
        subtitle: "Habilidades estruturadas",
        icon: Fingerprint,
        color: "border-violet-500/40 hover:border-violet-500",
        navigateTo: "/owner/capabilities",
        metrics: [
          { label: "Total", value: metrics.capabilities.total },
          { label: "Com skills", value: metrics.capabilities.linkedToSkills },
          { label: "Cobertura", value: `${metrics.capabilities.coverage}%` },
        ],
      },
      {
        title: "Agentes",
        subtitle: "Atores autônomos",
        icon: Bot,
        color: "border-amber-500/40 hover:border-amber-500",
        navigateTo: "/owner/agent-swarm",
        metrics: [
          { label: "Total", value: metrics.agents.total },
          { label: "Ativos", value: metrics.agents.active },
          { label: "Média caps", value: metrics.agents.avgCapabilities },
        ],
      },
      {
        title: "Execução",
        subtitle: "Operações em runtime",
        icon: Zap,
        color: "border-cyan-500/40 hover:border-cyan-500",
        navigateTo: "/builder/runtime",
        metrics: [
          { label: "Tarefas (7d)", value: metrics.execution.recentSubtasks },
          { label: "Concluídas", value: metrics.execution.completed },
          { label: "Sucesso", value: `${metrics.execution.successRate}%` },
        ],
      },
      {
        title: "Resultados",
        subtitle: "Impacto operacional",
        icon: Target,
        color: "border-red-500/40 hover:border-red-500",
        navigateTo: "/owner/delivery-outcomes",
        metrics: [
          { label: "Outputs", value: metrics.outcomes.totalOutputs },
          { label: "Aprovados", value: metrics.outcomes.approved },
          { label: "Rejeitados", value: metrics.outcomes.rejected },
        ],
      },
      {
        title: "Aprendizado",
        subtitle: "Loop de feedback",
        icon: RefreshCw,
        color: "border-blue-500/40 hover:border-blue-500",
        navigateTo: "/owner/knowledge-health",
        metrics: [
          { label: "Atualizações Canon", value: metrics.learning.canonUpdates },
          { label: "Extrações", value: metrics.learning.skillExtractions },
          { label: "Sinais", value: metrics.learning.learningSignals || "—" },
        ],
      },
    ];
  }, [metrics]);

  if (isLoading || !metrics) {
    return (
      <AppShell>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold">Mapa da Arquitetura Cognitiva</h1>
            <p className="text-sm text-muted-foreground">Carregando loop de inteligência…</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <TooltipProvider delayDuration={200}>
      <div className="p-6 space-y-6 max-w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Mapa da Arquitetura Cognitiva</h1>
              <p className="text-sm text-muted-foreground">
                Como o sistema percebe, aprende, protege, executa e evolui
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main content: flow + insights */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Architecture flow */}
          <div className="flex-1 min-w-0">
            {/* Responsive flow grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
              {layers.map((layer, i) => (
                <LayerNode
                  key={layer.title}
                  title={layer.title}
                  subtitle={layer.subtitle}
                  icon={layer.icon}
                  metrics={layer.metrics}
                  color={layer.color}
                  navigateTo={layer.navigateTo}
                  index={i}
                  isLast={i === layers.length - 1}
                />
              ))}
            </div>

            {/* Learning loop connector */}
            <LearningLoopConnector />

            {/* Summary cards row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4"
            >
              <SummaryCard
                label="Saúde do Loop de Inteligência"
                value={`${Math.round((metrics.knowledge.healthScore + metrics.execution.successRate + metrics.capabilities.coverage) / 3)}%`}
                detail="Média de conhecimento, execução e cobertura"
                trend={metrics.execution.successRate >= 70 ? "up" : "down"}
              />
              <SummaryCard
                label="Conhecimento → Conversão em Skills"
                value={metrics.knowledge.canonEntries > 0
                  ? `${Math.round((metrics.skills.total / metrics.knowledge.canonEntries) * 100)}%`
                  : "—"}
                detail={`${metrics.skills.total} skills de ${metrics.knowledge.canonEntries} entradas canon`}
                trend={metrics.skills.total > 0 ? "up" : "neutral"}
              />
              <SummaryCard
                label="Skill → Vínculo com Capacidade"
                value={metrics.skills.approved > 0
                  ? `${Math.round((metrics.capabilities.linkedToSkills / Math.max(1, metrics.skills.approved)) * 100)}%`
                  : "—"}
                detail={`${metrics.capabilities.linkedToSkills} vínculos de ${metrics.skills.approved} skills aprovadas`}
                trend={metrics.capabilities.linkedToSkills > 0 ? "up" : "neutral"}
              />
              <SummaryCard
                label="Capacidade → Densidade por Agente"
                value={`${metrics.agents.avgCapabilities}`}
                detail={`${metrics.capabilities.total} capacidades / ${metrics.agents.total} agentes`}
                trend={metrics.agents.avgCapabilities >= 1 ? "up" : "down"}
              />
            </motion.div>
          </div>

          {/* Insights panel */}
          <div className="w-full lg:w-[300px] shrink-0">
            <ArchitectureInsightsPanel metrics={metrics} />
          </div>
        </div>
      </div>
    </TooltipProvider>
    </AppShell>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold tabular-nums">{value}</span>
          {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
          {trend === "down" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
      </CardContent>
    </Card>
  );
}

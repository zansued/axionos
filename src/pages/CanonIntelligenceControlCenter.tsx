/**
 * Canon Intelligence Control Center — Sprint 210
 * Meta-Learning Governance: unified control over graph memory, agent feedback,
 * pattern mining, evolution proposals, and canonical audit trail.
 */
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Activity, GitFork, MessageSquare, Pickaxe,
  Sparkles, Shield, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, Eye, Ban,
} from "lucide-react";

import { useCanonGraphMemory } from "@/hooks/useCanonGraphMemory";
import { useAgentLearningFeedback } from "@/hooks/useAgentLearningFeedback";
import { useOperationalPatternMining } from "@/hooks/useOperationalPatternMining";
import { useCanonSelfImprovement, EVOLUTION_ACTION_LABELS, IMPACT_LEVEL_LABELS } from "@/hooks/useCanonSelfImprovement";

/* ─── Stat Card ─── */
function Stat({ label, value, icon: Icon, variant = "default" }: {
  label: string; value: string | number; icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "destructive";
}) {
  const colors = {
    default: "text-primary bg-primary/10",
    success: "text-emerald-500 bg-emerald-500/10",
    warning: "text-yellow-500 bg-yellow-500/10",
    destructive: "text-destructive bg-destructive/10",
  };
  return (
    <Card className="border-border/40 bg-card/80">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Canon Health Overview ─── */
function CanonHealthOverview() {
  const graph = useCanonGraphMemory();
  const feedback = useAgentLearningFeedback();
  const mining = useOperationalPatternMining();
  const evolution = useCanonSelfImprovement();

  const isLoading = graph.nodesLoading || feedback.feedbackLoading || mining.patternsLoading || evolution.proposalsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Stat label="Nós do Grafo" value={graph.stats.totalNodes} icon={GitFork} />
      <Stat label="Arestas do Grafo" value={graph.stats.totalEdges} icon={Activity} />
      <Stat label="Sinais de Feedback" value={feedback.stats.totalFeedback} icon={MessageSquare}
        variant={feedback.stats.totalFeedback > 0 ? "success" : "default"} />
      <Stat label="Padrões Minerados" value={mining.stats.total} icon={Pickaxe}
        variant={mining.stats.confirmed > 0 ? "success" : "default"} />
      <Stat label="Propostas de Evolução" value={evolution.stats.total} icon={Sparkles}
        variant={evolution.stats.pending > 0 ? "warning" : "default"} />
      <Stat label="Bloqueadas" value={evolution.stats.blocked} icon={Shield}
        variant={evolution.stats.blocked > 0 ? "destructive" : "success"} />
    </div>
  );
}

/* ─── Graph Memory Panel ─── */
function GraphMemoryPanel() {
  const { nodes, edges, stats, nodesLoading } = useCanonGraphMemory();

  if (nodesLoading) return <Skeleton className="h-64 rounded-lg" />;

  const topNodes = [...nodes].sort((a, b) => b.centrality_score - a.centrality_score).slice(0, 10);
  const relationDist = stats.relationDistribution;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Nós Principais por Centralidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topNodes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum nó no grafo ainda</p>}
          {topNodes.map((n) => (
            <div key={n.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[10px] shrink-0">{n.node_type}</Badge>
                <span className="truncate text-foreground">{n.label}</span>
              </div>
              <span className="text-muted-foreground font-mono text-xs">{n.centrality_score.toFixed(3)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribuição de Relações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.keys(relationDist).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma aresta ainda</p>}
          {Object.entries(relationDist).sort(([,a],[,b]) => b - a).map(([rel, count]) => (
            <div key={rel} className="flex items-center justify-between text-sm">
              <Badge variant="secondary" className="text-[10px]">{rel}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{count}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border/30 flex justify-between text-xs text-muted-foreground">
            <span>Total de arestas</span>
            <span className="font-mono">{stats.totalEdges}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Agent Feedback Panel ─── */
function AgentFeedbackPanel() {
  const { feedback, stats, feedbackLoading } = useAgentLearningFeedback();

  if (feedbackLoading) return <Skeleton className="h-64 rounded-lg" />;

  const recent = feedback.slice(0, 20);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Stats */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Resumo de Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground">Ativos</span>
              <span className="ml-auto font-mono text-foreground">{stats.activeFeedback}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-muted-foreground">Suprimidos</span>
              <span className="ml-auto font-mono text-foreground">{stats.suppressedFeedback}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border/30 space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Por Direção</p>
            {Object.entries(stats.byDirection).map(([dir, count]) => (
              <div key={dir} className="flex justify-between text-sm">
                <Badge variant={dir === "reinforce" ? "default" : dir === "degrade" ? "destructive" : "secondary"}
                  className="text-[10px]">{dir}</Badge>
                <span className="font-mono text-xs">{count}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border/30 space-y-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Por Categoria</p>
            {Object.entries(stats.byCategory).sort(([,a],[,b]) => b - a).map(([cat, count]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-muted-foreground text-xs truncate">{cat.replace(/_/g, " ")}</span>
                <span className="font-mono text-xs">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent */}
      <Card className="border-border/40 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Feedback Recente ({recent.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Nenhum feedback registrado ainda</p>}
            {recent.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs border-b border-border/20 pb-1.5">
                {f.impact_direction === "reinforce" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : f.impact_direction === "degrade" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <Badge variant="outline" className="text-[9px] shrink-0">{f.category.replace(/_/g, " ")}</Badge>
                <span className="text-muted-foreground truncate">{f.agent_type} · {f.pipeline_stage}</span>
                <span className={`ml-auto font-mono ${f.suppressed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  Δ{f.applied_confidence_delta >= 0 ? "+" : ""}{f.applied_confidence_delta.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Pattern Mining Panel ─── */
function PatternMiningPanel() {
  const { patterns, stats, patternsLoading } = useOperationalPatternMining();

  if (patternsLoading) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Resumo de Mineração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-[11px]">Total</p>
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">Confirmados</p>
              <p className="text-lg font-bold text-emerald-500">{stats.confirmed}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">Proposáveis</p>
              <p className="text-lg font-bold text-primary">{stats.proposable}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">Ruído Filtrado</p>
              <p className="text-lg font-bold text-muted-foreground">{stats.noiseFiltered}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Por Tipo</p>
            {Object.entries(stats.byType).sort(([,a],[,b]) => b - a).map(([t, c]) => (
              <div key={t} className="flex justify-between text-sm">
                <span className="text-muted-foreground text-xs">{t.replace(/_/g, " ")}</span>
                <span className="font-mono text-xs">{c}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Padrões ({patterns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {patterns.length === 0 && <p className="text-sm text-muted-foreground">Nenhum padrão minerado ainda</p>}
            {patterns.slice(0, 20).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs border-b border-border/20 pb-1.5">
                <Badge variant={
                  p.status === "confirmed" ? "default" :
                  p.status === "candidate_proposed" ? "secondary" :
                  p.status === "noise" || p.status === "dismissed" ? "outline" : "outline"
                } className="text-[9px] shrink-0">{p.status}</Badge>
                <span className="text-foreground truncate font-medium">{p.title}</span>
                <span className="text-muted-foreground shrink-0">×{p.occurrence_count}</span>
                <span className="ml-auto font-mono text-muted-foreground">
                  conf: {p.confidence_score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Evolution Proposals Panel ─── */
function EvolutionProposalsPanel() {
  const { proposals, stats, proposalsLoading, reviewProposal, blockProposal } = useCanonSelfImprovement();

  if (proposalsLoading) return <Skeleton className="h-64 rounded-lg" />;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Pendentes" value={stats.pending} icon={Eye} variant={stats.pending > 0 ? "warning" : "default"} />
        <Stat label="Aprovadas" value={stats.approved} icon={CheckCircle2} variant="success" />
        <Stat label="Rejeitadas" value={stats.rejected} icon={XCircle} variant="destructive" />
        <Stat label="Bloqueadas" value={stats.blocked} icon={Shield} variant={stats.blocked > 0 ? "destructive" : "default"} />
        <Stat label="Prioridade Média" value={stats.avgPriority.toFixed(2)} icon={TrendingUp} />
      </div>

      {/* By Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Nível de Impacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(stats.byImpact).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma proposta ainda</p>}
            {Object.entries(stats.byImpact).sort(([a],[b]) => {
              const order = ["critical","high","medium","low"];
              return order.indexOf(a) - order.indexOf(b);
            }).map(([level, count]) => (
              <div key={level} className="flex justify-between text-sm">
                <Badge variant={
                  level === "critical" ? "destructive" :
                  level === "high" ? "destructive" :
                  level === "medium" ? "secondary" : "outline"
                } className="text-[10px]">
                  {IMPACT_LEVEL_LABELS[level as keyof typeof IMPACT_LEVEL_LABELS] || level}
                </Badge>
                <span className="font-mono text-xs">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Tipo de Ação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(stats.byAction).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma proposta ainda</p>}
            {Object.entries(stats.byAction).sort(([,a],[,b]) => b - a).map(([action, count]) => (
              <div key={action} className="flex justify-between text-sm">
                <Badge variant="outline" className="text-[10px]">
                  {EVOLUTION_ACTION_LABELS[action as keyof typeof EVOLUTION_ACTION_LABELS] || action}
                </Badge>
                <span className="font-mono text-xs">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Proposal list */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Fila de Propostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {proposals.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma proposta de evolução ainda</p>}
            {proposals.slice(0, 30).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs border-b border-border/20 pb-2">
                <Badge variant={
                  p.status === "approved" ? "default" :
                  p.status === "rejected" ? "destructive" :
                  p.blocked ? "destructive" : "secondary"
                } className="text-[9px] shrink-0">
                  {p.blocked ? "BLOQUEADA" : p.status}
                </Badge>
                <Badge variant="outline" className="text-[9px] shrink-0">{p.impact_level}</Badge>
                <span className="text-foreground truncate font-medium">{p.title}</span>
                <span className="ml-auto font-mono text-muted-foreground shrink-0">
                  pri: {p.priority_score.toFixed(2)}
                </span>
                {p.requires_human_review && (
                  <Shield className="h-3 w-3 text-yellow-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Thresholds & Policies Panel ─── */
function ThresholdsPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Salvaguardas de Auto-Aprimoramento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Máx. propostas/dia</span>
            <Badge variant="outline">20</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Limite auto-aprovação</span>
            <Badge variant="outline">confiança ≥ 0.7 + apenas baixo impacto</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revisão humana obrigatória</span>
            <Badge variant="outline">médio, alto, crítico</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supressão de ruído</span>
            <Badge variant="outline">ruído &gt; 0.6 → suprimir</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Força mín. de sinal</span>
            <Badge variant="outline">≥ 0.2</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Limiares de Mineração de Padrões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mín. ocorrências p/ confirmar</span>
            <Badge variant="outline">3</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mín. confiança p/ candidato</span>
            <Badge variant="outline">0.6</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Limiar de ruído</span>
            <Badge variant="outline">0.65</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mín. taxa de sucesso (positivo)</span>
            <Badge variant="outline">0.6</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Feedback Δ reforço máx.</span>
            <Badge variant="outline">+0.005 a +0.05</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Feedback Δ degradação máx.</span>
            <Badge variant="outline">-0.01 a -0.08</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CanonIntelligenceControlCenter() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Centro de Controle de Inteligência Canon
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governança de meta-aprendizado — monitorar, revisar e controlar todos os subsistemas de inteligência canônica.
          </p>
        </div>

        <CanonHealthOverview />

        <Tabs defaultValue="graph" className="space-y-4">
          <TabsList className="bg-secondary/50 flex-wrap h-auto p-1">
            <TabsTrigger value="graph" className="text-xs">Memória em Grafo</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs">Feedback de Agentes</TabsTrigger>
            <TabsTrigger value="mining" className="text-xs">Mineração de Padrões</TabsTrigger>
            <TabsTrigger value="evolution" className="text-xs">Propostas de Evolução</TabsTrigger>
            <TabsTrigger value="thresholds" className="text-xs">Limiares e Políticas</TabsTrigger>
          </TabsList>

          <TabsContent value="graph"><GraphMemoryPanel /></TabsContent>
          <TabsContent value="feedback"><AgentFeedbackPanel /></TabsContent>
          <TabsContent value="mining"><PatternMiningPanel /></TabsContent>
          <TabsContent value="evolution"><EvolutionProposalsPanel /></TabsContent>
          <TabsContent value="thresholds"><ThresholdsPanel /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

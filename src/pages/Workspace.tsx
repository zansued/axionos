import { useState, useCallback } from "react";
import { getUserFriendlyError } from "@/lib/error-utils";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bot, Play, CheckCircle2, Clock, AlertTriangle, Loader2, Sparkles,
  ChevronDown, ChevronRight, FileText, Zap, BarChart3, Map, Hammer,
  GitCompare, ShieldCheck, Lightbulb, Package, Radio, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const SUBTASK_STATUS: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-muted-foreground" },
  in_progress: { label: "Executando", icon: Loader2, color: "text-blue-400" },
  completed: { label: "Concluído", icon: CheckCircle2, color: "text-green-400" },
  failed: { label: "Falhou", icon: AlertTriangle, color: "text-destructive" },
};

export default function Workspace() {
  const { user } = useAuth();
  const { currentOrg, currentWorkspace } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [executingSubtasks, setExecutingSubtasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("execution");

  // --- Data queries ---
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories-with-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, agents(name, role), story_phases(*, story_subtasks(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: planning = [] } = useQuery({
    queryKey: ["planning-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: outputs = [] } = useQuery({
    queryKey: ["workspace-outputs", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_outputs")
        .select("*, agents(name, role)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: adrs = [] } = useQuery({
    queryKey: ["workspace-adrs", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adrs")
        .select("*, agent_outputs(organization_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data?.filter((a: any) => a.agent_outputs?.organization_id === currentOrg!.id) || [];
    },
  });

  const { data: validations = [] } = useQuery({
    queryKey: ["workspace-validations", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_runs")
        .select("*, agent_outputs(organization_id, summary)")
        .order("executed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data?.filter((v: any) => v.agent_outputs?.organization_id === currentOrg!.id) || [];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["workspace-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("category", "execution")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const filteredStories = selectedAgent === "all"
    ? stories
    : stories.filter((s: any) => s.assigned_agent_id === selectedAgent);

  // --- Execution logic ---
  const executeSubtask = useCallback(async (subtaskId: string, agentId: string) => {
    setExecutingSubtasks((prev) => new Set(prev).add(subtaskId));
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-subtask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ subtaskId, agentId, organizationId: currentOrg?.id, workspaceId: currentWorkspace?.id }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error);
      }
      toast({ title: "Subtask executada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["stories-with-phases"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-adrs"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-audit"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na execução", description: getUserFriendlyError(e) });
    } finally {
      setExecutingSubtasks((prev) => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  }, [toast, queryClient, currentOrg, currentWorkspace]);

  const executeAllPending = useCallback(async (story: any) => {
    const agentId = story.assigned_agent_id;
    if (!agentId) {
      toast({ variant: "destructive", title: "Sem agente", description: "Atribua um agente à story primeiro." });
      return;
    }
    const pendingSubtasks: string[] = [];
    for (const phase of story.story_phases || []) {
      for (const st of phase.story_subtasks || []) {
        if (st.status === "pending") pendingSubtasks.push(st.id);
      }
    }
    if (pendingSubtasks.length === 0) {
      toast({ title: "Nenhuma subtask pendente." });
      return;
    }
    toast({ title: `Executando ${pendingSubtasks.length} subtask(s)...` });
    for (const id of pendingSubtasks) {
      await executeSubtask(id, agentId);
    }
  }, [executeSubtask, toast]);

  // --- Stats ---
  const totalSubtasks = stories.reduce((acc: number, s: any) =>
    acc + (s.story_phases || []).reduce((a2: number, p: any) => a2 + (p.story_subtasks || []).length, 0), 0);
  const completedSubtasks = stories.reduce((acc: number, s: any) =>
    acc + (s.story_phases || []).reduce((a2: number, p: any) =>
      a2 + (p.story_subtasks || []).filter((st: any) => st.status === "completed").length, 0), 0);
  const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Workspace</h1>
            <p className="text-muted-foreground mt-1 text-sm">Mesa do cirurgião — visão completa do ciclo de desenvolvimento</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{completedSubtasks}/{totalSubtasks}</span>
              <Progress value={progressPct} className="h-1.5 w-20" />
              <span>{progressPct}%</span>
            </div>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Filtrar agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Agentes</SelectItem>
                {agents.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>@{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 h-9">
            <TabsTrigger value="plan" className="text-xs gap-1"><Map className="h-3 w-3" /> Plano</TabsTrigger>
            <TabsTrigger value="execution" className="text-xs gap-1"><Hammer className="h-3 w-3" /> Execução</TabsTrigger>
            <TabsTrigger value="diff" className="text-xs gap-1"><GitCompare className="h-3 w-3" /> Diff</TabsTrigger>
            <TabsTrigger value="validation" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> Validação</TabsTrigger>
            <TabsTrigger value="decisions" className="text-xs gap-1"><Lightbulb className="h-3 w-3" /> Decisões</TabsTrigger>
            <TabsTrigger value="artifacts" className="text-xs gap-1"><Package className="h-3 w-3" /> Artefatos</TabsTrigger>
            <TabsTrigger value="observability" className="text-xs gap-1"><Radio className="h-3 w-3" /> Obs</TabsTrigger>
          </TabsList>

          {/* ===== PLANO ===== */}
          <TabsContent value="plan" className="mt-4 space-y-4">
            {planning.length === 0 ? (
              <EmptyState icon={Map} text="Nenhuma sessão de planejamento. Acesse a página de Planejamento para criar." />
            ) : (
              planning.map((p: any) => (
                <Card key={p.id} className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display">{p.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{p.status}</Badge>
                      {p.prd_content && <Badge variant="secondary" className="text-[10px]">PRD ✓</Badge>}
                      {p.architecture_content && <Badge variant="secondary" className="text-[10px]">Arquitetura ✓</Badge>}
                    </div>
                    {p.prd_content && (
                      <ScrollArea className="mt-3 max-h-[200px] rounded border border-border/30 bg-muted/20 p-3">
                        <pre className="text-xs whitespace-pre-wrap">{p.prd_content.slice(0, 2000)}</pre>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ===== EXECUÇÃO ===== */}
          <TabsContent value="execution" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredStories.length === 0 ? (
              <EmptyState icon={Bot} text="Nenhuma story encontrada. Gere stories no Planejamento." />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredStories.map((story: any) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      isExpanded={expandedStory === story.id}
                      onToggle={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                      executingSubtasks={executingSubtasks}
                      executeSubtask={executeSubtask}
                      executeAllPending={executeAllPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* ===== DIFF ===== */}
          <TabsContent value="diff" className="mt-4 space-y-3">
            {outputs.filter((o: any) => o.type === "code").length === 0 ? (
              <EmptyState icon={GitCompare} text="Nenhum artefato de código gerado. Execute subtasks com agentes Dev/DevOps." />
            ) : (
              outputs.filter((o: any) => o.type === "code").map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GitCompare className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-medium">{o.summary || "Artefato de código"}</span>
                      </div>
                      <Badge variant="outline">{o.status}</Badge>
                    </div>
                    <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {getOutputText(o.raw_output)}
                      </pre>
                    </ScrollArea>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      {o.agents && <span>@{o.agents.name}</span>}
                      <span>{o.tokens_used?.toLocaleString()} tokens</span>
                      <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ===== VALIDAÇÃO ===== */}
          <TabsContent value="validation" className="mt-4 space-y-3">
            {validations.length === 0 ? (
              <EmptyState icon={ShieldCheck} text="Nenhuma validação executada. Valide artefatos na página de Artefatos." />
            ) : (
              validations.map((v: any) => (
                <Card key={v.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`h-4 w-4 ${v.result === "pass" ? "text-green-400" : v.result === "fail" ? "text-destructive" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">{v.type}</span>
                        <span className="text-xs text-muted-foreground">— {v.agent_outputs?.summary || "Artefato"}</span>
                      </div>
                      <Badge variant={v.result === "pass" ? "default" : "destructive"}>{v.result}</Badge>
                    </div>
                    {v.logs && (
                      <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground bg-muted/20 rounded p-2 max-h-[150px] overflow-y-auto">{v.logs}</pre>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {v.duration && `${v.duration}ms • `}{new Date(v.executed_at).toLocaleString("pt-BR")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ===== DECISÕES (ADRs) ===== */}
          <TabsContent value="decisions" className="mt-4 space-y-3">
            {adrs.length === 0 ? (
              <EmptyState icon={Lightbulb} text="Nenhuma ADR. Decisões são geradas automaticamente por agentes Architect." />
            ) : (
              adrs.map((adr: any) => (
                <Card key={adr.id} className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-display flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        {adr.title}
                      </CardTitle>
                      <Badge variant="outline">{adr.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {adr.context && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contexto</p>
                        <p className="text-xs mt-0.5">{adr.context}</p>
                      </div>
                    )}
                    {adr.decision && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Decisão</p>
                        <ScrollArea className="max-h-[200px]">
                          <pre className="text-xs whitespace-pre-wrap mt-0.5">{adr.decision}</pre>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ===== ARTEFATOS ===== */}
          <TabsContent value="artifacts" className="mt-4 space-y-3">
            {outputs.length === 0 ? (
              <EmptyState icon={Package} text="Nenhum artefato. Execute subtasks no Workspace para gerar artefatos rastreáveis." />
            ) : (
              outputs.map((o: any) => {
                const typeLabels: Record<string, string> = { code: "Código", content: "Conteúdo", decision: "Decisão", analysis: "Análise" };
                return (
                  <Card key={o.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{o.summary || "Sem resumo"}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            {o.agents && <span>@{o.agents.name} ({o.agents.role})</span>}
                            <span>{o.model_used}</span>
                            <span>{o.tokens_used?.toLocaleString()} tokens</span>
                            <span>${Number(o.cost_estimate || 0).toFixed(4)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{typeLabels[o.type] || o.type}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{o.status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ===== OBSERVABILIDADE ===== */}
          <TabsContent value="observability" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Subtasks" value={totalSubtasks} />
              <StatCard label="Concluídas" value={completedSubtasks} />
              <StatCard label="Artefatos" value={outputs.length} />
              <StatCard label="ADRs" value={adrs.length} />
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Radio className="h-4 w-4 text-primary" /> Timeline de Execução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Sem eventos de execução registrados.</p>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs">{log.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// --- Reusable sub-components ---

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <Icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm">{text}</p>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

function StoryCard({ story, isExpanded, onToggle, executingSubtasks, executeSubtask, executeAllPending }: any) {
  const phases = story.story_phases || [];
  const storySubtasks = phases.flatMap((p: any) => p.story_subtasks || []);
  const done = storySubtasks.filter((s: any) => s.status === "completed").length;
  const total = storySubtasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasPending = storySubtasks.some((s: any) => s.status === "pending");

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/50">
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="font-display text-sm">{story.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {story.agents && (
                        <Badge variant="outline" className="text-[10px]">
                          <Bot className="h-2.5 w-2.5 mr-1" />@{story.agents.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{done}/{total}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24"><Progress value={pct} className="h-1.5" /></div>
                  <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                  {hasPending && story.assigned_agent_id && (
                    <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={(e) => { e.stopPropagation(); executeAllPending(story); }}>
                      <Play className="h-3 w-3" /> Executar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {phases.sort((a: any, b: any) => a.sort_order - b.sort_order).map((phase: any) => (
                <div key={phase.id} className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{phase.name}</h4>
                  <div className="space-y-1.5 pl-3 border-l-2 border-border/30">
                    {(phase.story_subtasks || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((st: any) => {
                      const statusInfo = SUBTASK_STATUS[st.status] || SUBTASK_STATUS.pending;
                      const StatusIcon = statusInfo.icon;
                      const isExecuting = executingSubtasks.has(st.id);

                      return (
                        <div key={st.id} className="rounded-md border border-border/40 bg-card/50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${statusInfo.color} ${st.status === "in_progress" ? "animate-spin" : ""}`} />
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${st.status === "completed" ? "line-through text-muted-foreground/60" : ""}`}>{st.description}</p>
                                {st.executed_at && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(st.executed_at).toLocaleString("pt-BR")}
                                  </p>
                                )}
                              </div>
                            </div>
                            {(st.status === "pending" || st.status === "failed") && story.assigned_agent_id && (
                              <Button
                                variant="outline" size="sm"
                                className={`h-7 text-xs gap-1 shrink-0 ${st.status === "failed" ? "border-destructive/30 text-destructive" : ""}`}
                                onClick={() => executeSubtask(st.id, story.assigned_agent_id)}
                                disabled={isExecuting}
                              >
                                {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                {st.status === "failed" ? "Retentar" : "Executar"}
                              </Button>
                            )}
                          </div>
                          {st.output && (
                            <div className="mt-2 rounded-md bg-muted/30 border border-border/30 p-3">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <FileText className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Output</span>
                              </div>
                              <pre className="text-xs whitespace-pre-wrap text-foreground/80 max-h-[300px] overflow-y-auto">{st.output}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!story.assigned_agent_id && (
                <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-400">Atribua um agente na página de Stories.</p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}

function getOutputText(raw: any): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw) && "text" in raw) {
    return String(raw.text);
  }
  return JSON.stringify(raw, null, 2);
}

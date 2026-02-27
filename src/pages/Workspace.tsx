import { useState, useCallback } from "react";
import { getUserFriendlyError } from "@/lib/error-utils";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bot, Play, CheckCircle2, Clock, AlertTriangle, Loader2, Sparkles,
  ChevronDown, ChevronRight, FileText, Zap, BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const SUBTASK_STATUS: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-muted-foreground" },
  in_progress: { label: "Executando", icon: Loader2, color: "text-info" },
  completed: { label: "Concluído", icon: CheckCircle2, color: "text-success" },
  failed: { label: "Falhou", icon: AlertTriangle, color: "text-destructive" },
};

export default function Workspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [executingSubtasks, setExecutingSubtasks] = useState<Set<string>>(new Set());

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

  const filteredStories = selectedAgent === "all"
    ? stories
    : stories.filter((s: any) => s.assigned_agent_id === selectedAgent);

  const executeSubtask = useCallback(async (subtaskId: string, agentId: string) => {
    setExecutingSubtasks((prev) => new Set(prev).add(subtaskId));
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-subtask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ subtaskId, agentId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error);
      }
      toast({ title: "Subtask executada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["stories-with-phases"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na execução", description: getUserFriendlyError(e) });
    } finally {
      setExecutingSubtasks((prev) => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  }, [toast, queryClient]);

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

  // Stats
  const totalSubtasks = stories.reduce((acc: number, s: any) =>
    acc + (s.story_phases || []).reduce((a2: number, p: any) => a2 + (p.story_subtasks || []).length, 0), 0);
  const completedSubtasks = stories.reduce((acc: number, s: any) =>
    acc + (s.story_phases || []).reduce((a2: number, p: any) =>
      a2 + (p.story_subtasks || []).filter((st: any) => st.status === "completed").length, 0), 0);
  const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Agent Workspace</h1>
            <p className="text-muted-foreground mt-1">Visualize e execute o trabalho dos agentes</p>
          </div>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Agentes</SelectItem>
              {agents.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>@{a.name} ({a.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary/60" />
              <div>
                <p className="text-2xl font-bold">{progressPct}%</p>
                <p className="text-xs text-muted-foreground">Progresso geral</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="h-8 w-8 text-success/60" />
              <div>
                <p className="text-2xl font-bold">{completedSubtasks}</p>
                <p className="text-xs text-muted-foreground">Subtasks concluídas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-warning/60" />
              <div>
                <p className="text-2xl font-bold">{totalSubtasks - completedSubtasks}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Progresso</p>
              <Progress value={progressPct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{completedSubtasks}/{totalSubtasks} subtasks</p>
            </CardContent>
          </Card>
        </div>

        {/* Stories with execution */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStories.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhuma story encontrada. Gere stories no Planejamento primeiro.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredStories.map((story: any) => {
                const phases = story.story_phases || [];
                const storySubtasks = phases.flatMap((p: any) => p.story_subtasks || []);
                const done = storySubtasks.filter((s: any) => s.status === "completed").length;
                const total = storySubtasks.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const isExpanded = expandedStory === story.id;
                const hasPending = storySubtasks.some((s: any) => s.status === "pending");

                return (
                  <motion.div key={story.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-border/50">
                      <Collapsible open={isExpanded} onOpenChange={() => setExpandedStory(isExpanded ? null : story.id)}>
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
                                        <Bot className="h-2.5 w-2.5 mr-1" />
                                        @{story.agents.name}
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">{done}/{total} subtasks</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="w-24">
                                  <Progress value={pct} className="h-1.5" />
                                </div>
                                <span className="text-xs font-medium w-8 text-right">{pct}%</span>
                                {hasPending && story.assigned_agent_id && (
                                  <Button
                                    size="sm"
                                    className="gap-1.5 h-7 text-xs"
                                    onClick={(e) => { e.stopPropagation(); executeAllPending(story); }}
                                  >
                                    <Play className="h-3 w-3" /> Executar Todas
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
                                              <p className={`text-sm ${st.status === "completed" ? "line-through text-muted-foreground/60" : ""}`}>
                                                {st.description}
                                              </p>
                                              {st.executed_by_agent_id && (
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                  Executado por agente • {st.executed_at ? new Date(st.executed_at).toLocaleString("pt-BR") : ""}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          {st.status === "pending" && story.assigned_agent_id && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs gap-1 shrink-0"
                                              onClick={() => executeSubtask(st.id, story.assigned_agent_id)}
                                              disabled={isExecuting}
                                            >
                                              {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                              Executar
                                            </Button>
                                          )}
                                          {st.status === "failed" && story.assigned_agent_id && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs gap-1 shrink-0 border-destructive/30 text-destructive"
                                              onClick={() => executeSubtask(st.id, story.assigned_agent_id)}
                                              disabled={isExecuting}
                                            >
                                              {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                              Retentar
                                            </Button>
                                          )}
                                        </div>
                                        {st.output && (
                                          <div className="mt-2 rounded-md bg-muted/30 border border-border/30 p-3">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                              <FileText className="h-3 w-3 text-primary" />
                                              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Output do Agente</span>
                                            </div>
                                            <pre className="text-xs whitespace-pre-wrap text-foreground/80 max-h-[300px] overflow-y-auto">
                                              {st.output}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                            {!story.assigned_agent_id && (
                              <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 p-3">
                                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                                <p className="text-xs text-warning">Nenhum agente atribuído a esta story. Atribua um agente na página de Stories para habilitar a execução.</p>
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

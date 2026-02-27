import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Cpu, BookOpen, Users, ArrowRight, CheckCircle2, Circle, Clock, Trash2, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-planning-content`;

async function streamAIContent({
  title, type, existingPrd, onDelta, onDone, onError,
}: {
  title: string; type: "prd" | "architecture"; existingPrd?: string;
  onDelta: (text: string) => void; onDone: () => void; onError: (err: string) => void;
}) {
  const resp = await fetch(GENERATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ title, type, existingPrd }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
    onError(err.error || `Erro ${resp.status}`);
    return;
  }

  if (!resp.body) { onError("Sem resposta do servidor"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

const PIPELINE_STEPS = [
  { key: "prd_draft", label: "PRD", sublabel: "Analyst", icon: FileText, agentRole: "analyst", color: "text-info", bg: "bg-info/10", border: "border-info/30" },
  { key: "architecture", label: "Arquitetura", sublabel: "Architect", icon: Cpu, agentRole: "architect", color: "text-accent", bg: "bg-accent/10", border: "border-accent/30" },
  { key: "stories_creation", label: "Stories", sublabel: "PM + SM", icon: BookOpen, agentRole: "pm", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  { key: "completed", label: "Concluído", sublabel: "", icon: CheckCircle2, agentRole: "", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
];

function getStepIndex(status: string) {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1 w-full">
      {PIPELINE_STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              isActive ? `${step.bg} ${step.color} ${step.border} border` :
              isDone ? "bg-success/10 text-success border border-success/30" :
              "bg-muted/30 text-muted-foreground border border-border/30"
            }`}>
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : isActive ? <Clock className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <ArrowRight className={`h-3.5 w-3.5 mx-1 shrink-0 ${isDone ? "text-success" : "text-muted-foreground/30"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Planning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["planning-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_sessions")
        .select("*, assigned_analyst:agents!planning_sessions_assigned_analyst_id_fkey(name, role), assigned_architect:agents!planning_sessions_assigned_architect_id_fkey(name, role), assigned_pm:agents!planning_sessions_assigned_pm_id_fkey(name, role), assigned_sm:agents!planning_sessions_assigned_sm_id_fkey(name, role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("id, name, role").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase.from("planning_sessions").insert({ user_id: user!.id, title }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["planning-sessions"] });
      setNewTitle("");
      setCreateOpen(false);
      setSelectedSession(data);
      toast({ title: "Sessão de planejamento criada!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from("planning_sessions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-sessions"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdate = useCallback((updates: any) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (selectedSession) {
        updateMutation.mutate({ id: selectedSession.id, ...updates });
      }
    }, 800);
  }, [selectedSession, updateMutation]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planning_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planning-sessions"] });
      setSelectedSession(null);
      toast({ title: "Sessão removida" });
    },
  });

  const advanceStep = (session: any) => {
    const currentIdx = getStepIndex(session.status);
    if (currentIdx < PIPELINE_STEPS.length - 1) {
      const nextStatus = PIPELINE_STEPS[currentIdx + 1].key;
      updateMutation.mutate({ id: session.id, status: nextStatus });
      setSelectedSession({ ...session, status: nextStatus });
    }
  };

  const goBackStep = (session: any) => {
    const currentIdx = getStepIndex(session.status);
    if (currentIdx > 0) {
      const prevStatus = PIPELINE_STEPS[currentIdx - 1].key;
      updateMutation.mutate({ id: session.id, status: prevStatus });
      setSelectedSession({ ...session, status: prevStatus });
    }
  };

  const agentsByRole = (role: string) => agents.filter((a: any) => a.role === role);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Planejamento</h1>
            <p className="text-muted-foreground mt-1">Pipeline visual: PRD → Arquitetura → Stories</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Sessão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Nova Sessão de Planejamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título do Projeto/Feature</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Sistema de Notificações" autoFocus onKeyDown={(e) => e.key === "Enter" && newTitle.trim() && createMutation.mutate(newTitle.trim())} />
                </div>
                <Button className="w-full" onClick={() => newTitle.trim() && createMutation.mutate(newTitle.trim())} disabled={!newTitle.trim() || createMutation.isPending}>
                  Criar Sessão
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          {/* Sessions List */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sessões</h2>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}</div>
            ) : sessions.length === 0 ? (
              <Card className="border-dashed border-2 border-border">
                <CardContent className="flex flex-col items-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Crie sua primeira sessão</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-260px)]">
                <div className="space-y-2 pr-2">
                  <AnimatePresence>
                    {sessions.map((session: any) => {
                      const stepIdx = getStepIndex(session.status);
                      const step = PIPELINE_STEPS[stepIdx];
                      const isSelected = selectedSession?.id === session.id;
                      return (
                        <motion.div key={session.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                          <Card
                            className={`cursor-pointer transition-all ${isSelected ? `border-primary/50 bg-primary/5` : "border-border/50 hover:border-primary/20"}`}
                            onClick={() => setSelectedSession(session)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <p className="font-display text-sm font-medium leading-tight">{session.title}</p>
                                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${step.bg} ${step.color}`}>
                                  {step.label}
                                </Badge>
                              </div>
                              <div className="flex gap-0.5">
                                {PIPELINE_STEPS.map((_, i) => (
                                  <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted/40"}`} />
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Session Detail */}
          {selectedSession ? (
            <SessionDetail
              session={selectedSession}
              agents={agents}
              agentsByRole={agentsByRole}
              onUpdate={(updates: any) => { setSelectedSession((s: any) => ({ ...s, ...updates })); debouncedUpdate(updates); }}
              onAdvance={() => advanceStep(selectedSession)}
              onGoBack={() => goBackStep(selectedSession)}
              onDelete={() => deleteMutation.mutate(selectedSession.id)}
            />
          ) : (
            <Card className="border-dashed border-2 border-border flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecione uma sessão para ver o pipeline</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function SessionDetail({
  session,
  agents,
  agentsByRole,
  onUpdate,
  onAdvance,
  onGoBack,
  onDelete,
}: {
  session: any;
  agents: any[];
  agentsByRole: (role: string) => any[];
  onUpdate: (updates: any) => void;
  onAdvance: () => void;
  onGoBack: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [generatingPrd, setGeneratingPrd] = useState(false);
  const [generatingArch, setGeneratingArch] = useState(false);
  const [generatingStories, setGeneratingStories] = useState(false);
  const stepIdx = getStepIndex(session.status);
  const currentStep = PIPELINE_STEPS[stepIdx];
  const isCompleted = session.status === "completed";

  const handleGeneratePrd = useCallback(() => {
    setGeneratingPrd(true);
    let content = "";
    streamAIContent({
      title: session.title,
      type: "prd",
      onDelta: (text) => { content += text; onUpdate({ prd_content: content }); },
      onDone: () => { setGeneratingPrd(false); toast({ title: "PRD gerado com sucesso!" }); },
      onError: (err) => { setGeneratingPrd(false); toast({ variant: "destructive", title: "Erro ao gerar PRD", description: err }); },
    });
  }, [session.title, onUpdate, toast]);

  const handleGenerateArch = useCallback(() => {
    setGeneratingArch(true);
    let content = "";
    streamAIContent({
      title: session.title,
      type: "architecture",
      existingPrd: session.prd_content,
      onDelta: (text) => { content += text; onUpdate({ architecture_content: content }); },
      onDone: () => { setGeneratingArch(false); toast({ title: "Arquitetura gerada com sucesso!" }); },
      onError: (err) => { setGeneratingArch(false); toast({ variant: "destructive", title: "Erro ao gerar arquitetura", description: err }); },
    });
  }, [session.title, session.prd_content, onUpdate, toast]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={session.id} className="space-y-5">
      {/* Pipeline indicator */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <StepIndicator currentStep={stepIdx} />
        </CardContent>
      </Card>

      {/* Title & Actions */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{session.title}</h2>
        <div className="flex gap-2">
          {stepIdx > 0 && !isCompleted && (
            <Button variant="outline" size="sm" onClick={onGoBack}>← Voltar</Button>
          )}
          {!isCompleted && (
            <Button size="sm" className="gap-1.5" onClick={onAdvance}>
              Avançar para {PIPELINE_STEPS[stepIdx + 1]?.label || "Concluir"} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Agent Assignments */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Agentes Designados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Analyst", field: "assigned_analyst_id", role: "analyst" },
            { label: "Architect", field: "assigned_architect_id", role: "architect" },
            { label: "PM", field: "assigned_pm_id", role: "pm" },
            { label: "SM", field: "assigned_sm_id", role: "sm" },
          ].map((slot) => (
            <div key={slot.field} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{slot.label}</Label>
              <Select
                value={session[slot.field] || "none"}
                onValueChange={(v) => onUpdate({ [slot.field]: v === "none" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {agentsByRole(slot.role).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>@{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Content sections based on current step */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* PRD */}
        <Card className={`border-border/50 ${stepIdx === 0 ? "ring-1 ring-info/30" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-info" /> PRD
                {stepIdx > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              </CardTitle>
              {!isCompleted && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleGeneratePrd} disabled={generatingPrd}>
                  {generatingPrd ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {generatingPrd ? "Gerando..." : "Gerar com IA"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={session.prd_content || ""}
              onChange={(e) => onUpdate({ prd_content: e.target.value })}
              placeholder="Descreva o Product Requirements Document...&#10;&#10;• Problema a resolver&#10;• Requisitos funcionais&#10;• Critérios de aceite&#10;• Personas e casos de uso"
              className="min-h-[200px] text-sm resize-y"
              disabled={isCompleted}
            />
          </CardContent>
        </Card>

        {/* Architecture */}
        <Card className={`border-border/50 ${stepIdx === 1 ? "ring-1 ring-accent/30" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-accent" /> Arquitetura
                {stepIdx > 1 && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              </CardTitle>
              {!isCompleted && stepIdx >= 1 && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleGenerateArch} disabled={generatingArch}>
                  {generatingArch ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {generatingArch ? "Gerando..." : "Gerar com IA"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={session.architecture_content || ""}
              onChange={(e) => onUpdate({ architecture_content: e.target.value })}
              placeholder="Defina a arquitetura técnica...&#10;&#10;• Stack tecnológica&#10;• Componentes do sistema&#10;• Diagramas de fluxo&#10;• Integrações e APIs"
              className="min-h-[200px] text-sm resize-y"
              disabled={stepIdx < 1 || isCompleted}
            />
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm">Notas & Decisões</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={session.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Anotações gerais, decisões tomadas, pendências..."
            className="min-h-[100px] text-sm resize-y"
            disabled={isCompleted}
          />
        </CardContent>
      </Card>

      {stepIdx >= 2 && (
        <Card className={`${isCompleted ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <BookOpen className="h-5 w-5 text-warning" />
              )}
              <div>
                <p className={`text-sm font-medium ${isCompleted ? "text-success" : "text-warning"}`}>
                  {isCompleted ? "Planejamento Concluído" : "Geração de Stories"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isCompleted
                    ? "Stories geradas a partir deste planejamento"
                    : "Gere user stories automaticamente a partir do PRD e Arquitetura"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                setGeneratingStories(true);
                try {
                  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stories`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    },
                    body: JSON.stringify({
                      title: session.title,
                      prdContent: session.prd_content,
                      architectureContent: session.architecture_content,
                    }),
                  });
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({ error: "Erro" }));
                    throw new Error(err.error);
                  }
                  const data = await resp.json();
                  toast({ title: `${data.stories.length} stories criadas com sucesso!` });
                  if (!isCompleted) onAdvance();
                } catch (e: any) {
                  toast({ variant: "destructive", title: "Erro ao gerar stories", description: e.message });
                } finally {
                  setGeneratingStories(false);
                }
              }}
              disabled={generatingStories}
            >
              {generatingStories ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generatingStories ? "Gerando Stories..." : "Gerar Stories com IA"}
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

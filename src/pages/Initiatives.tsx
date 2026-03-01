import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/error-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Lightbulb, FileText, Cpu, BookOpen, Hammer, CheckCircle2, Users, Rocket, Loader2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STEPS = [
  { key: "idea", label: "Ideia", icon: Lightbulb, color: "text-warning", bg: "bg-warning/10" },
  { key: "planning", label: "PRD", icon: FileText, color: "text-info", bg: "bg-info/10" },
  { key: "architecting", label: "Arquitetura", icon: Cpu, color: "text-accent", bg: "bg-accent/10" },
  { key: "ready", label: "Pronto", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  { key: "in_progress", label: "Execução", icon: Hammer, color: "text-primary", bg: "bg-primary/10" },
  { key: "validating", label: "Validação", icon: BookOpen, color: "text-info", bg: "bg-info/10" },
  { key: "completed", label: "Concluído", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
];

function getStepIndex(status: string) {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

const PIPELINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-initiative-pipeline`;

export default function Initiatives() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ["initiatives", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*, squads(id, name, squad_members(id))")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const createMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (!currentOrg || !user) throw new Error("Sem organização");
      const { data, error } = await supabase
        .from("initiatives")
        .insert({ title, description: description || null, organization_id: currentOrg.id, user_id: user.id, status: "idea" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setNewTitle(""); setNewDesc(""); setCreateOpen(false);
      toast({ title: "Iniciativa criada!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(e) }),
  });

  const runPipeline = async (initiativeId: string) => {
    setRunningPipeline(initiativeId);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Não autenticado");
      const resp = await fetch(PIPELINE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ initiativeId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }
      const result = await resp.json();
      toast({ title: "Pipeline completo!", description: `${result.steps?.squad?.agentCount || 0} agentes, ${result.steps?.stories?.length || 0} stories criadas` });
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      queryClient.invalidateQueries({ queryKey: ["squads"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no pipeline", description: e.message });
    } finally {
      setRunningPipeline(null);
    }
  };

  const selected = initiatives.find((i: any) => i.id === selectedId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Iniciativas</h1>
            <p className="text-muted-foreground mt-1">Da ideia ao software — pipeline completo governado</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Iniciativa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Nova Iniciativa</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>O que você quer construir?</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: SaaS de gestão de clínicas" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descreva o contexto, público-alvo e objetivos..." className="min-h-[80px] text-sm" />
                </div>
                <Button className="w-full" onClick={() => newTitle.trim() && createMutation.mutate({ title: newTitle.trim(), description: newDesc.trim() })} disabled={!newTitle.trim() || createMutation.isPending}>
                  Criar Iniciativa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          {/* List */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Iniciativas</h2>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}</div>
            ) : initiatives.length === 0 ? (
              <Card className="border-dashed border-2"><CardContent className="flex flex-col items-center py-8 text-center">
                <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Crie sua primeira iniciativa</p>
              </CardContent></Card>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-260px)]">
                <div className="space-y-2 pr-2">
                  <AnimatePresence>
                    {initiatives.map((init: any) => {
                      const stepIdx = getStepIndex(init.status);
                      const step = PIPELINE_STEPS[stepIdx];
                      const isSelected = selectedId === init.id;
                      return (
                        <motion.div key={init.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                          <Card className={`cursor-pointer transition-all ${isSelected ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/20"}`} onClick={() => setSelectedId(init.id)}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <p className="font-display text-sm font-medium leading-tight">{init.title}</p>
                                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${step.bg} ${step.color}`}>{step.label}</Badge>
                              </div>
                              <div className="flex gap-0.5">
                                {PIPELINE_STEPS.map((_, i) => (
                                  <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted/40"}`} />
                                ))}
                              </div>
                              {init.squads?.length > 0 && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {init.squads[0].squad_members?.length || 0} agentes
                                </p>
                              )}
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

          {/* Detail */}
          {selected ? (
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-display text-xl">{selected.title}</CardTitle>
                    {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
                  </div>
                  {selected.status === "idea" && (
                    <Button onClick={() => runPipeline(selected.id)} disabled={runningPipeline === selected.id} className="gap-2">
                      {runningPipeline === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                      {runningPipeline === selected.id ? "Executando pipeline..." : "Executar Pipeline"}
                    </Button>
                  )}
                </div>
                {/* Pipeline progress */}
                <div className="flex items-center gap-1 mt-4">
                  {PIPELINE_STEPS.map((step, i) => {
                    const stepIdx = getStepIndex(selected.status);
                    const Icon = step.icon;
                    const isDone = i < stepIdx;
                    const isActive = i === stepIdx;
                    return (
                      <div key={step.key} className="flex items-center flex-1 last:flex-none">
                        <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${isActive ? `${step.bg} ${step.color} border border-current/20` : isDone ? "bg-success/10 text-success" : "bg-muted/30 text-muted-foreground"}`}>
                          <Icon className="h-3 w-3" />
                          <span className="hidden md:inline">{step.label}</span>
                        </div>
                        {i < PIPELINE_STEPS.length - 1 && <div className={`h-px flex-1 mx-1 ${isDone ? "bg-success" : "bg-border"}`} />}
                      </div>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {runningPipeline === selected.id && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div>
                        <p className="text-sm font-medium">Pipeline em execução...</p>
                        <p className="text-xs text-muted-foreground">Gerando squad → PRD → Arquitetura → Stories. Isso pode levar ~1 minuto.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selected.prd_content && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-info" />
                      <h3 className="font-display text-sm font-semibold">PRD</h3>
                    </div>
                    <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
                      <pre className="text-xs whitespace-pre-wrap break-words">{selected.prd_content}</pre>
                    </ScrollArea>
                  </div>
                )}

                {selected.architecture_content && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-accent" />
                      <h3 className="font-display text-sm font-semibold">Arquitetura</h3>
                    </div>
                    <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
                      <pre className="text-xs whitespace-pre-wrap break-words">{selected.architecture_content}</pre>
                    </ScrollArea>
                  </div>
                )}

                {selected.squads?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-semibold">Squad</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selected.squads[0].squad_members?.length || 0} agentes atribuídos automaticamente
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Lightbulb className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecione uma iniciativa para ver o pipeline</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

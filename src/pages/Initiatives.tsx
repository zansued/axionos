import { useState, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Plus, Lightbulb, FileText, Cpu, BookOpen, Hammer, CheckCircle2, Users,
  Rocket, Loader2, Brain, Target, TrendingUp, Shield, Layers, AlertTriangle,
  ArrowRight, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STEPS = [
  { key: "idea", label: "Ideia", icon: Lightbulb, color: "text-warning", bg: "bg-warning/10" },
  { key: "discovery", label: "Descoberta", icon: Brain, color: "text-accent", bg: "bg-accent/10" },
  { key: "squad_formation", label: "Squad", icon: Users, color: "text-info", bg: "bg-info/10" },
  { key: "planning", label: "PRD", icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  { key: "architecting", label: "Arquitetura", icon: Cpu, color: "text-accent", bg: "bg-accent/10" },
  { key: "ready", label: "Stories", icon: BookOpen, color: "text-warning", bg: "bg-warning/10" },
  { key: "in_progress", label: "Execução", icon: Hammer, color: "text-primary", bg: "bg-primary/10" },
  { key: "completed", label: "Concluído", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
];

function getStepIndex(status: string) {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

const PIPELINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-initiative-pipeline`;

const RISK_COLORS: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/20 text-destructive",
};

export default function Initiatives() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runningStage, setRunningStage] = useState<string | null>(null);

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ["initiatives", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*, squads(id, name, squad_members(id, role_in_squad, agents(name, role)))")
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
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setNewTitle(""); setNewDesc(""); setCreateOpen(false);
      setSelectedId(data.id);
      toast({ title: "Iniciativa criada!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(e) }),
  });

  const runStage = useCallback(async (initiativeId: string, stage: string) => {
    setRunningStage(stage);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Não autenticado");
      const resp = await fetch(PIPELINE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ initiativeId, stage }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }
      const result = await resp.json();
      const stageLabels: Record<string, string> = {
        discovery: "Descoberta inteligente concluída",
        squad_formation: `Squad formado com ${result.agents?.length || 0} agentes`,
        planning: `Planning completo: ${result.stories?.length || 0} stories criadas`,
      };
      toast({ title: stageLabels[stage] || "Stage concluído!" });
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      queryClient.invalidateQueries({ queryKey: ["squads"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setRunningStage(null);
    }
  }, [toast, queryClient]);

  const selected = initiatives.find((i: any) => i.id === selectedId);

  const getNextStage = (status: string): { stage: string; label: string; icon: any } | null => {
    if (status === "idea") return { stage: "discovery", label: "Iniciar Descoberta", icon: Brain };
    if (status === "discovery") return { stage: "squad_formation", label: "Formar Squad", icon: Users };
    if (status === "squad_formation") return { stage: "planning", label: "Iniciar Planning", icon: FileText };
    return null;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Iniciativas</h1>
            <p className="text-muted-foreground mt-1">Da ideia ao software — pipeline governado em estágios</p>
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
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descreva o contexto, público-alvo e objetivos..." className="min-h-[100px] text-sm" />
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
                <p className="text-sm text-muted-foreground">Descreva sua ideia e a IA faz o resto</p>
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
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-display text-sm font-medium leading-tight">{init.title}</p>
                                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${step.bg} ${step.color}`}>{step.label}</Badge>
                              </div>
                              <div className="flex gap-0.5">
                                {PIPELINE_STEPS.map((_, i) => (
                                  <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted/40"}`} />
                                ))}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {init.risk_level && init.risk_level !== "medium" && (
                                  <span className="flex items-center gap-0.5">
                                    <AlertTriangle className="h-3 w-3" />Risco {init.risk_level}
                                  </span>
                                )}
                                {init.squads?.length > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Users className="h-3 w-3" />{init.squads[0].squad_members?.length || 0}
                                  </span>
                                )}
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

          {/* Detail */}
          {selected ? (
            <InitiativeDetail
              initiative={selected}
              runningStage={runningStage}
              onRunStage={(stage) => runStage(selected.id, stage)}
              getNextStage={getNextStage}
            />
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

function InitiativeDetail({ initiative, runningStage, onRunStage, getNextStage }: {
  initiative: any;
  runningStage: string | null;
  onRunStage: (stage: string) => void;
  getNextStage: (status: string) => { stage: string; label: string; icon: any } | null;
}) {
  const stepIdx = getStepIndex(initiative.status);
  const nextStage = getNextStage(initiative.status);

  return (
    <div className="space-y-4">
      {/* Header + Pipeline */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="font-display text-xl">{initiative.title}</CardTitle>
              {initiative.description && <p className="text-sm text-muted-foreground mt-1 break-words">{initiative.description}</p>}
            </div>
            {nextStage && (
              <Button
                onClick={() => onRunStage(nextStage.stage)}
                disabled={!!runningStage}
                className="gap-2 shrink-0"
              >
                {runningStage === nextStage.stage ? <Loader2 className="h-4 w-4 animate-spin" /> : <nextStage.icon className="h-4 w-4" />}
                {runningStage === nextStage.stage ? "Processando..." : nextStage.label}
              </Button>
            )}
          </div>
          {/* Pipeline steps */}
          <div className="flex items-center gap-0.5 mt-4 overflow-x-auto">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isDone = i < stepIdx;
              const isActive = i === stepIdx;
              return (
                <div key={step.key} className="flex items-center shrink-0">
                  <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap ${
                    isActive ? `${step.bg} ${step.color} border border-current/20` :
                    isDone ? "bg-success/10 text-success" : "bg-muted/30 text-muted-foreground"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{step.label}</span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && <ArrowRight className={`h-3 w-3 mx-0.5 shrink-0 ${isDone ? "text-success" : "text-muted-foreground/20"}`} />}
                </div>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {/* Running indicator */}
      {runningStage && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {runningStage === "discovery" && "IA analisando ideia, mercado e viabilidade..."}
                {runningStage === "squad_formation" && "Montando squad ideal de agentes..."}
                {runningStage === "planning" && "Gerando PRD → Arquitetura → Stories..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {runningStage === "planning" ? "Isso pode levar ~2 minutos." : "Isso pode levar ~30 segundos."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discovery Results */}
      {initiative.refined_idea && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" /> Descoberta Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCard icon={Layers} label="Complexidade" value={initiative.complexity} className={RISK_COLORS[initiative.complexity] || ""} />
              <MetricCard icon={AlertTriangle} label="Risco" value={initiative.risk_level} className={RISK_COLORS[initiative.risk_level] || ""} />
              {initiative.initial_estimate?.effort_weeks && (
                <MetricCard icon={Target} label="Estimativa" value={`${initiative.initial_estimate.effort_weeks} sem.`} />
              )}
              {initiative.initial_estimate?.estimated_stories && (
                <MetricCard icon={BookOpen} label="Stories est." value={initiative.initial_estimate.estimated_stories} />
              )}
            </div>

            <Separator />

            <DiscoverySection icon={Sparkles} title="Ideia Refinada" content={initiative.refined_idea} />
            <DiscoverySection icon={TrendingUp} title="Modelo de Negócio" content={initiative.business_model} />
            <DiscoverySection icon={Target} title="Escopo MVP" content={initiative.mvp_scope} />
            <DiscoverySection icon={Shield} title="Análise de Mercado" content={initiative.market_analysis} />
            <DiscoverySection icon={Cpu} title="Stack Sugerida" content={initiative.suggested_stack} />
            <DiscoverySection icon={Rocket} title="Visão Estratégica" content={initiative.strategic_vision} />
            <DiscoverySection icon={AlertTriangle} title="Viabilidade" content={initiative.feasibility_analysis} />
          </CardContent>
        </Card>
      )}

      {/* Squad */}
      {initiative.squads?.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Users className="h-4 w-4 text-info" /> Squad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(initiative.squads[0].squad_members || []).map((sm: any) => (
                <Badge key={sm.id} variant="secondary" className="text-xs gap-1.5 py-1">
                  <span className="font-semibold">{sm.agents?.name || "?"}</span>
                  <span className="text-muted-foreground">· {sm.role_in_squad}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PRD */}
      {initiative.prd_content && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> PRD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
              <pre className="text-xs whitespace-pre-wrap break-words">{initiative.prd_content}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Architecture */}
      {initiative.architecture_content && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent" /> Arquitetura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
              <pre className="text-xs whitespace-pre-wrap break-words">{initiative.architecture_content}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: any; className?: string }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${className || "bg-muted/30"}`}>
      <Icon className="h-4 w-4 mx-auto mb-1 opacity-70" />
      <p className="text-xs font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DiscoverySection({ icon: Icon, title, content }: { icon: any; title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h4>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{content}</p>
    </div>
  );
}

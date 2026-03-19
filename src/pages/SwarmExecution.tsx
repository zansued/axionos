import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import {
  Zap, GitBranch, AlertTriangle, CheckCircle2, XCircle,
  Activity, ShieldAlert, Clock, FileText, Users, Sparkles, Loader2,
} from "lucide-react";

interface Campaign {
  id: string;
  campaign_name: string;
  campaign_description: string;
  participating_agent_ids: string[];
  status: string;
  risk_posture: string;
  max_branches: number;
  max_retries: number;
  escalated: boolean;
  escalation_reason: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/20 text-primary",
  paused: "bg-accent/20 text-accent-foreground",
  completed: "bg-emerald-500/20 text-emerald-400",
  aborted: "bg-destructive/20 text-destructive",
  rolled_back: "bg-orange-500/20 text-orange-400",
  failed: "bg-destructive/20 text-destructive",
  escalated: "bg-yellow-500/20 text-yellow-400",
};

export default function SwarmExecution() {
  const { currentOrg } = useOrg();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState("active");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formManagerId, setFormManagerId] = useState("manager-agent-01");
  const [formManagerGoal, setFormManagerGoal] = useState("Coordenar e revisar a execução das tarefas");
  const [formExecutorId, setFormExecutorId] = useState("executor-agent-01");
  const [formExecutorGoal, setFormExecutorGoal] = useState("Executar a tarefa delegada com alta qualidade");
  const [formTaskDesc, setFormTaskDesc] = useState("");

  // AI Planner state
  const [showAiPlanner, setShowAiPlanner] = useState(false);
  const [aiObjective, setAiObjective] = useState("");
  const [aiPlanning, setAiPlanning] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const loadCampaigns = () => {
    if (!currentOrg) return;
    setLoading(true);
    supabase
      .from("swarm_execution_campaigns" as any)
      .select("*")
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCampaigns((data as any) || []);
        setLoading(false);
      });
  };

  useEffect(() => { loadCampaigns(); }, [currentOrg]);

  const openDetail = async (c: Campaign) => {
    setSelected(c);
    const [branchRes, cpRes, evtRes, agentRes] = await Promise.all([
      supabase.from("swarm_execution_branches" as any).select("*").eq("campaign_id", c.id).order("created_at"),
      supabase.from("swarm_execution_checkpoints" as any).select("*").eq("campaign_id", c.id).order("created_at"),
      supabase.from("swarm_execution_events" as any).select("*").eq("campaign_id", c.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("swarm_execution_agents" as any).select("*").eq("campaign_id", c.id),
    ]);
    setDetail({
      branches: (branchRes.data as any) || [],
      checkpoints: (cpRes.data as any) || [],
      events: (evtRes.data as any) || [],
      agents: (agentRes.data as any) || [],
    });
  };

  const handleCreateContracted = async () => {
    if (!currentOrg || !formName || !formTaskDesc) {
      toast.error("Nome da campanha e primeira tarefa são obrigatórios");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("swarm-execution", {
        body: {
          action: "launch_contracted_campaign",
          organization_id: currentOrg.id,
          campaign_name: formName,
          campaign_description: formDesc,
          agent_contracts: [
            { agent_id: formManagerId, role: "manager", goal: formManagerGoal },
            { agent_id: formExecutorId, role: "executor", goal: formExecutorGoal },
          ],
          first_task: { description: formTaskDesc, priority: "medium" },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Campanha criada com ${data.contracts_registered} agentes`);
      setShowCreate(false);
      setFormName(""); setFormDesc(""); setFormTaskDesc("");
      loadCampaigns();
    } catch (e: any) {
      toast.error(e.message || "Falha ao criar campanha contratada");
    } finally {
      setCreating(false);
    }
  };

  const handleAiPlan = async () => {
    if (!aiObjective.trim()) {
      toast.error("Descreva o objetivo da campanha");
      return;
    }
    setAiPlanning(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-campaign-planner", {
        body: { objective: aiObjective },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiResult(data?.plan || data?.result || JSON.stringify(data, null, 2));

      // Auto-fill form if AI returns structured data
      if (data?.campaign_name) setFormName(data.campaign_name);
      if (data?.campaign_description) setFormDesc(data.campaign_description);
      if (data?.first_task) setFormTaskDesc(data.first_task);
      if (data?.manager_goal) setFormManagerGoal(data.manager_goal);
      if (data?.executor_goal) setFormExecutorGoal(data.executor_goal);

      toast.success("Plano gerado pela IA com sucesso");
    } catch (e: any) {
      // Fallback: show a helpful message even if edge function doesn't exist yet
      setAiResult(
        `📋 Sugestão de Campanha para: "${aiObjective}"\n\n` +
        `• Nome: Campanha — ${aiObjective.slice(0, 50)}\n` +
        `• Agente Gestor: Coordenar análise e revisão do objetivo\n` +
        `• Agente Executor: Executar as tarefas planejadas com qualidade\n` +
        `• Primeira Tarefa: Analisar escopo e requisitos de "${aiObjective.slice(0, 40)}"\n\n` +
        `💡 Preencha o formulário de criação com base nesta sugestão.`
      );
      setFormName(`Campanha — ${aiObjective.slice(0, 50)}`);
      setFormDesc(aiObjective);
      setFormTaskDesc(`Analisar escopo e requisitos de: ${aiObjective}`);
      toast.info("Sugestão local gerada (edge function não disponível)");
    } finally {
      setAiPlanning(false);
    }
  };

  const handleApplyAiAndCreate = () => {
    setShowAiPlanner(false);
    setShowCreate(true);
  };

  const filtered = campaigns.filter((c) => {
    if (tab === "active") return ["draft", "active", "launching", "paused"].includes(c.status);
    if (tab === "completed") return c.status === "completed";
    if (tab === "failed") return ["failed", "aborted", "rolled_back", "escalated"].includes(c.status);
    return true;
  });

  const kpis = {
    active: campaigns.filter((c) => c.status === "active").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    escalated: campaigns.filter((c) => c.escalated).length,
    aborted: campaigns.filter((c) => ["aborted", "rolled_back"].includes(c.status)).length,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Execução de Swarm Governada</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Campanhas multi-agente coordenadas com contratos, delegação e revisão.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAiPlanner(true)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Planejar com IA
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <FileText className="h-4 w-4" /> Nova Campanha Contratada
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.active}</p><p className="text-xs text-muted-foreground">Ativas</p></div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.completed}</p><p className="text-xs text-muted-foreground">Concluídas</p></div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-yellow-400" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.escalated}</p><p className="text-xs text-muted-foreground">Escaladas</p></div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.aborted}</p><p className="text-xs text-muted-foreground">Abortadas / Revertidas</p></div>
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="active">Ativas</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
            <TabsTrigger value="failed">Falhas / Escaladas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {loading ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : filtered.length === 0 ? (
              <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma campanha de swarm nesta visualização.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <Card key={c.id} className="border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => openDetail(c)}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Zap className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{c.campaign_name || "Campanha sem nome"}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.participating_agent_ids.length} agentes · máx {c.max_branches} ramificações</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={STATUS_COLORS[c.status] || "bg-muted text-muted-foreground"}>{c.status}</Badge>
                        <Badge variant="outline" className="text-xs">{c.risk_posture}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail Drawer */}
        <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setDetail(null); } }}>
          <SheetContent className="w-full sm:max-w-xl bg-card border-border overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-foreground">{selected.campaign_name || "Detalhe da Campanha"}</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge>
                    <Badge variant="outline">Risco: {selected.risk_posture}</Badge>
                    {selected.escalated && <Badge className="bg-yellow-500/20 text-yellow-400">Escalada</Badge>}
                  </div>
                  {selected.campaign_description && <p className="text-sm text-muted-foreground">{selected.campaign_description}</p>}
                  {selected.escalation_reason && (
                    <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-300">
                      <AlertTriangle className="h-4 w-4 inline mr-1" /> {selected.escalation_reason}
                    </div>
                  )}

                  <Separator className="bg-border" />

                  {/* Agent Contracts */}
                  {detail?.agents?.length > 0 && (
                    <>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Contratos de Agentes ({detail.agents.length})</h4>
                        <div className="space-y-2">
                          {detail.agents.map((a: any) => {
                            const contract = a.agent_contract;
                            return (
                              <div key={a.id} className="p-3 rounded bg-muted/30 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground">{a.agent_id}</span>
                                  <Badge variant="outline" className="text-xs">{a.agent_role}</Badge>
                                </div>
                                {contract?.goal && (
                                  <p className="text-xs text-muted-foreground">{contract.goal}</p>
                                )}
                                {contract?.capabilities?.length > 0 && (
                                  <div className="flex gap-1 flex-wrap">
                                    {contract.capabilities.map((cap: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="text-[10px]">{cap}</Badge>
                                    ))}
                                  </div>
                                )}
                                {contract?.constraints && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Orçamento: ${contract.constraints.cost_budget_usd} · Timeout: {Math.round((contract.constraints.timeout_ms || 0) / 1000)}s · Tentativas: {contract.constraints.max_retries}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <Separator className="bg-border" />
                    </>
                  )}

                  {/* Branches */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Ramificações ({detail?.branches?.length || 0})</h4>
                    {detail?.branches?.length ? (
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {detail.branches.map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <div className="min-w-0">
                                <span className="text-sm text-foreground">{b.branch_label || "Ramificação"}</span>
                                {b.branch_plan?.delegation && (
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {b.branch_plan.from_role} → {b.branch_plan.to_role}: {b.branch_plan.delegation.task_description?.slice(0, 60)}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Badge variant="outline" className="text-xs">{b.branch_type}</Badge>
                                <Badge className={STATUS_COLORS[b.status] || "bg-muted text-muted-foreground"}>{b.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : <p className="text-xs text-muted-foreground">Nenhuma ramificação ainda.</p>}
                  </div>

                  <Separator className="bg-border" />

                  {/* Checkpoints */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Checkpoints ({detail?.checkpoints?.length || 0})</h4>
                    {detail?.checkpoints?.length ? (
                      <ScrollArea className="max-h-40">
                        <div className="space-y-1">
                          {detail.checkpoints.map((cp: any) => (
                            <div key={cp.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <span className="text-sm text-foreground">{cp.checkpoint_label || "Checkpoint"}</span>
                              <Badge variant="outline" className="text-xs">{cp.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : <p className="text-xs text-muted-foreground">Nenhum checkpoint ainda.</p>}
                  </div>

                  <Separator className="bg-border" />

                  {/* Events */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Activity className="h-4 w-4" /> Eventos Recentes</h4>
                    {detail?.events?.length ? (
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {detail.events.map((e: any) => (
                            <div key={e.id} className="p-2 rounded bg-muted/30 text-xs">
                              <span className="font-mono text-primary">{e.event_type}</span>
                              {e.agent_id && <span className="text-muted-foreground ml-2">por {e.agent_id}</span>}
                              <span className="text-muted-foreground ml-2">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : <p className="text-xs text-muted-foreground">Nenhum evento ainda.</p>}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Create Contracted Campaign Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nova Campanha Contratada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Nome da Campanha</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="ex: Sprint de Revisão de Arquitetura" className="bg-muted border-border" />
              </div>
              <div>
                <Label className="text-foreground">Descrição</Label>
                <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descrição opcional" className="bg-muted border-border" />
              </div>
              <Separator className="bg-border" />
              <p className="text-xs text-muted-foreground font-semibold">Agente Gestor</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-foreground text-xs">ID do Agente</Label>
                  <Input value={formManagerId} onChange={e => setFormManagerId(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Objetivo</Label>
                  <Input value={formManagerGoal} onChange={e => setFormManagerGoal(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-semibold">Agente Executor</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-foreground text-xs">ID do Agente</Label>
                  <Input value={formExecutorId} onChange={e => setFormExecutorId(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Objetivo</Label>
                  <Input value={formExecutorGoal} onChange={e => setFormExecutorGoal(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
              </div>
              <Separator className="bg-border" />
              <div>
                <Label className="text-foreground">Descrição da Primeira Tarefa</Label>
                <Textarea value={formTaskDesc} onChange={e => setFormTaskDesc(e.target.value)} placeholder="Descreva a tarefa a ser delegada ao executor..." className="bg-muted border-border" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreateContracted} disabled={creating}>
                {creating ? "Criando..." : "Lançar Campanha"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Campaign Planner Dialog */}
        <Dialog open={showAiPlanner} onOpenChange={setShowAiPlanner}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Planejamento de Campanha com IA
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Descreva o objetivo da campanha e a IA irá sugerir a estrutura ideal: agentes, papéis, tarefas e estratégia de execução.
              </p>
              <div>
                <Label className="text-foreground">Objetivo da Campanha</Label>
                <Textarea
                  value={aiObjective}
                  onChange={e => setAiObjective(e.target.value)}
                  placeholder="ex: Revisar a arquitetura de segurança do módulo de pagamentos e propor melhorias..."
                  className="bg-muted border-border"
                  rows={4}
                />
              </div>
              <Button onClick={handleAiPlan} disabled={aiPlanning} className="w-full gap-2">
                {aiPlanning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Gerando plano...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Gerar Plano com IA</>
                )}
              </Button>
              {aiResult && (
                <div className="space-y-3">
                  <Separator className="bg-border" />
                  <div className="rounded-md bg-muted/40 border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Plano Sugerido
                    </h4>
                    <ScrollArea className="max-h-[200px]">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{aiResult}</pre>
                    </ScrollArea>
                  </div>
                  <Button onClick={handleApplyAiAndCreate} className="w-full gap-2" variant="outline">
                    <FileText className="h-4 w-4" /> Aplicar e Criar Campanha
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAiPlanner(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

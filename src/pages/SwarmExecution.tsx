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
  Activity, ShieldAlert, Clock, FileText, Users,
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
  const [formManagerGoal, setFormManagerGoal] = useState("Coordinate and review task execution");
  const [formExecutorId, setFormExecutorId] = useState("executor-agent-01");
  const [formExecutorGoal, setFormExecutorGoal] = useState("Execute the delegated task with high quality");
  const [formTaskDesc, setFormTaskDesc] = useState("");

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
      toast.error("Campaign name and first task are required");
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
      toast.success(`Contracted campaign created with ${data.contracts_registered} agents`);
      setShowCreate(false);
      setFormName(""); setFormDesc(""); setFormTaskDesc("");
      loadCampaigns();
    } catch (e: any) {
      toast.error(e.message || "Failed to create contracted campaign");
    } finally {
      setCreating(false);
    }
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
            <h1 className="text-2xl font-bold text-foreground">Bounded Swarm Execution</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Coordinated multi-agent campaigns with contracts, delegation, and review.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <FileText className="h-4 w-4" /> New Contracted Campaign
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-yellow-400" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.escalated}</p><p className="text-xs text-muted-foreground">Escalated</p></div>
          </CardContent></Card>
          <Card className="border-border bg-card"><CardContent className="pt-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <div><p className="text-2xl font-bold text-foreground">{kpis.aborted}</p><p className="text-xs text-muted-foreground">Aborted / Rolled Back</p></div>
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed / Escalated</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {loading ? (
              <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : filtered.length === 0 ? (
              <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">No swarm campaigns in this view.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <Card key={c.id} className="border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => openDetail(c)}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Zap className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{c.campaign_name || "Unnamed Campaign"}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.participating_agent_ids.length} agents · max {c.max_branches} branches</p>
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
                  <SheetTitle className="text-foreground">{selected.campaign_name || "Campaign Detail"}</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge>
                    <Badge variant="outline">{selected.risk_posture} risk</Badge>
                    {selected.escalated && <Badge className="bg-yellow-500/20 text-yellow-400">Escalated</Badge>}
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
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Agent Contracts ({detail.agents.length})</h4>
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
                                    Budget: ${contract.constraints.cost_budget_usd} · Timeout: {Math.round((contract.constraints.timeout_ms || 0) / 1000)}s · Retries: {contract.constraints.max_retries}
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
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><GitBranch className="h-4 w-4" /> Branches ({detail?.branches?.length || 0})</h4>
                    {detail?.branches?.length ? (
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {detail.branches.map((b: any) => (
                            <div key={b.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <div className="min-w-0">
                                <span className="text-sm text-foreground">{b.branch_label || "Branch"}</span>
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
                    ) : <p className="text-xs text-muted-foreground">No branches yet.</p>}
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
                    ) : <p className="text-xs text-muted-foreground">No checkpoints yet.</p>}
                  </div>

                  <Separator className="bg-border" />

                  {/* Events */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Events</h4>
                    {detail?.events?.length ? (
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {detail.events.map((e: any) => (
                            <div key={e.id} className="p-2 rounded bg-muted/30 text-xs">
                              <span className="font-mono text-primary">{e.event_type}</span>
                              {e.agent_id && <span className="text-muted-foreground ml-2">by {e.agent_id}</span>}
                              <span className="text-muted-foreground ml-2">{new Date(e.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : <p className="text-xs text-muted-foreground">No events yet.</p>}
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
              <DialogTitle className="text-foreground">New Contracted Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground">Campaign Name</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Architecture Review Sprint" className="bg-muted border-border" />
              </div>
              <div>
                <Label className="text-foreground">Description</Label>
                <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description" className="bg-muted border-border" />
              </div>
              <Separator className="bg-border" />
              <p className="text-xs text-muted-foreground font-semibold">Manager Agent</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-foreground text-xs">Agent ID</Label>
                  <Input value={formManagerId} onChange={e => setFormManagerId(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Goal</Label>
                  <Input value={formManagerGoal} onChange={e => setFormManagerGoal(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-semibold">Executor Agent</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-foreground text-xs">Agent ID</Label>
                  <Input value={formExecutorId} onChange={e => setFormExecutorId(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Goal</Label>
                  <Input value={formExecutorGoal} onChange={e => setFormExecutorGoal(e.target.value)} className="bg-muted border-border text-sm" />
                </div>
              </div>
              <Separator className="bg-border" />
              <div>
                <Label className="text-foreground">First Task Description</Label>
                <Textarea value={formTaskDesc} onChange={e => setFormTaskDesc(e.target.value)} placeholder="Describe the task to delegate to the executor..." className="bg-muted border-border" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreateContracted} disabled={creating}>
                {creating ? "Creating..." : "Launch Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

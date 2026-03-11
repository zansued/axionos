import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { BrainCircuit, AlertTriangle, CheckCircle2, Clock, Flag, ArrowRightLeft, Bookmark } from "lucide-react";

interface WMContext {
  id: string;
  context_label: string;
  current_task_state: string;
  participating_agent_ids: string[];
  risk_posture: string;
  escalation_reason: string | null;
  open_issues: unknown[];
  blocked_reasons: unknown[];
  agreed_assumptions: unknown[];
  created_at: string;
}

const STATE_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  proposed: { variant: "outline", label: "Proposed" },
  accepted: { variant: "default", label: "Accepted" },
  in_progress: { variant: "default", label: "In Progress" },
  blocked: { variant: "destructive", label: "Blocked" },
  contested: { variant: "destructive", label: "Contested" },
  escalated: { variant: "destructive", label: "Escalated" },
  resolved: { variant: "secondary", label: "Resolved" },
  ready_for_next_stage: { variant: "secondary", label: "Ready" },
};

const RISK_COLOR: Record<string, string> = {
  low: "text-emerald-400",
  moderate: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-destructive",
};

export default function WorkingMemory() {
  const { currentOrg } = useOrg();
  const [tab, setTab] = useState("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: contexts = [] } = useQuery({
    queryKey: ["wm-contexts", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_working_memory_contexts")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data || []) as WMContext[];
    },
  });

  const active = contexts.filter((c) => ["proposed", "accepted", "in_progress"].includes(c.current_task_state));
  const blocked = contexts.filter((c) => ["blocked", "contested"].includes(c.current_task_state));
  const escalated = contexts.filter((c) => c.current_task_state === "escalated");
  const resolved = contexts.filter((c) => ["resolved", "ready_for_next_stage"].includes(c.current_task_state));

  const listForTab = tab === "active" ? active : tab === "blocked" ? blocked : tab === "escalated" ? escalated : resolved;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Working Memory & Task-State</h1>
            <p className="text-sm text-muted-foreground">Shared coordination contexts, checkpoints, and negotiated task-state transitions.</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={<BrainCircuit className="h-4 w-4" />} label="Total Contexts" value={contexts.length} />
            <KPI icon={<Clock className="h-4 w-4" />} label="Active" value={active.length} />
            <KPI icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Blocked/Contested" value={blocked.length} />
            <KPI icon={<Flag className="h-4 w-4 text-destructive" />} label="Escalated" value={escalated.length} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} label="Resolved/Ready" value={resolved.length} />
            <KPI icon={<ArrowRightLeft className="h-4 w-4" />} label="Agents Involved" value={new Set(contexts.flatMap((c) => c.participating_agent_ids)).size} />
            <KPI icon={<Bookmark className="h-4 w-4" />} label="Open Issues" value={contexts.reduce((s, c) => s + (Array.isArray(c.open_issues) ? c.open_issues.length : 0), 0)} />
            <KPI icon={<AlertTriangle className="h-4 w-4 text-yellow-400" />} label="High-Risk" value={contexts.filter((c) => ["high", "critical"].includes(c.risk_posture)).length} />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="blocked">Blocked ({blocked.length})</TabsTrigger>
              <TabsTrigger value="escalated">Escalated ({escalated.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[480px]">
                    {listForTab.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No contexts in this category.</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {listForTab.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3"
                            onClick={() => setSelectedId(c.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.context_label || "Untitled context"}</p>
                              <p className="text-xs text-muted-foreground">{c.participating_agent_ids.length} agents</p>
                            </div>
                            <Badge variant={STATE_BADGE[c.current_task_state]?.variant || "outline"}>
                              {STATE_BADGE[c.current_task_state]?.label || c.current_task_state}
                            </Badge>
                            <span className={`text-xs font-medium ${RISK_COLOR[c.risk_posture] || ""}`}>{c.risk_posture}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <ContextDetailDrawer contextId={selectedId} onClose={() => setSelectedId(null)} />
        </main>
      </div>
    </SidebarProvider>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-md bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ContextDetailDrawer({ contextId, onClose }: { contextId: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["wm-detail", contextId],
    enabled: !!contextId,
    queryFn: async () => {
      const [ctxRes, entRes, trRes, cpRes] = await Promise.all([
        supabase.from("agent_working_memory_contexts").select("*").eq("id", contextId!).single(),
        supabase.from("agent_working_memory_entries").select("*").eq("context_id", contextId!).order("created_at"),
        supabase.from("agent_task_state_transitions").select("*").eq("context_id", contextId!).order("created_at"),
        supabase.from("agent_coordination_checkpoints").select("*").eq("context_id", contextId!).order("created_at"),
      ]);
      return {
        context: ctxRes.data,
        entries: entRes.data || [],
        transitions: trRes.data || [],
        checkpoints: cpRes.data || [],
      };
    },
  });

  const ctx = data?.context;
  const entries = data?.entries || [];
  const transitions = data?.transitions || [];
  const checkpoints = data?.checkpoints || [];

  return (
    <Sheet open={!!contextId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{ctx?.context_label || "Context Detail"}</SheetTitle>
        </SheetHeader>
        {ctx && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">State:</span>{" "}
                <Badge variant={STATE_BADGE[ctx.current_task_state]?.variant || "outline"}>
                  {STATE_BADGE[ctx.current_task_state]?.label || ctx.current_task_state}
                </Badge>
              </div>
              <div><span className="text-muted-foreground">Risk:</span> <span className={RISK_COLOR[ctx.risk_posture]}>{ctx.risk_posture}</span></div>
              <div><span className="text-muted-foreground">Agents:</span> {ctx.participating_agent_ids?.length || 0}</div>
            </div>

            {ctx.escalation_reason && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm">
                <p className="font-medium text-destructive">Escalated</p>
                <p className="text-xs text-muted-foreground">{ctx.escalation_reason}</p>
              </div>
            )}

            <Separator />

            {/* Entries */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Memory Entries ({entries.length})</h3>
              <div className="space-y-2">
                {entries.map((e: any) => (
                  <div key={e.id} className="p-3 rounded-md bg-muted/40 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{e.key}</span>
                      <Badge variant="outline" className="text-xs">{e.entry_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{typeof e.value === "object" ? JSON.stringify(e.value) : String(e.value)}</p>
                    <span className="text-xs text-muted-foreground">Agent: {e.agent_id} · Conf: {(e.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Transitions */}
            <div>
              <h3 className="text-sm font-semibold mb-2">State Transitions ({transitions.length})</h3>
              <div className="space-y-2">
                {transitions.map((t: any) => (
                  <div key={t.id} className="p-3 rounded-md bg-muted/30 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{t.from_state}</Badge>
                      <span className="text-xs">→</span>
                      <Badge variant="outline" className="text-xs">{t.to_state}</Badge>
                      <Badge variant={t.status === "accepted" ? "secondary" : t.status === "contested" || t.status === "escalated" ? "destructive" : "outline"} className="text-xs ml-auto">{t.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.proposal_reason}</p>
                    <span className="text-xs text-muted-foreground">By: {t.proposed_by}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Checkpoints */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Checkpoints ({checkpoints.length})</h3>
              <div className="space-y-2">
                {checkpoints.map((cp: any) => (
                  <div key={cp.id} className="p-3 rounded-md bg-primary/5 border border-primary/20 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cp.checkpoint_label}</span>
                      <Badge variant="outline" className="text-xs">{cp.checkpoint_type}</Badge>
                    </div>
                    {cp.notes && <p className="text-xs text-muted-foreground">{cp.notes}</p>}
                    <span className="text-xs text-muted-foreground">Agent: {cp.agent_id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

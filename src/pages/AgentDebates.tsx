import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, AlertTriangle, CheckCircle2, XCircle, Clock, Scale, ArrowUpRight } from "lucide-react";

interface DebateSession {
  id: string;
  topic: string;
  status: string;
  participating_agent_ids: string[];
  max_rounds: number;
  current_round: number;
  risk_posture: string;
  escalated: boolean;
  escalation_reason: string | null;
  resolution_outcome: string | null;
  resolution_confidence: number | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  open: { variant: "outline", label: "Open" },
  active: { variant: "default", label: "Active" },
  resolved: { variant: "secondary", label: "Resolved" },
  escalated: { variant: "destructive", label: "Escalated" },
  closed: { variant: "secondary", label: "Closed" },
  abandoned: { variant: "outline", label: "Abandoned" },
};

const RISK_COLOR: Record<string, string> = {
  low: "text-emerald-400",
  moderate: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-destructive",
};

export default function AgentDebates() {
  const { currentOrg } = useOrg();
  const [tab, setTab] = useState("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: debates = [] } = useQuery({
    queryKey: ["agent-debates", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_debate_sessions")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data || []) as DebateSession[];
    },
  });

  const active = debates.filter((d) => ["open", "active"].includes(d.status));
  const resolved = debates.filter((d) => d.status === "resolved");
  const escalated = debates.filter((d) => d.status === "escalated");
  const closed = debates.filter((d) => ["closed", "abandoned"].includes(d.status));

  const totalResolved = resolved.length;
  const totalEscalated = escalated.length;
  const highRisk = debates.filter((d) => ["high", "critical"].includes(d.risk_posture)).length;
  const avgDepth = debates.length > 0 ? (debates.reduce((s, d) => s + d.current_round, 0) / debates.length).toFixed(1) : "0";

  const listForTab = tab === "active" ? active : tab === "resolved" ? resolved : tab === "escalated" ? escalated : closed;

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Multi-Agent Debates</h1>
            <p className="text-sm text-muted-foreground">Structured debate sessions, argument comparison, and governed resolution.</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={<MessageSquare className="h-4 w-4" />} label="Total Debates" value={debates.length} />
            <KPI icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} label="Resolved" value={totalResolved} />
            <KPI icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Escalated" value={totalEscalated} />
            <KPI icon={<Scale className="h-4 w-4 text-yellow-400" />} label="High-Risk" value={highRisk} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={<Clock className="h-4 w-4" />} label="Active Now" value={active.length} />
            <KPI icon={<XCircle className="h-4 w-4" />} label="Closed/Abandoned" value={closed.length} />
            <KPI icon={<ArrowUpRight className="h-4 w-4" />} label="Avg Depth (rounds)" value={avgDepth} />
            <KPI icon={<MessageSquare className="h-4 w-4" />} label="Agents Involved" value={new Set(debates.flatMap((d) => d.participating_agent_ids)).size} />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
              <TabsTrigger value="escalated">Escalated ({escalated.length})</TabsTrigger>
              <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[480px]">
                    {listForTab.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">No debates in this category.</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {listForTab.map((d) => (
                          <button
                            key={d.id}
                            className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3"
                            onClick={() => setSelectedId(d.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{d.topic || "Untitled debate"}</p>
                              <p className="text-xs text-muted-foreground">
                                Round {d.current_round}/{d.max_rounds} · {d.participating_agent_ids.length} agents
                              </p>
                            </div>
                            <Badge variant={STATUS_BADGE[d.status]?.variant || "outline"}>
                              {STATUS_BADGE[d.status]?.label || d.status}
                            </Badge>
                            <span className={`text-xs font-medium ${RISK_COLOR[d.risk_posture] || ""}`}>
                              {d.risk_posture}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Detail drawer */}
          <DebateDetailDrawer sessionId={selectedId} onClose={() => setSelectedId(null)} />
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

function DebateDetailDrawer({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["debate-detail", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const [sess, pos, args, res] = await Promise.all([
        supabase.from("agent_debate_sessions").select("*").eq("id", sessionId!).single(),
        supabase.from("agent_debate_positions").select("*").eq("session_id", sessionId!).order("round_number"),
        supabase.from("agent_debate_arguments").select("*").eq("session_id", sessionId!).order("round_number"),
        supabase.from("agent_debate_resolutions").select("*").eq("session_id", sessionId!),
      ]);
      return { session: sess.data, positions: pos.data || [], arguments: args.data || [], resolutions: res.data || [] };
    },
  });

  const session = data?.session;
  const positions = data?.positions || [];
  const arguments_ = data?.arguments || [];
  const resolutions = data?.resolutions || [];

  return (
    <Sheet open={!!sessionId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{session?.topic || "Debate Detail"}</SheetTitle>
        </SheetHeader>

        {session && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={STATUS_BADGE[session.status]?.variant || "outline"}>{STATUS_BADGE[session.status]?.label || session.status}</Badge></div>
              <div><span className="text-muted-foreground">Risk:</span> <span className={RISK_COLOR[session.risk_posture]}>{session.risk_posture}</span></div>
              <div><span className="text-muted-foreground">Round:</span> {session.current_round}/{session.max_rounds}</div>
              <div><span className="text-muted-foreground">Agents:</span> {session.participating_agent_ids?.length || 0}</div>
            </div>

            {session.escalated && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm">
                <p className="font-medium text-destructive">Escalated</p>
                <p className="text-xs text-muted-foreground">{session.escalation_reason}</p>
              </div>
            )}

            <Separator />

            {/* Positions */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Positions ({positions.length})</h3>
              <div className="space-y-2">
                {positions.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-md bg-muted/40 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.position_label}</span>
                      <Badge variant="outline" className="text-xs">R{p.round_number} · {p.position_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.reasoning}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Agent: {p.agent_id}</span>
                      <span className="text-muted-foreground">Confidence: {(p.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Arguments */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Arguments ({arguments_.length})</h3>
              <div className="space-y-2">
                {arguments_.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-md bg-muted/30 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{a.argument_type}</Badge>
                      <span className="text-xs text-muted-foreground">R{a.round_number} · Strength {(a.strength * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs">{a.content}</p>
                    <span className="text-xs text-muted-foreground">Agent: {a.agent_id}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Resolution */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Resolution</h3>
              {resolutions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No resolution yet.</p>
              ) : (
                resolutions.map((r: any) => (
                  <div key={r.id} className="p-3 rounded-md bg-primary/5 border border-primary/20 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge>{r.resolution_type}</Badge>
                      <span className="text-xs">Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs">{r.resolution_summary}</p>
                    {r.requires_human_review && (
                      <Badge variant="destructive" className="text-xs">Human review: {r.human_review_status}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

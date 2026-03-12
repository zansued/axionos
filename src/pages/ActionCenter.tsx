/**
 * Action Center — Sprint 154 / AE-11
 *
 * Central operational surface for viewing, filtering, and inspecting
 * all formalized actions across their lifecycle.
 *
 * Belongs to: Workspace Governance Surface
 * Access: operator, tenant_owner, platform_reviewer, platform_admin
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, Clock, CheckCircle2, XCircle, AlertTriangle, ShieldAlert,
  ShieldCheck, Loader2, Inbox, Zap, Pause, Play, RotateCcw,
  ArrowUpCircle, Timer, Ban, Eye, GitBranch, BookOpen, Shield, FlaskConical,
  ExternalLink, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ACTION_STATES,
  STATE_CATEGORIES,
  getTransitionsForActor,
  isRecoveryEligible,
  isTerminalState,
  validateTransition,
  type ActionState,
  type TransitionDefinition,
} from "@/lib/action-domain-state-machine";

// ── Types ──

interface ActionEntry {
  id: string;
  organization_id: string;
  action_id: string;
  intent_id: string;
  trigger_id: string;
  trigger_type: string;
  initiative_id: string | null;
  stage: string;
  execution_mode: string;
  status: string;
  risk_level: string;
  description: string;
  reason: string;
  policy_decision_id: string | null;
  dispatch_decision_id: string | null;
  approval_id: string | null;
  approved_by: string | null;
  requires_approval: boolean;
  rollback_available: boolean;
  constraints: string[];
  outcome_status: string | null;
  outcome_summary: string | null;
  outcome_errors: string[] | null;
  recovery_hook_id: string | null;
  recovery_type: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface AuditEvent {
  id: string;
  action_id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  reason: string;
  actor_type: string;
  actor_id: string | null;
  executor_type: string | null;
  created_at: string;
}

// ── Status config ──

const STATUS_CFG: Record<string, { label: string; icon: typeof Activity; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "text-muted-foreground" },
  approved: { label: "Approved", icon: CheckCircle2, className: "text-primary" },
  executing: { label: "Running", icon: Play, className: "text-info" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-primary" },
  failed: { label: "Failed", icon: XCircle, className: "text-destructive" },
  rejected: { label: "Rejected", icon: Ban, className: "text-destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "text-muted-foreground" },
  blocked: { label: "Blocked", icon: Pause, className: "text-warning" },
  waiting_approval: { label: "Waiting Approval", icon: Clock, className: "text-warning" },
  queued: { label: "Queued", icon: Zap, className: "text-info" },
  dispatched: { label: "Dispatched", icon: ArrowUpCircle, className: "text-info" },
  escalated: { label: "Escalated", icon: AlertTriangle, className: "text-destructive" },
  rolled_back: { label: "Rolled Back", icon: RotateCcw, className: "text-warning" },
  expired: { label: "Expired", icon: Timer, className: "text-muted-foreground" },
};

const RISK_CFG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  medium: { label: "Medium", className: "bg-accent/10 text-accent-foreground" },
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  unknown: { label: "Unknown", className: "bg-muted text-muted-foreground" },
};

const MODE_CFG: Record<string, string> = {
  auto: "Auto",
  approval_required: "Approval Required",
  manual_only: "Manual Only",
  blocked: "Blocked",
};

// ── Main ──

export default function ActionCenter() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  // Simulate recovery mutation — uses governed recover_action path
  const simulateRecovery = useMutation({
    mutationFn: async (actionEntry: ActionEntry) => {
      const { data, error } = await supabase.functions.invoke("architecture-simulation", {
        body: {
          action: "recover_action",
          organization_id: orgId,
          action_id: actionEntry.action_id,
          initiative_id: actionEntry.initiative_id,
          trigger_type: actionEntry.trigger_type,
          stage: actionEntry.stage,
          risk_level: actionEntry.risk_level,
          simulation_context: {
            source: "action_center_recovery",
            description: actionEntry.description,
            outcome_status: actionEntry.outcome_status,
            outcome_summary: actionEntry.outcome_summary,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      if (d?.success) {
        toast.success(`Recovery simulation complete: ${d.simulations_created} scenario(s), confidence=${(d.confidence_score * 100).toFixed(0)}%`);
      } else {
        toast.warning(`Recovery blocked: ${d?.reason || "unknown"}`);
      }
      qc.invalidateQueries({ queryKey: ["action-center"] });
    },
    onError: () => toast.error("Recovery simulation failed"),
  });

  // ── Fetch actions ──
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["action-center", orgId],
    enabled: !!orgId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_registry_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ActionEntry[];
    },
  });

  // ── Auto-select from URL param (cross-navigation from Approval Queue) ──
  useEffect(() => {
    const actionIdParam = searchParams.get("action_id");
    if (actionIdParam && actions.length > 0) {
      const match = actions.find((a) => a.action_id === actionIdParam);
      if (match) {
        setSelectedId(match.id);
        setTab("all");
      }
      setSearchParams({}, { replace: true });
    }
  }, [actions, searchParams, setSearchParams]);

  // ── Fetch audit for selected ──
  const selected = actions.find((a) => a.id === selectedId) || null;
  const { data: auditEvents = [] } = useQuery({
    queryKey: ["action-audit", selected?.action_id, orgId],
    enabled: !!selected && !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("action_audit_events")
        .select("*")
        .eq("action_id", selected!.action_id)
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });
      return (data || []) as AuditEvent[];
    },
  });

  // ── Counts (driven by state machine categories) ──
  const counts = {
    active: actions.filter((a) => STATE_CATEGORIES.active.includes(a.status as ActionState)).length,
    waiting: actions.filter((a) => a.status === "waiting_approval").length,
    blocked: actions.filter((a) => STATE_CATEGORIES.blocked.includes(a.status as ActionState)).length,
    failed: actions.filter((a) => a.status === "failed" || a.status === "escalated").length,
    completed: actions.filter((a) => STATE_CATEGORIES.completed.includes(a.status as ActionState)).length,
    recovery: actions.filter((a) => !!a.recovery_hook_id).length,
  };

  // ── Filter (driven by state machine categories) ──
  const filtered = actions.filter((a) => {
    if (tab === "active") return STATE_CATEGORIES.active.includes(a.status as ActionState);
    if (tab === "blocked") return STATE_CATEGORIES.blocked.includes(a.status as ActionState);
    if (tab === "failed") return a.status === "failed";
    if (tab === "completed") return STATE_CATEGORIES.completed.includes(a.status as ActionState);
    if (tab === "recovery") return !!a.recovery_hook_id;
    return true;
  }).filter((a) => {
    if (stageFilter !== "all" && a.stage !== stageFilter) return false;
    if (riskFilter !== "all" && a.risk_level !== riskFilter) return false;
    return true;
  });

  const stages = [...new Set(actions.map((a) => a.stage).filter(Boolean))];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Action Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central operational view of all formalized actions across the governed pipeline.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Active" value={counts.active} icon={Activity} className="text-info" />
          <SummaryCard label="Waiting Approval" value={counts.waiting} icon={Clock} className="text-warning" />
          <SummaryCard label="Blocked" value={counts.blocked} icon={Pause} className="text-destructive" />
          <SummaryCard label="Failed" value={counts.failed} icon={XCircle} className="text-destructive" />
          <SummaryCard label="Completed" value={counts.completed} icon={CheckCircle2} className="text-primary" />
          <SummaryCard label="Recovery" value={counts.recovery} icon={RotateCcw} className="text-warning" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active" className="gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" /> Active ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="blocked" className="gap-1.5 text-xs">
              <Pause className="h-3.5 w-3.5" /> Blocked
            </TabsTrigger>
            <TabsTrigger value="failed" className="gap-1.5 text-xs">
              <XCircle className="h-3.5 w-3.5" /> Failed
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </TabsTrigger>
            <TabsTrigger value="recovery" className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Recovery
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" /> All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <Card><CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground">Loading actions…</span>
              </CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No actions found for this filter.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((a) => (
                  <ActionRow key={a.id} action={a} isSelected={selectedId === a.id} onSelect={() => setSelectedId(a.id)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail Sheet */}
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-foreground">Action Detail</SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    Full operational context for this formalized action.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 mt-6">
                  {/* Status + Risk + Mode */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selected.status} />
                    <RiskBadge risk={selected.risk_level} />
                    <Badge variant="outline" className="text-[10px]">{MODE_CFG[selected.execution_mode] || selected.execution_mode}</Badge>
                    {selected.requires_approval && <Badge variant="outline" className="text-[10px] text-warning">Approval Required</Badge>}
                    {selected.rollback_available && <Badge variant="outline" className="text-[10px]">Rollback Available</Badge>}
                  </div>

                  {/* Description */}
                  <Section title="Description">
                    <p className="text-sm text-foreground">{selected.description || selected.reason || "No description."}</p>
                  </Section>

                  {/* Trigger / Intent */}
                  <Section title="Origin">
                    <DetailRow label="Action ID" value={selected.action_id} />
                    <DetailRow label="Trigger" value={selected.trigger_type} />
                    <DetailRow label="Trigger ID" value={selected.trigger_id || "—"} />
                    <DetailRow label="Intent ID" value={selected.intent_id} />
                    <DetailRow label="Stage" value={selected.stage} />
                    {selected.initiative_id && <DetailRow label="Initiative" value={selected.initiative_id} />}
                  </Section>

                  {/* Decision Path — Canon + Policy lineage */}
                  <Section title="Decision Path">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-muted-foreground">Canon informed:</span>
                        <span className="text-foreground font-medium">{selected.stage} stage context</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Shield className="h-3.5 w-3.5 text-warning shrink-0" />
                        <span className="text-muted-foreground">Policy constrained:</span>
                        <span className="text-foreground font-medium">{MODE_CFG[selected.execution_mode] || selected.execution_mode}</span>
                      </div>
                      {selected.policy_decision_id && (
                        <div className="flex items-center gap-2 text-xs">
                          <GitBranch className="h-3.5 w-3.5 text-info shrink-0" />
                          <span className="text-muted-foreground">Policy Decision:</span>
                          <span className="text-foreground font-mono text-[10px] truncate max-w-[180px]">{selected.policy_decision_id}</span>
                        </div>
                      )}
                      {selected.dispatch_decision_id && (
                        <div className="flex items-center gap-2 text-xs">
                          <Zap className="h-3.5 w-3.5 text-info shrink-0" />
                          <span className="text-muted-foreground">Dispatch:</span>
                          <span className="text-foreground font-mono text-[10px] truncate max-w-[180px]">{selected.dispatch_decision_id}</span>
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* Policy & Governance */}
                  <Section title="Policy & Governance">
                    <DetailRow label="Execution Mode" value={MODE_CFG[selected.execution_mode] || selected.execution_mode} />
                    <DetailRow label="Risk Level" value={selected.risk_level} />
                    {selected.approval_id && <DetailRow label="Approval ID" value={selected.approval_id} />}
                    {selected.approved_by && <DetailRow label="Approved By" value={selected.approved_by} />}
                  </Section>

                  {/* State Machine — Valid Transitions */}
                  {(() => {
                    const currentState = selected.status as ActionState;
                    const stateDef = ACTION_STATES[currentState];
                    const humanTransitions = getTransitionsForActor(currentState, "human");
                    const systemTransitions = getTransitionsForActor(currentState, "system");
                    return (
                      <Section title="Lifecycle State">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {stateDef?.category || "unknown"}
                            </Badge>
                            {stateDef?.isTerminal && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">Terminal</Badge>
                            )}
                            {stateDef?.isBlocking && (
                              <Badge variant="outline" className="text-[10px] text-warning">Blocking</Badge>
                            )}
                            {stateDef?.recoveryEligible && (
                              <Badge variant="outline" className="text-[10px] text-info">Recovery Eligible</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{stateDef?.description}</p>
                          {humanTransitions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium text-foreground">Operator actions available:</p>
                              {humanTransitions.map((t) => (
                                <div key={`${t.from}-${t.to}`} className="flex items-center gap-1.5 text-[11px]">
                                  <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                                  <span className="text-foreground font-medium">{t.label}</span>
                                  <span className="text-muted-foreground">→ {ACTION_STATES[t.to]?.label}</span>
                                  {t.guards.length > 0 && (
                                    <span className="text-muted-foreground/60 text-[9px] ml-1">({t.guards[0]})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {systemTransitions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium text-muted-foreground">System transitions:</p>
                              {systemTransitions.map((t) => (
                                <div key={`${t.from}-${t.to}`} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                                  <span>{t.label} → {ACTION_STATES[t.to]?.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {humanTransitions.length === 0 && systemTransitions.length === 0 && (
                            <p className="text-[10px] text-muted-foreground/60">No further transitions available (terminal state).</p>
                          )}
                        </div>
                      </Section>
                    );
                  })()}
                  {(selected.requires_approval || selected.status === "waiting_approval" || selected.approval_id) && (
                    <Section title="Related Approval">
                      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2.5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-foreground">
                            {selected.status === "waiting_approval"
                              ? "Awaiting human decision"
                              : selected.status === "approved"
                                ? "Approved by operator"
                                : selected.status === "rejected"
                                  ? "Rejected by operator"
                                  : selected.status === "expired"
                                    ? "Approval window expired"
                                    : "Approval required"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            View full approval context and decision history
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs shrink-0"
                          onClick={() => {
                            setSelectedId(null);
                            navigate(`/owner/pending-approvals?action_id=${selected.action_id}`);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Approval Queue
                        </Button>
                      </div>
                    </Section>
                  )}

                  {/* Constraints */}
                  {Array.isArray(selected.constraints) && selected.constraints.length > 0 && (
                    <Section title="Constraints">
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ml-3">
                        {selected.constraints.map((c: any, i: number) => (
                          <li key={i}>{typeof c === "string" ? c : c.description || JSON.stringify(c)}</li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {/* Outcome */}
                  {selected.outcome_status && (
                    <Section title="Outcome">
                      <DetailRow label="Status" value={selected.outcome_status} />
                      {selected.outcome_summary && <p className="text-xs text-muted-foreground mt-1">{selected.outcome_summary}</p>}
                      {Array.isArray(selected.outcome_errors) && selected.outcome_errors.length > 0 && (
                        <ul className="text-xs text-destructive space-y-0.5 list-disc ml-3 mt-1">
                          {selected.outcome_errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                    </Section>
                  )}

                  {/* Recovery */}
                  {selected.recovery_hook_id && (
                    <Section title="Recovery">
                      <DetailRow label="Recovery Hook" value={selected.recovery_hook_id} />
                      {selected.recovery_type && <DetailRow label="Recovery Type" value={selected.recovery_type} />}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 gap-1.5 text-xs"
                        disabled={simulateRecovery.isPending}
                        onClick={() => simulateRecovery.mutate(selected)}
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        {simulateRecovery.isPending ? "Simulating…" : "Simulate Recovery"}
                      </Button>
                    </Section>
                  )}

                  {/* Simulate Recovery for recovery-eligible states (state machine driven) */}
                  {!selected.recovery_hook_id && isRecoveryEligible(selected.status as ActionState) && (
                    <Section title="Recovery Options">
                      <p className="text-xs text-muted-foreground mb-2">
                        Run an architecture simulation before applying a rollback.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={simulateRecovery.isPending}
                        onClick={() => simulateRecovery.mutate(selected)}
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        {simulateRecovery.isPending ? "Simulating…" : "Simulate Recovery"}
                      </Button>
                    </Section>
                  )}

                  {/* Timeline */}
                  <Section title="Timeline">
                    <DetailRow label="Created" value={fmtDate(selected.created_at)} />
                    <DetailRow label="Updated" value={fmtDate(selected.updated_at)} />
                    {selected.completed_at && <DetailRow label="Completed" value={fmtDate(selected.completed_at)} />}
                  </Section>

                  <Separator />

                  {/* Audit Trail */}
                  <Section title="Audit Trail">
                    {auditEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No audit events recorded.</p>
                    ) : (
                      <ScrollArea className="max-h-[240px]">
                        <div className="space-y-2">
                          {auditEvents.map((e) => (
                            <div key={e.id} className="border border-border rounded-md p-2 text-xs space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{e.event_type}</span>
                                <span className="text-muted-foreground text-[10px]">{fmtDate(e.created_at)}</span>
                              </div>
                              {e.previous_status && e.new_status && (
                                <p className="text-muted-foreground">
                                  {e.previous_status} → {e.new_status}
                                </p>
                              )}
                              {e.reason && <p className="text-muted-foreground">{e.reason}</p>}
                              <p className="text-muted-foreground/60">{e.actor_type}{e.actor_id ? ` (${e.actor_id})` : ""}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </Section>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

// ── Sub-components ──

function SummaryCard({ label, value, icon: Icon, className }: { label: string; value: number; icon: typeof Activity; className: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${className}`} />
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionRow({ action, isSelected, onSelect }: { action: ActionEntry; isSelected: boolean; onSelect: () => void }) {
  const sCfg = STATUS_CFG[action.status] || STATUS_CFG.pending;
  const Icon = sCfg.icon;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:border-primary/30
        ${isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${sCfg.className}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={action.status} />
          <RiskBadge risk={action.risk_level} />
          <Badge variant="outline" className="text-[10px]">{action.trigger_type}</Badge>
          <Badge variant="outline" className="text-[10px]">{action.stage}</Badge>
          {action.requires_approval && <Badge variant="outline" className="text-[10px] text-warning border-warning/20">Approval</Badge>}
        </div>
        <p className="text-xs text-foreground mt-0.5 truncate">{action.description || action.reason || action.action_id}</p>
        {/* Decision Path mini-indicator */}
        <div className="flex items-center gap-1 mt-0.5">
          <BookOpen className="h-2.5 w-2.5 text-primary/60" />
          <span className="text-[9px] text-muted-foreground">Canon</span>
          <span className="text-[9px] text-muted-foreground/40">→</span>
          <Shield className="h-2.5 w-2.5 text-warning/60" />
          <span className="text-[9px] text-muted-foreground">{MODE_CFG[action.execution_mode] || action.execution_mode}</span>
          {action.policy_decision_id && (
            <>
              <span className="text-[9px] text-muted-foreground/40">→</span>
              <GitBranch className="h-2.5 w-2.5 text-info/60" />
              <span className="text-[9px] text-muted-foreground">Policy</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-muted-foreground">{fmtDateShort(action.created_at)}</p>
        {action.outcome_status && (
          <Badge variant="outline" className={`text-[9px] mt-0.5 ${action.outcome_status === "success" ? "text-primary" : "text-destructive"}`}>
            {action.outcome_status}
          </Badge>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.className}`}>{cfg.label}</Badge>;
}

function RiskBadge({ risk }: { risk: string }) {
  const cfg = RISK_CFG[risk] || RISK_CFG.unknown;
  const Icon = risk === "critical" || risk === "high" ? ShieldAlert : ShieldCheck;
  return <Badge variant="outline" className={`text-[10px] gap-0.5 ${cfg.className}`}><Icon className="h-3 w-3" />{cfg.label}</Badge>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="text-xs font-semibold text-foreground mb-1.5">{title}</h3>{children}</div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-[11px] truncate max-w-[200px]">{value}</span>
    </div>
  );
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
}
function fmtDateShort(iso: string): string {
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
}

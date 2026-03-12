/**
 * Approval Queue — Sprint 153 / AE-10
 *
 * Operational surface for reviewing, approving, and rejecting
 * actions that require human governance decisions.
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Timer,
  Loader2,
  Inbox,
  Filter,
  ExternalLink,
} from "lucide-react";

// ── Types ──

interface ApprovalRequest {
  id: string;
  organization_id: string;
  action_id: string;
  intent_id: string;
  trigger_type: string;
  initiative_id: string | null;
  stage: string;
  reason: string;
  explanation: string;
  risk_level: string;
  execution_mode: string;
  approval_scope: string;
  policy_rules: string[];
  constraints_summary: string[];
  status: string;
  requested_by: string;
  decided_by: string | null;
  decision_notes: string | null;
  decided_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Status config ──

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  waiting_approval: { label: "Waiting Approval", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  expired: { label: "Expired", icon: Timer, className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-muted text-muted-foreground border-border" },
  pending: { label: "Pending", icon: Clock, className: "bg-info/10 text-info border-info/20" },
};

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  medium: { label: "Medium", className: "bg-accent/10 text-accent-foreground" },
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  unknown: { label: "Unknown", className: "bg-muted text-muted-foreground" },
};

// ── Main component ──

export default function ApprovalQueue() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = currentOrg?.id;

  const [tab, setTab] = useState("waiting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  // ── Data fetch ──

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approval-queue", orgId],
    enabled: !!orgId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_approval_requests")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ApprovalRequest[];
    },
  });

  // ── Filter by tab ──

  const filtered = requests.filter((r) => {
    if (tab === "waiting") return r.status === "waiting_approval" || r.status === "pending";
    if (tab === "approved") return r.status === "approved";
    if (tab === "rejected") return r.status === "rejected";
    if (tab === "expired") return r.status === "expired" || r.status === "cancelled";
    if (tab === "high_risk") return r.risk_level === "critical" || r.risk_level === "high";
    return true;
  });

  // ── Counts ──

  const waitingCount = requests.filter((r) => r.status === "waiting_approval" || r.status === "pending").length;
  const highRiskCount = requests.filter((r) => (r.risk_level === "critical" || r.risk_level === "high") && r.status === "waiting_approval").length;

  // ── Decision mutation ──

  const decideMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const now = new Date().toISOString();
      const request = requests.find((r) => r.id === id);

      // 1. Update approval request
      const { error } = await supabase
        .from("action_approval_requests")
        .update({
          status: decision,
          decided_by: user?.id,
          decision_notes: decisionNotes || null,
          decided_at: now,
          updated_at: now,
        })
        .eq("id", id)
        .eq("organization_id", orgId!);
      if (error) throw error;

      // 2. Propagate decision to the action registry entry
      if (request?.action_id) {
        const actionStatus = decision === "approved" ? "approved" : "rejected";
        await supabase
          .from("action_registry_entries")
          .update({
            status: actionStatus,
            approved_by: decision === "approved" ? user?.id : null,
            updated_at: now,
          })
          .eq("action_id", request.action_id)
          .eq("organization_id", orgId!);

        // 3. Write audit trail event
        await supabase
          .from("action_audit_events")
          .insert({
            action_id: request.action_id,
            organization_id: orgId!,
            event_type: `approval_${decision}`,
            previous_status: "waiting_approval",
            new_status: actionStatus,
            reason: decisionNotes || `Human ${decision} via Approval Queue`,
            actor_type: "human",
            actor_id: user?.id,
          });
      }
    },
    onSuccess: (_data, vars) => {
      toast({ title: `Request ${vars.decision}`, description: `Approval request has been ${vars.decision}.` });
      qc.invalidateQueries({ queryKey: ["approval-queue"] });
      qc.invalidateQueries({ queryKey: ["action-center"] });
      setSelectedId(null);
      setDecisionNotes("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit decision.", variant: "destructive" });
    },
  });

  const selected = requests.find((r) => r.id === selectedId) || null;
  const isExpired = selected?.expires_at ? new Date(selected.expires_at) < new Date() : false;
  const canDecide = selected?.status === "waiting_approval" && !isExpired;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Approval Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and resolve actions requiring human approval before execution.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {waitingCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1.5">
                <Clock className="h-3 w-3" />
                {waitingCount} pending
              </Badge>
            )}
            {highRiskCount > 0 && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                {highRiskCount} high risk
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="waiting" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Waiting ({waitingCount})
            </TabsTrigger>
            <TabsTrigger value="high_risk" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> High Risk
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5" /> Rejected
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-1.5">
              <Timer className="h-3.5 w-3.5" /> Expired
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">Loading approval requests…</span>
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {tab === "waiting"
                      ? "No pending approval requests. All actions are cleared."
                      : `No ${tab === "all" ? "" : tab + " "}approval requests found.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((req) => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    isSelected={selectedId === req.id}
                    onSelect={() => setSelectedId(req.id)}
                  />
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
                  <SheetTitle className="text-foreground">Approval Request</SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    Review context, risk, and policy before deciding.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 mt-6">
                  {/* Status + Risk */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selected.status} />
                    <RiskBadge risk={selected.risk_level} />
                    {isExpired && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">
                        EXPIRED
                      </Badge>
                    )}
                  </div>

                  {/* What is being approved */}
                  <Section title="What is being approved">
                    <p className="text-sm text-foreground">{selected.reason || "No reason provided."}</p>
                    {selected.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">{selected.explanation}</p>
                    )}
                  </Section>

                  {/* Context */}
                  <Section title="Context">
                    <DetailRow label="Action ID" value={selected.action_id} />
                    <DetailRow label="Intent ID" value={selected.intent_id} />
                    <DetailRow label="Trigger" value={selected.trigger_type} />
                    <DetailRow label="Stage" value={selected.stage} />
                    <DetailRow label="Scope" value={selected.approval_scope} />
                    <DetailRow label="Execution Mode" value={selected.execution_mode} />
                    {selected.initiative_id && (
                      <DetailRow label="Initiative" value={selected.initiative_id} />
                    )}
                  </Section>

                  {/* Policy */}
                  {Array.isArray(selected.policy_rules) && selected.policy_rules.length > 0 && (
                    <Section title="Policy rules that triggered approval">
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ml-3">
                        {selected.policy_rules.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </Section>
                  )}

                  {/* Constraints */}
                  {Array.isArray(selected.constraints_summary) && selected.constraints_summary.length > 0 && (
                    <Section title="Constraints">
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc ml-3">
                        {selected.constraints_summary.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </Section>
                  )}

                  {/* Consequences */}
                  <Section title="What happens if…">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">Approved</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Action proceeds to dispatch and execution via the governed pipeline.
                        </p>
                      </div>
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-xs font-medium text-destructive">Rejected</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Action is blocked. No dispatch or execution occurs.
                        </p>
                      </div>
                    </div>
                  </Section>

                  {/* Timestamps */}
                  <Section title="Timeline">
                    <DetailRow label="Requested" value={formatDate(selected.created_at)} />
                    {selected.expires_at && (
                      <DetailRow label="Expires" value={formatDate(selected.expires_at)} />
                    )}
                    {selected.decided_at && (
                      <DetailRow label="Decided" value={formatDate(selected.decided_at)} />
                    )}
                    <DetailRow label="Requested by" value={selected.requested_by} />
                  </Section>

                  {/* Decision notes (if already decided) */}
                  {selected.decision_notes && (
                    <Section title="Decision notes">
                      <p className="text-xs text-muted-foreground">{selected.decision_notes}</p>
                    </Section>
                  )}

                  <Separator />

                  {/* Decision input */}
                  {canDecide ? (
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-foreground">Decision Notes (optional)</label>
                      <Textarea
                        placeholder="Add context for your decision…"
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        className="text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-1.5"
                          onClick={() => decideMutation.mutate({ id: selected.id, decision: "approved" })}
                          disabled={decideMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 gap-1.5"
                          onClick={() => decideMutation.mutate({ id: selected.id, decision: "rejected" })}
                          disabled={decideMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      {isExpired
                        ? "This approval request has expired and can no longer be decided."
                        : selected.status !== "waiting_approval"
                          ? `This request has already been ${selected.status}.`
                          : "Unable to decide on this request."}
                    </div>
                  )}
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

function ApprovalCard({
  request,
  isSelected,
  onSelect,
}: {
  request: ApprovalRequest;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isExpired = request.expires_at ? new Date(request.expires_at) < new Date() : false;

  return (
    <Card
      className={`cursor-pointer transition-colors hover:border-primary/30 ${isSelected ? "border-primary/50 bg-primary/5" : ""}`}
      onClick={onSelect}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={isExpired && request.status === "waiting_approval" ? "expired" : request.status} />
              <RiskBadge risk={request.risk_level} />
              <Badge variant="outline" className="text-[10px]">
                {request.trigger_type}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {request.stage}
              </Badge>
            </div>
            <p className="text-sm text-foreground truncate">{request.reason || "Approval required"}</p>
            <p className="text-xs text-muted-foreground truncate">
              Action: {request.action_id.substring(0, 12)}… · {request.approval_scope}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">{formatDateShort(request.created_at)}</p>
            {request.expires_at && (
              <p className={`text-[10px] ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                {isExpired ? "Expired" : `Expires ${formatDateShort(request.expires_at)}`}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.unknown;
  return (
    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
      {risk === "critical" || risk === "high" ? (
        <ShieldAlert className="h-3 w-3 mr-0.5" />
      ) : (
        <ShieldCheck className="h-3 w-3 mr-0.5" />
      )}
      {cfg.label}
    </Badge>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-foreground mb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-[11px] truncate max-w-[200px]">{value}</span>
    </div>
  );
}

// ── Helpers ──

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

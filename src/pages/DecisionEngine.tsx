/**
 * Sprint 98 — Institutional Decision Engine
 * Block T: Governed Intelligence OS — Completion
 *
 * Workspace Governance surface for:
 * - Decision recommendations overview
 * - Confidence and uncertainty visibility
 * - Contributing signals (memory + doctrine)
 * - Trade-offs and approval posture
 * - Decision detail drawer with explainability
 *
 * Invariants: advisory-first, governance before autonomy, tenant isolation, auditable
 */

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Brain,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Scale,
  ArrowUpRight,
  Pause,
  Filter,
  BookOpen,
  Network,
  Target,
  GitBranch,
  Activity,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface Decision {
  id: string;
  decision_key: string;
  decision_title: string;
  decision_description: string;
  decision_class: string;
  recommendation: string;
  recommendation_rationale: string;
  confidence_posture: string;
  confidence_score: number;
  uncertainty_notes?: string;
  risk_posture: string;
  risk_score: number;
  approval_posture: string;
  status: string;
  contributing_memory_count: number;
  contributing_doctrine_count: number;
  trade_offs: any[];
  escalation_reason?: string;
  created_at: string;
  updated_at: string;
}

interface DecisionStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  deferred: number;
  escalated: number;
  high_confidence: number;
  by_status: Record<string, number>;
  by_class: Record<string, number>;
  by_confidence: Record<string, number>;
  by_approval: Record<string, number>;
}

interface DecisionExplanation {
  summary: string;
  rationale: string;
  why_recommended: string;
  contributing_signals: { type: string; summary: string; weight: number }[];
  trade_offs: any[];
  confidence: { posture: string; score: number; interpretation: string };
  uncertainty: string;
  risk: { posture: string; score: number; interpretation: string };
  approval: { posture: string; interpretation: string };
  escalation_recommended: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────

function useDecisionStats(orgId: string | undefined) {
  return useQuery({
    queryKey: ["decision-engine-stats", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.functions.invoke("decision-engine", {
        body: { action: "stats", organization_id: orgId },
      });
      if (error) throw error;
      return data.stats as DecisionStats;
    },
    enabled: !!orgId,
  });
}

function useDecisions(orgId: string | undefined, filters: Record<string, any>) {
  return useQuery({
    queryKey: ["decisions", orgId, filters],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.functions.invoke("decision-engine", {
        body: { action: "list", organization_id: orgId, filters },
      });
      if (error) throw error;
      return data.decisions as Decision[];
    },
    enabled: !!orgId,
  });
}

function useDecisionDetail(orgId: string | undefined, decisionId: string | null) {
  return useQuery({
    queryKey: ["decision-detail", orgId, decisionId],
    queryFn: async () => {
      if (!orgId || !decisionId) return null;
      const { data, error } = await supabase.functions.invoke("decision-engine", {
        body: { action: "detail", organization_id: orgId, decision_id: decisionId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!decisionId,
  });
}

function useDecisionExplanation(orgId: string | undefined, decisionId: string | null) {
  return useQuery({
    queryKey: ["decision-explain", orgId, decisionId],
    queryFn: async () => {
      if (!orgId || !decisionId) return null;
      const { data, error } = await supabase.functions.invoke("decision-engine", {
        body: { action: "explain", organization_id: orgId, decision_id: decisionId },
      });
      if (error) throw error;
      return data.explanation as DecisionExplanation;
    },
    enabled: !!orgId && !!decisionId,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  draft: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Draft" },
  pending: { icon: Clock, color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400", label: "Pending" },
  accepted: { icon: CheckCircle2, color: "bg-green-500/20 text-green-700 dark:text-green-400", label: "Accepted" },
  rejected: { icon: XCircle, color: "bg-red-500/20 text-red-700 dark:text-red-400", label: "Rejected" },
  deferred: { icon: Pause, color: "bg-orange-500/20 text-orange-700 dark:text-orange-400", label: "Deferred" },
  escalated: { icon: ArrowUpRight, color: "bg-purple-500/20 text-purple-700 dark:text-purple-400", label: "Escalated" },
  archived: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Archived" },
};

const CONFIDENCE_CONFIG: Record<string, { color: string; label: string }> = {
  very_low: { color: "bg-red-500/20 text-red-700 dark:text-red-400", label: "Very Low" },
  low: { color: "bg-orange-500/20 text-orange-700 dark:text-orange-400", label: "Low" },
  moderate: { color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400", label: "Moderate" },
  high: { color: "bg-green-500/20 text-green-700 dark:text-green-400", label: "High" },
  very_high: { color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400", label: "Very High" },
};

const CLASS_LABELS: Record<string, string> = {
  governance_recommendation: "Governance",
  routing_decision_support: "Routing",
  capability_activation_posture: "Capability",
  benchmark_escalation: "Benchmark",
  intervention_recommendation: "Intervention",
  bounded_autonomy_decision: "Bounded Autonomy",
  promotion_guidance: "Promotion",
  delivery_readiness: "Delivery Readiness",
};

const APPROVAL_CONFIG: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  advisory_only: { icon: Lightbulb, color: "bg-slate-500/20 text-slate-700 dark:text-slate-400", label: "Advisory Only" },
  suggested_approval: { icon: CheckCircle2, color: "bg-green-500/20 text-green-700 dark:text-green-400", label: "Suggested Approval" },
  requires_review: { icon: Eye, color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400", label: "Requires Review" },
  requires_approval: { icon: Shield, color: "bg-orange-500/20 text-orange-700 dark:text-orange-400", label: "Requires Approval" },
  escalate_to_admin: { icon: ArrowUpRight, color: "bg-red-500/20 text-red-700 dark:text-red-400", label: "Escalate to Admin" },
};

// ─── Components ───────────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, subtitle }: { title: string; value: number | string; icon: any; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionCard({ decision, onSelect }: { decision: Decision; onSelect: () => void }) {
  const statusCfg = STATUS_CONFIG[decision.status] || STATUS_CONFIG.pending;
  const confCfg = CONFIDENCE_CONFIG[decision.confidence_posture] || CONFIDENCE_CONFIG.moderate;
  const approvalCfg = APPROVAL_CONFIG[decision.approval_posture] || APPROVAL_CONFIG.advisory_only;
  const StatusIcon = statusCfg.icon;

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onSelect}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg shrink-0">
            <StatusIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{decision.decision_title}</h4>
              <Badge variant="outline" className={statusCfg.color}>{statusCfg.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{decision.recommendation || decision.decision_description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline" className={`${confCfg.color} text-xs`}>{confCfg.label}</Badge>
              <Badge variant="outline" className={`${approvalCfg.color} text-xs`}>{approvalCfg.label}</Badge>
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />{decision.contributing_memory_count}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />{decision.contributing_doctrine_count}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionDetailDrawer({
  open,
  onOpenChange,
  decisionId,
  orgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decisionId: string | null;
  orgId: string | undefined;
}) {
  const { data: detail, isLoading: detailLoading } = useDecisionDetail(orgId, decisionId);
  const { data: explanation, isLoading: explainLoading } = useDecisionExplanation(orgId, decisionId);
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async (reviewAction: string) => {
      const { error } = await supabase.functions.invoke("decision-engine", {
        body: { action: "review", organization_id: orgId, decision_id: decisionId, review_input: { review_action: reviewAction, review_notes: "" } },
      });
      if (error) throw error;
    },
    onSuccess: (_, reviewAction) => {
      toast.success(`Decision ${reviewAction}ed`);
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      queryClient.invalidateQueries({ queryKey: ["decision-engine-stats"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Action failed"),
  });

  const deferMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("decision-engine", {
        body: { action: "defer", organization_id: orgId, decision_id: decisionId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision deferred");
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      queryClient.invalidateQueries({ queryKey: ["decision-engine-stats"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Defer failed"),
  });

  const escalateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("decision-engine", {
        body: { action: "escalate", organization_id: orgId, decision_id: decisionId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision escalated");
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      queryClient.invalidateQueries({ queryKey: ["decision-engine-stats"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Escalation failed"),
  });

  const dec = detail?.decision;
  const statusCfg = dec ? STATUS_CONFIG[dec.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending;
  const confCfg = dec ? CONFIDENCE_CONFIG[dec.confidence_posture] || CONFIDENCE_CONFIG.moderate : CONFIDENCE_CONFIG.moderate;
  const approvalCfg = dec ? APPROVAL_CONFIG[dec.approval_posture] || APPROVAL_CONFIG.advisory_only : APPROVAL_CONFIG.advisory_only;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {detailLoading || !dec ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle>{dec.decision_title}</SheetTitle>
                  <SheetDescription>{CLASS_LABELS[dec.decision_class] || dec.decision_class}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="mt-6 pr-4 h-[calc(100vh-180px)]">
              <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  <Badge className={confCfg.color}>{confCfg.label} Confidence</Badge>
                  <Badge className={approvalCfg.color}>{approvalCfg.label}</Badge>
                </div>

                {/* Recommendation */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{dec.recommendation}</p>
                    {dec.recommendation_rationale && (
                      <p className="text-xs text-muted-foreground mt-2">{dec.recommendation_rationale}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Metrics */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Confidence</span>
                        <span className="font-medium">{(dec.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={dec.confidence_score * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk</span>
                        <span className="font-medium">{(dec.risk_score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={dec.risk_score * 100} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-muted-foreground" />
                        <span>{dec.contributing_memory_count} memories</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span>{dec.contributing_doctrine_count} doctrines</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Explanation */}
                {explainLoading ? (
                  <Card><CardContent className="pt-4 flex justify-center"><RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /></CardContent></Card>
                ) : explanation ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Scale className="h-4 w-4" />Explainability
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Why recommended</p>
                        <p>{explanation.why_recommended}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Confidence</p>
                        <p>{explanation.confidence.interpretation}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Risk assessment</p>
                        <p>{explanation.risk.interpretation}</p>
                      </div>
                      {explanation.uncertainty && explanation.uncertainty !== "No explicit uncertainties documented." && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-muted-foreground text-xs uppercase mb-1">Uncertainties</p>
                            <p className="text-amber-600 dark:text-amber-400">{explanation.uncertainty}</p>
                          </div>
                        </>
                      )}
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Approval posture</p>
                        <p>{explanation.approval.interpretation}</p>
                      </div>
                      {explanation.escalation_recommended && (
                        <>
                          <Separator />
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Escalation recommended</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Trade-offs */}
                {dec.trade_offs && dec.trade_offs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />Trade-offs ({dec.trade_offs.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dec.trade_offs.map((t: any, i: number) => (
                          <div key={i} className="text-sm p-2 bg-muted/50 rounded">
                            {typeof t === "string" ? t : JSON.stringify(t)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contributing Signals */}
                {detail?.signals?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Network className="h-4 w-4" />Contributing Signals ({detail.signals.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.signals.map((sig: any) => (
                          <div key={sig.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <div className="min-w-0">
                              <span className="font-medium capitalize">{sig.signal_type}</span>
                              <span className="text-muted-foreground ml-2 truncate">{sig.signal_summary}</span>
                            </div>
                            <span className="text-muted-foreground shrink-0">{(sig.contribution_weight * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                {dec.status === "pending" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => reviewMutation.mutate("accept")} disabled={reviewMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Accept
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => reviewMutation.mutate("reject")} disabled={reviewMutation.isPending}>
                      <XCircle className="h-4 w-4 mr-1" />Reject
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deferMutation.mutate()} disabled={deferMutation.isPending}>
                      <Pause className="h-4 w-4 mr-1" />Defer
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => escalateMutation.mutate()} disabled={escalateMutation.isPending}>
                      <ArrowUpRight className="h-4 w-4 mr-1" />Escalate
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function DecisionEngine() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  const { data: stats } = useDecisionStats(orgId);

  const filters: Record<string, any> = {};
  if (tab === "pending") filters.status = "pending";
  if (tab === "accepted") filters.status = "accepted";
  if (tab === "escalated") filters.status = "escalated";
  if (tab === "deferred") filters.status = "deferred";
  if (classFilter !== "all") filters.decision_class = classFilter;

  const { data: decisions, isLoading } = useDecisions(orgId, filters);

  const openDetail = (id: string) => {
    setSelectedDecisionId(id);
    setDrawerOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Decision Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Institutional decision support using memory, doctrine, and governance signals
          </p>
        </div>

        <PageGuidanceShell pageKey="decision-engine" compact />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatsCard title="Total" value={stats?.total ?? 0} icon={Activity} />
          <StatsCard title="Pending" value={stats?.pending ?? 0} icon={Clock} />
          <StatsCard title="Accepted" value={stats?.accepted ?? 0} icon={CheckCircle2} />
          <StatsCard title="Rejected" value={stats?.rejected ?? 0} icon={XCircle} />
          <StatsCard title="Deferred" value={stats?.deferred ?? 0} icon={Pause} />
          <StatsCard title="Escalated" value={stats?.escalated ?? 0} icon={ArrowUpRight} />
          <StatsCard title="High Confidence" value={stats?.high_confidence ?? 0} icon={TrendingUp} />
        </div>

        {/* Approval Posture Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />Approval Posture Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(APPROVAL_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const count = stats?.by_approval?.[key] ?? 0;
                return (
                  <div key={key} className={`p-3 rounded-lg ${cfg.color} flex items-center gap-2`}>
                    <Icon className="h-4 w-4" />
                    <div>
                      <p className="text-xs font-medium">{cfg.label}</p>
                      <p className="text-lg font-bold">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Tabs value={tab} onValueChange={setTab} className="flex-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="escalated">Escalated</TabsTrigger>
              <TabsTrigger value="deferred">Deferred</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {Object.entries(CLASS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Decisions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : decisions && decisions.length > 0 ? (
          <div className="grid gap-3">
            {decisions.map((d) => (
              <DecisionCard key={d.id} decision={d} onSelect={() => openDetail(d.id)} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-lg">No decisions yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                The decision engine generates recommendations based on institutional memory, doctrine,
                and governance signals. Decisions will appear here as the system provides guidance.
              </p>
            </CardContent>
          </Card>
        )}

        <DecisionDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          decisionId={selectedDecisionId}
          orgId={orgId}
        />
      </div>
    </AppLayout>
  );
}

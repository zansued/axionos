/**
 * Sprint 97 — Bounded Autonomous Operations
 * Block T: Governed Intelligence OS
 *
 * Workspace Governance surface for:
 * - Operation overview and statistics
 * - Executed, blocked, pending operations
 * - Autonomy ladder visibility
 * - Rollback posture
 * - Operation detail drawer with explainability
 *
 * Invariants: advisory-first, bounded autonomy, rollback everywhere, tenant isolation, auditable
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
  Zap,
  Shield,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Eye,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lock,
  Unlock,
  Activity,
  Filter,
  BookOpen,
  Scale,
  Ban,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface AutonomousOperation {
  id: string;
  operation_key: string;
  operation_title: string;
  operation_description: string;
  operation_type: string;
  execution_scope: string;
  autonomy_level: string;
  approval_posture: string;
  rollback_posture: string;
  status: string;
  confidence_score: number;
  risk_score: number;
  created_at: string;
  updated_at: string;
  executed_at?: string;
  rolled_back_at?: string;
}

interface OpStats {
  total: number;
  completed: number;
  blocked: number;
  rolled_back: number;
  pending: number;
  auto_executed: number;
  requires_approval: number;
  by_status: Record<string, number>;
  by_autonomy: Record<string, number>;
  by_type: Record<string, number>;
}

interface OpExplanation {
  what_was_done: string;
  why_allowed: string;
  autonomy_posture: string;
  rollback_posture: string;
  risk_assessment: { risk_score: number; confidence: number; interpretation: string };
  what_not_automated: string;
  scope: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────

function useOpStats(orgId: string | undefined) {
  return useQuery({
    queryKey: ["autonomous-ops-stats", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.functions.invoke("autonomous-ops", {
        body: { action: "stats", organization_id: orgId },
      });
      if (error) throw error;
      return data.stats as OpStats;
    },
    enabled: !!orgId,
  });
}

function useOperations(orgId: string | undefined, filters: Record<string, any>) {
  return useQuery({
    queryKey: ["autonomous-ops", orgId, filters],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.functions.invoke("autonomous-ops", {
        body: { action: "list", organization_id: orgId, filters },
      });
      if (error) throw error;
      return data.operations as AutonomousOperation[];
    },
    enabled: !!orgId,
  });
}

function useOpDetail(orgId: string | undefined, opId: string | null) {
  return useQuery({
    queryKey: ["autonomous-op-detail", orgId, opId],
    queryFn: async () => {
      if (!orgId || !opId) return null;
      const { data, error } = await supabase.functions.invoke("autonomous-ops", {
        body: { action: "detail", organization_id: orgId, operation_id: opId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!opId,
  });
}

function useOpExplanation(orgId: string | undefined, opId: string | null) {
  return useQuery({
    queryKey: ["autonomous-op-explain", orgId, opId],
    queryFn: async () => {
      if (!orgId || !opId) return null;
      const { data, error } = await supabase.functions.invoke("autonomous-ops", {
        body: { action: "explain", organization_id: orgId, operation_id: opId },
      });
      if (error) throw error;
      return data.explanation as OpExplanation;
    },
    enabled: !!orgId && !!opId,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400", label: "Pending" },
  evaluating: { icon: Activity, color: "bg-blue-500/20 text-blue-700 dark:text-blue-400", label: "Evaluating" },
  approved: { icon: CheckCircle2, color: "bg-green-500/20 text-green-700 dark:text-green-400", label: "Approved" },
  executing: { icon: Zap, color: "bg-blue-500/20 text-blue-700 dark:text-blue-400", label: "Executing" },
  completed: { icon: CheckCircle2, color: "bg-green-500/20 text-green-700 dark:text-green-400", label: "Completed" },
  blocked: { icon: Ban, color: "bg-red-500/20 text-red-700 dark:text-red-400", label: "Blocked" },
  rolled_back: { icon: RotateCcw, color: "bg-orange-500/20 text-orange-700 dark:text-orange-400", label: "Rolled Back" },
  failed: { icon: XCircle, color: "bg-red-500/20 text-red-700 dark:text-red-400", label: "Failed" },
};

const AUTONOMY_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  recommend_only: { icon: BookOpen, color: "bg-slate-500/20 text-slate-700 dark:text-slate-400", label: "Recommend Only" },
  auto_execute_notify: { icon: Zap, color: "bg-blue-500/20 text-blue-700 dark:text-blue-400", label: "Auto + Notify" },
  auto_execute_bounded: { icon: Shield, color: "bg-purple-500/20 text-purple-700 dark:text-purple-400", label: "Auto Bounded" },
  requires_approval: { icon: Lock, color: "bg-amber-500/20 text-amber-700 dark:text-amber-400", label: "Requires Approval" },
};

const TYPE_LABELS: Record<string, string> = {
  low_risk_triage: "Low-Risk Triage",
  recommendation_prioritization: "Recommendation Prioritization",
  routing_refinement: "Routing Refinement",
  evidence_tagging: "Evidence Tagging",
  benchmark_scheduling: "Benchmark Scheduling",
  workspace_intervention: "Workspace Intervention",
  post_deploy_observation: "Post-Deploy Observation",
  governance_safe_admin: "Gov-Safe Admin",
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

function OperationCard({ op, onSelect }: { op: AutonomousOperation; onSelect: () => void }) {
  const statusCfg = STATUS_CONFIG[op.status] || STATUS_CONFIG.pending;
  const autonomyCfg = AUTONOMY_CONFIG[op.autonomy_level] || AUTONOMY_CONFIG.recommend_only;
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
              <h4 className="font-medium text-sm truncate">{op.operation_title}</h4>
              <Badge variant="outline" className={statusCfg.color}>{statusCfg.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{op.operation_description || "No description"}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={`${autonomyCfg.color} text-xs`}>{autonomyCfg.label}</Badge>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Risk: {(op.risk_score * 100).toFixed(0)}%
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Conf: {(op.confidence_score * 100).toFixed(0)}%
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

function OpDetailDrawer({
  open,
  onOpenChange,
  opId,
  orgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opId: string | null;
  orgId: string | undefined;
}) {
  const { data: detail, isLoading: detailLoading } = useOpDetail(orgId, opId);
  const { data: explanation, isLoading: explainLoading } = useOpExplanation(orgId, opId);
  const queryClient = useQueryClient();

  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("autonomous-ops", {
        body: { action: "rollback", organization_id: orgId, operation_id: opId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Operation rolled back");
      queryClient.invalidateQueries({ queryKey: ["autonomous-ops"] });
      queryClient.invalidateQueries({ queryKey: ["autonomous-ops-stats"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to rollback"),
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("autonomous-ops", {
        body: { action: "block", organization_id: orgId, operation_id: opId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Operation blocked");
      queryClient.invalidateQueries({ queryKey: ["autonomous-ops"] });
      queryClient.invalidateQueries({ queryKey: ["autonomous-ops-stats"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to block operation"),
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("autonomous-ops", {
        body: { action: "execute", organization_id: orgId, operation_id: opId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Operation executed");
      queryClient.invalidateQueries({ queryKey: ["autonomous-ops"] });
      queryClient.invalidateQueries({ queryKey: ["autonomous-ops-stats"] });
    },
    onError: (e: any) => toast.error(e.message || "Execution failed"),
  });

  const op = detail?.operation;
  const statusCfg = op ? STATUS_CONFIG[op.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending;
  const autonomyCfg = op ? AUTONOMY_CONFIG[op.autonomy_level] || AUTONOMY_CONFIG.recommend_only : AUTONOMY_CONFIG.recommend_only;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {detailLoading || !op ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle>{op.operation_title}</SheetTitle>
                  <SheetDescription>{TYPE_LABELS[op.operation_type] || op.operation_type}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="mt-6 pr-4 h-[calc(100vh-180px)]">
              <div className="space-y-6">
                {/* Status */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  <Badge className={autonomyCfg.color}>{autonomyCfg.label}</Badge>
                  <Badge variant="outline">{op.execution_scope}</Badge>
                </div>

                {/* Risk & Confidence */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Confidence</span>
                        <span className="font-medium">{(op.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={op.confidence_score * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk Score</span>
                        <span className="font-medium">{(op.risk_score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={op.risk_score * 100} className="h-2" />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rollback Posture</span>
                      <span className="font-medium capitalize">{op.rollback_posture?.replace(/_/g, " ")}</span>
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
                        <BookOpen className="h-4 w-4" />Explanation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">What was done</p>
                        <p>{explanation.what_was_done}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Why allowed</p>
                        <p>{explanation.why_allowed}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Autonomy posture</p>
                        <p>{explanation.autonomy_posture}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Rollback posture</p>
                        <p>{explanation.rollback_posture}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">What is NOT automated</p>
                        <p className="text-amber-600 dark:text-amber-400">{explanation.what_not_automated}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Executions */}
                {detail?.executions?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4" />Executions ({detail.executions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.executions.map((exec: any) => (
                          <div key={exec.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <div>
                              <span className="font-medium">{exec.execution_type}</span>
                              {exec.duration_ms != null && <span className="text-muted-foreground ml-2">{exec.duration_ms}ms</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {exec.rollback_executed && <Badge variant="outline" className="text-xs">Rolled Back</Badge>}
                              <Badge variant={exec.success ? "default" : "destructive"} className="text-xs">
                                {exec.success ? "Success" : "Failed"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {["pending", "approved"].includes(op.status) && (
                    <Button size="sm" onClick={() => executeMutation.mutate()} disabled={executeMutation.isPending}>
                      <Zap className="h-4 w-4 mr-1" />Execute
                    </Button>
                  )}
                  {op.rollback_posture !== "not_applicable" && op.status === "completed" && (
                    <Button variant="outline" size="sm" onClick={() => rollbackMutation.mutate()} disabled={rollbackMutation.isPending}>
                      <RotateCcw className="h-4 w-4 mr-1" />Rollback
                    </Button>
                  )}
                  {!["blocked", "rolled_back", "completed"].includes(op.status) && (
                    <Button variant="destructive" size="sm" onClick={() => blockMutation.mutate()} disabled={blockMutation.isPending}>
                      <Ban className="h-4 w-4 mr-1" />Block
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function BoundedOperations() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: stats } = useOpStats(orgId);

  const filters: Record<string, any> = {};
  if (tab === "completed") filters.status = "completed";
  if (tab === "blocked") filters.status = "blocked";
  if (tab === "pending") filters.status = "pending";
  if (tab === "rolled_back") filters.status = "rolled_back";
  if (typeFilter !== "all") filters.operation_type = typeFilter;

  const { data: operations, isLoading } = useOperations(orgId, filters);

  const openDetail = (id: string) => {
    setSelectedOpId(id);
    setDrawerOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bounded Operations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Safe, repeatable, low-risk autonomous operations under explicit governance
          </p>
        </div>

        <PageGuidanceShell pageKey="bounded-operations" compact />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatsCard title="Total" value={stats?.total ?? 0} icon={Activity} />
          <StatsCard title="Completed" value={stats?.completed ?? 0} icon={CheckCircle2} />
          <StatsCard title="Blocked" value={stats?.blocked ?? 0} icon={Ban} />
          <StatsCard title="Rolled Back" value={stats?.rolled_back ?? 0} icon={RotateCcw} />
          <StatsCard title="Pending" value={stats?.pending ?? 0} icon={Clock} />
          <StatsCard title="Auto-Executed" value={stats?.auto_executed ?? 0} icon={Zap} />
          <StatsCard title="Needs Approval" value={stats?.requires_approval ?? 0} icon={Lock} />
        </div>

        {/* Autonomy Ladder */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4" />Autonomy Ladder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(AUTONOMY_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const count = stats?.by_autonomy?.[key] ?? 0;
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
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="blocked">Blocked</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="rolled_back">Rolled Back</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : operations && operations.length > 0 ? (
          <div className="grid gap-3">
            {operations.map((op) => (
              <OperationCard key={op.id} op={op} onSelect={() => openDetail(op.id)} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-lg">No operations yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Bounded autonomous operations are created when the system identifies safe, repeatable
                actions governed by doctrine, rules, and explicit autonomy bounds.
              </p>
            </CardContent>
          </Card>
        )}

        <OpDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          opId={selectedOpId}
          orgId={orgId}
        />
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  BarChart3, DollarSign, Zap, Shield, Activity, RotateCcw, PlayCircle,
  ArrowRight, History, HeartPulse,
} from "lucide-react";
import { toast } from "sonner";

async function fetchOptimization(orgId: string, action: string, extra: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("prompt-optimization-engine", {
    body: { organization_id: orgId, action, ...extra },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  return data;
}

function useOptQuery(orgId: string | undefined, action: string, key: string, extra: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [key, orgId],
    enabled: !!orgId,
    queryFn: () => fetchOptimization(orgId!, action, extra),
    staleTime: 30_000,
  });
}

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    active_control: { variant: "default", label: "Control" },
    active_experiment: { variant: "secondary", label: "Experiment" },
    draft: { variant: "outline", label: "Draft" },
    candidate: { variant: "outline", label: "Candidate" },
    retired: { variant: "destructive", label: "Retired" },
  };
  const entry = map[status] || { variant: "outline" as const, label: status };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function healthBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    healthy: { variant: "default", label: "Healthy" },
    watch: { variant: "outline", label: "Watch" },
    rollback_recommended: { variant: "secondary", label: "Rollback Rec." },
    rollback_required: { variant: "destructive", label: "Rollback Req." },
  };
  const entry = map[status] || { variant: "outline" as const, label: status };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function rolloutStatusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    active: { variant: "default", label: "Active" },
    paused: { variant: "outline", label: "Paused" },
    completed: { variant: "secondary", label: "Completed" },
    rolled_back: { variant: "destructive", label: "Rolled Back" },
  };
  const entry = map[status] || { variant: "outline" as const, label: status };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function usd(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `$${v.toFixed(4)}`;
}

export default function PromptOptimization() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const overview = useOptQuery(orgId, "overview", "prompt-opt-overview");
  const performance = useOptQuery(orgId, "experiment_performance", "prompt-opt-performance");
  const candidates = useOptQuery(orgId, "promotion_candidates", "prompt-opt-candidates");
  const variants = useOptQuery(orgId, "variants_by_stage", "prompt-opt-variants");
  const rollouts = useOptQuery(orgId, "rollout_status", "prompt-opt-rollouts");
  const rollbackHistory = useOptQuery(orgId, "rollback_history", "prompt-opt-rollback-history");

  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [rolloutStrategy, setRolloutStrategy] = useState("immediate");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["prompt-opt-overview"] });
    queryClient.invalidateQueries({ queryKey: ["prompt-opt-rollouts"] });
    queryClient.invalidateQueries({ queryKey: ["prompt-opt-variants"] });
    queryClient.invalidateQueries({ queryKey: ["prompt-opt-rollback-history"] });
  };

  const activatePromotion = useMutation({
    mutationFn: (params: { variant_id: string; stage_key: string; rollout_strategy: string }) =>
      fetchOptimization(orgId!, "activate_promotion", params),
    onSuccess: () => {
      toast.success("Promotion activated");
      setPromoteDialogOpen(false);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message || "Failed to activate promotion"),
  });

  const advancePhase = useMutation({
    mutationFn: (rollout_window_id: string) =>
      fetchOptimization(orgId!, "advance_rollout_phase", { rollout_window_id }),
    onSuccess: (data: any) => {
      if (data?.result?.advanced) {
        toast.success(`Advanced to ${data.result.new_exposure_percent}%`);
      } else {
        toast.info(data?.result?.reason || "Cannot advance yet");
      }
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message || "Failed to advance phase"),
  });

  const rollbackMutation = useMutation({
    mutationFn: (rollout_window_id: string) =>
      fetchOptimization(orgId!, "rollback_variant", { rollout_window_id, rollback_mode: "manual" }),
    onSuccess: () => {
      toast.success("Variant rolled back");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message || "Failed to rollback"),
  });

  const ov = overview.data;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prompt Optimization</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controlled A/B experiments with bounded promotion and rollback guard. All changes are advisory and auditable.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Total Variants</CardDescription>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{ov?.total_variants ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Active Experiments</CardDescription>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{ov?.active_experiments ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Active Controls</CardDescription>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{ov?.active_controls ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><PlayCircle className="h-3.5 w-3.5" /> Active Rollouts</CardDescription>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{ov?.active_rollouts ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Rollbacks</CardDescription>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{ov?.recent_rollbacks ?? 0}</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="experiments" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
            <TabsTrigger value="variants">All Variants</TabsTrigger>
            <TabsTrigger value="promotions">Promotion Candidates</TabsTrigger>
            <TabsTrigger value="rollouts">Rollout Control</TabsTrigger>
            <TabsTrigger value="rollbacks">Rollback Watch</TabsTrigger>
            <TabsTrigger value="history">Rollback History</TabsTrigger>
          </TabsList>

          {/* Experiments Tab */}
          <TabsContent value="experiments" className="space-y-4">
            {(performance.data?.comparisons || []).length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No active experiments yet.</CardContent></Card>
            ) : (
              (performance.data?.comparisons || []).map((comp: any, i: number) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {comp.stage}
                    </CardTitle>
                    <CardDescription>
                      Control: {comp.control.variant_name} vs Experiment: {comp.experiment.variant_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{pct(comp.control.metrics?.success_rate)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono">{pct(comp.experiment.metrics?.success_rate)}</span>
                          {comp.comparison?.successRateDelta != null && (
                            comp.comparison.successRateDelta > 0
                              ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                              : comp.comparison.successRateDelta < 0
                              ? <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                              : null
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Repair Rate</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{pct(comp.control.metrics?.repair_rate)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono">{pct(comp.experiment.metrics?.repair_rate)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Cost</p>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{usd(comp.control.metrics?.avg_cost_usd)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono">{usd(comp.experiment.metrics?.avg_cost_usd)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Verdict</p>
                        <Badge variant={comp.comparison?.verdict === "experiment_better" ? "default" : comp.comparison?.verdict === "control_better" ? "destructive" : "outline"}>
                          {comp.comparison?.verdict?.replace(/_/g, " ") || "inconclusive"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* All Variants Tab */}
          <TabsContent value="variants">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(variants.data?.variants || []).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No variants created yet.</TableCell></TableRow>
                    ) : (
                      (variants.data?.variants || []).map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{v.stage_key}</TableCell>
                          <TableCell>{v.variant_name}</TableCell>
                          <TableCell>v{v.variant_version}</TableCell>
                          <TableCell>{statusBadge(v.status)}</TableCell>
                          <TableCell>
                            <Badge variant={v.is_enabled ? "default" : "outline"}>
                              {v.is_enabled ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {v.status === "active_experiment" && v.is_enabled && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => {
                                  setSelectedVariant(v);
                                  setPromoteDialogOpen(true);
                                }}
                              >
                                <ArrowRight className="h-3 w-3" /> Promote
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promotion Candidates Tab */}
          <TabsContent value="promotions" className="space-y-4">
            {(candidates.data?.candidates || []).length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No promotion candidates at this time.</CardContent></Card>
            ) : (
              (candidates.data?.candidates || []).map((c: any, i: number) => (
                <Card key={i} className={c.decision === "promote" ? "border-green-500/30" : c.decision === "regression" ? "border-red-500/30" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {c.decision === "promote" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                         c.decision === "regression" ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
                         <Activity className="h-4 w-4 text-muted-foreground" />}
                        {c.stageKey}
                      </CardTitle>
                      <Badge variant={c.decision === "promote" ? "default" : c.decision === "regression" ? "destructive" : "outline"}>
                        {c.decision.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Executions</p><p className="font-mono">{c.metrics?.executions ?? 0}</p></div>
                      <div><p className="text-muted-foreground">Success Rate</p><p className="font-mono">{pct(c.metrics?.success_rate)}</p></div>
                      <div><p className="text-muted-foreground">Promotion Score</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(c.metrics?.promotion_score ?? 0) * 100} className="h-2 flex-1" />
                          <span className="font-mono text-xs">{((c.metrics?.promotion_score ?? 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(c.reasons || []).join(" · ")}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rollout Control Tab */}
          <TabsContent value="rollouts" className="space-y-4">
            {(rollouts.data?.rollouts || []).length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No rollout windows. Promote a variant to start.</CardContent></Card>
            ) : (
              (rollouts.data?.rollouts || []).map((r: any) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <PlayCircle className="h-4 w-4" />
                        {r.stage_key}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {rolloutStatusBadge(r.rollout_status)}
                        <Badge variant="outline" className="font-mono">{r.rollout_strategy}</Badge>
                      </div>
                    </div>
                    <CardDescription>
                      Mode: {r.rollout_mode} · Started: {new Date(r.started_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Exposure</span>
                        <span className="font-mono">{r.current_exposure_percent}%</span>
                      </div>
                      <Progress value={r.current_exposure_percent} className="h-3" />
                    </div>

                    {/* Health checks timeline */}
                    {(r.health_checks || []).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><HeartPulse className="h-3 w-3" /> Health Checks</p>
                        <div className="flex flex-wrap gap-1">
                          {(r.health_checks || []).slice(0, 10).map((hc: any, i: number) => (
                            <div key={i} title={hc.regression_flags?.join(", ") || "OK"}>
                              {healthBadge(hc.health_status)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.rollout_status === "active" && (
                      <div className="flex gap-2 pt-1">
                        {r.rollout_strategy === "phased_10_25_50_100" && r.current_exposure_percent < 100 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={advancePhase.isPending}
                            onClick={() => advancePhase.mutate(r.id)}
                          >
                            <ArrowRight className="h-3 w-3" /> Advance Phase
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={rollbackMutation.isPending}
                          onClick={() => {
                            if (confirm("Are you sure you want to rollback this variant?")) {
                              rollbackMutation.mutate(r.id);
                            }
                          }}
                        >
                          <RotateCcw className="h-3 w-3" /> Rollback
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rollback Watch Tab */}
          <TabsContent value="rollbacks" className="space-y-4">
            {(candidates.data?.rollbacks || []).length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No rollback warnings. All variants performing within bounds.</CardContent></Card>
            ) : (
              (candidates.data?.rollbacks || []).map((r: any, i: number) => (
                <Card key={i} className={r.severity === "critical" ? "border-red-500/50" : "border-yellow-500/30"}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${r.severity === "critical" ? "text-red-500" : "text-yellow-500"}`} />
                        {r.stageKey}
                      </CardTitle>
                      <Badge variant={r.severity === "critical" ? "destructive" : "outline"}>
                        {r.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{(r.reasons || []).join(" · ")}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rollback History Tab */}
          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rollbackHistory.data?.rollbacks || []).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No rollback events recorded.</TableCell></TableRow>
                    ) : (
                      (rollbackHistory.data?.rollbacks || []).map((rb: any) => (
                        <TableRow key={rb.id}>
                          <TableCell className="font-mono text-xs">{rb.prompt_rollout_windows?.stage_key || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{rb.rollback_mode}</Badge></TableCell>
                          <TableCell className="text-xs max-w-xs truncate">
                            {rb.rollback_reason?.flags?.join(", ") || JSON.stringify(rb.rollback_reason)}
                          </TableCell>
                          <TableCell className="text-xs">{new Date(rb.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />
        <p className="text-xs text-muted-foreground text-center">
          Prompt optimization with bounded promotion and rollback guard. No automatic kernel mutation.
        </p>
      </div>

      {/* Promotion Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Promotion</DialogTitle>
            <DialogDescription>
              Promote <span className="font-semibold">{selectedVariant?.variant_name}</span> to active control for stage <span className="font-mono">{selectedVariant?.stage_key}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rollout Strategy</label>
              <Select value={rolloutStrategy} onValueChange={setRolloutStrategy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (100%)</SelectItem>
                  <SelectItem value="phased_10_25_50_100">Phased (10→25→50→100%)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {rolloutStrategy === "immediate"
                  ? "Variant becomes control immediately at 100% exposure."
                  : "Gradual rollout with health checks at each phase."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={activatePromotion.isPending}
              onClick={() => {
                if (!selectedVariant) return;
                activatePromotion.mutate({
                  variant_id: selectedVariant.id,
                  stage_key: selectedVariant.stage_key,
                  rollout_strategy: rolloutStrategy,
                });
              }}
            >
              {activatePromotion.isPending ? "Activating..." : "Activate Promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

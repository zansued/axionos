import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  FlaskConical, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  BarChart3, DollarSign, Zap, Shield, Activity,
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

function useOptOverview(orgId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-opt-overview", orgId],
    enabled: !!orgId,
    queryFn: () => fetchOptimization(orgId!, "overview"),
    staleTime: 30_000,
  });
}

function useOptPerformance(orgId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-opt-performance", orgId],
    enabled: !!orgId,
    queryFn: () => fetchOptimization(orgId!, "experiment_performance"),
    staleTime: 30_000,
  });
}

function useOptCandidates(orgId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-opt-candidates", orgId],
    enabled: !!orgId,
    queryFn: () => fetchOptimization(orgId!, "promotion_candidates"),
    staleTime: 30_000,
  });
}

function useOptVariants(orgId: string | undefined) {
  return useQuery({
    queryKey: ["prompt-opt-variants", orgId],
    enabled: !!orgId,
    queryFn: () => fetchOptimization(orgId!, "variants_by_stage"),
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

  const overview = useOptOverview(orgId);
  const performance = useOptPerformance(orgId);
  const candidates = useOptCandidates(orgId);
  const variants = useOptVariants(orgId);

  const ov = overview.data;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prompt Optimization</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controlled A/B experiments for prompt variants. All changes are advisory and auditable.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <CardDescription className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Stages Covered</CardDescription>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{ov?.stages_with_variants ?? 0}</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="experiments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
            <TabsTrigger value="variants">All Variants</TabsTrigger>
            <TabsTrigger value="promotions">Promotion Candidates</TabsTrigger>
            <TabsTrigger value="rollbacks">Rollback Watch</TabsTrigger>
          </TabsList>

          {/* Experiments Tab */}
          <TabsContent value="experiments" className="space-y-4">
            {(performance.data?.comparisons || []).length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No active experiments yet. Create variants and set them as experiments to begin.</CardContent></Card>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(variants.data?.variants || []).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No variants created yet.</TableCell></TableRow>
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
        </Tabs>

        <Separator />
        <p className="text-xs text-muted-foreground text-center">
          Prompt optimization experiments are advisory only and do not automatically mutate the execution kernel.
        </p>
      </div>
    </AppLayout>
  );
}

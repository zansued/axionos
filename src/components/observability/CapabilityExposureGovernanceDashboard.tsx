import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, KeyRound, FileCheck, BarChart3, AlertTriangle, Eye, GanttChart } from "lucide-react";
import { useCapabilityExposureGovernance } from "@/hooks/useCapabilityExposureGovernance";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function CapabilityExposureGovernanceDashboard() {
  const { overview, classifications, gates, restrictions, reviewQueue, outcomes } = useCapabilityExposureGovernance();
  const ov = overview.data as Record<string, any> | null;
  const cls = (classifications.data as any)?.cases || [];
  const gateEvals = (gates.data as any)?.gate_evaluations || [];
  const rests = (restrictions.data as any)?.restrictions || [];
  const queue = (reviewQueue.data as any)?.review_queue || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Eye className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Exposure Governance</h2>
          <p className="text-sm text-muted-foreground">
            Capability exposure governance — advisory-first, no external activation
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-yellow-500/30 text-yellow-400">Governance Only</Badge>
      </div>

      {/* Stats */}
      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-7">
          <StatCard label="Cases" value={ov.total_cases ?? 0} />
          <StatCard label="Classes" value={ov.classes_defined ?? 0} />
          <StatCard label="Pending Reviews" value={ov.pending_reviews ?? 0} />
          <StatCard label="Never Expose" value={ov.never_expose_count ?? 0} />
          <StatCard label="Internal Only" value={ov.internal_only_count ?? 0} />
          <StatCard label="Future Candidates" value={ov.future_candidate_count ?? 0} />
          <StatCard label="Outcomes" value={ov.outcome_count ?? 0} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="cases">
        <TabsList className="grid w-full grid-cols-6 h-9">
          <TabsTrigger value="cases" className="text-xs gap-1"><GanttChart className="h-3 w-3" /> Cases</TabsTrigger>
          <TabsTrigger value="classes" className="text-xs gap-1"><Lock className="h-3 w-3" /> Classes</TabsTrigger>
          <TabsTrigger value="gates" className="text-xs gap-1"><Shield className="h-3 w-3" /> Gates</TabsTrigger>
          <TabsTrigger value="restrictions" className="text-xs gap-1"><KeyRound className="h-3 w-3" /> Restrictions</TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Review Queue</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        {/* Governance Cases */}
        <TabsContent value="cases" className="mt-4 space-y-3">
          {cls.length === 0 ? (
            <EmptyState icon={GanttChart} text="No governance cases created yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {cls.slice(0, 20).map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{c.capability_name || "Unnamed"}</p>
                      <RestrictionBadge level={c.restriction_level} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.capability_domain} · {c.capability_type}</p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <MetricPill label="Safety" value={c.safety_gate_score} />
                      <MetricPill label="Trust" value={c.trust_gate_score} />
                      <MetricPill label="Policy" value={c.policy_gate_score} />
                      <MetricPill label="Audit" value={c.auditability_score} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Governance:</span>
                      <Progress value={(c.exposure_governance_score || 0) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs font-mono">{((c.exposure_governance_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-1">
                      <StatusBadge status={c.review_status} />
                      <StatusBadge status={c.decision_status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Exposure Classes */}
        <TabsContent value="classes" className="mt-4">
          {ov?.classes_defined === 0 ? (
            <EmptyState icon={Lock} text="No exposure classes defined yet." />
          ) : (
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Exposure Class Distribution</CardTitle></CardHeader>
              <CardContent>
                {ov?.cases_by_decision && Object.entries(ov.cases_by_decision).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs py-1">
                    <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                    <Badge variant="outline" className="text-[10px]">{String(v)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Gate Evaluations */}
        <TabsContent value="gates" className="mt-4 space-y-3">
          {gateEvals.length === 0 ? (
            <EmptyState icon={Shield} text="No gate evaluations available." />
          ) : (
            <div className="space-y-2">
              {gateEvals.slice(0, 15).map((g: any, i: number) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{g.capability_name}</p>
                      <span className="text-xs font-mono">{((g.overall || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <GatePill label="Safety" status={g.safety_gate} />
                      <GatePill label="Trust" status={g.trust_gate} />
                      <GatePill label="Policy" status={g.policy_gate} />
                      <GatePill label="Audit" status={g.auditability_gate} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Restrictions */}
        <TabsContent value="restrictions" className="mt-4 space-y-3">
          {rests.length === 0 ? (
            <EmptyState icon={KeyRound} text="No restrictions analyzed." />
          ) : (
            <div className="space-y-2">
              {rests.slice(0, 15).map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.capability_name}</p>
                      <p className="text-xs text-muted-foreground">{r.rationale}</p>
                    </div>
                    <div className="flex gap-1">
                      <RestrictionBadge level={r.restriction_type} />
                      <Badge className={`text-[10px] ${r.restriction_severity === 'hard' ? 'bg-red-500/20 text-red-400 border-red-500/30' : r.restriction_severity === 'soft' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-muted text-muted-foreground'}`}>
                        {r.restriction_severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Review Queue */}
        <TabsContent value="review" className="mt-4 space-y-3">
          {queue.length === 0 ? (
            <EmptyState icon={FileCheck} text="No cases pending review." />
          ) : (
            <div className="space-y-2">
              {queue.map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.capability_name}</p>
                      <p className="text-xs text-muted-foreground">Gov: {((c.exposure_governance_score || 0) * 100).toFixed(0)}% · {c.capability_domain}</p>
                    </div>
                    <div className="flex gap-1">
                      <StatusBadge status={c.review_status} />
                      <RestrictionBadge level={c.restriction_level} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Outcomes */}
        <TabsContent value="outcomes" className="mt-4 space-y-3">
          {outs.length === 0 ? (
            <EmptyState icon={AlertTriangle} text="No governance outcomes recorded." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.recommendation_type}</p>
                      <p className="text-xs text-muted-foreground">Accuracy: {((o.governance_outcome_accuracy_score || 0) * 100).toFixed(0)}%</p>
                    </div>
                    <StatusBadge status={o.outcome_status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RestrictionBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    never_expose: "bg-red-500/20 text-red-400 border-red-500/30",
    internal_only: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    partner_limited: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    sandbox_only: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    controlled_future_candidate: "bg-green-500/20 text-green-400 border-green-500/30",
    restricted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return <Badge className={`text-[10px] ${styles[level] || "bg-muted text-muted-foreground"}`}>{level?.replace(/_/g, ' ')}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    under_review: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    approved_for_future: "bg-green-500/20 text-green-400 border-green-500/30",
    delayed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    restricted: "bg-red-500/20 text-red-400 border-red-500/30",
    open: "bg-muted text-muted-foreground",
    reviewed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="font-mono text-xs">{((value || 0) * 100).toFixed(0)}%</p>
    </div>
  );
}

function GatePill({ label, status }: { label: string; status: string }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <Badge className={`text-[10px] ${status === 'pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{status}</Badge>
    </div>
  );
}

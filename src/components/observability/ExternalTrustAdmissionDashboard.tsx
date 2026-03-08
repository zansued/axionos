import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Shield, Lock, KeyRound, FileCheck, AlertTriangle, GanttChart, Users } from "lucide-react";
import { useExternalTrustAdmission } from "@/hooks/useExternalTrustAdmission";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function ExternalTrustAdmissionDashboard() {
  const { overview, actors, trustClassification, admissionCases, requirements, reviewQueue, outcomes } = useExternalTrustAdmission();
  const ov = overview.data as Record<string, any> | null;
  const actorList = (actors.data as any)?.actors || [];
  const trustActors = (trustClassification.data as any)?.actors || [];
  const cases = (admissionCases.data as any)?.cases || [];
  const reqs = (requirements.data as any)?.requirements || [];
  const queue = (reviewQueue.data as any)?.review_queue || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <UserCheck className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">External Trust & Admission</h2>
          <p className="text-sm text-muted-foreground">
            Trust evaluation and admission governance — advisory-first, no live external access
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-yellow-500/30 text-yellow-400">Governance Only</Badge>
      </div>

      {/* Stats */}
      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-7">
          <StatCard label="Actors" value={ov.total_actors ?? 0} />
          <StatCard label="Trust Tiers" value={ov.tiers_defined ?? 0} />
          <StatCard label="Cases" value={ov.total_cases ?? 0} />
          <StatCard label="Pending Reviews" value={ov.pending_reviews ?? 0} />
          <StatCard label="Unmet Reqs" value={ov.unmet_requirements ?? 0} />
          <StatCard label="Critical Unmet" value={ov.critical_unmet ?? 0} />
          <StatCard label="Outcomes" value={ov.outcome_count ?? 0} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="actors">
        <TabsList className="grid w-full grid-cols-7 h-9">
          <TabsTrigger value="actors" className="text-xs gap-1"><Users className="h-3 w-3" /> Actors</TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs gap-1"><Shield className="h-3 w-3" /> Tiers</TabsTrigger>
          <TabsTrigger value="cases" className="text-xs gap-1"><GanttChart className="h-3 w-3" /> Cases</TabsTrigger>
          <TabsTrigger value="requirements" className="text-xs gap-1"><KeyRound className="h-3 w-3" /> Requirements</TabsTrigger>
          <TabsTrigger value="restrictions" className="text-xs gap-1"><Lock className="h-3 w-3" /> Restrictions</TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Review</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        {/* Actor Registry */}
        <TabsContent value="actors" className="mt-4 space-y-3">
          {actorList.length === 0 ? (
            <EmptyState icon={Users} text="No external actors registered yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {actorList.slice(0, 20).map((a: any) => (
                <Card key={a.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{a.external_actor_name}</p>
                      <RestrictionBadge level={a.restriction_level} />
                    </div>
                    <p className="text-xs text-muted-foreground">{a.external_actor_type} · {a.external_actor_scope}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Identity:</span>
                      <Progress value={(a.identity_confidence_score || 0) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs font-mono">{((a.identity_confidence_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trust Tiers */}
        <TabsContent value="tiers" className="mt-4">
          {ov?.tiers_defined === 0 ? (
            <EmptyState icon={Shield} text="No trust tiers defined yet." />
          ) : (
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Trust Distribution</CardTitle></CardHeader>
              <CardContent>
                {trustActors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No actors classified yet.</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(
                      trustActors.reduce((acc: Record<string, number>, a: any) => {
                        const tier = a.external_trust_tiers?.tier_key || "unclassified";
                        acc[tier] = (acc[tier] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs py-1">
                        <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-[10px]">{String(v)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Admission Cases */}
        <TabsContent value="cases" className="mt-4 space-y-3">
          {cases.length === 0 ? (
            <EmptyState icon={GanttChart} text="No admission cases created yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {cases.slice(0, 20).map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{c.external_actor_registry?.external_actor_name || "Unknown"}</p>
                      <RestrictionBadge level={c.restriction_level} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <MetricPill label="Evidence" value={c.evidence_completeness_score} />
                      <MetricPill label="Audit" value={c.auditability_score} />
                      <MetricPill label="Policy" value={c.policy_alignment_score} />
                      <MetricPill label="Risk" value={c.risk_score} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Readiness:</span>
                      <Progress value={(c.admission_readiness_score || 0) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs font-mono">{((c.admission_readiness_score || 0) * 100).toFixed(0)}%</span>
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

        {/* Requirements */}
        <TabsContent value="requirements" className="mt-4 space-y-3">
          {reqs.length === 0 ? (
            <EmptyState icon={KeyRound} text="No admission requirements tracked yet." />
          ) : (
            <div className="space-y-2">
              {reqs.slice(0, 20).map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.requirement_name}</p>
                      <p className="text-xs text-muted-foreground">{r.requirement_type} · {r.gap_description || "Met"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge className={`text-[10px] ${r.is_met ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {r.is_met ? "met" : "unmet"}
                      </Badge>
                      <Badge className={`text-[10px] ${r.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-muted text-muted-foreground'}`}>
                        {r.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Restrictions */}
        <TabsContent value="restrictions" className="mt-4 space-y-3">
          {actorList.length === 0 ? (
            <EmptyState icon={Lock} text="No restriction data available." />
          ) : (
            <div className="space-y-2">
              {actorList.filter((a: any) => a.restriction_level !== 'none').slice(0, 15).map((a: any) => (
                <Card key={a.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{a.external_actor_name}</p>
                      <p className="text-xs text-muted-foreground">{a.external_actor_type} · {a.external_actor_scope}</p>
                    </div>
                    <RestrictionBadge level={a.restriction_level} />
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
                      <p className="text-sm font-medium">{c.external_actor_registry?.external_actor_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">Readiness: {((c.admission_readiness_score || 0) * 100).toFixed(0)}%</p>
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
            <EmptyState icon={AlertTriangle} text="No trust outcomes recorded." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.recommendation_type}</p>
                      <p className="text-xs text-muted-foreground">Accuracy: {((o.admission_outcome_accuracy_score || 0) * 100).toFixed(0)}% · Drift: {((o.trust_drift_score || 0) * 100).toFixed(0)}%</p>
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
    never_admit: "bg-red-500/20 text-red-400 border-red-500/30",
    restricted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    restricted_candidate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    provisional: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    sandbox_eligible: "bg-green-500/20 text-green-400 border-green-500/30",
    controlled_future_candidate: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return <Badge className={`text-[10px] ${styles[level] || "bg-muted text-muted-foreground"}`}>{level?.replace(/_/g, ' ')}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    under_review: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    sandbox_eligible_future: "bg-green-500/20 text-green-400 border-green-500/30",
    controlled_future_candidate: "bg-green-500/20 text-green-400 border-green-500/30",
    delayed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    restricted: "bg-red-500/20 text-red-400 border-red-500/30",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
    future_candidate: "bg-green-500/20 text-green-400 border-green-500/30",
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

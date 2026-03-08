import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Shield, Lock, KeyRound, FileCheck, BarChart3, AlertTriangle } from "lucide-react";
import { useControlledEcosystemReadiness } from "@/hooks/useControlledEcosystemReadiness";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function ControlledEcosystemReadinessDashboard() {
  const { overview, inventory, prerequisites, trustModels, recommendations, outcomes } = useControlledEcosystemReadiness();
  const ov = overview.data as Record<string, any> | null;
  const inv = (inventory.data as any)?.capabilities || [];
  const prereqs = prerequisites.data as Record<string, any> | null;
  const trust = (trustModels.data as any)?.trust_models || [];
  const recs = (recommendations.data as any)?.recommendations || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Ecosystem Readiness</h2>
          <p className="text-sm text-muted-foreground">
            Controlled ecosystem readiness assessment — advisory-first, no marketplace activation
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-yellow-500/30 text-yellow-400">Readiness Only</Badge>
      </div>

      {/* Stats */}
      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-7">
          <StatCard label="Capabilities" value={ov.total_capabilities ?? 0} />
          <StatCard label="Candidates" value={ov.candidate_count ?? 0} />
          <StatCard label="Restricted" value={ov.restricted_count ?? 0} />
          <StatCard label="Internal Only" value={ov.internal_only_count ?? 0} />
          <StatCard label="Never Expose" value={ov.never_expose_count ?? 0} />
          <StatCard label="Prerequisites Met" value={`${ov.prerequisite_met ?? 0}/${ov.prerequisite_total ?? 0}`} />
          <StatCard label="Trust Models" value={ov.trust_model_count ?? 0} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="inventory">
        <TabsList className="grid w-full grid-cols-6 h-9">
          <TabsTrigger value="inventory" className="text-xs gap-1"><Lock className="h-3 w-3" /> Inventory</TabsTrigger>
          <TabsTrigger value="readiness" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Readiness</TabsTrigger>
          <TabsTrigger value="prerequisites" className="text-xs gap-1"><Shield className="h-3 w-3" /> Prerequisites</TabsTrigger>
          <TabsTrigger value="trust" className="text-xs gap-1"><KeyRound className="h-3 w-3" /> Trust Models</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Actions</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        {/* Capability Inventory */}
        <TabsContent value="inventory" className="mt-4 space-y-3">
          {inv.length === 0 ? (
            <EmptyState icon={Lock} text="Nenhuma capability catalogada ainda." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {inv.map((cap: any) => (
                <Card key={cap.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{cap.capability_name || "Unnamed"}</p>
                      <StatusBadge status={cap.exposure_candidate_status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{cap.capability_domain} · {cap.capability_type}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <MetricPill label="Criticality" value={cap.internal_criticality_score} />
                      <MetricPill label="Dependency" value={cap.dependency_sensitivity_score} />
                      <MetricPill label="Auditability" value={cap.auditability_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Readiness Assessments */}
        <TabsContent value="readiness" className="mt-4">
          <EmptyState icon={BarChart3} text="Readiness assessments serão exibidos aqui quando disponíveis." />
        </TabsContent>

        {/* Safety Prerequisites */}
        <TabsContent value="prerequisites" className="mt-4 space-y-3">
          {prereqs ? (
            <>
              <div className="grid gap-3 grid-cols-3">
                <StatCard label="Total" value={prereqs.total ?? 0} />
                <StatCard label="Met" value={prereqs.met ?? 0} />
                <StatCard label="Unmet" value={prereqs.unmet ?? 0} />
              </div>
              {(prereqs.unmet_prerequisites || []).length > 0 && (
                <Card className="border-destructive/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Unmet Prerequisites</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {(prereqs.unmet_prerequisites as any[]).slice(0, 10).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span>{p.prerequisite_name || p.capability_name}</span>
                        <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">{p.severity}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <EmptyState icon={Shield} text="Nenhum prerequisite avaliado." />
          )}
        </TabsContent>

        {/* Trust Models */}
        <TabsContent value="trust" className="mt-4 space-y-3">
          {trust.length === 0 ? (
            <EmptyState icon={KeyRound} text="Nenhum modelo de confiança definido." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {trust.map((m: any) => (
                <Card key={m.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold text-sm">{m.trust_model_name}</p>
                    <p className="text-xs text-muted-foreground">{m.trust_model_type}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <Progress value={(m.trust_model_confidence_score || 0) * 100} className="h-1.5 flex-1" />
                      <span className="text-xs font-mono">{((m.trust_model_confidence_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <StatusBadge status={m.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Advisory Actions */}
        <TabsContent value="actions" className="mt-4 space-y-3">
          {recs.length === 0 ? (
            <EmptyState icon={FileCheck} text="Nenhuma recomendação de readiness pendente." />
          ) : (
            <div className="space-y-2">
              {recs.map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.recommendation_type}</p>
                      <p className="text-xs text-muted-foreground">Quality: {((r.readiness_recommendation_quality_score || 0) * 100).toFixed(0)}%</p>
                    </div>
                    <StatusBadge status={r.recommendation_status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Outcomes */}
        <TabsContent value="outcomes" className="mt-4 space-y-3">
          {outs.length === 0 ? (
            <EmptyState icon={AlertTriangle} text="Nenhum outcome de readiness registrado." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.recommendation_type}</p>
                      <p className="text-xs text-muted-foreground">Accuracy: {((o.readiness_outcome_accuracy_score || 0) * 100).toFixed(0)}%</p>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    candidate: "bg-green-500/20 text-green-400 border-green-500/30",
    restricted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    internal_only: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    never_expose: "bg-red-500/20 text-red-400 border-red-500/30",
    unclassified: "bg-muted text-muted-foreground",
    draft: "bg-muted text-muted-foreground",
    open: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    reviewed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    accepted: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-muted text-muted-foreground",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function MetricPill({ label, value }: { label: string; value: number }) {
  const pct = (value || 0) * 100;
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="font-mono text-xs">{pct.toFixed(0)}%</p>
    </div>
  );
}

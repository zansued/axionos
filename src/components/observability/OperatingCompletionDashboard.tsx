import { useOperatingCompletion } from "@/hooks/useOperatingCompletion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, ShieldCheck, Target, Layers, FileSearch, Award } from "lucide-react";

function MetricCard({ label, value, subtitle, variant }: { label: string; value: string | number; subtitle?: string; variant?: "default" | "warning" | "success" }) {
  const color = variant === "warning" ? "text-yellow-400" : variant === "success" ? "text-green-400" : "text-primary";
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold font-display ${color}`}>{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function OperatingCompletionDashboard() {
  const { overview, models, assessments, gaps, certifications, aggregation, outcomes } = useOperatingCompletion();
  const ov = overview.data as any;
  const isLoading = overview.isLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-bold">Operating Completion</h2>
        <Badge variant="outline" className="text-[10px]">Sprint 65</Badge>
        <Badge variant="secondary" className="text-[10px]">Advisory-First</Badge>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <MetricCard label="Completion Score" value={ov?.avg_completion_score ? `${(ov.avg_completion_score * 100).toFixed(1)}%` : "—"} />
        <MetricCard label="Round Enough" value={ov?.avg_round_enough_score ? `${(ov.avg_round_enough_score * 100).toFixed(1)}%` : "—"} variant={ov?.avg_round_enough_score >= 0.65 ? "success" : "warning"} />
        <MetricCard label="Models" value={ov?.total_models ?? 0} />
        <MetricCard label="Assessments" value={ov?.total_assessments ?? 0} />
        <MetricCard label="Gaps" value={ov?.total_gaps ?? 0} subtitle={`${ov?.high_severity_gaps ?? 0} high severity`} variant={ov?.high_severity_gaps > 0 ? "warning" : "default"} />
        <MetricCard label="Certifications" value={ov?.certified_baselines ?? 0} subtitle={`of ${ov?.total_certifications ?? 0} candidates`} variant={ov?.certified_baselines > 0 ? "success" : "default"} />
        <MetricCard label="Reviews Pending" value={ov?.pending_reviews ?? 0} variant={ov?.pending_reviews > 0 ? "warning" : "default"} />
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="dimensions">
        <TabsList className="grid w-full grid-cols-6 h-9">
          <TabsTrigger value="dimensions" className="text-xs gap-1"><Layers className="h-3 w-3" /> Dimensions</TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Gaps</TabsTrigger>
          <TabsTrigger value="certification" className="text-xs gap-1"><Award className="h-3 w-3" /> Certification</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs gap-1"><FileSearch className="h-3 w-3" /> Reviews</TabsTrigger>
          <TabsTrigger value="models" className="text-xs gap-1"><Target className="h-3 w-3" /> Models</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        {/* Dimensions */}
        <TabsContent value="dimensions" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Cross-Domain Completion Posture</CardTitle></CardHeader>
            <CardContent>
              {aggregation.data ? (
                <div className="space-y-2">
                  {((aggregation.data as any)?.domain_scores || []).map((d: any) => (
                    <div key={d.domain} className="flex items-center justify-between rounded-md border border-border/30 bg-muted/10 p-3">
                      <span className="text-sm font-medium capitalize">{d.domain}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{d.count} assessments</span>
                        <Badge variant={d.score >= 0.7 ? "default" : d.score >= 0.4 ? "secondary" : "destructive"} className="text-[10px]">
                          {(d.score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {((aggregation.data as any)?.domain_scores || []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No completion assessments yet</p>
                  )}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaps */}
        <TabsContent value="gaps" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Completion Gaps & Open Surfaces</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {((gaps.data as any)?.gaps || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No gaps detected</p>
                ) : (
                  <div className="space-y-2">
                    {((gaps.data as any)?.gaps || []).map((g: any) => (
                      <div key={g.id} className="rounded-md border border-border/30 bg-muted/10 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{g.gap_domain}</span>
                          <div className="flex gap-1.5">
                            {g.is_intentional && <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">Intentional</Badge>}
                            <Badge variant={g.severity === 'critical' || g.severity === 'high' ? "destructive" : "secondary"} className="text-[10px]">{g.severity}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{g.gap_description || g.gap_type}</p>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>Risk: {(Number(g.residual_risk_score) * 100).toFixed(0)}%</span>
                          <span>Open Surface: {(Number(g.open_surface_score) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certification */}
        <TabsContent value="certification" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Baseline Certifications</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {((certifications.data as any)?.certifications || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No certification candidates</p>
                ) : (
                  <div className="space-y-2">
                    {((certifications.data as any)?.certifications || []).map((c: any) => (
                      <div key={c.id} className="rounded-md border border-border/30 bg-muted/10 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{c.certification_name || 'Baseline Candidate'}</span>
                          <Badge variant={c.certification_status === 'certified' ? "default" : "secondary"} className="text-[10px]">{c.certification_status}</Badge>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>Completion: {(Number(c.completion_score) * 100).toFixed(1)}%</span>
                          <span>Round Enough: {(Number(c.round_enough_score) * 100).toFixed(1)}%</span>
                          <span>Readiness: {(Number(c.certification_readiness_score) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Completion Reviews</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {((assessments.data as any)?.assessments || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No assessments yet</p>
                ) : (
                  <div className="space-y-2">
                    {((assessments.data as any)?.assessments || []).map((a: any) => (
                      <div key={a.id} className="rounded-md border border-border/30 bg-muted/10 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{a.completion_domain}</span>
                          <Badge variant={Number(a.completion_score) >= 0.7 ? "default" : "secondary"} className="text-[10px]">
                            {(Number(a.completion_score) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                          <span>Gov: {(Number(a.governance_maturity_score) * 100).toFixed(0)}%</span>
                          <span>Assurance: {(Number(a.assurance_maturity_score) * 100).toFixed(0)}%</span>
                          <span>Canon: {(Number(a.canon_integrity_score) * 100).toFixed(0)}%</span>
                          <span>Ecosystem: {(Number(a.ecosystem_boundedness_score) * 100).toFixed(0)}%</span>
                          <span>Pipeline: {(Number(a.pipeline_operability_score) * 100).toFixed(0)}%</span>
                          <span>Risk: {(Number(a.residual_risk_score) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models */}
        <TabsContent value="models" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Completion Models</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {((models.data as any)?.models || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No completion models defined</p>
                ) : (
                  <div className="space-y-2">
                    {((models.data as any)?.models || []).map((m: any) => (
                      <div key={m.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{m.completion_model_name || m.completion_domain}</span>
                          <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Domain: {m.completion_domain} • Scope: {m.completion_scope_type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcomes */}
        <TabsContent value="outcomes" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Completion Outcomes</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {((outcomes.data as any)?.outcomes || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No completion outcomes tracked yet</p>
                ) : (
                  <div className="space-y-2">
                    {((outcomes.data as any)?.outcomes || []).map((o: any) => (
                      <div key={o.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Outcome #{o.id.slice(0, 8)}</span>
                          <Badge variant={Number(o.outcome_accuracy_score) >= 0.7 ? "default" : "secondary"} className="text-[10px]">
                            Accuracy: {(Number(o.outcome_accuracy_score) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

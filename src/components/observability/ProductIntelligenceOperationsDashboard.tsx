import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, AlertTriangle, Target, Lightbulb, Zap, Layers, Activity } from "lucide-react";
import { useProductIntelligenceOperations } from "@/hooks/useProductIntelligenceOperations";

export function ProductIntelligenceOperationsDashboard() {
  const { overview, benchmarks, recommendations, archCorrelations, profileCorrelations, outcomes, isLoading } = useProductIntelligenceOperations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-8">
        <StatCard icon={BarChart3} label="Benchmarks" value={overview?.total_benchmarks ?? benchmarks.length} />
        <StatCard icon={Lightbulb} label="Recommendations" value={overview?.total_recommendations ?? recommendations.length} />
        <StatCard icon={Layers} label="Arch Corr." value={overview?.total_arch_correlations ?? archCorrelations.length} />
        <StatCard icon={Target} label="Profile Corr." value={overview?.total_profile_correlations ?? profileCorrelations.length} />
        <StatCard icon={Zap} label="Avg Quality" value={overview?.avg_signal_quality?.toFixed(2) ?? '—'} />
        <StatCard icon={AlertTriangle} label="Avg Noise" value={overview?.avg_noise_penalty?.toFixed(2) ?? '—'} />
        <StatCard icon={TrendingUp} label="Avg Useful" value={overview?.avg_recommendation_usefulness?.toFixed(2) ?? '—'} />
        <StatCard icon={Activity} label="FP Rate" value={overview?.false_positive_rate != null ? `${(overview.false_positive_rate * 100).toFixed(0)}%` : '—'} />
      </div>

      <Tabs defaultValue="benchmarks">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="arch-corr">Arch Correlation</TabsTrigger>
          <TabsTrigger value="profile-corr">Profile Correlation</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
        </TabsList>

        <TabsContent value="benchmarks" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Cross-Tenant / Cross-Workspace Benchmarks</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {benchmarks.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No benchmarks built yet. Product signals will generate benchmarks as they mature operationally.</p>
                ) : (
                  <div className="space-y-3">
                    {benchmarks.map((b: any) => (
                      <div key={b.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{b.product_area || b.benchmark_scope_type || 'Benchmark'}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">#{b.benchmark_rank || '?'}</Badge>
                            <Badge variant="secondary" className="text-xs">{b.benchmark_scope_type}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>Adopt: {Number(b.adoption_score).toFixed(2)}</span>
                          <span>Retain: {Number(b.retention_score).toFixed(2)}</span>
                          <span>Friction: {Number(b.friction_score).toFixed(2)}</span>
                          <span>Value: {Number(b.value_score).toFixed(2)}</span>
                          <span>Quality: {Number(b.product_signal_quality_score).toFixed(2)}</span>
                          <span>Noise: {Number(b.signal_noise_penalty_score).toFixed(2)}</span>
                          <span>Priority: {Number(b.product_priority_score).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Operational Recommendations</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {recommendations.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No operational recommendations yet. Recommendations are generated when product signals reach decision-grade quality.</p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((r: any) => (
                      <div key={r.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{r.title || r.product_area || 'Recommendation'}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{r.recommendation_type}</Badge>
                            <Badge variant={r.recommendation_status === 'accepted' ? 'default' : 'secondary'} className="text-xs">{r.recommendation_status}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.description || 'No description'}</p>
                        <p className="text-xs text-muted-foreground italic">{r.rationale || ''}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Priority: {Number(r.priority_score).toFixed(2)}</span>
                          <span>Confidence: {Number(r.confidence_score).toFixed(2)}</span>
                          <span>Expected Impact: {Number(r.expected_impact_score).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arch-corr" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Product ↔ Architecture Correlations</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {archCorrelations.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No architecture correlations detected. Correlations form when product signals intersect with architecture modes and fitness data.</p>
                ) : (
                  <div className="space-y-3">
                    {archCorrelations.map((c: any) => (
                      <div key={c.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{c.product_area || 'Unknown area'}</span>
                          <Badge variant={c.correlation_strength === 'strong' ? 'default' : c.correlation_strength === 'weak' ? 'destructive' : 'secondary'} className="text-xs">{c.correlation_strength}</Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Arch Align: {Number(c.architecture_alignment_score).toFixed(2)}</span>
                          <span>Stability: {Number(c.stability_impact_score).toFixed(2)}</span>
                          <span>Fitness: {Number(c.fitness_impact_score).toFixed(2)}</span>
                          <span>Confidence: {Number(c.confidence_score).toFixed(2)}</span>
                        </div>
                        {c.limitations && <p className="text-xs text-muted-foreground italic">{c.limitations}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile-corr" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Product ↔ Profile Correlations</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {profileCorrelations.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No profile correlations detected. Correlations form when product signals intersect with operating profiles and policy packs.</p>
                ) : (
                  <div className="space-y-3">
                    {profileCorrelations.map((c: any) => (
                      <div key={c.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{c.product_area || 'Unknown area'}</span>
                          <Badge variant={c.correlation_strength === 'strong' ? 'default' : c.correlation_strength === 'weak' ? 'destructive' : 'secondary'} className="text-xs">{c.correlation_strength}</Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Profile Align: {Number(c.profile_alignment_score).toFixed(2)}</span>
                          <span>Override Impact: {Number(c.override_impact_score).toFixed(2)}</span>
                          <span>Confidence: {Number(c.confidence_score).toFixed(2)}</span>
                        </div>
                        {c.limitations && <p className="text-xs text-muted-foreground italic">{c.limitations}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Benchmark Outcomes</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {outcomes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No outcomes recorded yet. Outcomes track whether product-informed recommendations proved useful.</p>
                ) : (
                  <div className="space-y-3">
                    {outcomes.map((o: any) => (
                      <div key={o.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={o.outcome_status === 'helpful' ? 'default' : o.outcome_status === 'harmful' ? 'destructive' : 'secondary'} className="text-xs">
                            {o.outcome_status}
                          </Badge>
                          <div className="flex gap-1.5">
                            {o.false_positive && <Badge variant="destructive" className="text-xs">False Positive</Badge>}
                            {o.drift_detected && <Badge variant="outline" className="text-xs">Drift</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Usefulness: {Number(o.usefulness_score).toFixed(2)}</span>
                          <span>Expected: {Number(o.expected_impact).toFixed(2)}</span>
                          <span>Realized: {Number(o.realized_impact).toFixed(2)}</span>
                          <span>Δ: {(Number(o.realized_impact) - Number(o.expected_impact)).toFixed(2)}</span>
                        </div>
                        {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segmentation" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Operational Segmentation</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <p className="text-muted-foreground text-sm text-center py-8">
                  Operational segmentation analysis distinguishes meaningful tenant/workspace divergence from random variation. Segments are identified when benchmarks accumulate sufficient data across scopes. Divergence does not automatically imply fragmentation — it informs bounded specialization decisions.
                </p>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

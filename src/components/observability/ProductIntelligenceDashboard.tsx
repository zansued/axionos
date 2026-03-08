import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Zap, AlertTriangle, TrendingUp, Target, BarChart3 } from "lucide-react";
import { useProductIntelligence } from "@/hooks/useProductIntelligence";

export function ProductIntelligenceDashboard() {
  const { overview, signals, opportunities, frictionClusters, outcomes, isLoading } = useProductIntelligence();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        <StatCard icon={Zap} label="Signals" value={overview?.total_signals ?? signals.length} />
        <StatCard icon={Target} label="Opportunities" value={overview?.total_opportunities ?? opportunities.length} />
        <StatCard icon={AlertTriangle} label="Friction Clusters" value={overview?.active_friction_clusters ?? frictionClusters.length} />
        <StatCard icon={BarChart3} label="Avg Quality" value={overview?.avg_signal_quality?.toFixed(2) ?? '—'} />
        <StatCard icon={TrendingUp} label="Avg Friction" value={overview?.avg_friction?.toFixed(2) ?? '—'} />
        <StatCard icon={Lightbulb} label="Avg Effectiveness" value={overview?.avg_effectiveness?.toFixed(2) ?? '—'} />
      </div>

      <Tabs defaultValue="opportunities">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="friction">Friction</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Opportunity Radar</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {opportunities.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No opportunities detected yet. Product signals will generate opportunity candidates as they accumulate.</p>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map((o: any) => (
                      <div key={o.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{o.title || o.product_area || 'Untitled'}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{o.opportunity_type}</Badge>
                            <Badge variant={o.status === 'approved' ? 'default' : 'secondary'} className="text-xs">{o.status}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{o.description || 'No description'}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Priority: {Number(o.priority_score).toFixed(2)}</span>
                          <span>Confidence: {Number(o.confidence_score).toFixed(2)}</span>
                          <span>Arch Align: {Number(o.architecture_alignment_score).toFixed(2)}</span>
                          <span>Impact: {Number(o.expected_product_impact_score).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="friction" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Friction Clusters</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {frictionClusters.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No friction clusters detected. Clusters form when recurring friction signals are identified.</p>
                ) : (
                  <div className="space-y-3">
                    {frictionClusters.map((c: any) => (
                      <div key={c.id} className="border rounded-lg p-3 space-y-2 border-l-4 border-l-destructive/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{c.cluster_name || c.product_area}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{c.friction_type}</Badge>
                            <Badge variant={c.trend_direction === 'worsening' ? 'destructive' : 'secondary'} className="text-xs">{c.trend_direction}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Severity: {Number(c.severity_score).toFixed(2)}</span>
                          <span>Recurrence: {c.recurrence_count}</span>
                          <span>Arch Corr: {Number(c.architecture_correlation_score).toFixed(2)}</span>
                          <span>Profile Corr: {Number(c.profile_correlation_score).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Product Signals</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {signals.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No product signals ingested yet. Signals from internal and external sources will appear here.</p>
                ) : (
                  <div className="space-y-2">
                    {signals.map((s: any) => (
                      <div key={s.id} className="border rounded-lg p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{s.signal_type}</Badge>
                          <span className="text-xs text-muted-foreground">{s.product_area || '—'}</span>
                          <span className="text-xs text-muted-foreground">via {s.signal_source}</span>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>Q: {Number(s.signal_quality_score).toFixed(2)}</span>
                          <span>C: {Number(s.confidence_score).toFixed(2)}</span>
                        </div>
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
            <CardHeader><CardTitle className="text-sm font-medium">Product Intelligence Outcomes</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {outcomes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No outcomes recorded yet. Outcomes track expected vs realized product impact.</p>
                ) : (
                  <div className="space-y-3">
                    {outcomes.map((o: any) => (
                      <div key={o.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={o.outcome_status === 'helpful' ? 'default' : o.outcome_status === 'harmful' ? 'destructive' : 'secondary'} className="text-xs">
                            {o.outcome_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Effectiveness: {Number(o.product_effectiveness_score).toFixed(2)}</span>
                          <span>Impact Δ: {(Number(o.realized_product_impact) - Number(o.expected_product_impact)).toFixed(2)}</span>
                          <span>Adoption Δ: {Number(o.realized_adoption_gain).toFixed(2)}</span>
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
            <CardHeader><CardTitle className="text-sm font-medium">Product Segmentation</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <p className="text-muted-foreground text-sm text-center py-8">
                  Segmentation analysis will surface meaningful tenant/workspace product divergence as product intelligence profiles are populated. Divergence does not imply fragmentation — it informs bounded specialization decisions.
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

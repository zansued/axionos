import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Layers, Settings, TrendingUp, AlertTriangle, Shield } from "lucide-react";
import { useOperatingProfiles } from "@/hooks/useOperatingProfiles";

export function OperatingProfilesDashboard() {
  const { overview, profiles, policyPacks, overrides, outcomes, isLoading } = useOperatingProfiles();

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
        <StatCard icon={Package} label="Total Profiles" value={overview?.total_profiles ?? profiles.length} />
        <StatCard icon={Layers} label="Active Profiles" value={overview?.active_profiles ?? 0} />
        <StatCard icon={Settings} label="Policy Packs" value={overview?.total_packs ?? policyPacks.length} />
        <StatCard icon={Shield} label="Active Bindings" value={overview?.active_bindings ?? 0} />
        <StatCard icon={AlertTriangle} label="Overrides" value={overview?.total_overrides ?? overrides.length} />
        <StatCard icon={TrendingUp} label="Avg Effectiveness" value={overview?.avg_effectiveness?.toFixed(2) ?? '—'} />
      </div>

      <Tabs defaultValue="profiles">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="packs">Policy Packs</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="drift">Drift & Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Operating Profiles</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {profiles.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No operating profiles yet. Profiles will be created from institutional convergence memory and governance outcomes.</p>
                ) : (
                  <div className="space-y-3">
                    {profiles.map((p: any) => (
                      <div key={p.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{p.profile_name || 'Untitled Profile'}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{p.scope_type}</Badge>
                            <Badge variant={p.adoption_status === 'active' ? 'default' : 'secondary'} className="text-xs">{p.adoption_status}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description || 'No description'}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Fit: {Number(p.tenant_fit_score).toFixed(2)}</span>
                          <span>Stability: {Number(p.stability_bias_score).toFixed(2)}</span>
                          <span>Rollback: {Number(p.rollback_viability_score).toFixed(2)}</span>
                          <span>Reuse: {Number(p.shared_reuse_score).toFixed(2)}</span>
                          <span>v{p.profile_version}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packs" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Policy Packs</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {policyPacks.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No policy packs yet. Packs will be composed from compatible policy bundles.</p>
                ) : (
                  <div className="space-y-3">
                    {policyPacks.map((pack: any) => (
                      <div key={pack.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{pack.pack_name}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{pack.pack_type}</Badge>
                            <Badge variant={pack.status === 'active' ? 'default' : 'secondary'} className="text-xs">{pack.status}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{pack.description || 'No description'}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Cohesion: {Number(pack.cohesion_score).toFixed(2)}</span>
                          <span>v{pack.pack_version}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Local Overrides</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {overrides.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No overrides recorded. Overrides preserve local specialization while maintaining profile lineage.</p>
                ) : (
                  <div className="space-y-3">
                    {overrides.map((o: any) => (
                      <div key={o.id} className="border rounded-lg p-3 space-y-2 border-l-4 border-l-yellow-500/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{o.override_key}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{o.override_scope}</Badge>
                            <Badge variant={o.promotion_candidate ? 'default' : 'secondary'} className="text-xs">
                              {o.promotion_candidate ? 'Promotion candidate' : o.review_status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{o.justification || 'No justification'}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Pressure: {Number(o.override_pressure_score).toFixed(2)}</span>
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
            <CardHeader><CardTitle className="text-sm font-medium">Profile Adoption Outcomes</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {outcomes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No outcomes recorded yet. Outcomes track expected vs realized profile results.</p>
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
                          <span>Effectiveness: {Number(o.profile_effectiveness_score).toFixed(2)}</span>
                          <span>Stability Δ: {Number(o.realized_stability_gain).toFixed(2)}</span>
                          <span>Cost Δ: {Number(o.realized_cost_efficiency_gain).toFixed(2)}</span>
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

        <TabsContent value="drift" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Profile Drift & Quality</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {profiles.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No profiles to analyze for drift.</p>
                ) : (
                  <div className="space-y-3">
                    {profiles.filter((p: any) => Number(p.profile_drift_score) > 0).length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">No drift detected across profiles.</p>
                    ) : (
                      profiles.filter((p: any) => Number(p.profile_drift_score) > 0).map((p: any) => (
                        <div key={p.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{p.profile_name}</span>
                            <Badge variant={Number(p.profile_drift_score) >= 0.5 ? 'destructive' : 'secondary'} className="text-xs">
                              Drift: {Number(p.profile_drift_score).toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
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

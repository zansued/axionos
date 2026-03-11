import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Shield, Activity, AlertTriangle, TrendingUp, Scale, Eye } from "lucide-react";
import { useTenantDoctrine } from "@/hooks/useTenantDoctrine";

export default function TenantDoctrineDashboard() {
  const { activeProfile, profiles, signals, conflicts, adjustments, reviews, isLoading } = useTenantDoctrine();

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Tenant Doctrine & Operating Profiles</h1>
            <p className="text-sm text-muted-foreground">Evidence-based operating posture derived from runtime behavior.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Active Profile Summary */}
              {activeProfile && (
                <Card className="border-l-4 border-l-primary">
                  <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4" /> Active Doctrine Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge>{activeProfile.doctrine_mode}</Badge>
                      <Badge variant="outline">{activeProfile.profile_status}</Badge>
                      <span className="text-xs text-muted-foreground">Confidence: {Number(activeProfile.evidence_confidence).toFixed(2)}</span>
                      {Number(activeProfile.divergence_score) > 0.2 && (
                        <Badge variant="destructive" className="text-xs">Divergence: {Number(activeProfile.divergence_score).toFixed(2)}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <ScoreBar label="Risk Tolerance" value={Number(activeProfile.risk_tolerance_score)} />
                      <ScoreBar label="Validation Strictness" value={Number(activeProfile.validation_strictness_score)} />
                      <ScoreBar label="Rollback Preference" value={Number(activeProfile.rollback_preference_score)} />
                      <ScoreBar label="Rollout Cadence" value={Number(activeProfile.rollout_cadence_score)} />
                      <ScoreBar label="Escalation Bias" value={Number(activeProfile.incident_escalation_bias)} />
                      <ScoreBar label="Autonomy Tolerance" value={Number(activeProfile.autonomy_tolerance_score)} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                <StatCard icon={Shield} label="Profiles" value={profiles.length} />
                <StatCard icon={Activity} label="Signals" value={signals.length} />
                <StatCard icon={AlertTriangle} label="Conflicts" value={conflicts.filter((c: any) => c.resolution_status === 'open').length} />
                <StatCard icon={TrendingUp} label="Adjustments" value={adjustments.length} />
                <StatCard icon={Eye} label="Reviews" value={reviews.length} />
              </div>

              <Tabs defaultValue="signals">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="signals">Signals</TabsTrigger>
                  <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
                  <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="signals" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Doctrine Signals</CardTitle></CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        {signals.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-8">No doctrine signals yet. Signals are derived from runtime behavior.</p>
                        ) : (
                          <div className="space-y-2">
                            {signals.map((s: any) => (
                              <div key={s.id} className="border rounded-lg p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{s.signal_type}</span>
                                  <div className="flex gap-1.5">
                                    <Badge variant="outline" className="text-xs">{s.affected_dimension}</Badge>
                                    <Badge variant="secondary" className="text-xs">{s.signal_source}</Badge>
                                  </div>
                                </div>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span>Strength: {Number(s.strength).toFixed(2)}</span>
                                  <span>Confidence: {Number(s.confidence).toFixed(2)}</span>
                                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="conflicts" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Doctrine Conflicts</CardTitle></CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        {conflicts.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-8">No doctrine conflicts detected.</p>
                        ) : (
                          <div className="space-y-2">
                            {conflicts.map((c: any) => (
                              <div key={c.id} className="border rounded-lg p-3 space-y-1 border-l-4 border-l-yellow-500/50">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{c.conflict_type}</span>
                                  <div className="flex gap-1.5">
                                    <Badge variant={c.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">{c.severity}</Badge>
                                    <Badge variant="outline" className="text-xs">{c.resolution_status}</Badge>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">{c.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="adjustments" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Adjustment History</CardTitle></CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        {adjustments.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-8">No adjustments recorded yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {adjustments.map((a: any) => (
                              <div key={a.id} className="border rounded-lg p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{a.dimension}</span>
                                  <Badge variant="outline" className="text-xs">{a.adjustment_type}</Badge>
                                </div>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span>{Number(a.previous_value).toFixed(2)} → {Number(a.new_value).toFixed(2)}</span>
                                  <span>Δ {Number(a.delta).toFixed(3)}</span>
                                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                                </div>
                                {a.reason && <p className="text-xs text-muted-foreground">{a.reason}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">Doctrine Reviews</CardTitle></CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        {reviews.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-8">No reviews conducted yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {reviews.map((r: any) => (
                              <div key={r.id} className="border rounded-lg p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{r.review_type}</span>
                                  <Badge variant={r.review_status === 'approved' ? 'default' : 'secondary'} className="text-xs">{r.review_status}</Badge>
                                </div>
                                {r.review_notes && <p className="text-xs text-muted-foreground">{r.review_notes}</p>}
                                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(2)}</span>
      </div>
      <Progress value={value * 100} className="h-2" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
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

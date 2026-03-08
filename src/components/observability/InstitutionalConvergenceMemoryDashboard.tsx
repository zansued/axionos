import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Database, Search, Shield, ThumbsUp, AlertTriangle } from "lucide-react";
import { useInstitutionalConvergenceMemory } from "@/hooks/useInstitutionalConvergenceMemory";

export function InstitutionalConvergenceMemoryDashboard() {
  const { overview, entries, patterns, feedback, preservationSignals, isLoading } = useInstitutionalConvergenceMemory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const helpfulFeedback = feedback.filter((f: any) => f.usefulness_status === 'helpful').length;
  const usefulnessRate = feedback.length > 0 ? Math.round((helpfulFeedback / feedback.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        <StatCard icon={Database} label="Memory Entries" value={overview?.total_entries ?? entries.length} />
        <StatCard icon={Brain} label="Active Patterns" value={overview?.total_patterns ?? patterns.length} />
        <StatCard icon={Search} label="Retrievals" value={overview?.total_retrievals ?? 0} />
        <StatCard icon={ThumbsUp} label="Usefulness Rate" value={`${overview?.usefulness_rate ? Math.round(overview.usefulness_rate * 100) : usefulnessRate}%`} />
        <StatCard icon={Shield} label="Preservation Signals" value={preservationSignals.length} />
        <StatCard icon={AlertTriangle} label="Avg Quality" value={overview?.avg_quality_score?.toFixed(2) ?? '—'} />
      </div>

      <Tabs defaultValue="entries">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="entries">Memory Entries</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Library</TabsTrigger>
          <TabsTrigger value="preservation">Preserve vs Converge</TabsTrigger>
          <TabsTrigger value="feedback">Feedback & Quality</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Convergence Memory Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {entries.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No convergence memory entries yet. Memory will be populated as convergence governance decisions are approved and outcomes tracked.</p>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry: any) => (
                      <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{entry.title || 'Untitled'}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{entry.memory_type}</Badge>
                            <Badge variant="secondary" className="text-xs">{entry.action_type}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.summary || 'No summary'}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Quality: {Number(entry.memory_quality_score).toFixed(2)}</span>
                          <span>Evidence: {Number(entry.evidence_density_score).toFixed(2)}</span>
                          <span>Confidence: {Number(entry.reuse_confidence_score).toFixed(2)}</span>
                          <span>Domain: {entry.convergence_domain}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Convergence Pattern Library</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {patterns.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No patterns extracted yet. Patterns emerge as multiple convergence cases with similar context signatures are processed.</p>
                ) : (
                  <div className="space-y-3">
                    {patterns.map((pattern: any) => (
                      <div key={pattern.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{pattern.pattern_name}</span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-xs">{pattern.pattern_type}</Badge>
                            <Badge variant="secondary" className="text-xs">×{pattern.occurrence_count}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{pattern.pattern_description}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Strength: {Number(pattern.pattern_strength).toFixed(2)}</span>
                          <span>Confidence: {Number(pattern.confidence_score).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preservation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Preserve vs Converge — Historical Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {preservationSignals.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No preservation evidence yet. This section will populate when retention decisions, promotion failures, and preservation heuristics are recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {preservationSignals.map((entry: any) => (
                      <div key={entry.id} className="border rounded-lg p-3 space-y-2 border-l-4 border-l-yellow-500/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{entry.title || 'Preservation Signal'}</span>
                          <Badge variant="outline" className="text-xs">{entry.memory_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.rationale || 'No rationale recorded'}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Domain: {entry.convergence_domain}</span>
                          <span>Specialization: {entry.specialization_type}</span>
                          <span>Quality: {Number(entry.memory_quality_score).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Memory Feedback & Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {feedback.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No feedback recorded yet. Feedback will accumulate as memory retrieval results are evaluated for usefulness.</p>
                ) : (
                  <div className="space-y-3">
                    {feedback.map((f: any) => (
                      <div key={f.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={f.usefulness_status === 'helpful' ? 'default' : f.usefulness_status === 'harmful' || f.usefulness_status === 'misleading' ? 'destructive' : 'secondary'} className="text-xs">
                            {f.usefulness_status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                        </div>
                        {f.feedback_notes && <p className="text-xs text-muted-foreground">{f.feedback_notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Memory by Domain</CardTitle>
            </CardHeader>
            <CardContent>
              {overview?.domains && Object.keys(overview.domains).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(overview.domains).map(([domain, count]) => (
                    <div key={domain} className="flex items-center justify-between border rounded-lg p-3">
                      <span className="font-medium text-sm">{domain}</span>
                      <Badge variant="secondary">{String(count)} entries</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No domain distribution available yet.</p>
              )}
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

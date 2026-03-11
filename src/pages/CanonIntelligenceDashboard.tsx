import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Globe, ShieldCheck, FileInput, RefreshCw, Layers, BookOpen, AlertTriangle, GitBranch, ClipboardCheck, Zap, Activity, MessageSquare, Search } from "lucide-react";
import { useCanonIntelligence } from "@/hooks/useCanonIntelligence";
import { useCanonStewardship } from "@/hooks/useCanonStewardship";
import { useCanonRuntime } from "@/hooks/useCanonRuntime";

const TRUST_BADGE: Record<string, string> = {
  trusted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  verified: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  provisional: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  unknown: "bg-muted text-muted-foreground",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  promoted: "bg-primary/20 text-primary border-primary/30",
};

const LIFECYCLE_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  proposed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  experimental: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  deprecated: "bg-muted text-muted-foreground line-through",
  superseded: "bg-muted text-muted-foreground",
};

const SYNC_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed_empty: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
};

const CONFLICT_SEVERITY: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-destructive/20 text-destructive border-destructive/30",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  external_documentation: "External Docs",
  internal_runtime_learning: "Runtime Learning",
  internal_postmortem: "Postmortem",
  official_framework_docs: "Framework Docs",
  technical_reference: "Technical Ref",
  methodology_reference: "Methodology",
};

const PRACTICE_LABELS: Record<string, string> = {
  best_practice: "Best Practice",
  implementation_pattern: "Impl. Pattern",
  architecture_pattern: "Arch. Pattern",
  template: "Template",
  checklist: "Checklist",
  anti_pattern: "Anti-Pattern",
  validation_rule: "Validation Rule",
  methodology_guideline: "Methodology",
  migration_note: "Migration Note",
};

export default function CanonIntelligenceDashboard() {
  const { sources, trustProfiles, candidates, syncRuns, domains, loading } = useCanonIntelligence();
  const stewardship = useCanonStewardship();
  const runtime = useCanonRuntime();

  const pendingCandidates = candidates.filter((c: any) => c.promotion_status === "pending");
  const trustedSources = trustProfiles.filter((t: any) => t.trust_tier === "trusted" || t.trust_tier === "verified");
  const openConflicts = stewardship.conflicts.filter((c: any) => c.resolution_status === "open");
  const approvedEntries = stewardship.library.filter((e: any) => e.lifecycle_status === "approved");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Canon Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Source governance, stewardship workflow, and canonical knowledge management
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sources</p>
                <p className="text-xl font-bold mt-1">{sources.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Canon Library</p>
                <p className="text-xl font-bold mt-1">{stewardship.library.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Approved</p>
                <p className="text-xl font-bold mt-1 text-emerald-400">{approvedEntries.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Candidates</p>
                <p className="text-xl font-bold mt-1">{pendingCandidates.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Open Conflicts</p>
                <p className="text-xl font-bold mt-1 text-amber-400">{openConflicts.length}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="library" className="space-y-4">
            <TabsList className="bg-muted/30 flex-wrap h-auto gap-0.5 p-1">
              <TabsTrigger value="library" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1" />Library</TabsTrigger>
              <TabsTrigger value="review" className="text-xs"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Reviews</TabsTrigger>
              <TabsTrigger value="conflicts" className="text-xs"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Conflicts</TabsTrigger>
              <TabsTrigger value="supersession" className="text-xs"><GitBranch className="h-3.5 w-3.5 mr-1" />Supersession</TabsTrigger>
              <TabsTrigger value="sources" className="text-xs"><Globe className="h-3.5 w-3.5 mr-1" />Sources</TabsTrigger>
              <TabsTrigger value="trust" className="text-xs"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Trust</TabsTrigger>
              <TabsTrigger value="candidates" className="text-xs"><FileInput className="h-3.5 w-3.5 mr-1" />Candidates</TabsTrigger>
              <TabsTrigger value="syncs" className="text-xs"><RefreshCw className="h-3.5 w-3.5 mr-1" />Syncs</TabsTrigger>
              <TabsTrigger value="domains" className="text-xs"><Layers className="h-3.5 w-3.5 mr-1" />Domains</TabsTrigger>
            </TabsList>

            {/* Canon Library */}
            <TabsContent value="library">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Canon Library</CardTitle>
                  <CardDescription>Structured, governed canonical intelligence entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {stewardship.loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : stewardship.library.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No canon entries yet. Entries are created through the stewardship workflow.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {stewardship.library.map((e: any) => (
                          <div key={e.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate flex-1">{e.title}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className={`text-[10px] ${LIFECYCLE_BADGE[e.lifecycle_status] || LIFECYCLE_BADGE.draft}`}>{e.lifecycle_status}</Badge>
                                {e.practice_type && <Badge variant="outline" className="text-[10px]">{PRACTICE_LABELS[e.practice_type] || e.practice_type}</Badge>}
                                {e.anti_pattern_flag && <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">⚠ Anti</Badge>}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.summary}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              {e.topic && <span>Topic: {e.topic}</span>}
                              <span>Stack: {e.stack_scope}</span>
                              <span>Confidence: {e.confidence_score}%</span>
                              <span>v{e.current_version}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Review Queue */}
            <TabsContent value="review">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Stewardship Reviews</CardTitle>
                  <CardDescription>Review history and pending stewardship decisions</CardDescription>
                </CardHeader>
                <CardContent>
                  {stewardship.reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No reviews recorded yet.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {stewardship.reviews.map((r: any) => (
                          <div key={r.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[r.verdict] || STATUS_BADGE.pending}`}>{r.verdict}</Badge>
                              <span className="text-[10px] text-muted-foreground/50">{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">{r.review_notes || "No notes"}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Confidence: {r.confidence_assessment}%</span>
                              <span>Type: {r.review_type}</span>
                              {(r.strengths as any[])?.length > 0 && <span>Strengths: {(r.strengths as any[]).length}</span>}
                              {(r.weaknesses as any[])?.length > 0 && <span>Weaknesses: {(r.weaknesses as any[]).length}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conflicts */}
            <TabsContent value="conflicts">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Canon Conflicts</CardTitle>
                  <CardDescription>Detected contradictions and overlaps between entries</CardDescription>
                </CardHeader>
                <CardContent>
                  {stewardship.conflicts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No conflicts detected.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {stewardship.conflicts.map((c: any) => (
                          <div key={c.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${CONFLICT_SEVERITY[c.severity] || CONFLICT_SEVERITY.low}`}>{c.severity}</Badge>
                                <Badge variant="outline" className="text-[10px]">{c.conflict_type}</Badge>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${c.resolution_status === "resolved" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                                {c.resolution_status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">{c.conflict_description}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Detected by: {c.detected_by}</span>
                              {c.resolved_by && <span>Resolved by: {c.resolved_by}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Supersession */}
            <TabsContent value="supersession">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Supersession Graph</CardTitle>
                  <CardDescription>Canon entry lineage and replacement history</CardDescription>
                </CardHeader>
                <CardContent>
                  {stewardship.supersessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No supersessions recorded. Entries maintain lineage when one replaces another.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {stewardship.supersessions.map((s: any) => (
                          <div key={s.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground font-mono truncate max-w-[120px]">{s.predecessor_entry_id?.slice(0, 8)}...</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-primary font-mono truncate max-w-[120px]">{s.successor_entry_id?.slice(0, 8)}...</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{s.reason || "No reason provided"}</p>
                            <span className="text-[10px] text-muted-foreground/50 mt-1 block">{new Date(s.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sources */}
            <TabsContent value="sources">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Registered Sources</CardTitle>
                  <CardDescription>Knowledge sources registered for canon intake governance</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No sources registered yet.</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {sources.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{s.source_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{SOURCE_TYPE_LABELS[s.source_type] || s.source_type}</span>
                                {s.source_url && <span className="text-xs text-muted-foreground/50 truncate max-w-[200px]">{s.source_url}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className={`text-[10px] ${TRUST_BADGE[s.trust_level] || TRUST_BADGE.unknown}`}>{s.trust_level}</Badge>
                              <Badge variant="outline" className="text-[10px]">{s.sync_policy}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trust */}
            <TabsContent value="trust">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Source Trust Profiles</CardTitle>
                  <CardDescription>Trust evaluations and ingestion posture per source</CardDescription>
                </CardHeader>
                <CardContent>
                  {trustProfiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No trust profiles evaluated yet.</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {trustProfiles.map((t: any) => (
                          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${TRUST_BADGE[t.trust_tier] || TRUST_BADGE.unknown}`}>{t.trust_tier}</Badge>
                                <span className="text-xs text-muted-foreground">Score: {t.trust_score}/100</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span>Scope: {t.allowed_ingestion_scope}</span>
                                <span>Review: {t.review_posture}</span>
                                <span>{t.promotable ? "✓ Promotable" : "✗ Non-promotable"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Candidates */}
            <TabsContent value="candidates">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Candidate Intake Queue</CardTitle>
                  <CardDescription>Knowledge candidates awaiting stewardship review — no direct path to canon</CardDescription>
                </CardHeader>
                <CardContent>
                  {candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No candidates in the intake queue.</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {candidates.map((c: any) => (
                          <div key={c.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[c.promotion_status] || STATUS_BADGE.pending}`}>{c.promotion_status}</Badge>
                                <Badge variant="outline" className="text-[10px]">{c.knowledge_type}</Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.summary}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Validation: {c.internal_validation_status}</span>
                              <span>Trial: {c.trial_status}</span>
                              <span>Reliability: {c.source_reliability_score}/100</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Syncs */}
            <TabsContent value="syncs">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sync Runs</CardTitle>
                  <CardDescription>Source synchronization history</CardDescription>
                </CardHeader>
                <CardContent>
                  {syncRuns.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No sync runs executed yet.</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {syncRuns.map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${SYNC_BADGE[r.sync_status] || SYNC_BADGE.pending}`}>{r.sync_status}</Badge>
                                <span className="text-xs text-muted-foreground">by {r.triggered_by}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span>Found: {r.candidates_found}</span>
                                <span>Accepted: {r.candidates_accepted}</span>
                                <span>Rejected: {r.candidates_rejected}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Domains */}
            <TabsContent value="domains">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Source Domains</CardTitle>
                  <CardDescription>Knowledge domain scopes for source classification</CardDescription>
                </CardHeader>
                <CardContent>
                  {domains.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No domains configured yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {domains.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/10">
                          <div>
                            <p className="text-sm font-medium">{d.domain_label || d.domain_key}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{d.scope}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

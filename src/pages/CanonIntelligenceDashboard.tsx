import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Globe, ShieldCheck, FileInput, RefreshCw, Layers, BookOpen, AlertTriangle, GitBranch, ClipboardCheck, Zap, Activity, MessageSquare, Search, Brain, TrendingUp, XCircle, Wrench, CheckCircle } from "lucide-react";
import { useCanonIntelligence } from "@/hooks/useCanonIntelligence";
import { useCanonStewardship } from "@/hooks/useCanonStewardship";
import { useCanonRuntime } from "@/hooks/useCanonRuntime";
import { useCanonLearning } from "@/hooks/useCanonLearning";

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

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-destructive/20 text-destructive border-destructive/30",
  critical: "bg-red-600/20 text-red-400 border-red-600/30",
};

export default function CanonIntelligenceDashboard() {
  const { sources, trustProfiles, candidates, syncRuns, domains, loading } = useCanonIntelligence();
  const stewardship = useCanonStewardship();
  const runtime = useCanonRuntime();
  const learning = useCanonLearning();

  const pendingCandidates = candidates.filter((c: any) => c.promotion_status === "pending");
  const trustedSources = trustProfiles.filter((t: any) => t.trust_tier === "trusted" || t.trust_tier === "verified");
  const openConflicts = stewardship.conflicts.filter((c: any) => c.resolution_status === "open");
  const approvedEntries = stewardship.library.filter((e: any) => e.lifecycle_status === "approved");
  const pendingLearning = learning.candidates.filter((c: any) => c.review_status === "pending");

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
              Source governance, stewardship, runtime retrieval, and operational learning
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conflicts</p>
                <p className="text-xl font-bold mt-1 text-amber-400">{openConflicts.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions</p>
                <p className="text-xl font-bold mt-1 text-primary">{runtime.analytics.totalSessions}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Signals</p>
                <p className="text-xl font-bold mt-1">{learning.signals.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Learning Queue</p>
                <p className="text-xl font-bold mt-1 text-primary">{pendingLearning.length}</p>
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
              <TabsTrigger value="retrieval" className="text-xs"><Search className="h-3.5 w-3.5 mr-1" />Retrieval</TabsTrigger>
              <TabsTrigger value="applications" className="text-xs"><Zap className="h-3.5 w-3.5 mr-1" />Applications</TabsTrigger>
              <TabsTrigger value="runtime-analytics" className="text-xs"><Activity className="h-3.5 w-3.5 mr-1" />Analytics</TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs"><MessageSquare className="h-3.5 w-3.5 mr-1" />Feedback</TabsTrigger>
              <TabsTrigger value="learning" className="text-xs"><Brain className="h-3.5 w-3.5 mr-1" />Learning</TabsTrigger>
              <TabsTrigger value="signals" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1" />Signals</TabsTrigger>
              <TabsTrigger value="failure-patterns" className="text-xs"><XCircle className="h-3.5 w-3.5 mr-1" />Failures</TabsTrigger>
              <TabsTrigger value="refactor-patterns" className="text-xs"><Wrench className="h-3.5 w-3.5 mr-1" />Refactors</TabsTrigger>
              <TabsTrigger value="evolution-queue" className="text-xs"><CheckCircle className="h-3.5 w-3.5 mr-1" />Evolution</TabsTrigger>
            </TabsList>

            {/* ═══ Canon Library ═══ */}
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

            {/* ═══ Review Queue ═══ */}
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

            {/* ═══ Conflicts ═══ */}
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

            {/* ═══ Supersession ═══ */}
            <TabsContent value="supersession">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Supersession Graph</CardTitle>
                  <CardDescription>Canon entry lineage and replacement history</CardDescription>
                </CardHeader>
                <CardContent>
                  {stewardship.supersessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No supersessions recorded.</p>
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

            {/* ═══ Sources ═══ */}
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

            {/* ═══ Trust ═══ */}
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

            {/* ═══ Candidates ═══ */}
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

            {/* ═══ Syncs ═══ */}
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

            {/* ═══ Domains ═══ */}
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

            {/* ═══ Retrieval Console ═══ */}
            <TabsContent value="retrieval">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Retrieval Console</CardTitle>
                  <CardDescription>Agent retrieval sessions — canon queries at runtime</CardDescription>
                </CardHeader>
                <CardContent>
                  {runtime.sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No retrieval sessions yet.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {runtime.sessions.map((s: any) => (
                          <div key={s.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${s.session_status === "completed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>{s.session_status}</Badge>
                                <span className="text-xs font-medium">{s.agent_type}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground/50">{new Date(s.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{s.retrieval_reason || s.task_type || "No description"}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Retrieved: {s.entries_retrieved}</span>
                              <span>Applied: {s.entries_applied}</span>
                              {s.duration_ms && <span>{s.duration_ms}ms</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Applications ═══ */}
            <TabsContent value="applications">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Runtime Applications</CardTitle>
                  <CardDescription>Canon entries applied by agents during execution</CardDescription>
                </CardHeader>
                <CardContent>
                  {runtime.applications.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No runtime applications recorded yet.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {runtime.applications.map((a: any) => (
                          <div key={a.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{a.application_type}</Badge>
                                <span className="text-xs font-medium">{a.agent_type}</span>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${a.outcome_status === "applied" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{a.outcome_status}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Confidence: {a.confidence_at_application}%</span>
                              <span>{new Date(a.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Runtime Analytics ═══ */}
            <TabsContent value="runtime-analytics">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Runtime Usage Analytics</CardTitle>
                  <CardDescription>Canon retrieval and application metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border border-border/30 bg-muted/10 text-center">
                      <p className="text-2xl font-bold">{runtime.analytics.totalSessions}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Sessions</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/30 bg-muted/10 text-center">
                      <p className="text-2xl font-bold text-emerald-400">{runtime.analytics.completedSessions}</p>
                      <p className="text-xs text-muted-foreground mt-1">Completed</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/30 bg-muted/10 text-center">
                      <p className="text-2xl font-bold">{runtime.analytics.avgRetrieved}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg Retrieved</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/30 bg-muted/10 text-center">
                      <p className="text-2xl font-bold">{runtime.analytics.avgApplied}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg Applied</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-4 rounded-lg border border-border/30 bg-muted/10 text-center">
                      <p className="text-2xl font-bold text-primary">{runtime.analytics.totalApplications}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Applications</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/30 bg-muted/10 text-center">
                      <p className="text-2xl font-bold">{runtime.analytics.totalFeedback}</p>
                      <p className="text-xs text-muted-foreground mt-1">Feedback Entries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Feedback ═══ */}
            <TabsContent value="feedback">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Retrieval Feedback</CardTitle>
                  <CardDescription>Agent and human feedback on canon retrieval quality</CardDescription>
                </CardHeader>
                <CardContent>
                  {runtime.feedback.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No feedback submitted yet.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {runtime.feedback.map((f: any) => (
                          <div key={f.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px]">{f.feedback_type}</Badge>
                              <span className="text-xs font-medium">{f.feedback_score}/100</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{f.feedback_notes || "No notes"}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>By: {f.submitted_by}</span>
                              <span>{new Date(f.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Operational Learning ═══ */}
            <TabsContent value="learning">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Operational Learning Candidates</CardTitle>
                  <CardDescription>Knowledge candidates generated from operational evidence — advisory only, never direct canon insertion</CardDescription>
                </CardHeader>
                <CardContent>
                  {learning.loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : learning.candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No learning candidates generated yet. Candidates emerge from recurring operational patterns.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {learning.candidates.map((c: any) => (
                          <div key={c.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[c.review_status] || STATUS_BADGE.pending}`}>{c.review_status}</Badge>
                                <Badge variant="outline" className="text-[10px]">{c.source_type}</Badge>
                                {c.noise_suppressed && <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Suppressed</Badge>}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.summary}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Signals: {c.signal_count}</span>
                              <span>Confidence: {c.confidence_score}%</span>
                              <span>Practice: {PRACTICE_LABELS[c.proposed_practice_type] || c.proposed_practice_type}</span>
                              <span>Domain: {c.proposed_domain}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Candidate Signals ═══ */}
            <TabsContent value="signals">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Operational Signals</CardTitle>
                  <CardDescription>Raw operational signals collected from runtime execution</CardDescription>
                </CardHeader>
                <CardContent>
                  {learning.signals.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No signals captured yet. Signals are generated from repair loops, validation failures, and execution outcomes.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {learning.signals.map((s: any) => (
                          <div key={s.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{s.signal_type}</Badge>
                                <Badge variant="outline" className={`text-[10px] ${s.outcome_success ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                                  {s.outcome_success ? "Success" : "Failure"}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground/50">{new Date(s.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{s.outcome || "No outcome description"}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Stage: {s.stage_name}</span>
                              <span>Confidence: {s.confidence}%</span>
                              {s.error_signature && <span>Sig: {s.error_signature}</span>}
                              {s.clustered && <span className="text-primary">Clustered</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Failure Patterns ═══ */}
            <TabsContent value="failure-patterns">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Failure Patterns</CardTitle>
                  <CardDescription>Recurring failure patterns detected from operational signals</CardDescription>
                </CardHeader>
                <CardContent>
                  {learning.failurePatterns.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No failure patterns detected yet.</p>
                  ) : (
                    <ScrollArea className="h-[420px]">
                      <div className="space-y-2">
                        {learning.failurePatterns.map((p: any) => (
                          <div key={p.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate flex-1">{p.pattern_signature}</p>
                              <Badge variant="outline" className={`text-[10px] ${SEVERITY_BADGE[p.severity] || SEVERITY_BADGE.medium}`}>{p.severity}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{p.pattern_description}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                              <span>Occurrences: {p.occurrence_count}</span>
                              <span>Status: {p.status}</span>
                              <span>First: {new Date(p.first_seen_at).toLocaleDateString()}</span>
                              <span>Last: {new Date(p.last_seen_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Refactor Learnings ═══ */}
            <TabsContent value="refactor-patterns">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Refactor Learnings</CardTitle>
                  <CardDescription>Successful refactor patterns and success patterns worth codifying</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Refactor Patterns */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Refactor Patterns</h3>
                      {learning.refactorPatterns.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No refactor patterns detected yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {learning.refactorPatterns.map((p: any) => (
                            <div key={p.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium truncate flex-1">{p.pattern_name}</p>
                                <Badge variant="outline" className="text-[10px]">{p.refactor_type}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{p.pattern_description}</p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                                <span>Success: {p.success_rate}%</span>
                                <span>Count: {p.occurrence_count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Success Patterns */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Success Patterns</h3>
                      {learning.successPatterns.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No success patterns detected yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {learning.successPatterns.map((p: any) => (
                            <div key={p.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium truncate flex-1">{p.pattern_name}</p>
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{p.success_type}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{p.pattern_description}</p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                                <span>Success: {p.success_rate}%</span>
                                <span>Count: {p.occurrence_count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Canon Evolution Queue ═══ */}
            <TabsContent value="evolution-queue">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Canon Evolution Queue</CardTitle>
                  <CardDescription>Learning candidates ready for steward review and potential canon promotion</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const reviewable = learning.candidates.filter((c: any) => c.review_status === "pending" && !c.noise_suppressed && c.confidence_score >= 30);
                    return reviewable.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No candidates ready for evolution review. Candidates must pass noise filtering and meet minimum confidence.</p>
                    ) : (
                      <ScrollArea className="h-[420px]">
                        <div className="space-y-2">
                          {reviewable.map((c: any) => (
                            <div key={c.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className={`text-[10px] ${c.confidence_score >= 70 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : c.confidence_score >= 40 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground"}`}>
                                    {c.confidence_score >= 70 ? "Recommend Review" : c.confidence_score >= 40 ? "Observe" : "Defer"}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.summary}</p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                                <span>Signals: {c.signal_count}</span>
                                <span>Confidence: {c.confidence_score}%</span>
                                <span>Source: {c.source_type}</span>
                                <span>Domain: {c.proposed_domain}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

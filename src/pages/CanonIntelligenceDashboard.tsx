import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Globe, ShieldCheck, FileInput, RefreshCw, Layers } from "lucide-react";
import { useCanonIntelligence } from "@/hooks/useCanonIntelligence";

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

const SYNC_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed_empty: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  external_documentation: "External Docs",
  internal_runtime_learning: "Runtime Learning",
  internal_postmortem: "Postmortem",
  official_framework_docs: "Framework Docs",
  technical_reference: "Technical Ref",
  methodology_reference: "Methodology",
};

export default function CanonIntelligenceDashboard() {
  const { sources, trustProfiles, candidates, syncRuns, domains, loading } = useCanonIntelligence();

  const pendingCandidates = candidates.filter((c: any) => c.promotion_status === "pending");
  const trustedSources = trustProfiles.filter((t: any) => t.trust_tier === "trusted" || t.trust_tier === "verified");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Canon Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Source governance, trust evaluation, and candidate knowledge intake
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sources</p>
                <p className="text-2xl font-bold mt-1">{sources.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Trusted</p>
                <p className="text-2xl font-bold mt-1 text-emerald-400">{trustedSources.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Candidates</p>
                <p className="text-2xl font-bold mt-1">{candidates.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Review</p>
                <p className="text-2xl font-bold mt-1 text-amber-400">{pendingCandidates.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="sources" className="space-y-4">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="sources" className="text-xs"><Globe className="h-3.5 w-3.5 mr-1.5" />Sources</TabsTrigger>
              <TabsTrigger value="domains" className="text-xs"><Layers className="h-3.5 w-3.5 mr-1.5" />Domains</TabsTrigger>
              <TabsTrigger value="trust" className="text-xs"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Source Trust</TabsTrigger>
              <TabsTrigger value="candidates" className="text-xs"><FileInput className="h-3.5 w-3.5 mr-1.5" />Candidate Queue</TabsTrigger>
              <TabsTrigger value="syncs" className="text-xs"><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Sync Runs</TabsTrigger>
            </TabsList>

            {/* Sources Tab */}
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
                    <p className="text-sm text-muted-foreground py-8 text-center">No sources registered yet. Sources will appear here when registered via the Canon Intake Agent.</p>
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

            {/* Domains Tab */}
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

            {/* Trust Tab */}
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

            {/* Candidates Tab */}
            <TabsContent value="candidates">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Candidate Intake Queue</CardTitle>
                  <CardDescription>Knowledge candidates awaiting review — no direct path to canon</CardDescription>
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

            {/* Sync Runs Tab */}
            <TabsContent value="syncs">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sync Runs</CardTitle>
                  <CardDescription>Source synchronization history and candidate collection</CardDescription>
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
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

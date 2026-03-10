import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrg } from "@/contexts/OrgContext";
import { useCanonPatterns, useCanonUsageEvents, useCanonPatternApplications, useRetrievePatterns, useExplainRetrieval } from "@/hooks/useCanonRetrieval";
import { Search, Library, BarChart3, AlertTriangle, CheckCircle, FileText, Zap } from "lucide-react";

export default function PatternLibraryDashboard() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const [stackFilter, setStackFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [problemFilter, setProblemFilter] = useState("");

  const { data: patternsData, isLoading: patternsLoading } = useCanonPatterns(orgId, {
    stack: stackFilter || undefined,
    language: languageFilter || undefined,
    problem_type: problemFilter || undefined,
    max_results: 20,
  });
  const { data: usageEvents } = useCanonUsageEvents(orgId);
  const { data: applications } = useCanonPatternApplications(orgId);
  const retrieveMutation = useRetrievePatterns();
  const explainMutation = useExplainRetrieval();

  const patterns = patternsData?.patterns || [];
  const totalAvailable = patternsData?.totalAvailable || 0;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Library className="h-6 w-6 text-primary" />
              Pattern Library & Retrieval
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Runtime-connected implementation intelligence — retrieve approved patterns, templates, and conventions.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">Sprint 116</Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Available Patterns</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalAvailable}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Usage Events</span>
              </div>
              <p className="text-2xl font-bold mt-1">{usageEvents?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Applications</span>
              </div>
              <p className="text-2xl font-bold mt-1">{applications?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Retrieved Now</span>
              </div>
              <p className="text-2xl font-bold mt-1">{patterns.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="patterns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="query">Query Console</TabsTrigger>
            <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-3 flex-wrap">
                  <Input placeholder="Stack (e.g. react)" value={stackFilter} onChange={e => setStackFilter(e.target.value)} className="w-40" />
                  <Input placeholder="Language (e.g. typescript)" value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} className="w-40" />
                  <Input placeholder="Problem type" value={problemFilter} onChange={e => setProblemFilter(e.target.value)} className="w-40" />
                  <Button size="sm" variant="outline" onClick={() => { setStackFilter(""); setLanguageFilter(""); setProblemFilter(""); }}>Clear</Button>
                </div>
              </CardContent>
            </Card>

            {/* Pattern Table */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Retrieved Patterns</CardTitle></CardHeader>
              <CardContent>
                {patternsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : patterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No patterns match the current filters.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Stack</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quality</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patterns.map((p: any) => (
                        <TableRow key={p.canonEntryId}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.canonType}</Badge></TableCell>
                          <TableCell className="text-xs">{p.stackTags?.join(", ") || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={p.confidenceScore >= 0.7 ? "default" : "secondary"} className="text-xs">
                              {(p.confidenceScore * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.approvalStatus === "approved" ? "default" : "outline"} className="text-xs">
                              {p.approvalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{p.qualityLevel}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Retrieval Query Console
                </CardTitle>
                <CardDescription>Test retrieval queries and see explanation of pattern selection.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => orgId && explainMutation.mutate({
                      organization_id: orgId,
                      stack: stackFilter || undefined,
                      language: languageFilter || undefined,
                      problem_type: problemFilter || undefined,
                      query_description: `Stack: ${stackFilter || "any"}, Lang: ${languageFilter || "any"}, Problem: ${problemFilter || "any"}`,
                    })}
                    disabled={!orgId || explainMutation.isPending}
                  >
                    Explain Retrieval
                  </Button>
                </div>
                {explainMutation.data && (
                  <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium">{explainMutation.data.summary}</p>
                    <p className="text-sm text-muted-foreground">{explainMutation.data.topPatternExplanation}</p>
                    {explainMutation.data.selectionCriteria?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Selection Criteria:</p>
                        {explainMutation.data.selectionCriteria.map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs mr-1 mb-1">{c}</Badge>
                        ))}
                      </div>
                    )}
                    {explainMutation.data.antiPatternWarnings?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Cautions:</p>
                        {explainMutation.data.antiPatternWarnings.map((w: string, i: number) => (
                          <p key={i} className="text-xs text-destructive">{w}</p>
                        ))}
                      </div>
                    )}
                    {explainMutation.data.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Recommendations:</p>
                        {explainMutation.data.recommendations.map((r: string, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">{r}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Usage Events</CardTitle></CardHeader>
              <CardContent>
                {!usageEvents?.length ? (
                  <p className="text-sm text-muted-foreground">No usage events recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Context</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageEvents.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{e.usage_context}</TableCell>
                          <TableCell className="text-xs">{e.pipeline_stage || "—"}</TableCell>
                          <TableCell className="text-xs">{e.agent_type || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{(e.retrieval_score * 100).toFixed(0)}%</Badge></TableCell>
                          <TableCell>{e.was_applied ? <CheckCircle className="h-4 w-4 text-primary" /> : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Pattern Applications</CardTitle></CardHeader>
              <CardContent>
                {!applications?.length ? (
                  <p className="text-sm text-muted-foreground">No pattern applications recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stage</TableHead>
                        <TableHead>Applied By</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Quality Impact</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">{a.pipeline_stage || "—"}</TableCell>
                          <TableCell className="text-xs">{a.applied_by}</TableCell>
                          <TableCell><Badge variant={a.outcome_status === "success" ? "default" : "outline"} className="text-xs">{a.outcome_status}</Badge></TableCell>
                          <TableCell className="text-xs">{a.quality_impact_score != null ? `${(a.quality_impact_score * 100).toFixed(0)}%` : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

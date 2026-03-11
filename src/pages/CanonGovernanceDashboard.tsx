import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, FileText, Users, Archive, Layers, ShieldCheck } from "lucide-react";
import { useCanonGovernance } from "@/hooks/useCanonGovernance";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  proposed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  experimental: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  contested: "bg-destructive/20 text-destructive border-destructive/30",
  deprecated: "bg-muted text-muted-foreground line-through",
  archived: "bg-muted text-muted-foreground",
  superseded: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  pattern: "Pattern",
  template: "Template",
  anti_pattern: "Anti-Pattern",
  architectural_guideline: "Guideline",
  implementation_recipe: "Recipe",
  failure_memory: "Failure Memory",
  external_knowledge: "External",
};

export default function CanonGovernanceDashboard() {
  const { entries, categories, stewards, deprecations, loading } = useCanonGovernance();

  const statusCounts = entries.reduce((acc: Record<string, number>, e: any) => {
    acc[e.lifecycle_status] = (acc[e.lifecycle_status] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Canon Governance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Govern implementation knowledge: patterns, templates, guidelines, and failure memories
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Entries</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold font-mono">{entries.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-500">Approved</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold font-mono">{statusCounts.approved || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-500">Proposed</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold font-mono">{statusCounts.proposed || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-500">Experimental</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold font-mono">{statusCounts.experimental || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Deprecated</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold font-mono">{statusCounts.deprecated || 0}</div></CardContent>
            </Card>
          </div>

          <Tabs defaultValue="entries">
            <TabsList>
              <TabsTrigger value="entries"><FileText className="h-3 w-3 mr-1" />Entries</TabsTrigger>
              <TabsTrigger value="categories"><Layers className="h-3 w-3 mr-1" />Categories</TabsTrigger>
              <TabsTrigger value="stewards"><Users className="h-3 w-3 mr-1" />Stewards</TabsTrigger>
              <TabsTrigger value="deprecations"><Archive className="h-3 w-3 mr-1" />Deprecations</TabsTrigger>
            </TabsList>

            <TabsContent value="entries">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Canon Entries</CardTitle>
                  <CardDescription>Implementation knowledge governed as versioned, reviewable objects</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No canon entries yet. Create one to start building the implementation canon.</p>
                    ) : (
                      <div className="space-y-3">
                        {entries.map((e: any) => (
                          <div key={e.id} className="p-4 rounded-lg border border-border space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold truncate">{e.title}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{e.summary}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[e.canon_type] || e.canon_type}</Badge>
                                <Badge className={`text-[10px] ${STATUS_COLORS[e.lifecycle_status] || ""}`}>
                                  {e.lifecycle_status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                              <span>Confidence: {Math.round(Number(e.confidence_score) * 100)}%</span>
                              <span>v{e.current_version}</span>
                              <span>Stack: {e.stack_scope}</span>
                              <span>Layer: {e.layer_scope}</span>
                              {e.stewardship_owner && <span className="flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5" />{e.stewardship_owner}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardHeader><CardTitle className="text-sm">Canon Categories</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {categories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No categories defined yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {categories.map((c: any) => (
                          <div key={c.id} className="p-3 rounded-lg border border-border flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.description}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{c.slug}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stewards">
              <Card>
                <CardHeader><CardTitle className="text-sm">Canon Stewards</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {stewards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No stewards assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {stewards.map((s: any) => (
                          <div key={s.id} className="p-3 rounded-lg border border-border flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{s.steward_name}</p>
                              <p className="text-xs text-muted-foreground">Scope: {s.scope} | Entries: {s.assigned_entries_count}</p>
                            </div>
                            <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deprecations">
              <Card>
                <CardHeader><CardTitle className="text-sm">Deprecation History</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {deprecations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No deprecations recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {deprecations.map((d: any) => (
                          <div key={d.id} className="p-3 rounded-lg border border-border space-y-1">
                            <p className="text-sm">{d.reason}</p>
                            <p className="text-xs text-muted-foreground">{d.impact_assessment}</p>
                            <p className="text-[10px] text-muted-foreground">By: {d.deprecated_by}</p>
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
    </AppShell>
  );
}

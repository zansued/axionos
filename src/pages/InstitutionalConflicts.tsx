import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

import {
  Scale,
  AlertTriangle,
  Shield,
  Zap,
  FileSearch,
  ArrowUpRight,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface OverviewStats {
  total_conflicts: number;
  open_conflicts: number;
  status_distribution: Record<string, number>;
  type_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  total_precedents: number;
  total_events: number;
}

interface Conflict {
  id: string;
  conflict_code: string;
  conflict_type: string;
  conflict_title: string;
  conflict_summary: string;
  severity: string;
  urgency: string;
  blast_radius: string;
  involved_domains: string[];
  involved_subjects: Array<{ type: string; id: string }>;
  status: string;
  created_at: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const statusColors: Record<string, string> = {
  detected: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  triaged: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  under_review: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  resolved: "bg-green-500/10 text-green-400 border-green-500/20",
  escalated: "bg-red-500/10 text-red-400 border-red-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const statusIcons: Record<string, typeof AlertTriangle> = {
  detected: AlertTriangle,
  triaged: FileSearch,
  under_review: Clock,
  resolved: CheckCircle,
  escalated: ArrowUpRight,
  archived: XCircle,
};

export default function InstitutionalConflicts() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const orgId = currentOrg?.id;

  useEffect(() => {
    if (!orgId) return;
    loadData();
  }, [orgId]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, conflictsRes] = await Promise.all([
        supabase.functions.invoke("institutional-conflict-resolution-engine", {
          body: { action: "overview", organization_id: orgId },
        }),
        supabase
          .from("institutional_conflicts")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (statsRes.data) setStats(statsRes.data as OverviewStats);
      if (conflictsRes.data) setConflicts(conflictsRes.data as unknown as Conflict[]);
    } catch (e) {
      console.error("Failed to load conflicts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(conflictId: string) {
    const { data } = await supabase.functions.invoke("institutional-conflict-resolution-engine", {
      body: { action: "explain", organization_id: orgId, conflict_id: conflictId },
    });
    if (data) {
      setSelectedDetail(data);
      setDetailOpen(true);
    }
  }

  async function handleTriage(conflictId: string, newStatus: string) {
    await supabase.functions.invoke("institutional-conflict-resolution-engine", {
      body: { action: "triage", organization_id: orgId, conflict_id: conflictId, new_status: newStatus },
    });
    loadData();
  }

  async function handleGeneratePaths(conflictId: string) {
    const { data } = await supabase.functions.invoke("institutional-conflict-resolution-engine", {
      body: { action: "resolution_paths", organization_id: orgId, conflict_id: conflictId },
    });
    if (data) {
      openDetail(conflictId);
    }
  }

  const filteredConflicts = activeTab === "all"
    ? conflicts
    : conflicts.filter((c) => c.status === activeTab);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      
      <div className="min-h-screen bg-background p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Scale className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Institutional Conflicts</h1>
            <p className="text-sm text-muted-foreground">
              Conflict detection, classification, resolution paths, and institutional mediation
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-400" />
                <div className="text-2xl font-bold text-foreground">{stats.open_conflicts}</div>
                <div className="text-xs text-muted-foreground">Open Conflicts</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold text-foreground">{stats.total_conflicts}</div>
                <div className="text-xs text-muted-foreground">Total Conflicts</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <FileSearch className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                <div className="text-2xl font-bold text-foreground">{stats.total_precedents}</div>
                <div className="text-xs text-muted-foreground">Precedents</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4 text-center">
                <Zap className="h-5 w-5 mx-auto mb-1 text-green-400" />
                <div className="text-2xl font-bold text-foreground">{stats.total_events}</div>
                <div className="text-xs text-muted-foreground">Resolution Events</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Distribution Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">By Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.type_distribution).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}: {count}
                    </Badge>
                  ))}
                  {Object.keys(stats.type_distribution).length === 0 && (
                    <span className="text-xs text-muted-foreground">No conflicts yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">By Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.severity_distribution).map(([sev, count]) => (
                    <Badge key={sev} variant="outline" className={severityColors[sev] || ""}>
                      {sev}: {count}
                    </Badge>
                  ))}
                  {Object.keys(stats.severity_distribution).length === 0 && (
                    <span className="text-xs text-muted-foreground">No conflicts yet</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conflict List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="detected">Detected</TabsTrigger>
            <TabsTrigger value="triaged">Triaged</TabsTrigger>
            <TabsTrigger value="under_review">Under Review</TabsTrigger>
            <TabsTrigger value="escalated">Escalated</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card className="border-border/50 bg-card">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-2">
                  {filteredConflicts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No conflicts found for this filter.
                    </p>
                  ) : (
                    filteredConflicts.map((c) => {
                      const StatusIcon = statusIcons[c.status] || AlertTriangle;
                      return (
                        <div
                          key={c.id}
                          onClick={() => openDetail(c.id)}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <StatusIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {c.conflict_title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {c.conflict_summary}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={severityColors[c.severity] || ""}>
                              {c.severity}
                            </Badge>
                            <Badge variant="outline" className={statusColors[c.status] || ""}>
                              {c.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Drawer */}
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent className="w-[520px] sm:max-w-[520px] bg-card border-border">
            <SheetHeader>
              <SheetTitle className="text-foreground">Conflict Analysis</SheetTitle>
            </SheetHeader>
            {selectedDetail && (
              <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                <div className="space-y-4 pr-4">
                  {/* Conflict Info */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{selectedDetail.conflict?.conflict_title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-2">
                        <Badge variant="outline">{selectedDetail.conflict?.conflict_type}</Badge>
                        <Badge variant="outline" className={severityColors[selectedDetail.conflict?.severity] || ""}>
                          {selectedDetail.conflict?.severity}
                        </Badge>
                        <Badge variant="outline" className={statusColors[selectedDetail.conflict?.status] || ""}>
                          {selectedDetail.conflict?.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedDetail.conflict?.conflict_summary}</p>
                    </CardContent>
                  </Card>

                  {/* Explanation */}
                  {selectedDetail.explanation && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Explanation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div>
                          <div className="font-medium text-foreground mb-1">Why is this a conflict?</div>
                          <div className="text-muted-foreground">{selectedDetail.explanation.why_is_conflict}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground mb-1">What collides?</div>
                          <div className="text-muted-foreground">{selectedDetail.explanation.what_collides}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground mb-1">What is at risk?</div>
                          <div className="text-muted-foreground">{selectedDetail.explanation.what_is_at_risk}</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground mb-1">Resolution paths</div>
                          <div className="text-muted-foreground">{selectedDetail.explanation.possible_paths}</div>
                        </div>
                        {selectedDetail.explanation.escalation_needed && (
                          <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <ArrowUpRight className="h-4 w-4 text-red-400 shrink-0" />
                            <span className="text-red-400 text-xs">Escalation recommended due to severity/urgency.</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Resolution Paths */}
                  {selectedDetail.paths && selectedDetail.paths.length > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Resolution Paths ({selectedDetail.paths.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {selectedDetail.paths.map((p: any) => (
                          <div key={p.id || p.path_type} className="p-2 rounded border border-border/30 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{p.path_type}</Badge>
                              {p.recommended && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                                  recommended
                                </Badge>
                              )}
                              <span className="text-muted-foreground ml-auto">
                                Score: {(Number(p.advisory_score) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-muted-foreground">{p.path_summary}</div>
                            <div className="flex gap-3 mt-1 text-muted-foreground">
                              <span>Risk: {(Number(p.risk_tradeoff_score) * 100).toFixed(0)}%</span>
                              <span>Precedent: {(Number(p.precedent_alignment_score) * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  {selectedDetail.conflict && !["resolved", "archived"].includes(selectedDetail.conflict.status) && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        {selectedDetail.conflict.status === "detected" && (
                          <Button size="sm" variant="outline" onClick={() => handleTriage(selectedDetail.conflict.id, "triaged")}>
                            Mark as Triaged
                          </Button>
                        )}
                        {["detected", "triaged"].includes(selectedDetail.conflict.status) && (
                          <Button size="sm" variant="outline" onClick={() => handleTriage(selectedDetail.conflict.id, "under_review")}>
                            Start Review
                          </Button>
                        )}
                        {!selectedDetail.paths?.length && (
                          <Button size="sm" variant="outline" onClick={() => handleGeneratePaths(selectedDetail.conflict.id)}>
                            Generate Resolution Paths
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-red-400" onClick={() => handleTriage(selectedDetail.conflict.id, "escalated")}>
                          Escalate
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* What is NOT automated */}
                  <Card className="border-border/50 border-yellow-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Not Automated
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground space-y-1">
                      <p>• Severe conflicts are never auto-resolved</p>
                      <p>• Structural governance overrides require human approval</p>
                      <p>• Escalation decisions are always recorded</p>
                      <p>• Resolution precedents inform but do not mandate</p>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

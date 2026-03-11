import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, ClipboardCheck, AlertTriangle, Archive, GitBranch, ArrowUpCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanonPipeline } from "@/hooks/useCanonPipeline";
import { useState } from "react";

interface CanonGovernanceTabProps {
  library: any[];
  reviews: any[];
  conflicts: any[];
  supersessions: any[];
  candidates: any[];
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  promoted: "bg-primary/20 text-primary border-primary/30",
};

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-destructive/20 text-destructive border-destructive/30",
};

export function CanonGovernanceTab({ library, reviews, conflicts, supersessions, candidates }: CanonGovernanceTabProps) {
  const { promoteCandidateToCanon, promoting } = useCanonPipeline();
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const pendingReviews = reviews.filter((r: any) => r.verdict === "pending");
  const deprecatedEntries = library.filter((e: any) => e.lifecycle_status === "deprecated" || e.lifecycle_status === "archived");
  const openConflicts = conflicts.filter((c: any) => c.resolution_status !== "resolved");
  const pendingCandidates = candidates.filter((c: any) => c.promotion_status === "pending");
  const approvedCandidates = candidates.filter((c: any) => c.internal_validation_status === "approved" && c.promotion_status === "pending");

  const handlePromote = async (id: string) => {
    setPromotingId(id);
    await promoteCandidateToCanon(id);
    setPromotingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Governance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <GovMetric value={pendingReviews.length} label="Pending Reviews" warn={pendingReviews.length > 0} />
        <GovMetric value={openConflicts.length} label="Open Conflicts" warn={openConflicts.length > 0} />
        <GovMetric value={pendingCandidates.length} label="Source Candidates" />
        <GovMetric value={approvedCandidates.length} label="Ready to Promote" accent />
        <GovMetric value={deprecatedEntries.length} label="Deprecated" />
        <GovMetric value={supersessions.length} label="Supersessions" />
        <GovMetric value={supersessions.length} label="Supersessions" />
      </div>

      <Tabs defaultValue="reviews" className="space-y-3">
        <TabsList className="bg-muted/20 gap-0.5 p-0.5">
          <TabsTrigger value="reviews" className="text-xs"><ClipboardCheck className="h-3 w-3 mr-1" />Reviews</TabsTrigger>
          <TabsTrigger value="conflicts" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Conflicts</TabsTrigger>
          <TabsTrigger value="lifecycle" className="text-xs"><Archive className="h-3 w-3 mr-1" />Lifecycle</TabsTrigger>
          <TabsTrigger value="lineage" className="text-xs"><GitBranch className="h-3 w-3 mr-1" />Lineage</TabsTrigger>
        </TabsList>

        {/* Reviews */}
        <TabsContent value="reviews">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Stewardship Reviews</CardTitle>
              <CardDescription className="text-xs">Canon entries cannot be approved without steward review</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No reviews recorded yet.</p>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1.5">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="p-3 rounded border border-border/20 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[r.verdict] || STATUS_BADGE.pending}`}>{r.verdict}</Badge>
                          <span className="text-[10px] text-muted-foreground/50">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.review_notes || "No notes"}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/60">
                          <span>Confidence: {r.confidence_assessment}%</span>
                          <span>{r.review_type}</span>
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
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Canon Conflicts</CardTitle>
              <CardDescription className="text-xs">Contradictions and overlaps must be resolved before promotion</CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No conflicts detected.</p>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1.5">
                    {conflicts.map((c: any) => (
                      <div key={c.id} className="p-3 rounded border border-border/20 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${SEVERITY_BADGE[c.severity] || SEVERITY_BADGE.low}`}>{c.severity}</Badge>
                            <Badge variant="outline" className="text-[10px]">{c.conflict_type}</Badge>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${c.resolution_status === "resolved" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {c.resolution_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{c.conflict_description}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lifecycle */}
        <TabsContent value="lifecycle">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Deprecated & Archived</CardTitle>
              <CardDescription className="text-xs">Entries that have been deprecated or archived — not retrievable by default</CardDescription>
            </CardHeader>
            <CardContent>
              {deprecatedEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No deprecated or archived entries.</p>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1.5">
                    {deprecatedEntries.map((e: any) => (
                      <div key={e.id} className="p-3 rounded border border-border/20 bg-muted/5 opacity-70">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium line-through">{e.title}</p>
                          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">{e.lifecycle_status}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{e.summary}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lineage */}
        <TabsContent value="lineage">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Supersession Lineage</CardTitle>
              <CardDescription className="text-xs">Replacement history — all canon changes preserve lineage</CardDescription>
            </CardHeader>
            <CardContent>
              {supersessions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No supersessions recorded.</p>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1.5">
                    {supersessions.map((s: any) => (
                      <div key={s.id} className="p-3 rounded border border-border/20 bg-muted/10">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-mono truncate max-w-[100px]">{s.predecessor_entry_id?.slice(0, 8)}...</span>
                          <span className="text-primary font-bold">→</span>
                          <span className="text-primary font-mono truncate max-w-[100px]">{s.successor_entry_id?.slice(0, 8)}...</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{s.reason || "No reason"}</p>
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
  );
}

function GovMetric({ value, label, warn, accent }: { value: number; label: string; warn?: boolean; accent?: boolean }) {
  return (
    <Card className="border-border/30 bg-card/50">
      <CardContent className="pt-3 pb-2 text-center">
        <p className={`text-lg font-bold ${warn ? "text-amber-400" : accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

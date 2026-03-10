import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCanonPromotionPipeline } from "@/hooks/useCanonPromotionPipeline";
import { useLearningExtraction } from "@/hooks/useLearningExtraction";
import { useState } from "react";
import { FileText, CheckCircle, XCircle, Play, Archive, ArrowRight, TrendingUp } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-accent/20 text-accent-foreground",
  approved: "bg-primary/20 text-primary",
  active: "bg-primary/30 text-primary",
  deprecated: "bg-destructive/20 text-destructive",
};

const APPROVAL_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-primary/20 text-primary",
  rejected: "bg-destructive/20 text-destructive",
};

export default function CanonEvolutionDashboard() {
  const {
    records, recordsLoading, summary,
    createRecord, reviewRecord, approveRecord, activateRecord, deprecateRecord,
  } = useCanonPromotionPipeline();

  const { candidates } = useLearningExtraction();
  const [tab, setTab] = useState("records");

  const eligibleCandidates = candidates.filter(
    (c) => c.status === "active" && c.confidence_score >= 0.6
  );

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Canon Evolution</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Autonomous Intelligent Infrastructure — converting learning evidence into canonical operational doctrine.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{summary?.total || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Canon</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{summary?.by_stage?.active || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-accent-foreground">{summary?.by_stage?.under_review || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recent Promotions</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{summary?.recent_promotions || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recent Deprecations</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{summary?.recent_deprecations || 0}</div></CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="records"><FileText className="h-4 w-4 mr-1" />Canon Records</TabsTrigger>
            <TabsTrigger value="promote"><TrendingUp className="h-4 w-4 mr-1" />Promote Candidates</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <Card>
              <CardContent className="p-0">
                {recordsLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading…</div>
                ) : records.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No canon records yet. Promote learning candidates to begin.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Approval</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-foreground">
                            {r.learning_candidates?.pattern_signature || r.candidate_id?.slice(0, 8) || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={STAGE_COLORS[r.promotion_stage] || ""}>{r.promotion_stage}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={APPROVAL_COLORS[r.approval_status] || ""}>{r.approval_status}</Badge>
                          </TableCell>
                          <TableCell>{r.confidence_score}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="space-x-1">
                            {r.promotion_stage === "draft" && (
                              <Button size="sm" variant="ghost" onClick={() => reviewRecord.mutate({ record_id: r.id })} title="Send to review">
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                            {r.promotion_stage === "under_review" && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => approveRecord.mutate({ record_id: r.id })} title="Approve">
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {r.promotion_stage === "approved" && (
                              <Button size="sm" variant="ghost" onClick={() => activateRecord.mutate(r.id)} title="Activate">
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            {r.promotion_stage === "active" && (
                              <Button size="sm" variant="ghost" onClick={() => deprecateRecord.mutate({ record_id: r.id })} title="Deprecate">
                                <Archive className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promote">
            <Card>
              <CardContent className="p-0">
                {eligibleCandidates.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No high-confidence learning candidates eligible for promotion.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pattern</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Evidence</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibleCandidates.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-foreground">{c.pattern_signature}</TableCell>
                          <TableCell><Badge variant="outline">{c.candidate_type}</Badge></TableCell>
                          <TableCell>{c.confidence_score}</TableCell>
                          <TableCell>{c.evidence_count}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => createRecord.mutate(c.id)}
                              title="Create canon record"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />Promote
                            </Button>
                          </TableCell>
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

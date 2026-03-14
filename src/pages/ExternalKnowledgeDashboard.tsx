import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCanonEvolutionControl } from "@/hooks/useCanonEvolutionControl";
import { useCanonReviewPipeline } from "@/hooks/useCanonReviewPipeline";
import {
  PackagePlus, Search, ShieldAlert, TrendingUp, FileText, XCircle,
  Zap, CheckCircle2, RotateCcw, Loader2, Rocket,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  promoted: "bg-primary/20 text-primary",
  rejected: "bg-destructive/20 text-destructive",
  sandbox: "bg-accent/20 text-accent-foreground",
  defer: "bg-secondary text-secondary-foreground",
  draft: "bg-muted text-muted-foreground",
  open: "bg-primary/20 text-primary",
  approved: "bg-primary/20 text-primary",
  needs_review: "bg-warning/20 text-warning",
  under_trial: "bg-accent/20 text-accent-foreground",
};

export default function ExternalKnowledgeDashboard() {
  const {
    candidates, proposals, loadingCandidates, loadingProposals,
    detectConflict, promoteCandidate, rejectCandidate,
  } = useCanonEvolutionControl();
  const pipeline = useCanonReviewPipeline();
  const [tab, setTab] = useState("candidates");

  const ps = pipeline.status;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">External Knowledge & Canon Evolution</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Govern external knowledge intake, trials, and canon promotion decisions.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => pipeline.reviewCandidates.mutate()}
              disabled={pipeline.isRunning}
            >
              {pipeline.reviewCandidates.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Revisando…</>
                : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />AI Review</>
              }
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => pipeline.promoteApproved.mutate()}
              disabled={pipeline.isRunning}
            >
              {pipeline.promoteApproved.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Promovendo…</>
                : <><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Promote Approved</>
              }
            </Button>
            <Button
              size="sm"
              onClick={() => pipeline.runFullPipeline.mutate()}
              disabled={pipeline.isRunning}
              className="bg-primary text-primary-foreground"
            >
              {pipeline.runFullPipeline.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Pipeline…</>
                : <><Rocket className="h-3.5 w-3.5 mr-1.5" />Auto Pipeline Completo</>
              }
            </Button>
          </div>
        </div>

        {/* Pipeline Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] text-muted-foreground uppercase">Candidatos</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-foreground">{ps?.candidates?.total ?? candidates.length}</span></CardContent>
          </Card>
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] text-muted-foreground uppercase">Pendente Revisão</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-warning">{ps?.candidates?.pending_review ?? "—"}</span></CardContent>
          </Card>
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] text-muted-foreground uppercase">Aprovados</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-primary">{ps?.candidates?.approved ?? "—"}</span></CardContent>
          </Card>
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] text-muted-foreground uppercase">Revisão Humana</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-accent-foreground">{ps?.candidates?.needs_human_review ?? "—"}</span></CardContent>
          </Card>
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] text-muted-foreground uppercase">Promovidos</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-emerald-500">{ps?.candidates?.promoted ?? "—"}</span></CardContent>
          </Card>
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-[10px] text-muted-foreground uppercase">Canon Entries</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-foreground">{ps?.canon_entries?.active ?? "—"}</span></CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="candidates"><PackagePlus className="h-4 w-4 mr-1" />Candidates</TabsTrigger>
            <TabsTrigger value="proposals"><FileText className="h-4 w-4 mr-1" />Proposals</TabsTrigger>
          </TabsList>

          <TabsContent value="candidates">
            <Card>
              <CardContent className="p-0">
                {loadingCandidates ? (
                  <div className="p-8 text-center text-muted-foreground">Loading…</div>
                ) : candidates.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No external knowledge candidates registered yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Stack</TableHead>
                        <TableHead>Reliability</TableHead>
                        <TableHead>Review</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-foreground max-w-[200px] truncate">{c.title}</TableCell>
                          <TableCell><Badge variant="outline">{c.knowledge_type}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.source_type}</TableCell>
                          <TableCell className="text-sm">{c.stack_scope || c.domain_scope || "—"}</TableCell>
                          <TableCell>{c.source_reliability_score}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[c.internal_validation_status] || "bg-muted text-muted-foreground"}>
                              {c.internal_validation_status || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell><Badge className={STATUS_COLORS[c.promotion_status] || ""}>{c.promotion_status}</Badge></TableCell>
                          <TableCell className="space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => detectConflict.mutate(c.id)} title="Detect conflicts"><Search className="h-3 w-3" /></Button>
                            {c.promotion_status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => promoteCandidate.mutate({ candidateId: c.id })} title="Evaluate promotion"><TrendingUp className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => rejectCandidate.mutate({ candidateId: c.id, reason: "Rejected by operator" })} title="Reject"><XCircle className="h-3 w-3" /></Button>
                              </>
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

          <TabsContent value="proposals">
            <Card>
              <CardContent className="p-0">
                {loadingProposals ? (
                  <div className="p-8 text-center text-muted-foreground">Loading…</div>
                ) : proposals.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No canon evolution proposals yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Proposed By</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposals.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-foreground">{p.title}</TableCell>
                          <TableCell><Badge variant="outline">{p.proposal_type}</Badge></TableCell>
                          <TableCell><Badge className={STATUS_COLORS[p.status] || ""}>{p.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.proposed_by || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
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

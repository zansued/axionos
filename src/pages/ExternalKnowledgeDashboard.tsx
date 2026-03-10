import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCanonEvolutionControl } from "@/hooks/useCanonEvolutionControl";
import { PackagePlus, Search, ShieldAlert, TrendingUp, FileText, XCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  promoted: "bg-primary/20 text-primary",
  rejected: "bg-destructive/20 text-destructive",
  sandbox: "bg-accent/20 text-accent-foreground",
  defer: "bg-secondary text-secondary-foreground",
  draft: "bg-muted text-muted-foreground",
  open: "bg-primary/20 text-primary",
  approved: "bg-primary/20 text-primary",
  under_trial: "bg-accent/20 text-accent-foreground",
};

export default function ExternalKnowledgeDashboard() {
  const {
    candidates, proposals, loadingCandidates, loadingProposals,
    detectConflict, promoteCandidate, rejectCandidate,
  } = useCanonEvolutionControl();
  const [tab, setTab] = useState("candidates");

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">External Knowledge & Canon Evolution</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Govern external knowledge intake, trials, and canon promotion decisions.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Candidates</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{candidates.length}</div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{candidates.filter((c: any) => c.promotion_status === "pending").length}</div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Promoted</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{candidates.filter((c: any) => c.promotion_status === "promoted").length}</div></CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Proposals</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-foreground">{proposals.length}</div></CardContent>
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
                        <TableHead>Conflicts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-foreground">{c.title}</TableCell>
                          <TableCell><Badge variant="outline">{c.knowledge_type}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.source_type}</TableCell>
                          <TableCell className="text-sm">{c.stack_scope || "—"}</TableCell>
                          <TableCell>{c.source_reliability_score}</TableCell>
                          <TableCell>{c.conflict_with_existing_canon ? <ShieldAlert className="h-4 w-4 text-destructive" /> : "—"}</TableCell>
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

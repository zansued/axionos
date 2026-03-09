import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Scale, Users, AlertTriangle, Gavel, Clock } from "lucide-react";

interface Overview {
  constitutions: number;
  domains: number;
  rights: number;
  active_delegations: number;
  evaluations: number;
  open_conflicts: number;
}

export default function SovereignDecisionRights() {
  const { currentOrg } = useOrg();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rights, setRights] = useState<any[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    setLoading(true);

    const invoke = (action: string, extra: Record<string, unknown> = {}) =>
      supabase.functions.invoke("sovereign-decision-rights-orchestration", {
        body: { action, organization_id: orgId, ...extra },
      });

    Promise.all([
      invoke("overview"),
      invoke("decision_rights"),
      invoke("delegations"),
      invoke("conflict_events"),
      invoke("recommendations"),
    ]).then(([ovRes, drRes, delRes, confRes, recRes]) => {
      if (ovRes.data) setOverview(ovRes.data);
      if (drRes.data) setRights(Array.isArray(drRes.data) ? drRes.data : []);
      if (delRes.data) setDelegations(Array.isArray(delRes.data) ? delRes.data : []);
      if (confRes.data) setConflicts(Array.isArray(confRes.data) ? confRes.data : []);
      if (recRes.data?.recommendations) setRecommendations(recRes.data.recommendations);
      setLoading(false);
    });

    // Also load evaluations directly
    supabase
      .from("decision_authority_evaluations")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setEvaluations(data); });
  }, [currentOrg]);

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const resultColor = (r: string) => {
    switch (r) {
      case "allowed": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "delegated": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "denied": return "bg-destructive/20 text-destructive border-destructive/30";
      case "contested": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "escalated": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Decision Rights</h1>
          <p className="text-muted-foreground text-sm mt-1">Sovereign authority orchestration — who decides what, under which rules.</p>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Constitutions", value: overview.constitutions, icon: Shield },
              { label: "Domains", value: overview.domains, icon: Scale },
              { label: "Rights", value: overview.rights, icon: Gavel },
              { label: "Delegations", value: overview.active_delegations, icon: Users },
              { label: "Evaluations", value: overview.evaluations, icon: Clock },
              { label: "Conflicts", value: overview.open_conflicts, icon: AlertTriangle },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recommendations</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>{r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="rights">
          <TabsList className="bg-muted">
            <TabsTrigger value="rights">Rights</TabsTrigger>
            <TabsTrigger value="delegations">Delegations</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          </TabsList>

          <TabsContent value="rights">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Authority</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rights.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No decision rights registered yet.</TableCell></TableRow>
                    ) : rights.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.decision_code}</TableCell>
                        <TableCell className="text-sm">{r.decision_type}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.authority_level}</Badge></TableCell>
                        <TableCell className="text-sm">{r.subject_ref}</TableCell>
                        <TableCell className="text-sm">{r.precedence_rank}</TableCell>
                        <TableCell>{r.review_required ? <Badge variant="secondary" className="text-xs">Required</Badge> : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="delegations">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegations.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No delegations registered.</TableCell></TableRow>
                    ) : delegations.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.delegated_from_ref}</TableCell>
                        <TableCell className="text-sm">{d.delegated_to_ref}</TableCell>
                        <TableCell className="text-sm">{d.delegation_type}</TableCell>
                        <TableCell><Badge variant={d.revocation_status === "active" ? "default" : "secondary"} className="text-xs">{d.revocation_status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.end_at ? new Date(d.end_at).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="evaluations">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Actor</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Legitimacy</TableHead>
                      <TableHead>Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No evaluations yet.</TableCell></TableRow>
                    ) : evaluations.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.actor_ref}</TableCell>
                        <TableCell className="text-sm">{e.decision_type}</TableCell>
                        <TableCell><Badge className={`text-xs ${resultColor(e.evaluation_result)}`}>{e.evaluation_result}</Badge></TableCell>
                        <TableCell className="text-sm">{e.legitimacy_score}/100</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.explanation_summary}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No authority conflicts recorded.</TableCell></TableRow>
                    ) : conflicts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{c.conflict_type}</TableCell>
                        <TableCell><Badge variant={severityColor(c.severity)} className="text-xs">{c.severity}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{c.event_summary}</TableCell>
                        <TableCell>{c.resolved_at ? <Badge variant="outline" className="text-xs">Resolved</Badge> : <Badge variant="destructive" className="text-xs">Open</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

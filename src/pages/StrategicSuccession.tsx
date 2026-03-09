import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Users, AlertTriangle, Brain, ArrowRightLeft, ClipboardList, Info, Activity, ChevronDown } from "lucide-react";

interface Overview {
  constitutions: number;
  critical_roles: number;
  continuity_profiles: number;
  active_plans: number;
  assessments: number;
  open_transitions: number;
  roles_without_backup: number;
  high_knowledge_concentration: number;
}

interface ConcentrationRisk {
  roleId: string;
  roleName: string;
  riskLevel: string;
  factors: string[];
}

interface ReadinessResult {
  roleId: string;
  ownerRef: string;
  score: number;
  level: string;
  summary: string;
}

interface TransitionRisk {
  roleName: string;
  riskLevel: string;
  risks: string[];
}

interface HandoffResult {
  planId: string;
  planCode: string;
  viable: boolean;
  completeness: number;
  gaps: string[];
}

interface ContinuityResult {
  score: number;
  level: string;
  summary: string;
}

interface ComputeAssessment {
  concentrationRisks: ConcentrationRisk[];
  readinessResults: ReadinessResult[];
  transitionRisks: TransitionRisk[];
  handoffResults: HandoffResult[];
  continuity: ContinuityResult;
}

interface Explanation {
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
}

export default function StrategicSuccession() {
  const { currentOrg } = useOrg();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [transitions, setTransitions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [assessment, setAssessment] = useState<ComputeAssessment | null>(null);
  const [explainData, setExplainData] = useState<{ role: string; explanation: Explanation } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoke = (action: string, extra: Record<string, unknown> = {}) =>
    supabase.functions.invoke("strategic-succession-long-horizon-continuity", {
      body: { action, organization_id: currentOrg?.id, ...extra },
    });

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);

    Promise.all([
      invoke("overview"),
      invoke("critical_roles"),
      invoke("continuity_profiles"),
      invoke("succession_plans"),
      invoke("transition_events"),
      invoke("recommendations"),
      invoke("compute_assessment"),
    ]).then(([ovRes, rRes, pRes, spRes, tRes, recRes, assRes]) => {
      if (ovRes.error) { setError("Failed to load succession data."); setLoading(false); return; }
      if (ovRes.data) setOverview(ovRes.data);
      if (rRes.data) setRoles(Array.isArray(rRes.data?.roles) ? rRes.data.roles : Array.isArray(rRes.data) ? rRes.data : []);
      if (pRes.data) setProfiles(Array.isArray(pRes.data) ? pRes.data : []);
      if (spRes.data) setPlans(Array.isArray(spRes.data) ? spRes.data : []);
      if (tRes.data) setTransitions(Array.isArray(tRes.data) ? tRes.data : []);
      if (recRes.data?.recommendations) setRecommendations(recRes.data.recommendations);
      if (assRes.data && !assRes.error) setAssessment(assRes.data);
      setLoading(false);
    }).catch(() => { setError("Failed to load succession data."); setLoading(false); });
  }, [currentOrg]);

  const handleExplain = async (roleId: string) => {
    const res = await invoke("explain", { role_id: roleId });
    if (res.data && !res.error) setExplainData(res.data);
  };

  const critColor = (c: string) => {
    switch (c) { case "critical": case "high": return "destructive" as const; case "medium": return "secondary" as const; default: return "outline" as const; }
  };

  const riskColor = (level: string) => {
    switch (level) { case "critical": return "bg-destructive/15 text-destructive"; case "high": return "bg-destructive/10 text-destructive"; case "medium": return "bg-accent/50 text-accent-foreground"; default: return "bg-muted text-muted-foreground"; }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="bg-card border-destructive/30">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Succession</h1>
          <p className="text-muted-foreground text-sm mt-1">Strategic succession & long-horizon institutional continuity governance.</p>
        </div>

        {/* Strategy Continuity Score */}
        {assessment?.continuity && (
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <Activity className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Strategy Continuity</p>
                <p className="text-lg font-bold text-foreground">{assessment.continuity.score}/100 — <span className="capitalize">{assessment.continuity.level}</span></p>
              </div>
              <Badge variant={assessment.continuity.level === "resilient" ? "outline" : critColor(assessment.continuity.level === "at_risk" ? "critical" : "medium")} className="text-xs">
                {assessment.continuity.level}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Overview stats */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Critical Roles", value: overview.critical_roles, icon: Users },
              { label: "Profiles", value: overview.continuity_profiles, icon: Shield },
              { label: "Active Plans", value: overview.active_plans, icon: ClipboardList },
              { label: "No Backup", value: overview.roles_without_backup, icon: AlertTriangle },
              { label: "High Conc.", value: overview.high_knowledge_concentration, icon: Brain },
              { label: "Transitions", value: overview.open_transitions, icon: ArrowRightLeft },
              { label: "Assessments", value: overview.assessments, icon: Shield },
              { label: "Constitutions", value: overview.constitutions, icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="bg-card border-border">
                <CardContent className="p-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-foreground">{value}</p>
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

        {/* Explain Card */}
        {explainData?.explanation && (
          <Card className="bg-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4 text-primary" />{explainData.explanation.title}: {explainData.role}</CardTitle>
              <CardDescription className="text-xs">{explainData.explanation.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-1">
                {explainData.explanation.details.map((d, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {d}</li>
                ))}
              </ul>
              <p className="text-xs font-medium text-primary">{explainData.explanation.recommendation}</p>
              <button onClick={() => setExplainData(null)} className="text-xs text-muted-foreground underline">Dismiss</button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="roles">
          <TabsList className="bg-muted">
            <TabsTrigger value="roles">Critical Roles</TabsTrigger>
            <TabsTrigger value="profiles">Continuity Profiles</TabsTrigger>
            <TabsTrigger value="plans">Succession Plans</TabsTrigger>
            <TabsTrigger value="transitions">Transitions</TabsTrigger>
            <TabsTrigger value="concentration">Knowledge Concentration</TabsTrigger>
            <TabsTrigger value="readiness">Readiness</TabsTrigger>
          </TabsList>

          {/* Critical Roles */}
          <TabsContent value="roles">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead>Continuity Tier</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No critical roles registered.</TableCell></TableRow>
                    ) : roles.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.role_name}</TableCell>
                        <TableCell className="text-sm">{r.domain}</TableCell>
                        <TableCell className="text-xs">{r.role_type}</TableCell>
                        <TableCell><Badge variant={critColor(r.criticality_level)} className="text-xs">{r.criticality_level}</Badge></TableCell>
                        <TableCell className="text-xs">{r.continuity_tier}</TableCell>
                        <TableCell>
                          <button onClick={() => handleExplain(r.id)} className="text-xs text-primary underline">Explain</button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Continuity Profiles */}
          <TabsContent value="profiles">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner</TableHead>
                      <TableHead>Backup</TableHead>
                      <TableHead>Readiness</TableHead>
                      <TableHead>Knowledge Conc.</TableHead>
                      <TableHead>Handoff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No continuity profiles.</TableCell></TableRow>
                    ) : profiles.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.current_owner_ref}</TableCell>
                        <TableCell>{p.backup_exists ? <Badge variant="outline" className="text-xs">Yes</Badge> : <Badge variant="destructive" className="text-xs">No</Badge>}</TableCell>
                        <TableCell><Badge variant={p.succession_readiness_level === "ready" ? "outline" : critColor(p.succession_readiness_level === "fragile" ? "high" : "medium")} className="text-xs">{p.succession_readiness_level}</Badge></TableCell>
                        <TableCell className="text-sm">{Math.round((p.knowledge_concentration_score ?? 0) * 100)}%</TableCell>
                        <TableCell className="text-sm">{Math.round((p.handoff_maturity_score ?? 0) * 100)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Succession Plans */}
          <TabsContent value="plans">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[600px]">
                {plans.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No succession plans.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {plans.map((p: any) => {
                      const handoff = assessment?.handoffResults?.find((h: HandoffResult) => h.planId === p.id);
                      const hs = Array.isArray(p.handoff_sequence) ? p.handoff_sequence : [];
                      const kt = Array.isArray(p.knowledge_transfer_steps) ? p.knowledge_transfer_steps : [];
                      const at = Array.isArray(p.authority_transfer_steps) ? p.authority_transfer_steps : [];
                      const cc = Array.isArray(p.continuity_checks) ? p.continuity_checks : [];
                      const hasDetails = hs.length > 0 || kt.length > 0 || at.length > 0 || cc.length > 0;

                      return (
                        <Collapsible key={p.id}>
                          <div className="p-4">
                            <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="font-mono text-xs text-foreground">{p.plan_code}</span>
                                <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">{p.status}</Badge>
                                <span className="text-xs text-muted-foreground truncate">{p.succession_type}</span>
                                {handoff && (
                                  <span className={`text-xs font-medium shrink-0 ${handoff.viable ? "text-primary" : "text-destructive"}`}>
                                    Viability: {handoff.completeness}% {handoff.viable ? "✓" : `(${handoff.gaps.length} gaps)`}
                                  </span>
                                )}
                              </div>
                              {hasDetails && <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />}
                            </CollapsibleTrigger>

                            {/* Trigger conditions summary */}
                            <p className="text-xs text-muted-foreground mt-1 max-w-xl truncate">
                              Trigger: {typeof p.trigger_conditions === "string" ? p.trigger_conditions : JSON.stringify(p.trigger_conditions)}
                            </p>

                            {/* Handoff gaps */}
                            {handoff && !handoff.viable && handoff.gaps.length > 0 && (
                              <div className="mt-2">
                                {handoff.gaps.map((g, i) => (
                                  <span key={i} className="inline-block text-[10px] bg-destructive/10 text-destructive rounded px-1.5 py-0.5 mr-1 mb-1">{g}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {hasDetails && (
                            <CollapsibleContent>
                              <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <TransferSection title="Handoff Sequence" items={hs} icon={ArrowRightLeft} />
                                <TransferSection title="Knowledge Transfer" items={kt} icon={Brain} />
                                <TransferSection title="Authority Transfer" items={at} icon={Shield} />
                                <TransferSection title="Continuity Checks" items={cc} icon={ClipboardList} />
                              </div>
                            </CollapsibleContent>
                          )}
                        </Collapsible>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Transitions */}
          <TabsContent value="transitions">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transitions.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transition events.</TableCell></TableRow>
                    ) : transitions.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{t.event_type}</TableCell>
                        <TableCell><Badge variant={critColor(t.severity)} className="text-xs">{t.severity}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{t.transition_summary}</TableCell>
                        <TableCell className="text-xs">{t.continuity_impact}</TableCell>
                        <TableCell>{t.resolved_at ? <Badge variant="outline" className="text-xs">Resolved</Badge> : <Badge variant="destructive" className="text-xs">Open</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          {/* Knowledge Concentration Panel */}
          <TabsContent value="concentration">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Knowledge Concentration Risks</CardTitle>
                <CardDescription className="text-xs">Roles where tacit or explicit knowledge is dangerously concentrated.</CardDescription>
              </CardHeader>
              <CardContent>
                {!assessment?.concentrationRisks || assessment.concentrationRisks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No dangerous concentration detected.</p>
                ) : (
                  <div className="space-y-3">
                    {assessment.concentrationRisks.map((cr, i) => (
                      <div key={i} className={`rounded-md p-3 ${riskColor(cr.riskLevel)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cr.roleName}</span>
                          <Badge variant={critColor(cr.riskLevel)} className="text-xs">{cr.riskLevel}</Badge>
                        </div>
                        <ul className="space-y-0.5">
                          {cr.factors.map((f, j) => (
                            <li key={j} className="text-xs">• {f}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Readiness & Transition Risk Panel */}
          <TabsContent value="readiness">
            <div className="space-y-4">
              {/* Readiness scores */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Succession Readiness Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  {!assessment?.readinessResults || assessment.readinessResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No readiness data.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Owner</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessment.readinessResults.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{r.ownerRef ?? r.roleId}</TableCell>
                            <TableCell className="text-sm font-mono">{r.score}/100</TableCell>
                            <TableCell><Badge variant={r.level === "ready" ? "outline" : critColor(r.level === "fragile" ? "high" : "medium")} className="text-xs capitalize">{r.level}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Transition risks */}
              {assessment?.transitionRisks && assessment.transitionRisks.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Transition Risks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {assessment.transitionRisks.map((tr, i) => (
                        <div key={i} className={`rounded-md p-3 ${riskColor(tr.riskLevel)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{tr.roleName}</span>
                            <Badge variant={critColor(tr.riskLevel)} className="text-xs">{tr.riskLevel}</Badge>
                          </div>
                          <ul className="space-y-0.5">
                            {tr.risks.map((r, j) => (
                              <li key={j} className="text-xs">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

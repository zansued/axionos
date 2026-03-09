import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Users, AlertTriangle, Brain, ArrowRightLeft, ClipboardList } from "lucide-react";

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

export default function StrategicSuccession() {
  const { currentOrg } = useOrg();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [transitions, setTransitions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    setLoading(true);

    const invoke = (action: string, extra: Record<string, unknown> = {}) =>
      supabase.functions.invoke("strategic-succession-long-horizon-continuity", {
        body: { action, organization_id: orgId, ...extra },
      });

    Promise.all([
      invoke("overview"),
      invoke("critical_roles"),
      invoke("continuity_profiles"),
      invoke("succession_plans"),
      invoke("transition_events"),
      invoke("recommendations"),
    ]).then(([ovRes, rRes, pRes, spRes, tRes, recRes]) => {
      if (ovRes.data) setOverview(ovRes.data);
      if (rRes.data) setRoles(Array.isArray(rRes.data) ? rRes.data : []);
      if (pRes.data) setProfiles(Array.isArray(pRes.data) ? pRes.data : []);
      if (spRes.data) setPlans(Array.isArray(spRes.data) ? spRes.data : []);
      if (tRes.data) setTransitions(Array.isArray(tRes.data) ? tRes.data : []);
      if (recRes.data?.recommendations) setRecommendations(recRes.data.recommendations);
      setLoading(false);
    });
  }, [currentOrg]);

  const critColor = (c: string) => {
    switch (c) { case "critical": case "high": return "destructive"; case "medium": return "secondary"; default: return "outline"; }
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Succession</h1>
          <p className="text-muted-foreground text-sm mt-1">Strategic succession & long-horizon institutional continuity governance.</p>
        </div>

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

        <Tabs defaultValue="roles">
          <TabsList className="bg-muted">
            <TabsTrigger value="roles">Critical Roles</TabsTrigger>
            <TabsTrigger value="profiles">Continuity Profiles</TabsTrigger>
            <TabsTrigger value="plans">Succession Plans</TabsTrigger>
            <TabsTrigger value="transitions">Transitions</TabsTrigger>
          </TabsList>

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No critical roles registered.</TableCell></TableRow>
                    ) : roles.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.role_name}</TableCell>
                        <TableCell className="text-sm">{r.domain}</TableCell>
                        <TableCell className="text-xs">{r.role_type}</TableCell>
                        <TableCell><Badge variant={critColor(r.criticality_level)} className="text-xs">{r.criticality_level}</Badge></TableCell>
                        <TableCell className="text-xs">{r.continuity_tier}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

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

          <TabsContent value="plans">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trigger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No succession plans.</TableCell></TableRow>
                    ) : plans.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.plan_code}</TableCell>
                        <TableCell className="text-sm">{p.succession_type}</TableCell>
                        <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs">{p.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{p.trigger_conditions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

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
        </Tabs>
      </div>
    </AppLayout>
  );
}

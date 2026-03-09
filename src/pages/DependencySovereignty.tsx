import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, Link2, Globe, Unplug, Route } from "lucide-react";

interface Overview {
  constitutions: number;
  dependencies: number;
  reliance_links: number;
  assessments: number;
  open_disruptions: number;
  exit_paths: number;
  critical_dependencies: number;
  critical_without_fallback: number;
  high_lock_in: number;
}

export default function DependencySovereignty() {
  const { currentOrg } = useOrg();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [exitPaths, setExitPaths] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    const orgId = currentOrg.id;
    setLoading(true);

    const invoke = (action: string, extra: Record<string, unknown> = {}) =>
      supabase.functions.invoke("dependency-sovereignty-governance", {
        body: { action, organization_id: orgId, ...extra },
      });

    Promise.all([
      invoke("overview"),
      invoke("dependencies"),
      invoke("disruption_events"),
      invoke("exit_paths"),
      invoke("recommendations"),
    ]).then(([ovRes, depRes, disRes, exRes, recRes]) => {
      if (ovRes.data) setOverview(ovRes.data);
      if (depRes.data) setDependencies(Array.isArray(depRes.data) ? depRes.data : []);
      if (disRes.data) setDisruptions(Array.isArray(disRes.data) ? disRes.data : []);
      if (exRes.data) setExitPaths(Array.isArray(exRes.data) ? exRes.data : []);
      if (recRes.data?.recommendations) setRecommendations(recRes.data.recommendations);
      setLoading(false);
    });
  }, [currentOrg]);

  const critColor = (c: string) => {
    switch (c) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sovereignty</h1>
          <p className="text-muted-foreground text-sm mt-1">Dependency sovereignty & external reliance governance.</p>
        </div>

        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Dependencies", value: overview.dependencies, icon: Link2 },
              { label: "Critical", value: overview.critical_dependencies, icon: AlertTriangle },
              { label: "No Fallback", value: overview.critical_without_fallback, icon: Unplug },
              { label: "High Lock-in", value: overview.high_lock_in, icon: Shield },
              { label: "Disruptions", value: overview.open_disruptions, icon: Globe },
              { label: "Exit Paths", value: overview.exit_paths, icon: Route },
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

        <Tabs defaultValue="dependencies">
          <TabsList className="bg-muted">
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="disruptions">Disruptions</TabsTrigger>
            <TabsTrigger value="exit_paths">Exit Paths</TabsTrigger>
          </TabsList>

          <TabsContent value="dependencies">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead>Lock-in</TableHead>
                      <TableHead>Fallback</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dependencies.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No external dependencies registered.</TableCell></TableRow>
                    ) : dependencies.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium text-sm">{d.dependency_name}</TableCell>
                        <TableCell className="text-xs">{d.dependency_type}</TableCell>
                        <TableCell className="text-sm">{d.provider_name}</TableCell>
                        <TableCell><Badge variant={critColor(d.criticality_level)} className="text-xs">{d.criticality_level}</Badge></TableCell>
                        <TableCell><Badge variant={critColor(d.lock_in_risk_level)} className="text-xs">{d.lock_in_risk_level}</Badge></TableCell>
                        <TableCell>{d.fallback_exists ? <Badge variant="outline" className="text-xs">Yes</Badge> : <Badge variant="destructive" className="text-xs">No</Badge>}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{d.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="disruptions">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Continuity Effect</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disruptions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No disruption events recorded.</TableCell></TableRow>
                    ) : disruptions.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm">{d.disruption_type}</TableCell>
                        <TableCell><Badge variant={critColor(d.severity)} className="text-xs">{d.severity}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{d.event_summary}</TableCell>
                        <TableCell className="text-xs">{d.continuity_effect}</TableCell>
                        <TableCell>{d.resolved_at ? <Badge variant="outline" className="text-xs">Resolved</Badge> : <Badge variant="destructive" className="text-xs">Open</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="exit_paths">
            <Card className="bg-card border-border">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exit Type</TableHead>
                      <TableHead>Feasibility</TableHead>
                      <TableHead>Switch Cost</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exitPaths.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No exit paths modeled.</TableCell></TableRow>
                    ) : exitPaths.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.exit_type}</TableCell>
                        <TableCell className="text-sm">{Math.round((e.feasibility_score ?? 0) * 100)}%</TableCell>
                        <TableCell className="text-sm">{e.estimated_switch_cost || "—"}</TableCell>
                        <TableCell className="text-sm">{e.timeline_estimate || "—"}</TableCell>
                        <TableCell>{e.active ? <Badge variant="outline" className="text-xs">Active</Badge> : "—"}</TableCell>
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

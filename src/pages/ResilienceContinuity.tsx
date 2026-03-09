import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Shield, ShieldAlert, AlertTriangle, Activity, Eye, FileCheck, Zap, Link2, Server, Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

const MOCK_ASSETS = [
  { id: "1", asset_code: "SVC-AUTH", asset_name: "Authentication Service", asset_type: "service", domain: "platform", criticality_level: "critical", continuity_tier: "tier-1" },
  { id: "2", asset_code: "PROC-PIPELINE", asset_name: "Delivery Pipeline", asset_type: "process", domain: "delivery", criticality_level: "critical", continuity_tier: "tier-1" },
  { id: "3", asset_code: "MEM-INST", asset_name: "Institutional Memory", asset_type: "memory", domain: "intelligence", criticality_level: "high", continuity_tier: "tier-2" },
  { id: "4", asset_code: "POL-DOCTRINE", asset_name: "Doctrine Engine", asset_type: "policy", domain: "governance", criticality_level: "high", continuity_tier: "tier-2" },
  { id: "5", asset_code: "INT-AI-GW", asset_name: "AI Gateway", asset_type: "integration", domain: "platform", criticality_level: "critical", continuity_tier: "tier-1" },
];

const MOCK_PLANS = [
  { id: "1", plan_code: "CP-AUTH-FAIL", domain: "platform", disruption_type: "service_failure", plan_status: "active", plan_summary: "Fallback to cached tokens + degraded mode" },
  { id: "2", plan_code: "CP-PIPELINE-HALT", domain: "delivery", disruption_type: "process_disruption", plan_status: "active", plan_summary: "Queue pending work, notify operators, hold gates" },
  { id: "3", plan_code: "CP-MEMORY-LOSS", domain: "intelligence", disruption_type: "data_degradation", plan_status: "draft", plan_summary: "Restore from snapshots, rebuild summaries" },
];

const MOCK_INCIDENTS = [
  { id: "1", incident_code: "INC-042", domain: "platform", disruption_type: "service_failure", severity: "high", incident_status: "open", incident_summary: "AI Gateway intermittent failures", continuity_plan_id: null },
  { id: "2", incident_code: "INC-041", domain: "delivery", disruption_type: "process_disruption", severity: "medium", incident_status: "resolved", incident_summary: "Pipeline queue backup resolved", continuity_plan_id: "2", resolved_at: new Date().toISOString() },
];

function criticalityBadge(level: string) {
  if (level === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (level === "high") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>;
  if (level === "medium") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Medium</Badge>;
  return <Badge variant="secondary">Low</Badge>;
}

function statusBadge(status: string) {
  if (status === "active") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
  if (status === "open") return <Badge variant="destructive">Open</Badge>;
  if (status === "resolved") return <Badge variant="secondary">Resolved</Badge>;
  if (status === "draft") return <Badge variant="outline">Draft</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function assetTypeIcon(type: string) {
  const icons: Record<string, typeof Server> = { service: Server, process: Activity, memory: Brain, policy: FileCheck, integration: Link2 };
  const Icon = icons[type] || Zap;
  return <Icon className="h-4 w-4 text-muted-foreground" />;
}

export default function ResilienceContinuity() {
  const { currentOrg } = useOrg();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<"asset" | "plan" | "incident">("asset");
  const orgId = currentOrg?.id;

  const { data: assetsData } = useQuery({
    queryKey: ["continuity-assets", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("continuity_assets").select("*").eq("organization_id", orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: plansData } = useQuery({
    queryKey: ["continuity-plans", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("continuity_plans").select("*").eq("organization_id", orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: incidentsData } = useQuery({
    queryKey: ["continuity-incidents", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("continuity_incidents").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!orgId,
  });

  const assets = assetsData?.length ? assetsData : MOCK_ASSETS;
  const plans = plansData?.length ? plansData : MOCK_PLANS;
  const incidents = incidentsData?.length ? incidentsData : MOCK_INCIDENTS;

  const criticalCount = assets.filter((a: any) => a.criticality_level === "critical").length;
  const activePlans = plans.filter((p: any) => p.plan_status === "active").length;
  const openIncidents = incidents.filter((i: any) => i.incident_status === "open").length;
  const uncoveredIncidents = incidents.filter((i: any) => i.incident_status === "open" && !i.continuity_plan_id).length;
  const coveragePercent = openIncidents > 0 ? Math.round(((openIncidents - uncoveredIncidents) / openIncidents) * 100) : 100;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resilience & Continuity Governance</h1>
          <p className="text-muted-foreground">Map fragilities, plan continuity, and govern institutional resilience.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Server className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{assets.length}</p>
            <p className="text-xs text-muted-foreground">Assets</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <FileCheck className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-2xl font-bold">{activePlans}</p>
            <p className="text-xs text-muted-foreground">Active Plans</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-400" />
            <p className="text-2xl font-bold">{openIncidents}</p>
            <p className="text-xs text-muted-foreground">Open Incidents</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Zap className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{uncoveredIncidents}</p>
            <p className="text-xs text-muted-foreground">Uncovered</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{coveragePercent}%</p>
            <Progress value={coveragePercent} className="mt-1 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Coverage</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assets">Critical Assets</TabsTrigger>
            <TabsTrigger value="plans">Continuity Plans</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle>Critical Assets & Dependencies</CardTitle>
                <CardDescription>Services, processes, memory, policies, and integrations mapped by criticality</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Criticality</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>{assetTypeIcon(a.asset_type)}</TableCell>
                        <TableCell className="font-mono text-xs">{a.asset_code}</TableCell>
                        <TableCell className="text-sm">{a.asset_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.domain}</TableCell>
                        <TableCell>{criticalityBadge(a.criticality_level)}</TableCell>
                        <TableCell className="text-xs">{a.continuity_tier}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(a); setDetailType("asset"); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>Continuity Plans</CardTitle>
                <CardDescription>Fallback and recovery sequences by domain and disruption type</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Disruption Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.plan_code}</TableCell>
                        <TableCell className="text-xs">{p.domain}</TableCell>
                        <TableCell className="text-xs">{p.disruption_type}</TableCell>
                        <TableCell>{statusBadge(p.plan_status)}</TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate">{p.plan_summary}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(p); setDetailType("plan"); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <CardTitle>Continuity Incidents</CardTitle>
                <CardDescription>Disruptions tracked and linked to continuity plans</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Disruption</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.incident_code}</TableCell>
                        <TableCell className="text-xs">{i.domain}</TableCell>
                        <TableCell className="text-xs">{i.disruption_type}</TableCell>
                        <TableCell>{criticalityBadge(i.severity)}</TableCell>
                        <TableCell>{statusBadge(i.incident_status)}</TableCell>
                        <TableCell>
                          {i.continuity_plan_id
                            ? <Badge variant="secondary" className="gap-1"><Link2 className="h-3 w-3" />Linked</Badge>
                            : <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />None</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(i); setDetailType("incident"); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Sheet */}
        <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedItem && detailType === "asset" && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">{assetTypeIcon(selectedItem.asset_type)} {selectedItem.asset_name}</SheetTitle>
                  <SheetDescription>Asset {selectedItem.asset_code}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground mb-1">Domain</p><p className="text-sm">{selectedItem.domain}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Criticality</p>{criticalityBadge(selectedItem.criticality_level)}</div>
                    <div><p className="text-xs text-muted-foreground mb-1">Type</p><p className="text-sm capitalize">{selectedItem.asset_type}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Continuity Tier</p><p className="text-sm">{selectedItem.continuity_tier}</p></div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Governance Note</p>
                    <p className="text-sm">This asset is classified as {selectedItem.criticality_level} criticality. Disruptions require immediate response and an active continuity plan.</p>
                  </div>
                </div>
              </>
            )}
            {selectedItem && detailType === "plan" && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" /> {selectedItem.plan_code}</SheetTitle>
                  <SheetDescription>Continuity Plan — {selectedItem.domain}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div><p className="text-xs text-muted-foreground mb-1">Disruption Type</p><p className="text-sm">{selectedItem.disruption_type}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Status</p>{statusBadge(selectedItem.plan_status)}</div>
                  <div><p className="text-xs text-muted-foreground mb-1">Summary</p><p className="text-sm">{selectedItem.plan_summary}</p></div>
                </div>
              </>
            )}
            {selectedItem && detailType === "incident" && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> {selectedItem.incident_code}</SheetTitle>
                  <SheetDescription>Incident — {selectedItem.domain}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground mb-1">Severity</p>{criticalityBadge(selectedItem.severity)}</div>
                    <div><p className="text-xs text-muted-foreground mb-1">Status</p>{statusBadge(selectedItem.incident_status)}</div>
                  </div>
                  <div><p className="text-xs text-muted-foreground mb-1">Summary</p><p className="text-sm">{selectedItem.incident_summary}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Continuity Plan</p>
                    {selectedItem.continuity_plan_id
                      ? <Badge variant="secondary">Linked</Badge>
                      : <p className="text-sm text-destructive">No plan linked — maturity gap detected.</p>
                    }
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldAlert, ArrowRightLeft, Eye, AlertTriangle, CheckCircle2, XCircle, Lock, Unlock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

// Mock data for display when no real data exists
const MOCK_BOUNDARIES = [
  { id: "1", boundary_code: "TENANT-CORE", source_scope: "tenant_alpha", target_scope: "tenant_beta", boundary_type: "hard", boundary_status: "active", description: "Hard isolation between tenant workspaces" },
  { id: "2", boundary_code: "DOMAIN-LEARN", source_scope: "learning_layer", target_scope: "execution_kernel", boundary_type: "controlled", boundary_status: "active", description: "Controlled boundary for learning signals to execution" },
  { id: "3", boundary_code: "METRICS-AGG", source_scope: "workspace_ops", target_scope: "platform_analytics", boundary_type: "aggregate_only", boundary_status: "active", description: "Aggregate-only metrics sharing" },
  { id: "4", boundary_code: "ADVISORY-FEED", source_scope: "calibration_layer", target_scope: "strategy_evolution", boundary_type: "advisory", boundary_status: "active", description: "Advisory boundary for calibration recommendations" },
];

const MOCK_TRANSFERS = [
  { id: "1", signal_type: "performance_metrics", transfer_decision: "transformed", transformation_type: "aggregation", reason_summary: "Policy requires aggregation before crossing.", source_entity: "workspace_ops", target_entity: "platform_analytics", created_at: new Date().toISOString() },
  { id: "2", signal_type: "error_patterns", transfer_decision: "allowed", transformation_type: null, reason_summary: "Policy allows this transfer.", source_entity: "learning_layer", target_entity: "execution_kernel", created_at: new Date().toISOString() },
  { id: "3", signal_type: "raw_user_data", transfer_decision: "denied", transformation_type: null, reason_summary: "Hard boundary blocks all transfers.", source_entity: "tenant_alpha", target_entity: "tenant_beta", created_at: new Date().toISOString() },
  { id: "4", signal_type: "tenant_config", transfer_decision: "escalated", transformation_type: null, reason_summary: "Transfer requires human review.", source_entity: "calibration_layer", target_entity: "strategy_evolution", created_at: new Date().toISOString() },
];

const MOCK_VIOLATIONS = [
  { id: "1", violation_type: "hard_boundary_bypass", severity: "critical", event_summary: "Attempt to bypass hard boundary between tenant_alpha and tenant_beta.", created_at: new Date().toISOString(), resolved_at: null },
  { id: "2", violation_type: "aggregate_boundary_raw_transfer", severity: "high", event_summary: "High-sensitivity signal transferred raw through aggregate-only boundary.", created_at: new Date().toISOString(), resolved_at: null },
];

function boundaryTypeBadge(type: string) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Shield }> = {
    hard: { variant: "destructive", icon: Lock },
    controlled: { variant: "default", icon: Shield },
    advisory: { variant: "secondary", icon: Eye },
    aggregate_only: { variant: "outline", icon: ArrowRightLeft },
  };
  const v = variants[type] || variants.controlled;
  const Icon = v.icon;
  return <Badge variant={v.variant} className="gap-1"><Icon className="h-3 w-3" />{type.replace("_", " ")}</Badge>;
}

function decisionBadge(decision: string) {
  if (decision === "allowed") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />Allowed</Badge>;
  if (decision === "denied") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Denied</Badge>;
  if (decision === "transformed") return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1"><ArrowRightLeft className="h-3 w-3" />Transformed</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><AlertTriangle className="h-3 w-3" />Escalated</Badge>;
}

function severityBadge(severity: string) {
  if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (severity === "high") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>;
  if (severity === "moderate") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Moderate</Badge>;
  return <Badge variant="secondary">Low</Badge>;
}

export default function FederatedBoundaries() {
  const { currentOrg } = useOrg();
  const [selectedBoundary, setSelectedBoundary] = useState<any>(null);
  const orgId = currentOrg?.id;

  const { data: boundariesData } = useQuery({
    queryKey: ["federated-boundaries", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("federated_boundaries").select("*").eq("organization_id", orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: transfersData } = useQuery({
    queryKey: ["federated-transfers", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("federated_transfer_events").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: violationsData } = useQuery({
    queryKey: ["boundary-violations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("boundary_violation_events").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!orgId,
  });

  const boundaries = boundariesData?.length ? boundariesData : MOCK_BOUNDARIES;
  const transfers = transfersData?.length ? transfersData : MOCK_TRANSFERS;
  const violations = violationsData?.length ? violationsData : MOCK_VIOLATIONS;

  const stats = {
    total: boundaries.length,
    hard: boundaries.filter((b: any) => b.boundary_type === "hard").length,
    allowed: transfers.filter((t: any) => t.transfer_decision === "allowed").length,
    denied: transfers.filter((t: any) => t.transfer_decision === "denied").length,
    transformed: transfers.filter((t: any) => t.transfer_decision === "transformed").length,
    violations: violations.length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Federated Intelligence Boundaries</h1>
          <p className="text-muted-foreground">Control what crosses boundaries, at what level, with which restrictions and under which guarantees.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Boundaries</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Lock className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{stats.hard}</p>
            <p className="text-xs text-muted-foreground">Hard</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-2xl font-bold">{stats.allowed}</p>
            <p className="text-xs text-muted-foreground">Allowed</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{stats.denied}</p>
            <p className="text-xs text-muted-foreground">Denied</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <ArrowRightLeft className="h-5 w-5 mx-auto mb-1 text-blue-400" />
            <p className="text-2xl font-bold">{stats.transformed}</p>
            <p className="text-xs text-muted-foreground">Transformed</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-amber-400" />
            <p className="text-2xl font-bold">{stats.violations}</p>
            <p className="text-xs text-muted-foreground">Violations</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="boundaries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="boundaries">Boundary Map</TabsTrigger>
            <TabsTrigger value="transfers">Transfer Decisions</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
          </TabsList>

          {/* Boundaries Tab */}
          <TabsContent value="boundaries">
            <Card>
              <CardHeader>
                <CardTitle>Federated Boundaries</CardTitle>
                <CardDescription>Source → Target boundaries with type and governance posture</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boundaries.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.boundary_code}</TableCell>
                        <TableCell className="text-xs">{b.source_scope}</TableCell>
                        <TableCell className="text-xs">{b.target_scope}</TableCell>
                        <TableCell>{boundaryTypeBadge(b.boundary_type)}</TableCell>
                        <TableCell><Badge variant={b.boundary_status === "active" ? "default" : "secondary"}>{b.boundary_status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedBoundary(b)}>
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

          {/* Transfers Tab */}
          <TabsContent value="transfers">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Decision Log</CardTitle>
                <CardDescription>Recent signal transfer decisions with justifications</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Signal</TableHead>
                      <TableHead>From → To</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Transformation</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.signal_type}</TableCell>
                        <TableCell className="text-xs">{t.source_entity} → {t.target_entity}</TableCell>
                        <TableCell>{decisionBadge(t.transfer_decision)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.transformation_type || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate">{t.reason_summary}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle>Boundary Violations</CardTitle>
                <CardDescription>Detected attempts to cross boundaries improperly</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.violation_type}</TableCell>
                        <TableCell>{severityBadge(v.severity)}</TableCell>
                        <TableCell className="text-xs max-w-[400px]">{v.event_summary}</TableCell>
                        <TableCell>
                          {v.resolved_at
                            ? <Badge variant="secondary">Resolved</Badge>
                            : <Badge variant="destructive">Open</Badge>
                          }
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
        <Sheet open={!!selectedBoundary} onOpenChange={() => setSelectedBoundary(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedBoundary && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {selectedBoundary.boundary_code}
                  </SheetTitle>
                  <SheetDescription>{selectedBoundary.description}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Source Scope</p>
                      <p className="text-sm font-mono">{selectedBoundary.source_scope}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Target Scope</p>
                      <p className="text-sm font-mono">{selectedBoundary.target_scope}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Boundary Type</p>
                    {boundaryTypeBadge(selectedBoundary.boundary_type)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Governance Posture</p>
                    <p className="text-sm">
                      {selectedBoundary.boundary_type === "hard" && "All transfers blocked. No exceptions without boundary reclassification."}
                      {selectedBoundary.boundary_type === "controlled" && "Transfers allowed only with explicit policy. Default: deny."}
                      {selectedBoundary.boundary_type === "advisory" && "Transfers allowed with review. Signals are monitored for compliance."}
                      {selectedBoundary.boundary_type === "aggregate_only" && "Only aggregated/anonymized data may cross. Raw data prohibited."}
                    </p>
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

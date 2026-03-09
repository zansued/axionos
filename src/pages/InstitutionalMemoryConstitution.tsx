import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Shield, AlertTriangle, Eye, Brain, Archive, Clock, FileWarning, Star, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

const MOCK_CLASSES = [
  { id: "1", class_code: "MEM-CRIT", class_name: "Critical Institutional", class_type: "critical", retention_level: "permanent", reconstruction_required: true, deletion_requires_review: true, description: "Memory that the institution cannot afford to lose." },
  { id: "2", class_code: "MEM-PREC", class_name: "Protected Precedent", class_type: "precedent", retention_level: "permanent", reconstruction_required: true, deletion_requires_review: true, description: "Decisions and resolutions that set institutional precedent." },
  { id: "3", class_code: "MEM-OPS", class_name: "Operational", class_type: "operational", retention_level: "long_term", reconstruction_required: false, deletion_requires_review: true, description: "Active operational knowledge for daily governance." },
  { id: "4", class_code: "MEM-TEMP", class_name: "Temporary Working", class_type: "temporary", retention_level: "short_term", reconstruction_required: false, deletion_requires_review: false, description: "Short-lived working context." },
  { id: "5", class_code: "MEM-DISP", class_name: "Disposable", class_type: "disposable", retention_level: "ephemeral", reconstruction_required: false, deletion_requires_review: false, description: "Transient data safe to discard." },
  { id: "6", class_code: "MEM-RECON", class_name: "Reconstructable", class_type: "reconstructable", retention_level: "bounded", reconstruction_required: true, deletion_requires_review: true, description: "Memory that can be rebuilt from source materials." },
];

const MOCK_ASSETS = [
  { id: "1", memory_code: "MA-001", title: "Architecture Decision: Multi-tenant Isolation Model", class_type: "precedent", sensitivity_level: "high", precedent_weight: 0.92, current_status: "protected", domain: "architecture", retention_deadline: null },
  { id: "2", memory_code: "MA-002", title: "Doctrine: Governance Before Autonomy", class_type: "critical", sensitivity_level: "critical", precedent_weight: 0.95, current_status: "active", domain: "governance", retention_deadline: null },
  { id: "3", memory_code: "MA-003", title: "Conflict Resolution: Policy vs Strategy Priority", class_type: "precedent", sensitivity_level: "high", precedent_weight: 0.78, current_status: "active", domain: "conflicts", retention_deadline: null },
  { id: "4", memory_code: "MA-004", title: "Sprint 87 Execution Metrics", class_type: "operational", sensitivity_level: "standard", precedent_weight: 0.2, current_status: "active", domain: "delivery", retention_deadline: "2026-06-15T00:00:00Z" },
  { id: "5", memory_code: "MA-005", title: "Debug Session: Pipeline Timeout Issue", class_type: "temporary", sensitivity_level: "low", precedent_weight: 0.05, current_status: "active", domain: "operations", retention_deadline: "2026-04-01T00:00:00Z" },
];

const MOCK_LOSS_EVENTS = [
  { id: "1", loss_type: "broken_lineage", severity: "high", event_summary: "Memory MA-006 source reference broken after schema migration.", recoverability_level: "partially_recoverable", created_at: new Date().toISOString(), resolved_at: null },
];

function classTypeBadge(type: string) {
  const map: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; icon: typeof Shield }> = {
    critical: { variant: "destructive", icon: Shield },
    precedent: { variant: "default", icon: Star },
    operational: { variant: "secondary", icon: Layers },
    temporary: { variant: "outline", icon: Clock },
    disposable: { variant: "outline", icon: Archive },
    reconstructable: { variant: "secondary", icon: Brain },
  };
  const v = map[type] || map.operational;
  const Icon = v.icon;
  return <Badge variant={v.variant} className="gap-1"><Icon className="h-3 w-3" />{type}</Badge>;
}

function statusBadge(status: string) {
  if (status === "protected") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1"><Shield className="h-3 w-3" />Protected</Badge>;
  if (status === "active") return <Badge variant="default">Active</Badge>;
  if (status === "archived") return <Badge variant="secondary">Archived</Badge>;
  if (status === "expired") return <Badge variant="outline">Expired</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function severityBadge(sev: string) {
  if (sev === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (sev === "high") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>;
  return <Badge variant="secondary">{sev}</Badge>;
}

export default function InstitutionalMemoryConstitution() {
  const { currentOrg } = useOrg();
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const orgId = currentOrg?.id;

  const { data: classesData } = useQuery({
    queryKey: ["memory-classes", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("memory_asset_classes").select("*").eq("organization_id", orgId);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: assetsData } = useQuery({
    queryKey: ["memory-assets", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("institutional_memory_assets").select("*").eq("organization_id", orgId).order("precedent_weight", { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: lossData } = useQuery({
    queryKey: ["memory-loss-events", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase.from("memory_loss_events").select("*").eq("organization_id", orgId).is("resolved_at", null);
      return data || [];
    },
    enabled: !!orgId,
  });

  const classes = classesData?.length ? classesData : MOCK_CLASSES;
  const assets = assetsData?.length ? assetsData : MOCK_ASSETS;
  const lossEvents = lossData?.length ? lossData : MOCK_LOSS_EVENTS;

  const protectedCount = assets.filter((a: any) => a.current_status === "protected" || a.precedent_weight >= 0.7).length;
  const expiringSoon = assets.filter((a: any) => {
    if (!a.retention_deadline) return false;
    const days = (new Date(a.retention_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 30;
  }).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Institutional Memory Constitution</h1>
          <p className="text-muted-foreground">Govern what the institution must remember, may forget, and can reconstruct.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{assets.length}</p>
            <p className="text-xs text-muted-foreground">Memory Assets</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Layers className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{classes.length}</p>
            <p className="text-xs text-muted-foreground">Classes</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-2xl font-bold">{protectedCount}</p>
            <p className="text-xs text-muted-foreground">Protected</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-400" />
            <p className="text-2xl font-bold">{expiringSoon}</p>
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <FileWarning className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{lossEvents.length}</p>
            <p className="text-xs text-muted-foreground">Loss Events</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Star className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{protectedCount > 0 ? Math.round((protectedCount / Math.max(assets.length, 1)) * 100) : 0}%</p>
            <Progress value={protectedCount > 0 ? (protectedCount / Math.max(assets.length, 1)) * 100 : 0} className="mt-1 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Precedent Coverage</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assets">Memory Assets</TabsTrigger>
            <TabsTrigger value="classes">Class Matrix</TabsTrigger>
            <TabsTrigger value="loss">Loss Events</TabsTrigger>
          </TabsList>

          <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle>Institutional Memory Assets</CardTitle>
                <CardDescription>Classified by constitutional importance, precedent weight, and retention posture</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Precedent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.memory_code}</TableCell>
                        <TableCell className="text-sm max-w-[250px] truncate">{a.title}</TableCell>
                        <TableCell>{classTypeBadge(a.class_type || "operational")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={a.precedent_weight * 100} className="w-16 h-1.5" />
                            <span className="text-xs text-muted-foreground">{(a.precedent_weight * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(a.current_status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.domain}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedAsset(a)}>
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

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>Memory Class Matrix</CardTitle>
                <CardDescription>Constitutional classification with retention rules and governance controls</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Retention</TableHead>
                      <TableHead>Reconstruction</TableHead>
                      <TableHead>Deletion Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.class_code}</TableCell>
                        <TableCell className="text-sm">{c.class_name}</TableCell>
                        <TableCell>{classTypeBadge(c.class_type)}</TableCell>
                        <TableCell><Badge variant="outline">{c.retention_level}</Badge></TableCell>
                        <TableCell>{c.reconstruction_required ? <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                        <TableCell>{c.deletion_requires_review ? <Badge variant="destructive">Required</Badge> : <span className="text-xs text-muted-foreground">Not required</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loss">
            <Card>
              <CardHeader>
                <CardTitle>Memory Loss Events</CardTitle>
                <CardDescription>Detected loss, decay, fragmentation, or broken lineage</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Recoverability</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lossEvents.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.loss_type}</TableCell>
                        <TableCell>{severityBadge(e.severity)}</TableCell>
                        <TableCell className="text-xs max-w-[350px]">{e.event_summary}</TableCell>
                        <TableCell><Badge variant="outline">{e.recoverability_level}</Badge></TableCell>
                        <TableCell>{e.resolved_at ? <Badge variant="secondary">Resolved</Badge> : <Badge variant="destructive">Open</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Sheet */}
        <Sheet open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedAsset && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    {selectedAsset.title}
                  </SheetTitle>
                  <SheetDescription>Memory Asset {selectedAsset.memory_code}</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground mb-1">Class</p>{classTypeBadge(selectedAsset.class_type || "operational")}</div>
                    <div><p className="text-xs text-muted-foreground mb-1">Status</p>{statusBadge(selectedAsset.current_status)}</div>
                    <div><p className="text-xs text-muted-foreground mb-1">Domain</p><p className="text-sm">{selectedAsset.domain}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">Sensitivity</p><Badge variant="outline">{selectedAsset.sensitivity_level}</Badge></div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Precedent Weight</p>
                    <div className="flex items-center gap-3">
                      <Progress value={selectedAsset.precedent_weight * 100} className="flex-1 h-2" />
                      <span className="text-sm font-medium">{(selectedAsset.precedent_weight * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedAsset.precedent_weight >= 0.7
                        ? "High precedent — informs institutional decision-making. Must be preserved."
                        : selectedAsset.precedent_weight >= 0.3
                        ? "Moderate precedent — may be relevant for future reference."
                        : "Low precedent weight."
                      }
                    </p>
                  </div>

                  {selectedAsset.retention_deadline && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Retention Deadline</p>
                      <p className="text-sm">{new Date(selectedAsset.retention_deadline).toLocaleDateString()}</p>
                    </div>
                  )}

                  <div className="rounded-lg border p-4 bg-muted/30">
                    <p className="text-xs font-medium mb-2">Governance Guidance</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAsset.current_status === "protected"
                        ? "This memory is constitutionally protected. Deletion blocked. Changes require audit trail."
                        : selectedAsset.precedent_weight >= 0.7
                        ? "High-precedent memory. Deletion requires human review. Reconstruction paths should be maintained."
                        : "Standard governance applies per retention policy."
                      }
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

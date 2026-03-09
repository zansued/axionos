import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageGuidanceShell } from "@/components/guidance";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Package, Shield, CheckCircle, XCircle, RotateCcw, AlertTriangle,
  Eye, Power, PowerOff, Clock, Info, Layers, Radio, Settings, Workflow,
} from "lucide-react";

type ExtAction = "activate" | "approve" | "reject" | "deactivate" | "rollback" | "check_compatibility";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-muted text-muted-foreground",
  installed: "bg-primary/10 text-primary border-primary/20",
  deprecated: "bg-destructive/10 text-destructive border-destructive/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const ACTIVATION_COLORS: Record<string, string> = {
  pending_approval: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground",
  rolled_back: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-500",
  moderate: "text-yellow-500",
  high: "text-orange-500",
  critical: "text-destructive",
};

const CATEGORY_ICONS: Record<string, typeof Package> = {
  integration: Package,
  capability: Layers,
  provider: Radio,
  workflow: Workflow,
  observability: Eye,
  governance: Shield,
};

export default function Extensions() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedExt, setSelectedExt] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ ext: any; action: ExtAction; activationId?: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [compatResult, setCompatResult] = useState<any>(null);
  const [tab, setTab] = useState("all");

  const { data: extensionsData, isLoading, error: queryError } = useQuery({
    queryKey: ["platform-extensions", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("extension-management", {
        body: { action: "list", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data?.extensions || [];
    },
    enabled: !!currentOrg?.id,
  });

  const { data: auditEvents } = useQuery({
    queryKey: ["extension-audit", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extension_audit_events" as any)
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentOrg?.id,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, extension_id, activation_id, notesVal }: { action: ExtAction; extension_id?: string; activation_id?: string; notesVal?: string }) => {
      const { data, error } = await supabase.functions.invoke("extension-management", {
        body: { action, extension_id, activation_id, organization_id: currentOrg!.id, notes: notesVal },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, vars) => {
      if (vars.action === "check_compatibility") {
        setCompatResult(data.compatibility);
        toast.success("Compatibility check complete");
      } else {
        toast.success(`Extension ${vars.action} successful`);
        setActionDialog(null);
        setNotes("");
      }
      queryClient.invalidateQueries({ queryKey: ["platform-extensions"] });
      queryClient.invalidateQueries({ queryKey: ["extension-audit"] });
    },
    onError: (e) => toast.error(`Action failed: ${e.message}`),
  });

  const extensions = extensionsData || [];
  const getActivation = (ext: any) => {
    const acts = ext.extension_activations || [];
    return acts.find((a: any) => a.activation_status === "active" || a.activation_status === "pending_approval") || acts[0];
  };

  const filteredExtensions = tab === "all" ? extensions
    : tab === "active" ? extensions.filter((e: any) => getActivation(e)?.activation_status === "active")
    : tab === "pending" ? extensions.filter((e: any) => getActivation(e)?.activation_status === "pending_approval")
    : extensions;

  const counts = {
    all: extensions.length,
    active: extensions.filter((e: any) => getActivation(e)?.activation_status === "active").length,
    pending: extensions.filter((e: any) => getActivation(e)?.activation_status === "pending_approval").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageGuidanceShell pageKey="extensions" />
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Platform Extensions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governed platform extensions with approval-based activation, compatibility checks, and rollback posture.
          </p>
        </div>

        {/* Safety Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-start gap-3">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Governed Extensibility.</span>{" "}
              All extensions require human approval before activation. No extension can mutate pipeline topology, core governance, or tenant isolation. Full audit trail and rollback capability preserved.
            </p>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Available", value: counts.all, icon: Package },
            { label: "Active", value: counts.active, icon: CheckCircle },
            { label: "Pending Approval", value: counts.pending, icon: Clock },
            { label: "Audit Events", value: auditEvents?.length || 0, icon: Shield },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          {/* Extensions List */}
          <TabsContent value="all" className="space-y-3 mt-4">
            {renderExtensionList(filteredExtensions)}
          </TabsContent>
          <TabsContent value="active" className="space-y-3 mt-4">
            {renderExtensionList(filteredExtensions)}
          </TabsContent>
          <TabsContent value="pending" className="space-y-3 mt-4">
            {renderExtensionList(filteredExtensions)}
          </TabsContent>

          {/* Audit Trail */}
          <TabsContent value="audit" className="space-y-2 mt-4">
            {!auditEvents?.length ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No audit events yet.</CardContent></Card>
            ) : (
              auditEvents.map((evt: any) => (
                <Card key={evt.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{evt.event_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evt.created_at).toLocaleString()}
                        {evt.event_details?.notes && ` — ${evt.event_details.notes}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{evt.event_type}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Loading / Error */}
        {isLoading && (
          <div className="space-y-3">{[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></CardContent></Card>
          ))}</div>
        )}
        {queryError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Failed to load extensions: {String((queryError as Error)?.message)}</p>
            </CardContent>
          </Card>
        )}

        {/* Extension Detail Drawer */}
        <Dialog open={!!selectedExt} onOpenChange={() => { setSelectedExt(null); setCompatResult(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedExt && (() => { const Icon = CATEGORY_ICONS[selectedExt.category] || Package; return <Icon className="h-5 w-5 text-primary" />; })()}
                {selectedExt?.extension_name}
              </DialogTitle>
            </DialogHeader>
            {selectedExt && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedExt.description}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> <Badge variant="outline">{selectedExt.category}</Badge></div>
                  <div><span className="text-muted-foreground">Version:</span> <span className="font-mono">{selectedExt.version}</span></div>
                  <div><span className="text-muted-foreground">Risk:</span> <span className={RISK_COLORS[selectedExt.risk_level] || ""}>{selectedExt.risk_level}</span></div>
                  <div><span className="text-muted-foreground">Rollback:</span> {selectedExt.rollback_ready ? <CheckCircle className="h-4 w-4 text-emerald-500 inline" /> : <XCircle className="h-4 w-4 text-destructive inline" />}</div>
                  <div><span className="text-muted-foreground">Author:</span> {selectedExt.author}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={STATUS_COLORS[selectedExt.status]}>{selectedExt.status}</Badge></div>
                </div>

                {/* Permissions */}
                {selectedExt.permissions_required?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Required Permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {(selectedExt.permissions_required as string[]).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affected Surfaces */}
                {selectedExt.affected_surfaces?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Affected Surfaces</p>
                    <div className="flex flex-wrap gap-1">
                      {(selectedExt.affected_surfaces as string[]).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compatibility Result */}
                {compatResult && (
                  <Card className="border-primary/20">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-xs font-medium">Compatibility Check</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Score: <span className="font-bold">{compatResult.score}</span></div>
                        <div>Risk: <span className={RISK_COLORS[compatResult.risk_assessment]}>{compatResult.risk_assessment}</span></div>
                        <div>Requirements met: {compatResult.requirements_met ? "✅" : "❌"}</div>
                      </div>
                      {compatResult.conflicts?.length > 0 && (
                        <div className="text-xs text-destructive">
                          {compatResult.conflicts.map((c: string, i: number) => <p key={i}>⚠ {c}</p>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => actionMutation.mutate({ action: "check_compatibility", extension_id: selectedExt.id })} disabled={actionMutation.isPending}>
                    <Info className="h-3 w-3 mr-1" /> Check Compatibility
                  </Button>
                  {(() => {
                    const act = getActivation(selectedExt);
                    if (!act || act.activation_status === "inactive" || act.activation_status === "rejected" || act.activation_status === "rolled_back") {
                      return <Button size="sm" onClick={() => setActionDialog({ ext: selectedExt, action: "activate" })}><Power className="h-3 w-3 mr-1" /> Request Activation</Button>;
                    }
                    if (act.activation_status === "pending_approval") {
                      return (
                        <>
                          <Button size="sm" onClick={() => setActionDialog({ ext: selectedExt, action: "approve", activationId: act.id })}><CheckCircle className="h-3 w-3 mr-1" /> Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => setActionDialog({ ext: selectedExt, action: "reject", activationId: act.id })}><XCircle className="h-3 w-3 mr-1" /> Reject</Button>
                        </>
                      );
                    }
                    if (act.activation_status === "active") {
                      return (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setActionDialog({ ext: selectedExt, action: "deactivate", activationId: act.id })}><PowerOff className="h-3 w-3 mr-1" /> Deactivate</Button>
                          <Button size="sm" variant="outline" onClick={() => setActionDialog({ ext: selectedExt, action: "rollback", activationId: act.id })}><RotateCcw className="h-3 w-3 mr-1" /> Rollback</Button>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Action Confirmation Dialog */}
        <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setNotes(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="capitalize">{actionDialog?.action?.replace("_", " ")} Extension</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{actionDialog?.ext?.extension_name}</p>
            {actionDialog?.action === "activate" && (
              <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded p-2">
                This will create an activation request requiring admin approval. No changes take effect until approved.
              </p>
            )}
            {actionDialog?.action === "rollback" && (
              <p className="text-xs text-orange-600 bg-orange-500/5 border border-orange-500/20 rounded p-2">
                This will rollback the extension to its pre-activation state. The extension will be marked as rolled back.
              </p>
            )}
            <Textarea placeholder="Notes (optional)..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setActionDialog(null); setNotes(""); }}>Cancel</Button>
              <Button
                onClick={() => actionDialog && actionMutation.mutate({
                  action: actionDialog.action,
                  extension_id: actionDialog.ext.id,
                  activation_id: actionDialog.activationId,
                  notesVal: notes,
                })}
                disabled={actionMutation.isPending}
              >
                Confirm {actionDialog?.action?.replace("_", " ")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );

  function renderExtensionList(exts: any[]) {
    if (!exts?.length) {
      return (
        <Card><CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No extensions found.</p>
          <p className="text-xs text-muted-foreground mt-1">Extensions will appear here when available for your organization.</p>
        </CardContent></Card>
      );
    }
    return exts.map((ext: any) => {
      const activation = getActivation(ext);
      const CatIcon = CATEGORY_ICONS[ext.category] || Package;
      return (
        <Card key={ext.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelectedExt(ext); setCompatResult(null); }}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CatIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium text-sm">{ext.extension_name}</h3>
                    <Badge variant="outline" className={STATUS_COLORS[ext.status] || ""}>{ext.status}</Badge>
                    <Badge variant="outline" className="text-xs">{ext.category}</Badge>
                    <span className={`text-xs font-medium ${RISK_COLORS[ext.risk_level] || ""}`}>{ext.risk_level} risk</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ext.description}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>v{ext.version}</span>
                    <span>•</span>
                    <span>By {ext.author}</span>
                    {ext.rollback_ready && <><span>•</span><span className="text-emerald-500">Rollback ready</span></>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activation && (
                  <Badge variant="outline" className={ACTIVATION_COLORS[activation.activation_status] || ""}>
                    {activation.activation_status === "pending_approval" ? "Pending" : activation.activation_status}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  }
}

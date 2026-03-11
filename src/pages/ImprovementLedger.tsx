import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileSearch, AlertTriangle, CheckCircle, Eye, Archive,
  Layers, Clock, Info, Shield, RotateCcw, Zap, Bug, Radio,
  Package, MessageSquare, Activity, TrendingUp,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  low: "bg-primary/10 text-primary border-primary/20",
  moderate: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

const REVIEW_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  reviewing: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  relevant: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  not_relevant: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground opacity-60",
};

const SOURCE_ICONS: Record<string, typeof Bug> = {
  validation_failure: Bug,
  repair_attempt: RotateCcw,
  rollback_event: RotateCcw,
  deployment_blocker: Shield,
  extension_compatibility_failure: Package,
  extension_approval_outcome: Package,
  operator_note: MessageSquare,
  execution_anomaly: Zap,
  adoption_friction: Activity,
  delivery_friction: TrendingUp,
  general: Info,
};

type Evidence = {
  id: string;
  source_type: string;
  severity: string;
  summary: string;
  detail?: string;
  affected_stage?: string;
  review_status: string;
  created_at: string;
  structured_metadata: Record<string, unknown>;
  linked_extension_id?: string;
};

type KPIs = { total: number; high_severity: number; review_backlog: number };

export default function ImprovementLedger() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [reviewNotes, setReviewNotes] = useState("");

  const orgId = currentOrg?.id;

  const callEvidence = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("evidence-management", {
      body: { organization_id: orgId, ...payload },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const { data: listData, isLoading } = useQuery({
    queryKey: ["evidence-list", orgId, sourceFilter, severityFilter, reviewFilter],
    queryFn: () => callEvidence({
      action: "list",
      ...(sourceFilter !== "all" && { source_type: sourceFilter }),
      ...(severityFilter !== "all" && { severity: severityFilter }),
      ...(reviewFilter !== "all" && { review_status: reviewFilter }),
      limit: 100,
    }),
    enabled: !!orgId,
  });

  const evidence: Evidence[] = listData?.evidence || [];
  const kpis: KPIs = listData?.kpis || { total: 0, high_severity: 0, review_backlog: 0 };

  const { data: detailData } = useQuery({
    queryKey: ["evidence-detail", selectedEvidence?.id],
    queryFn: () => callEvidence({ action: "detail", evidence_id: selectedEvidence!.id }),
    enabled: !!selectedEvidence?.id && detailOpen,
  });

  const markMutation = useMutation({
    mutationFn: (vars: { evidence_id: string; new_status: string; notes?: string }) =>
      callEvidence({ action: "mark_relevant", ...vars }),
    onSuccess: () => {
      toast.success("Review status updated");
      qc.invalidateQueries({ queryKey: ["evidence-list"] });
      qc.invalidateQueries({ queryKey: ["evidence-detail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (evidence_id: string) => callEvidence({ action: "archive", evidence_id }),
    onSuccess: () => {
      toast.success("Evidence archived");
      qc.invalidateQueries({ queryKey: ["evidence-list"] });
      setDetailOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetail = (ev: Evidence) => {
    setSelectedEvidence(ev);
    setDetailOpen(true);
    setReviewNotes("");
  };

  const SourceIcon = (type: string) => SOURCE_ICONS[type] || Info;

  return (
    <AppLayout>
      <PageGuidanceShell pageKey="evidence" />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Improvement Ledger</h1>
        <p className="text-sm text-muted-foreground">Evidence capture & improvement tracking — Sprint 72</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evidence</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{kpis.high_severity}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Backlog</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{kpis.review_backlog}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {kpis.total - kpis.review_backlog}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Source type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="validation_failure">Validation failure</SelectItem>
            <SelectItem value="repair_attempt">Repair attempt</SelectItem>
            <SelectItem value="rollback_event">Rollback event</SelectItem>
            <SelectItem value="deployment_blocker">Deploy blocker</SelectItem>
            <SelectItem value="extension_compatibility_failure">Extension compat.</SelectItem>
            <SelectItem value="extension_approval_outcome">Extension approval</SelectItem>
            <SelectItem value="operator_note">Operator note</SelectItem>
            <SelectItem value="execution_anomaly">Anomaly</SelectItem>
            <SelectItem value="adoption_friction">Adoption friction</SelectItem>
            <SelectItem value="delivery_friction">Delivery friction</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={reviewFilter} onValueChange={setReviewFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Review status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="relevant">Relevant</SelectItem>
            <SelectItem value="not_relevant">Not relevant</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Evidence List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : evidence.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileSearch className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No evidence captured yet</p>
            <p className="text-sm mt-1">Evidence will appear here as the system captures operational signals.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {evidence.map((ev) => {
            const Icon = SourceIcon(ev.source_type);
            return (
              <Card key={ev.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openDetail(ev)}>
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.summary}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ev.source_type.replace(/_/g, " ")} · {ev.affected_stage || "—"} · {new Date(ev.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={SEVERITY_COLORS[ev.severity] || ""}>{ev.severity}</Badge>
                  <Badge variant="outline" className={REVIEW_COLORS[ev.review_status] || ""}>{ev.review_status}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Evidence Detail
            </DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">{selectedEvidence.summary}</h3>
                {selectedEvidence.detail && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedEvidence.detail}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <Badge variant="outline">{selectedEvidence.source_type.replace(/_/g, " ")}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Severity</p>
                  <Badge variant="outline" className={SEVERITY_COLORS[selectedEvidence.severity]}>{selectedEvidence.severity}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Review Status</p>
                  <Badge variant="outline" className={REVIEW_COLORS[selectedEvidence.review_status]}>{selectedEvidence.review_status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Affected Stage</p>
                  <p className="text-sm">{selectedEvidence.affected_stage || "—"}</p>
                </div>
              </div>

              {selectedEvidence.linked_extension_id && (
                <div className="p-3 rounded-md bg-muted/30 border">
                  <p className="text-xs text-muted-foreground">Linked Extension</p>
                  <p className="text-sm font-mono">{selectedEvidence.linked_extension_id}</p>
                </div>
              )}

              {/* Linked Context */}
              {detailData?.links && detailData.links.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Layers className="h-4 w-4" /> Linked Context</h4>
                  <div className="space-y-1">
                    {detailData.links.map((l: any) => (
                      <div key={l.id} className="text-xs p-2 bg-muted/20 rounded flex justify-between">
                        <span>{l.link_type} → {l.target_table}</span>
                        <span className="font-mono text-muted-foreground">{l.target_id.slice(0, 8)}…</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review History */}
              {detailData?.reviews && detailData.reviews.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Shield className="h-4 w-4" /> Review History</h4>
                  <div className="space-y-1">
                    {detailData.reviews.map((r: any) => (
                      <div key={r.id} className="text-xs p-2 bg-muted/20 rounded">
                        <span className="font-medium">{r.action}</span>: {r.previous_status} → {r.new_status}
                        {r.notes && <span className="text-muted-foreground ml-2">— {r.notes}</span>}
                        <span className="float-right text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Controls */}
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  placeholder="Review notes (optional)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markMutation.mutate({ evidence_id: selectedEvidence.id, new_status: "reviewing", notes: reviewNotes })}
                    disabled={markMutation.isPending}
                  >
                    <Eye className="h-3 w-3 mr-1" /> Mark Reviewing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-600"
                    onClick={() => markMutation.mutate({ evidence_id: selectedEvidence.id, new_status: "relevant", notes: reviewNotes })}
                    disabled={markMutation.isPending}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" /> Mark Relevant
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markMutation.mutate({ evidence_id: selectedEvidence.id, new_status: "not_relevant", notes: reviewNotes })}
                    disabled={markMutation.isPending}
                  >
                    Not Relevant
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive"
                    onClick={() => archiveMutation.mutate(selectedEvidence.id)}
                    disabled={archiveMutation.isPending}
                  >
                    <Archive className="h-3 w-3 mr-1" /> Archive
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

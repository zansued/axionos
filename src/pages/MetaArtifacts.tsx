import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileText, Shield, CheckCircle, XCircle, Eye, Rocket,
  Layers, Users, Workflow, TrendingUp, Brain, AlertTriangle, Clock, BarChart3,
} from "lucide-react";
import { RelatedMemoryPanel } from "@/components/memory/RelatedMemoryPanel";
import { RelatedSummaryPanel } from "@/components/memory/RelatedSummaryPanel";

type ArtifactStatus = "draft" | "reviewed" | "approved" | "rejected" | "implemented";

const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  implemented: "bg-primary/10 text-primary border-primary/20",
};

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  ADR_DRAFT: "ADR Draft",
  ARCHITECTURE_PROPOSAL: "Architecture Proposal",
  AGENT_ROLE_SPEC: "Agent Role Spec",
  WORKFLOW_CHANGE_PROPOSAL: "Workflow Change",
  IMPLEMENTATION_PLAN: "Implementation Plan",
  PR_DRAFT: "PR Draft",
};

const AGENT_ICONS: Record<string, typeof Brain> = {
  ARCHITECTURE_META_AGENT: Layers,
  AGENT_ROLE_DESIGNER: Users,
  WORKFLOW_OPTIMIZER: Workflow,
  SYSTEM_EVOLUTION_ADVISOR: TrendingUp,
};

const VALID_ACTIONS: Record<string, { action: string; label: string; icon: typeof Eye }[]> = {
  draft: [
    { action: "reviewed", label: "Mark Reviewed", icon: Eye },
    { action: "rejected", label: "Reject", icon: XCircle },
  ],
  reviewed: [
    { action: "approved", label: "Approve", icon: CheckCircle },
    { action: "rejected", label: "Reject", icon: XCircle },
  ],
  approved: [
    { action: "implemented", label: "Mark Implemented", icon: Rocket },
  ],
};

export default function MetaArtifacts() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [reviewDialog, setReviewDialog] = useState<{ id: string; title: string; action: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [previewArtifact, setPreviewArtifact] = useState<Record<string, unknown> | null>(null);

  const { data: artifacts, isLoading, error: queryError } = useQuery({
    queryKey: ["meta-artifacts", currentOrg?.id, statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("meta_agent_artifacts" as any)
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (typeFilter !== "all") query = query.eq("artifact_type", typeFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown) as Record<string, unknown>[];
    },
    enabled: !!currentOrg?.id,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: string; notes: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-artifact-review", {
        body: { artifact_id: id, action, review_notes: notes },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Artifact updated");
      queryClient.invalidateQueries({ queryKey: ["meta-artifacts"] });
      setReviewDialog(null);
      setReviewNotes("");
    },
    onError: (e) => toast.error(`Review failed: ${e.message}`),
  });

  const statusCounts = {
    total: artifacts?.length || 0,
    draft: artifacts?.filter((a) => a.status === "draft").length || 0,
    approved: artifacts?.filter((a) => a.status === "approved").length || 0,
    implemented: artifacts?.filter((a) => a.status === "implemented").length || 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Meta-Artifacts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Engineering proposals generated from accepted Meta-Agent recommendations
          </p>
        </div>

        {/* Safety Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-start gap-3">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Safety Constraints Active.</span>{" "}
              Artifacts do not automatically change system behavior. They are structured engineering
              proposals for human review and controlled implementation.
            </p>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: statusCounts.total, icon: FileText },
            { label: "Draft", value: statusCounts.draft, icon: Clock },
            { label: "Approved", value: statusCounts.approved, icon: CheckCircle },
            { label: "Implemented", value: statusCounts.implemented, icon: Rocket },
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="implemented">Implemented</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Artifact Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ADR_DRAFT">ADR Draft</SelectItem>
              <SelectItem value="ARCHITECTURE_PROPOSAL">Architecture Proposal</SelectItem>
              <SelectItem value="AGENT_ROLE_SPEC">Agent Role Spec</SelectItem>
              <SelectItem value="WORKFLOW_CHANGE_PROPOSAL">Workflow Change</SelectItem>
              <SelectItem value="IMPLEMENTATION_PLAN">Implementation Plan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {queryError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Failed to load artifacts: {String((queryError as Error)?.message || queryError)}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent></Card>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !queryError && !artifacts?.length && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No artifacts found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Accept a Meta-Agent recommendation to generate engineering proposals.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Artifact List */}
        {!isLoading && artifacts && artifacts.length > 0 && (
          <div className="space-y-3">
            {artifacts.map((art) => {
              const AgentIcon = AGENT_ICONS[art.created_by_meta_agent as string] || Brain;
              const status = art.status as ArtifactStatus;
              const actions = VALID_ACTIONS[status] || [];

              return (
                <Card key={art.id as string} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <AgentIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium text-sm">{art.title as string}</h3>
                            <Badge variant="outline" className={STATUS_COLORS[status] || ""}>
                              {status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {ARTIFACT_TYPE_LABELS[art.artifact_type as string] || String(art.artifact_type)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{art.summary as string}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>By: {art.created_by_meta_agent as string}</span>
                            <span>•</span>
                            <span>{new Date(art.created_at as string).toLocaleDateString()}</span>
                          </div>
                          {art.review_notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">
                              Review: {art.review_notes as string}
                            </p>
                          )}

                          {/* Sprint 16: Related Memory Panel */}
                          <div className="mt-2 space-y-2">
                            <RelatedMemoryPanel
                              reviewType="artifact_review"
                              targetComponent={art.created_by_meta_agent as string}
                              tags={[art.artifact_type as string, art.created_by_meta_agent as string]}
                            />
                            {/* Sprint 17: Related Summary Panel */}
                            <RelatedSummaryPanel
                              relevantTypes={["ARTIFACT_OUTCOME_SUMMARY", "ARCHITECTURE_EVOLUTION_SUMMARY"]}
                              label="Related Summaries"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => setPreviewArtifact(art)}>
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                        {actions.map(({ action, label, icon: Icon }) => (
                          <Button
                            key={action}
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewDialog({ id: art.id as string, title: art.title as string, action })}
                          >
                            <Icon className="h-3 w-3 mr-1" /> {label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => { setReviewDialog(null); setReviewNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewDialog?.action} Artifact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{reviewDialog?.title}</p>
          {reviewDialog?.action === "implemented" && (
            <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded p-2">
              Marking as implemented signals that the change has been manually applied. This does not trigger any automatic system changes.
            </p>
          )}
          <Textarea
            placeholder="Review notes (optional)..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewDialog(null); setReviewNotes(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => reviewDialog && reviewMutation.mutate({
                id: reviewDialog.id,
                action: reviewDialog.action,
                notes: reviewNotes,
              })}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Preview Dialog */}
      <Dialog open={!!previewArtifact} onOpenChange={() => setPreviewArtifact(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewArtifact?.title as string}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg">
              {JSON.stringify(previewArtifact?.content, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

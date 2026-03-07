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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Brain, Eye, CheckCircle, XCircle, Clock, ArrowUpDown,
  Layers, Users, Workflow, TrendingUp, Shield, AlertTriangle,
  ArrowDown, ArrowUp, BarChart3,
} from "lucide-react";
import { RelatedMemoryPanel } from "@/components/memory/RelatedMemoryPanel";
import { RelatedSummaryPanel } from "@/components/memory/RelatedSummaryPanel";

type RecStatus = "pending" | "reviewed" | "accepted" | "rejected" | "deferred";

const STATUS_COLORS: Record<RecStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  reviewed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  accepted: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  deferred: "bg-muted text-muted-foreground border-border",
};

const AGENT_ICONS: Record<string, typeof Brain> = {
  ARCHITECTURE_META_AGENT: Layers,
  AGENT_ROLE_DESIGNER: Users,
  WORKFLOW_OPTIMIZER: Workflow,
  SYSTEM_EVOLUTION_ADVISOR: TrendingUp,
};

const AGENT_LABELS: Record<string, string> = {
  ARCHITECTURE_META_AGENT: "Architecture",
  AGENT_ROLE_DESIGNER: "Role Designer",
  WORKFLOW_OPTIMIZER: "Workflow",
  SYSTEM_EVOLUTION_ADVISOR: "Evolution",
};

type SortField = "priority_score" | "confidence_score" | "impact_score" | "created_at";

const FEEDBACK_TAGS = [
  { value: "too_generic", label: "Too Generic" },
  { value: "well_supported", label: "Well Supported" },
  { value: "historically_redundant", label: "Historically Redundant" },
  { value: "novel_but_useful", label: "Novel but Useful" },
  { value: "unclear_impact", label: "Unclear Impact" },
  { value: "high_value", label: "High Value" },
  { value: "needs_more_evidence", label: "Needs More Evidence" },
];

export default function MetaAgents() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("priority_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{ id: string; title: string; action: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Sprint 19: Quality aggregates
  const { data: qualityAggregates } = useQuery({
    queryKey: ["quality-aggregates", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_quality_aggregates" as any)
        .select("*")
        .eq("organization_id", currentOrg!.id);
      if (error) throw error;
      return (data as unknown) as Record<string, unknown>[];
    },
    enabled: !!currentOrg?.id,
  });

  const getAgentQuality = (agentType: string) => {
    const agg = qualityAggregates?.find((a) => a.meta_agent_type === agentType);
    if (!agg) return null;
    return {
      acceptanceRate: Number(agg.avg_acceptance_rate || 0),
      quality: Number(agg.avg_overall_quality || 0),
      trend: agg.quality_trend as string,
      total: Number(agg.total_recommendations || 0),
    };
  };

  const { data: recommendations, isLoading, error: queryError } = useQuery({
    queryKey: ["meta-recommendations", currentOrg?.id, statusFilter, agentFilter, sortField, sortAsc],
    queryFn: async () => {
      let query = supabase
        .from("meta_agent_recommendations")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order(sortField, { ascending: sortAsc })
        .limit(100);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (agentFilter !== "all") query = query.eq("meta_agent_type", agentFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("run-meta-agent-analysis", {
        body: { organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const parts = [];
      if (data.recommendations_created > 0) parts.push(`${data.recommendations_created} created`);
      if (data.quality_suppressed > 0) parts.push(`${data.quality_suppressed} suppressed`);
      if (data.duplicates_skipped > 0) parts.push(`${data.duplicates_skipped} deduplicated`);
      toast.success(`Analysis complete: ${parts.join(", ") || "no new recommendations"}`);
      queryClient.invalidateQueries({ queryKey: ["meta-recommendations"] });
    },
    onError: (e) => toast.error(`Analysis failed: ${e.message}`),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: string; notes: string }) => {
      const { data, error } = await supabase.functions.invoke("meta-recommendation-review", {
        body: { recommendation_id: id, action, review_notes: notes },
      });
      if (error) throw error;
      // If accepted, trigger artifact generation + memory capture
      if (action === "accepted") {
        const { error: artErr } = await supabase.functions.invoke("meta-artifact-generator", {
          body: { recommendation_id: id },
        });
        if (artErr) console.error("Artifact generation failed:", artErr);
        else toast.success("Engineering artifact generated");

        // Capture memory entry for accepted recommendation
        await supabase.functions.invoke("engineering-memory-service", {
          body: {
            action: "create_entry",
            organization_id: currentOrg!.id,
            memory_type: "DesignMemory",
            memory_subtype: "recommendation_accepted",
            title: `Recommendation accepted: ${data?.title || id}`,
            summary: `Meta-agent recommendation ${id} was accepted by user.`,
            source_type: "meta_agent_recommendation",
            source_id: id,
            confidence_score: 0.9,
            relevance_score: 0.9,
            tags: ["recommendation_accepted", "meta_agent"],
          },
        }).catch((e: any) => console.error("Memory capture error:", e));
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Recommendation updated");
      queryClient.invalidateQueries({ queryKey: ["meta-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["meta-artifacts"] });
      setReviewDialog(null);
      setReviewNotes("");
    },
    onError: (e) => toast.error(`Review failed: ${e.message}`),
  });

  const statusCounts = {
    total: recommendations?.length || 0,
    pending: recommendations?.filter((r) => r.status === "pending").length || 0,
    accepted: recommendations?.filter((r) => r.status === "accepted").length || 0,
    rejected: recommendations?.filter((r) => r.status === "rejected").length || 0,
    deferred: recommendations?.filter((r) => r.status === "deferred").length || 0,
  };

  const handleReviewAction = (id: string, title: string, action: string) => {
    setReviewDialog({ id, title, action });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant={sortField === field ? "secondary" : "ghost"}
      size="sm"
      className="h-7 text-xs"
      onClick={() => toggleSort(field)}
    >
      {label}
      {sortField === field && (sortAsc ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />)}
    </Button>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Meta-Agents
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Higher-order recommendations for system architecture optimization
            </p>
          </div>
          <Button
            onClick={() => runAnalysisMutation.mutate()}
            disabled={runAnalysisMutation.isPending}
          >
            {runAnalysisMutation.isPending ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>

        {/* Safety Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-start gap-3">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Safety Constraints Active.</span>{" "}
              Meta-Agents operate in recommendation-only mode. Accepted recommendations do not
              automatically change system behavior — they signal human agreement for future controlled implementation.
            </p>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: statusCounts.total, icon: Eye },
            { label: "Pending", value: statusCounts.pending, icon: Clock },
            { label: "Accepted", value: statusCounts.accepted, icon: CheckCircle },
            { label: "Rejected", value: statusCounts.rejected, icon: XCircle },
            { label: "Deferred", value: statusCounts.deferred, icon: ArrowUpDown },
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

        {/* Filters & Sort */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Meta-Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              <SelectItem value="ARCHITECTURE_META_AGENT">Architecture</SelectItem>
              <SelectItem value="AGENT_ROLE_DESIGNER">Role Designer</SelectItem>
              <SelectItem value="WORKFLOW_OPTIMIZER">Workflow</SelectItem>
              <SelectItem value="SYSTEM_EVOLUTION_ADVISOR">Evolution</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 ml-auto">
            <SortButton field="priority_score" label="Priority" />
            <SortButton field="confidence_score" label="Confidence" />
            <SortButton field="impact_score" label="Impact" />
            <SortButton field="created_at" label="Date" />
          </div>
        </div>

        {/* Error State */}
        {queryError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">Failed to load recommendations: {queryError.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !queryError && !recommendations?.length && (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No recommendations found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {statusFilter !== "all" || agentFilter !== "all"
                  ? "Try changing your filters, or run a new analysis."
                  : "Run an analysis to generate meta-level insights from system data."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recommendations List */}
        {!isLoading && recommendations && recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const AgentIcon = AGENT_ICONS[rec.meta_agent_type] || Brain;
              const evidence = Array.isArray(rec.supporting_evidence) ? rec.supporting_evidence : [];
              const status = rec.status as RecStatus;

              return (
                <Card key={rec.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <AgentIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium text-sm">{rec.title}</h3>
                            <Badge variant="outline" className={STATUS_COLORS[status] || ""}>
                              {status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.recommendation_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.description}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>{AGENT_LABELS[rec.meta_agent_type] || rec.meta_agent_type}</span>
                            {/* Sprint 19: Quality indicator */}
                            {(() => {
                              const q = getAgentQuality(rec.meta_agent_type);
                              if (!q || q.total < 3) return null;
                              const trendIcon = q.trend === "improving" ? "↑" : q.trend === "declining" ? "↓" : "→";
                              const trendColor = q.trend === "improving" ? "text-green-600" : q.trend === "declining" ? "text-red-500" : "text-muted-foreground";
                              return (
                                <span className="flex items-center gap-1">
                                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                                  <span>Accept: {(q.acceptanceRate * 100).toFixed(0)}%</span>
                                  <span className={trendColor}>{trendIcon}</span>
                                </span>
                              );
                            })()}
                            <span>•</span>
                            <span>Target: {rec.target_component}</span>
                            <span>•</span>
                            <span>Confidence: {(Number(rec.confidence_score) * 100).toFixed(0)}%</span>
                            <span>•</span>
                            <span>Impact: {(Number(rec.impact_score) * 100).toFixed(0)}%</span>
                            <span>•</span>
                            <span>Priority: {(Number(rec.priority_score) * 100).toFixed(0)}%</span>
                            {evidence.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{evidence.length} evidence</span>
                              </>
                            )}
                          </div>

                          {/* Sprint 18: Historical alignment & context indicators */}
                          {(() => {
                            const histEv = evidence.find((e: any) => typeof e.type === "string" && e.type.includes("history_context")) as Record<string, unknown> | undefined;
                            const srcMetrics = rec.source_metrics as Record<string, unknown> | undefined;
                            const alignment = histEv?.historical_alignment as string || srcMetrics?.historical_alignment as string || null;
                            const ctxScore = Number(srcMetrics?.historical_context_score || 0);
                            const novelty = Boolean(histEv?.novelty_flag);
                            if (!alignment && ctxScore === 0) return null;
                            const ALIGNMENT_COLORS: Record<string, string> = {
                              reinforces_prior_direction: "bg-green-500/10 text-green-600 border-green-500/20",
                              extends_prior_direction: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                              reopens_unresolved_issue: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                              diverges_from_prior_direction: "bg-red-500/10 text-red-600 border-red-500/20",
                              historically_novel: "bg-primary/10 text-primary border-primary/20",
                            };
                            const ALIGNMENT_LABELS: Record<string, string> = {
                              reinforces_prior_direction: "Reinforces Prior",
                              extends_prior_direction: "Extends Prior",
                              reopens_unresolved_issue: "Reopens Issue",
                              diverges_from_prior_direction: "Diverges",
                              historically_novel: "Novel",
                            };
                            return (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {alignment && (
                                  <Badge variant="outline" className={`text-[10px] ${ALIGNMENT_COLORS[alignment] || ""}`}>
                                    {ALIGNMENT_LABELS[alignment] || alignment.replace(/_/g, " ")}
                                  </Badge>
                                )}
                                {ctxScore > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    History: {(ctxScore * 100).toFixed(0)}%
                                  </span>
                                )}
                                {novelty && (
                                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                                    New Signal
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}

                          {/* Evidence Preview */}
                          {evidence.length > 0 && (
                            <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground space-y-1">
                              {evidence.slice(0, 2).map((ev, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                                    {(ev as Record<string, unknown>).type as string || "data"}
                                  </Badge>
                                  <span className="truncate">
                                    {Object.entries(ev as Record<string, unknown>)
                                      .filter(([k]) => k !== "type")
                                      .map(([k, v]) => `${k}: ${typeof v === "number" ? (v as number).toFixed?.(2) ?? v : v}`)
                                      .join(", ")}
                                  </span>
                                </div>
                              ))}
                          {evidence.length > 2 && (
                                <span className="text-[10px]">+{evidence.length - 2} more</span>
                              )}
                            </div>
                          )}

                          {/* Sprint 16: Related Memory Panel */}
                          <div className="mt-2 space-y-2">
                            <RelatedMemoryPanel
                              reviewType="recommendation_review"
                              targetComponent={rec.target_component}
                              tags={[rec.meta_agent_type, rec.recommendation_type]}
                            />
                            {/* Sprint 17: Related Summary Panel */}
                            <RelatedSummaryPanel
                              relevantTypes={
                                rec.meta_agent_type === "ARCHITECTURE_META_AGENT"
                                  ? ["ARCHITECTURE_EVOLUTION_SUMMARY", "FAILURE_PATTERN_SUMMARY"]
                                  : rec.meta_agent_type === "WORKFLOW_OPTIMIZER"
                                  ? ["FAILURE_PATTERN_SUMMARY", "MEMORY_RETRIEVAL_SUMMARY"]
                                  : ["RECOMMENDATION_DECISION_SUMMARY", "ARTIFACT_OUTCOME_SUMMARY"]
                              }
                              label="Related Summaries"
                            />
                          </div>

                          {rec.review_notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">
                              Review: {rec.review_notes}
                            </p>
                          )}
                          {rec.reviewed_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Reviewed: {new Date(rec.reviewed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions — only for pending */}
                      {status === "pending" && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="outline"
                            onClick={() => handleReviewAction(rec.id, rec.title, "accepted")}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Accept
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => handleReviewAction(rec.id, rec.title, "rejected")}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                          <Button size="sm" variant="ghost"
                            onClick={() => handleReviewAction(rec.id, rec.title, "deferred")}>
                            Defer
                          </Button>
                        </div>
                      )}
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
            <DialogTitle className="capitalize">{reviewDialog?.action} Recommendation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{reviewDialog?.title}</p>
          {reviewDialog?.action === "accepted" && (
            <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded p-2">
              Accepting this recommendation will generate an engineering artifact (ADR, proposal, or spec) for human review. It does not automatically change system behavior.
            </p>
          )}
          <Textarea
            placeholder="Review notes (optional for accept, recommended for reject/defer)..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="mt-2"
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
              {reviewMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

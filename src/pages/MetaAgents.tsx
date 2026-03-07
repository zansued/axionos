import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Brain, Eye, CheckCircle, XCircle, Clock, ArrowUpDown,
  Layers, Users, Workflow, TrendingUp, Shield,
} from "lucide-react";

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

export default function MetaAgents() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [reviewDialog, setReviewDialog] = useState<{ id: string; title: string; action: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["meta-recommendations", currentOrg?.id, statusFilter, agentFilter],
    queryFn: async () => {
      let query = supabase
        .from("meta_agent_recommendations")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("priority_score", { ascending: false })
        .order("created_at", { ascending: false })
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
      toast.success(`Analysis complete: ${data.recommendations_created} new recommendations`);
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
      return data;
    },
    onSuccess: () => {
      toast.success("Recommendation updated");
      queryClient.invalidateQueries({ queryKey: ["meta-recommendations"] });
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
    if (action === "accepted" || action === "rejected" || action === "deferred") {
      setReviewDialog({ id, title, action });
    } else {
      reviewMutation.mutate({ id, action, notes: "" });
    }
  };

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

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
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
        </div>

        {/* Recommendations List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading recommendations...</div>
        ) : !recommendations?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No recommendations yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Run an analysis to generate meta-level insights.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => {
              const AgentIcon = AGENT_ICONS[rec.meta_agent_type] || Brain;
              const evidence = Array.isArray(rec.supporting_evidence) ? rec.supporting_evidence : [];

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
                            <Badge variant="outline" className={STATUS_COLORS[rec.status as RecStatus] || ""}>
                              {rec.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.description}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>{AGENT_LABELS[rec.meta_agent_type] || rec.meta_agent_type}</span>
                            <span>•</span>
                            <span>Confidence: {(Number(rec.confidence_score) * 100).toFixed(0)}%</span>
                            <span>•</span>
                            <span>Impact: {(Number(rec.impact_score) * 100).toFixed(0)}%</span>
                            <span>•</span>
                            <span>Priority: {(Number(rec.priority_score) * 100).toFixed(0)}%</span>
                            {evidence.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{evidence.length} evidence items</span>
                              </>
                            )}
                          </div>
                          {rec.review_notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">
                              {rec.review_notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {rec.status === "pending" && (
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

        {/* Safety note */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Safety Constraints Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Meta-Agents operate in recommendation-only mode. Accepting a recommendation does not
                implement any change — it signals human agreement for future controlled implementation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => { setReviewDialog(null); setReviewNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewDialog?.action} Recommendation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{reviewDialog?.title}</p>
          <Textarea
            placeholder="Review notes (optional)..."
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
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

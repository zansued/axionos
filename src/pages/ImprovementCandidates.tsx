import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageIntroCard } from "@/components/guidance";
import { usePageGuidance } from "@/hooks/usePageGuidance";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Sparkles, AlertTriangle, Clock, CheckCircle, Archive, Eye,
  TrendingUp, Shield, Layers, Beaker, RotateCcw, FileSearch,
  Zap, Bug, Package, MessageSquare, Activity, Info,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-primary/10 text-primary border-primary/20",
  moderate: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

const REVIEW_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  reviewing: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  triaged: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  deferred: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground opacity-60",
  ready_for_benchmark: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
};

const TYPE_ICONS: Record<string, typeof Bug> = {
  validation_rule_candidate: Bug,
  repair_strategy_candidate: RotateCcw,
  process_guideline_candidate: Shield,
  extension_governance_candidate: Package,
  compatibility_rule_candidate: Package,
  operator_playbook_candidate: MessageSquare,
  evidence_only_observation: Activity,
};

type Candidate = {
  id: string;
  candidate_type: string;
  title: string;
  summary: string;
  explanation: string;
  affected_stages: string[];
  severity: string;
  priority_score: number;
  confidence_score: number;
  recurrence_count: number;
  expected_benefit: string;
  risk_posture: string;
  review_status: string;
  evidence_count: number;
  created_at: string;
};

type KPIs = {
  total: number;
  high_confidence: number;
  review_backlog: number;
  recurring_patterns: number;
  benchmark_ready: number;
};

export default function ImprovementCandidates() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const { guidance, whyNowText } = usePageGuidance("candidates");
  const [sevFilter, setSevFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [notes, setNotes] = useState("");

  const orgId = currentOrg?.id;

  const callApi = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("candidate-distillation", {
      body: { organization_id: orgId, ...payload },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const { data: listData, isLoading } = useQuery({
    queryKey: ["candidates-list", orgId, typeFilter, sevFilter, reviewFilter],
    queryFn: () => callApi({
      action: "list_candidates",
      ...(typeFilter !== "all" && { candidate_type: typeFilter }),
      ...(sevFilter !== "all" && { severity: sevFilter }),
      ...(reviewFilter !== "all" && { review_status: reviewFilter }),
    }),
    enabled: !!orgId,
  });

  const candidates: Candidate[] = listData?.candidates || [];
  const kpis: KPIs = listData?.kpis || { total: 0, high_confidence: 0, review_backlog: 0, recurring_patterns: 0, benchmark_ready: 0 };

  const { data: detailData } = useQuery({
    queryKey: ["candidate-detail", selected?.id],
    queryFn: () => callApi({ action: "candidate_detail", candidate_id: selected!.id }),
    enabled: !!selected?.id && detailOpen,
  });

  const { data: explainData } = useQuery({
    queryKey: ["candidate-explain", selected?.id],
    queryFn: () => callApi({ action: "explain_candidate", candidate_id: selected!.id }),
    enabled: !!selected?.id && detailOpen,
  });

  const generateMutation = useMutation({
    mutationFn: () => callApi({ action: "generate_candidates" }),
    onSuccess: (d) => {
      toast.success(`Distilled ${d.candidates_created} candidate(s) from ${d.evidence_processed} evidence items`);
      qc.invalidateQueries({ queryKey: ["candidates-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const triageMutation = useMutation({
    mutationFn: (vars: { candidate_id: string; new_status: string; notes?: string }) =>
      callApi({ action: "triage_candidate", ...vars }),
    onSuccess: () => {
      toast.success("Candidate status updated");
      qc.invalidateQueries({ queryKey: ["candidates-list"] });
      qc.invalidateQueries({ queryKey: ["candidate-detail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => callApi({ action: "archive_candidate", candidate_id: id }),
    onSuccess: () => {
      toast.success("Candidate archived");
      qc.invalidateQueries({ queryKey: ["candidates-list"] });
      setDetailOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const benchmarkMutation = useMutation({
    mutationFn: (vars: { candidate_id: string; notes?: string }) =>
      callApi({ action: "mark_ready_for_benchmark", ...vars }),
    onSuccess: () => {
      toast.success("Candidate marked ready for benchmark");
      qc.invalidateQueries({ queryKey: ["candidates-list"] });
      qc.invalidateQueries({ queryKey: ["candidate-detail"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetail = (c: Candidate) => { setSelected(c); setDetailOpen(true); setNotes(""); };
  const Icon = (type: string) => TYPE_ICONS[type] || Info;

  return (
    <AppLayout>
      {guidance && <PageIntroCard guidance={guidance} whyNow={whyNowText} compact />}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Improvement Candidates</h1>
          <p className="text-sm text-muted-foreground">Distilled improvement proposals from operational evidence — Sprint 73</p>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} size="sm">
          <Sparkles className="h-4 w-4 mr-1" />
          {generateMutation.isPending ? "Distilling…" : "Generate Candidates"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-500">{kpis.high_confidence}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backlog</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-500">{kpis.review_backlog}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-500">{kpis.recurring_patterns}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benchmark Ready</CardTitle>
            <Beaker className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-cyan-500">{kpis.benchmark_ready}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Candidate type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="validation_rule_candidate">Validation rule</SelectItem>
            <SelectItem value="repair_strategy_candidate">Repair strategy</SelectItem>
            <SelectItem value="process_guideline_candidate">Process guideline</SelectItem>
            <SelectItem value="extension_governance_candidate">Extension governance</SelectItem>
            <SelectItem value="compatibility_rule_candidate">Compatibility rule</SelectItem>
            <SelectItem value="operator_playbook_candidate">Operator playbook</SelectItem>
            <SelectItem value="evidence_only_observation">Observation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sevFilter} onValueChange={setSevFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={reviewFilter} onValueChange={setReviewFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Review status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="triaged">Triaged</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="deferred">Deferred</SelectItem>
            <SelectItem value="ready_for_benchmark">Benchmark ready</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Candidate List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No improvement candidates yet</p>
            <p className="text-sm mt-1">Click "Generate Candidates" to distill candidates from reviewed evidence.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => {
            const CIcon = Icon(c.candidate_type);
            return (
              <Card key={c.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openDetail(c)}>
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  <CIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.candidate_type.replace(/_/g, " ")} · {c.evidence_count} evidence · {c.recurrence_count}x recurrence
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right mr-2 hidden sm:block">
                      <p className="text-[10px] text-muted-foreground">Confidence</p>
                      <Progress value={c.confidence_score * 100} className="w-16 h-1.5" />
                    </div>
                    <Badge variant="outline" className={SEVERITY_COLORS[c.severity] || ""}>{c.severity}</Badge>
                    <Badge variant="outline" className={REVIEW_COLORS[c.review_status] || ""}>{c.review_status.replace(/_/g, " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Candidate Detail
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold">{selected.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selected.summary}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><p className="text-xs text-muted-foreground">Type</p><Badge variant="outline">{selected.candidate_type.replace(/_/g, " ")}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Severity</p><Badge variant="outline" className={SEVERITY_COLORS[selected.severity]}>{selected.severity}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={REVIEW_COLORS[selected.review_status]}>{selected.review_status.replace(/_/g, " ")}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Confidence</p><p className="text-sm font-medium">{(selected.confidence_score * 100).toFixed(0)}%</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><p className="text-sm font-medium">{(selected.priority_score * 100).toFixed(0)}%</p></div>
                <div><p className="text-xs text-muted-foreground">Recurrence</p><p className="text-sm font-medium">{selected.recurrence_count}x</p></div>
                <div><p className="text-xs text-muted-foreground">Risk Posture</p><p className="text-sm">{selected.risk_posture}</p></div>
                <div><p className="text-xs text-muted-foreground">Evidence Items</p><p className="text-sm font-medium">{selected.evidence_count}</p></div>
                <div><p className="text-xs text-muted-foreground">Expected Benefit</p><p className="text-sm">{selected.expected_benefit}</p></div>
              </div>

              {selected.affected_stages.length > 0 && (
                <div><p className="text-xs text-muted-foreground mb-1">Affected Stages</p><div className="flex gap-1">{selected.affected_stages.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></div>
              )}

              {/* Explainability */}
              {explainData && (
                <div className="p-3 rounded-md bg-muted/30 border space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1"><Zap className="h-4 w-4" /> Why This Candidate Exists</h4>
                  <p className="text-xs text-muted-foreground">{explainData.why_it_exists}</p>
                  <p className="text-xs"><span className="font-medium">Pattern:</span> {explainData.pattern_detected}</p>
                  <p className="text-xs"><span className="font-medium">Still a candidate because:</span> {explainData.why_still_candidate}</p>
                </div>
              )}

              {/* Linked Evidence */}
              {detailData?.evidence_links && detailData.evidence_links.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Layers className="h-4 w-4" /> Contributing Evidence ({detailData.evidence_links.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detailData.evidence_links.map((l: any) => (
                      <div key={l.id} className="text-xs p-2 bg-muted/20 rounded flex justify-between items-center">
                        <span className="truncate flex-1">{l.improvement_evidence?.summary || "—"}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{l.improvement_evidence?.source_type?.replace(/_/g, " ")}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {detailData?.patterns && detailData.patterns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Detected Patterns</h4>
                  {detailData.patterns.map((p: any) => (
                    <div key={p.id} className="text-xs p-2 bg-muted/20 rounded mb-1">
                      <span className="font-medium">{p.pattern_key}</span> — {p.pattern_description} ({p.occurrence_count}x)
                    </div>
                  ))}
                </div>
              )}

              {/* Review History */}
              {detailData?.reviews && detailData.reviews.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Shield className="h-4 w-4" /> Review History</h4>
                  {detailData.reviews.map((r: any) => (
                    <div key={r.id} className="text-xs p-2 bg-muted/20 rounded mb-1">
                      <span className="font-medium">{r.action}</span>: {r.previous_status} → {r.new_status}
                      {r.notes && <span className="text-muted-foreground ml-2">— {r.notes}</span>}
                      <span className="float-right text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Triage Controls */}
              <div className="border-t pt-4 space-y-3">
                <Textarea placeholder="Triage notes (optional)..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => triageMutation.mutate({ candidate_id: selected.id, new_status: "reviewing", notes })} disabled={triageMutation.isPending}>
                    <Eye className="h-3 w-3 mr-1" /> Reviewing
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => triageMutation.mutate({ candidate_id: selected.id, new_status: "triaged", notes })} disabled={triageMutation.isPending}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Triage
                  </Button>
                  <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-600" onClick={() => triageMutation.mutate({ candidate_id: selected.id, new_status: "accepted", notes })} disabled={triageMutation.isPending}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-600" onClick={() => benchmarkMutation.mutate({ candidate_id: selected.id, notes })} disabled={benchmarkMutation.isPending}>
                    <Beaker className="h-3 w-3 mr-1" /> Ready for Benchmark
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => triageMutation.mutate({ candidate_id: selected.id, new_status: "deferred", notes })} disabled={triageMutation.isPending}>
                    Defer
                  </Button>
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive" onClick={() => triageMutation.mutate({ candidate_id: selected.id, new_status: "rejected", notes })} disabled={triageMutation.isPending}>
                    Reject
                  </Button>
                  <Button size="sm" variant="outline" className="border-destructive/30 text-destructive" onClick={() => archiveMutation.mutate(selected.id)} disabled={archiveMutation.isPending}>
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

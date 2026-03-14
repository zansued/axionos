import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Shield, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ReviewableSkill {
  id: string;
  skill_name: string;
  description: string;
  domain: string;
  confidence: number;
  lifecycle_status: string;
  extraction_method: string;
  canon_entry_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

type Verdict = "approved" | "rejected" | "needs_refinement";

const VERDICT_CONFIG: Record<Verdict, { label: string; icon: typeof CheckCircle; className: string }> = {
  approved: { label: "Aprovar", icon: CheckCircle, className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  rejected: { label: "Rejeitar", icon: XCircle, className: "bg-destructive hover:bg-destructive/90 text-white" },
  needs_refinement: { label: "Refinar", icon: AlertTriangle, className: "bg-amber-600 hover:bg-amber-700 text-white" },
};

const STATUS_COLORS: Record<string, string> = {
  extracted: "border-amber-500/30 text-amber-400",
  pending_review: "border-blue-500/30 text-blue-400",
  approved: "border-emerald-500/30 text-emerald-400",
  rejected: "border-destructive/30 text-destructive",
};

export function SkillReviewTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Review form state
  const [scores, setScores] = useState({
    specificity: 0.5,
    applicability: 0.5,
    reusability: 0.5,
    confidence_assessment: 0.5,
  });
  const [notes, setNotes] = useState("");

  const { data: skills, isLoading, refetch } = useQuery<ReviewableSkill[]>({
    queryKey: ["skill-review-list"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: { action: "list_reviewable", include_reviewed: true },
      });
      if (res.error) throw res.error;
      return res.data?.skills || [];
    },
  });

  const { data: reviewStats } = useQuery({
    queryKey: ["skill-review-stats"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: { action: "review_history" },
      });
      if (res.error) throw res.error;
      return res.data;
    },
  });

  const filteredSkills = skills?.filter(s => {
    if (filter === "all") return true;
    return s.lifecycle_status === filter;
  }) || [];

  const pendingCount = skills?.filter(s => s.lifecycle_status === "extracted" || s.lifecycle_status === "pending_review").length || 0;
  const approvedCount = skills?.filter(s => s.lifecycle_status === "approved").length || 0;
  const rejectedCount = skills?.filter(s => s.lifecycle_status === "rejected").length || 0;

  const submitReview = async (skillId: string, verdict: Verdict) => {
    setSubmitting(true);
    try {
      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: {
          action: "review_skill",
          skill_id: skillId,
          verdict,
          ...scores,
          notes,
        },
      });
      if (res.error) throw res.error;
      toast({
        title: `Skill ${verdict === "approved" ? "aprovada" : verdict === "rejected" ? "rejeitada" : "marcada para refinamento"}`,
        description: `Score geral: ${(res.data.overall_score * 100).toFixed(0)}%`,
      });
      setReviewingId(null);
      setNotes("");
      setScores({ specificity: 0.5, applicability: 0.5, reusability: 0.5, confidence_assessment: 0.5 });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["skill-extraction-status"] });
    } catch (e: any) {
      toast({ title: "Erro no review", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitBatchReview = async (verdict: Verdict) => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: {
          action: "batch_review",
          skill_ids: Array.from(selectedIds),
          verdict,
          ...scores,
          notes: notes || `Batch ${verdict}`,
        },
      });
      if (res.error) throw res.error;
      toast({
        title: `Batch review: ${res.data.reviewed} skills processadas`,
        description: `Veredicto: ${verdict}`,
      });
      setSelectedIds(new Set());
      setBatchMode(false);
      setNotes("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["skill-extraction-status"] });
    } catch (e: any) {
      toast({ title: "Erro no batch review", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const reviewable = filteredSkills.filter(s => s.lifecycle_status === "extracted" || s.lifecycle_status === "pending_review");
    setSelectedIds(new Set(reviewable.map(s => s.id)));
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pendentes" value={pendingCount} accent />
        <StatCard label="Aprovadas" value={approvedCount} />
        <StatCard label="Rejeitadas" value={rejectedCount} />
        <StatCard label="Reviews Realizados" value={reviewStats?.total_reviews ?? 0} />
      </div>

      {/* Filters & Actions Bar */}
      <Card className="border-border/30 bg-card/40">
        <CardContent className="py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">Filtrar:</span>
          {["all", "extracted", "pending_review", "approved", "rejected"].map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f.replace("_", " ")}
            </Button>
          ))}
          <div className="flex-1" />
          <Button
            variant={batchMode ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
          >
            <Shield className="h-3 w-3" />
            {batchMode ? "Sair Batch" : "Batch Review"}
          </Button>
        </CardContent>
      </Card>

      {/* Batch Actions */}
      {batchMode && selectedIds.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{selectedIds.size} skills selecionadas</span>
              <Button variant="ghost" size="sm" className="text-xs" onClick={selectAllFiltered}>
                Selecionar todos pendentes
              </Button>
            </div>
            <ScoreSliders scores={scores} onChange={setScores} />
            <Textarea
              placeholder="Notas do batch review (opcional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs h-16 bg-background/50"
            />
            <div className="flex gap-2">
              {(Object.entries(VERDICT_CONFIG) as [Verdict, typeof VERDICT_CONFIG[Verdict]][]).map(([v, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <Button
                    key={v}
                    size="sm"
                    className={`text-xs gap-1 ${cfg.className}`}
                    disabled={submitting}
                    onClick={() => submitBatchReview(v)}
                  >
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                    {cfg.label} ({selectedIds.size})
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredSkills.length === 0 ? (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma skill encontrada para o filtro selecionado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSkills.map(skill => (
            <Card key={skill.id} className={`border-border/30 bg-card/40 transition-colors ${selectedIds.has(skill.id) ? "ring-1 ring-primary/50" : ""}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  {batchMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(skill.id)}
                      onChange={() => toggleSelect(skill.id)}
                      className="mt-1 accent-primary"
                      disabled={skill.lifecycle_status !== "extracted" && skill.lifecycle_status !== "pending_review"}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{skill.skill_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[skill.lifecycle_status] || ""}`}>
                        {skill.lifecycle_status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground">
                        {skill.domain}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {(skill.confidence * 100).toFixed(0)}% conf
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>

                    {/* Expanded Detail */}
                    {expandedId === skill.id && (
                      <div className="mt-3 space-y-2 text-xs border-t border-border/20 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-muted-foreground">Método:</span> {skill.extraction_method}</div>
                          <div><span className="text-muted-foreground">Canon ID:</span> <code className="text-[10px]">{skill.canon_entry_id?.slice(0, 8)}...</code></div>
                          {skill.metadata && (
                            <>
                              <div><span className="text-muted-foreground">Tipo Canon:</span> {String(skill.metadata.source_canon_type || "—")}</div>
                              <div><span className="text-muted-foreground">Prática:</span> {String(skill.metadata.source_practice_type || "—")}</div>
                              <div><span className="text-muted-foreground">Tópico:</span> {String(skill.metadata.source_topic || "—")}</div>
                              <div><span className="text-muted-foreground">Layer:</span> {String(skill.metadata.source_layer || "—")}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Individual Review Form */}
                    {reviewingId === skill.id && (
                      <div className="mt-3 space-y-3 border-t border-border/20 pt-3">
                        <ScoreSliders scores={scores} onChange={setScores} />
                        <Textarea
                          placeholder="Notas do review (opcional)"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="text-xs h-16 bg-background/50"
                        />
                        <div className="flex gap-2">
                          {(Object.entries(VERDICT_CONFIG) as [Verdict, typeof VERDICT_CONFIG[Verdict]][]).map(([v, cfg]) => {
                            const Icon = cfg.icon;
                            return (
                              <Button
                                key={v}
                                size="sm"
                                className={`text-xs gap-1 ${cfg.className}`}
                                disabled={submitting}
                                onClick={() => submitReview(skill.id, v)}
                              >
                                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                                {cfg.label}
                              </Button>
                            );
                          })}
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setReviewingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setExpandedId(expandedId === skill.id ? null : skill.id)}
                    >
                      {expandedId === skill.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                    {(skill.lifecycle_status === "extracted" || skill.lifecycle_status === "pending_review") && !batchMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          setReviewingId(reviewingId === skill.id ? null : skill.id);
                          setScores({ specificity: 0.5, applicability: 0.5, reusability: 0.5, confidence_assessment: 0.5 });
                          setNotes("");
                        }}
                      >
                        <Eye className="h-3 w-3" />
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreSliders({ scores, onChange }: {
  scores: { specificity: number; applicability: number; reusability: number; confidence_assessment: number };
  onChange: (s: { specificity: number; applicability: number; reusability: number; confidence_assessment: number }) => void;
}) {
  const labels: Record<string, string> = {
    specificity: "Especificidade",
    applicability: "Aplicabilidade",
    reusability: "Reusabilidade",
    confidence_assessment: "Avaliação de Confiança",
  };

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(scores).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{labels[key] || key}</span>
            <span className="text-[10px] font-mono text-foreground">{(value * 100).toFixed(0)}%</span>
          </div>
          <Slider
            value={[value * 100]}
            max={100}
            step={5}
            onValueChange={([v]) => onChange({ ...scores, [key]: v / 100 })}
            className="h-4"
          />
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="border-border/30 bg-card/40">
      <CardContent className="pt-3 pb-2.5 text-center">
        <p className={`text-lg font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

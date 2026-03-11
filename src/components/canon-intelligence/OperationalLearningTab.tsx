import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, XCircle, Wrench, CheckCircle, Lightbulb } from "lucide-react";

const PRACTICE_LABELS: Record<string, string> = {
  best_practice: "Best Practice",
  implementation_pattern: "Impl. Pattern",
  architecture_pattern: "Arch. Pattern",
  template: "Template",
  anti_pattern: "Anti-Pattern",
  validation_rule: "Validation Rule",
  methodology_guideline: "Methodology",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-destructive/20 text-destructive border-destructive/30",
  critical: "bg-red-600/20 text-red-400 border-red-600/30",
};

interface OperationalLearningTabProps {
  candidates: any[];
  signals: any[];
  failurePatterns: any[];
  refactorPatterns: any[];
  successPatterns: any[];
  validationPatterns: any[];
  loading: boolean;
}

export function OperationalLearningTab({
  candidates, signals, failurePatterns, refactorPatterns, successPatterns, validationPatterns, loading,
}: OperationalLearningTabProps) {
  const pendingCandidates = candidates.filter((c: any) => c.review_status === "pending" && !c.noise_suppressed);
  const evolutionReady = pendingCandidates.filter((c: any) => c.confidence_score >= 30);

  return (
    <div className="space-y-5">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <LearnMetric value={signals.length} label="Signals" icon={<TrendingUp className="h-3 w-3" />} />
        <LearnMetric value={candidates.length} label="Candidates" icon={<Brain className="h-3 w-3" />} />
        <LearnMetric value={failurePatterns.length} label="Failure Patterns" icon={<XCircle className="h-3 w-3" />} warn />
        <LearnMetric value={refactorPatterns.length} label="Refactors" icon={<Wrench className="h-3 w-3" />} />
        <LearnMetric value={successPatterns.length} label="Successes" icon={<CheckCircle className="h-3 w-3" />} success />
        <LearnMetric value={evolutionReady.length} label="Evolution Queue" icon={<Lightbulb className="h-3 w-3" />} accent />
      </div>

      <Tabs defaultValue="evolution" className="space-y-3">
        <TabsList className="bg-muted/20 gap-0.5 p-0.5">
          <TabsTrigger value="evolution" className="text-xs"><Lightbulb className="h-3 w-3 mr-1" />Evolution Queue</TabsTrigger>
          <TabsTrigger value="candidates" className="text-xs"><Brain className="h-3 w-3 mr-1" />Candidates</TabsTrigger>
          <TabsTrigger value="signals" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" />Signals</TabsTrigger>
          <TabsTrigger value="failures" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Failures</TabsTrigger>
          <TabsTrigger value="patterns" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Patterns</TabsTrigger>
        </TabsList>

        {/* Evolution Queue */}
        <TabsContent value="evolution">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Canon Evolution Queue</CardTitle>
              <CardDescription className="text-xs">Candidates that passed noise filtering and meet minimum confidence — ready for steward review</CardDescription>
            </CardHeader>
            <CardContent>
              {evolutionReady.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Lightbulb className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs text-muted-foreground">No candidates ready for evolution review.</p>
                </div>
              ) : (
                <ScrollArea className="h-[380px]">
                  <div className="space-y-2">
                    {evolutionReady.map((c: any) => (
                      <div key={c.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/15 transition-colors">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate flex-1">{c.title}</p>
                          <Badge variant="outline" className={`text-[10px] ${c.confidence_score >= 70 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : c.confidence_score >= 40 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground"}`}>
                            {c.confidence_score >= 70 ? "Recommend" : c.confidence_score >= 40 ? "Observe" : "Defer"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.summary}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                          <span>Signals: {c.signal_count}</span>
                          <span>Confidence: {c.confidence_score}%</span>
                          <span>Source: {c.source_type}</span>
                          <span>{PRACTICE_LABELS[c.proposed_practice_type] || c.proposed_practice_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Candidates */}
        <TabsContent value="candidates">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">All Learning Candidates</CardTitle>
              <CardDescription className="text-xs">Knowledge candidates generated from operational evidence — advisory only</CardDescription>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No learning candidates yet.</p>
              ) : (
                <ScrollArea className="h-[380px]">
                  <div className="space-y-1.5">
                    {candidates.map((c: any) => (
                      <div key={c.id} className="p-3 rounded border border-border/20 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium truncate flex-1">{c.title}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className={`text-[9px] ${STATUS_BADGE[c.review_status] || STATUS_BADGE.pending}`}>{c.review_status}</Badge>
                            {c.noise_suppressed && <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">Suppressed</Badge>}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{c.summary}</p>
                        <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground/60">
                          <span>Signals: {c.signal_count}</span>
                          <span>{c.confidence_score}%</span>
                          <span>{c.source_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signals */}
        <TabsContent value="signals">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Operational Signals</CardTitle>
              <CardDescription className="text-xs">Raw signals from repair loops, validation, and execution outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {signals.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No signals captured yet.</p>
              ) : (
                <ScrollArea className="h-[380px]">
                  <div className="space-y-1.5">
                    {signals.map((s: any) => (
                      <div key={s.id} className="p-2 rounded border border-border/20 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{s.signal_type}</Badge>
                            <Badge variant="outline" className={`text-[9px] ${s.outcome_success ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                              {s.outcome_success ? "✓" : "✗"}
                            </Badge>
                          </div>
                          <span className="text-[9px] text-muted-foreground/50">{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{s.outcome}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failure Patterns */}
        <TabsContent value="failures">
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Failure Patterns</CardTitle>
              <CardDescription className="text-xs">Recurring failures detected from operational signals</CardDescription>
            </CardHeader>
            <CardContent>
              {failurePatterns.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No failure patterns detected.</p>
              ) : (
                <ScrollArea className="h-[380px]">
                  <div className="space-y-1.5">
                    {failurePatterns.map((p: any) => (
                      <div key={p.id} className="p-3 rounded border border-border/20 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium truncate flex-1">{p.pattern_signature}</p>
                          <Badge variant="outline" className={`text-[9px] ${SEVERITY_BADGE[p.severity] || SEVERITY_BADGE.medium}`}>{p.severity}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{p.pattern_description}</p>
                        <span className="text-[9px] text-muted-foreground/50">×{p.occurrence_count}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Success & Refactor Patterns */}
        <TabsContent value="patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Success Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                {successPatterns.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-4 text-center">None yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {successPatterns.slice(0, 8).map((p: any) => (
                      <div key={p.id} className="p-2 rounded border border-border/20 bg-muted/10">
                        <p className="text-xs font-medium">{p.pattern_name}</p>
                        <span className="text-[9px] text-muted-foreground">{p.success_rate}% success · ×{p.occurrence_count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Refactor Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                {refactorPatterns.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-4 text-center">None yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {refactorPatterns.slice(0, 8).map((p: any) => (
                      <div key={p.id} className="p-2 rounded border border-border/20 bg-muted/10">
                        <p className="text-xs font-medium">{p.pattern_name}</p>
                        <span className="text-[9px] text-muted-foreground">{p.success_rate}% · ×{p.occurrence_count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LearnMetric({ value, label, icon, warn, success, accent }: { value: number; label: string; icon: React.ReactNode; warn?: boolean; success?: boolean; accent?: boolean }) {
  const color = warn ? "text-amber-400" : success ? "text-emerald-400" : accent ? "text-primary" : "text-foreground";
  return (
    <Card className="border-border/30 bg-card/50">
      <CardContent className="pt-3 pb-2 text-center">
        <div className={`flex items-center justify-center gap-1.5 ${color}`}>
          {icon}
          <span className="text-lg font-bold">{value}</span>
        </div>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

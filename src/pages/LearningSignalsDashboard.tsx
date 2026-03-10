import { useOrg } from "@/contexts/OrgContext";
import { useLearningExtraction } from "@/hooks/useLearningExtraction";
import { useColdStart } from "@/hooks/useColdStart";
import { ColdStartBanner } from "@/components/observability/ColdStartBanner";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Brain, Lightbulb, Loader2, RefreshCw,
  Shield, Target, TrendingUp, Zap,
} from "lucide-react";

const TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  repair_strategy: { label: "Repair Strategy", color: "text-blue-400", icon: Shield },
  execution_pattern: { label: "Execution Pattern", color: "text-green-400", icon: TrendingUp },
  regression_prevention: { label: "Regression Prevention", color: "text-amber-400", icon: Target },
  architecture_guideline: { label: "Architecture Guideline", color: "text-purple-400", icon: BookOpen },
  validation_rule: { label: "Validation Rule", color: "text-cyan-400", icon: Zap },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  reviewed: "bg-blue-500/20 text-blue-400",
  promoted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

function MetricCard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string; icon: any; color: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-30`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LearningSignalsDashboard() {
  const { currentOrg } = useOrg();
  const coldStart = useColdStart();
  const {
    candidates, candidatesLoading,
    summary, summaryLoading,
    extract, extracting, extractionResult,
  } = useLearningExtraction();

  if (!currentOrg) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-6">
            <p className="text-muted-foreground">Select an organization.</p>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const highConfidence = candidates.filter((c) => c.confidence_score >= 0.7);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                  <Brain className="h-6 w-6 text-primary" />
                  Learning Signals
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Structured learning candidates extracted from runtime evidence
                </p>
              </div>
              <Button
                onClick={() => extract(30)}
                disabled={extracting}
                className="gap-2"
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Extract Candidates
              </Button>
            </div>

            {coldStart.data?.is_cold_start && (
              <ColdStartBanner label={coldStart.data.label} summary={coldStart.data.summary} signals={coldStart.data.signals} />
            )}

            {/* Extraction result toast */}
            {extractionResult && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm font-medium text-foreground">
                    Extraction complete: {extractionResult.total_signals} signals found
                    ({extractionResult.inserted} new, {extractionResult.updated} updated)
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Validation: {extractionResult.by_source?.execution_validation ?? 0}</span>
                    <span>Autonomy: {extractionResult.by_source?.autonomy_transitions ?? 0}</span>
                    <span>Repair: {extractionResult.by_source?.repair_evidence ?? 0}</span>
                    <span>Compounding: {extractionResult.by_source?.compounding_metrics ?? 0}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Candidates"
                value={summary?.total_candidates ?? 0}
                icon={Lightbulb}
                color="text-primary"
              />
              <MetricCard
                title="High Confidence"
                value={summary?.high_confidence_count ?? 0}
                subtitle="confidence ≥ 0.7"
                icon={TrendingUp}
                color="text-green-400"
              />
              <MetricCard
                title="Candidate Types"
                value={Object.keys(summary?.by_type ?? {}).length}
                icon={BookOpen}
                color="text-blue-400"
              />
              <MetricCard
                title="Pending Review"
                value={summary?.by_status?.pending ?? 0}
                icon={Target}
                color="text-amber-400"
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="candidates" className="space-y-4">
              <TabsList>
                <TabsTrigger value="candidates">All Candidates</TabsTrigger>
                <TabsTrigger value="types">Type Distribution</TabsTrigger>
                <TabsTrigger value="domains">Signal Domains</TabsTrigger>
              </TabsList>

              {/* Candidates list */}
              <TabsContent value="candidates" className="space-y-3">
                {candidatesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : candidates.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="py-12 text-center">
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">No learning candidates yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click "Extract Candidates" to scan runtime evidence.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  candidates.map((c) => {
                    const typeInfo = TYPE_LABELS[c.candidate_type] || {
                      label: c.candidate_type,
                      color: "text-muted-foreground",
                      icon: Lightbulb,
                    };
                    const TypeIcon = typeInfo.icon;
                    return (
                      <Card key={c.id} className="border-border/50 hover:border-border transition-colors">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                                <span className={`text-xs font-medium ${typeInfo.color}`}>
                                  {typeInfo.label}
                                </span>
                                <Badge variant="outline" className={STATUS_COLORS[c.status] || ""}>
                                  {c.status}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  {c.candidate_scope.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground font-medium truncate">
                                {c.recommended_action}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                                {c.pattern_signature}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Confidence</span>
                                <span className="text-sm font-bold text-foreground">
                                  {(c.confidence_score * 100).toFixed(0)}%
                                </span>
                              </div>
                              <Progress
                                value={c.confidence_score * 100}
                                className="w-24 h-1.5 mt-1"
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {c.evidence_count} evidence
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              {/* Type distribution */}
              <TabsContent value="types" className="space-y-3">
                {summary?.by_type && Object.entries(summary.by_type).length > 0 ? (
                  Object.entries(summary.by_type).map(([type, count]) => {
                    const typeInfo = TYPE_LABELS[type] || {
                      label: type,
                      color: "text-muted-foreground",
                      icon: Lightbulb,
                    };
                    const TypeIcon = typeInfo.icon;
                    const pct = summary.total_candidates
                      ? ((count / summary.total_candidates) * 100).toFixed(0)
                      : "0";
                    return (
                      <Card key={type} className="border-border/50">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                              <div>
                                <p className="text-sm font-medium text-foreground">{typeInfo.label}</p>
                                <p className="text-xs text-muted-foreground">{count} candidates</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={Number(pct)} className="w-32 h-2" />
                              <span className="text-sm font-medium text-muted-foreground w-10 text-right">
                                {pct}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="border-border/50">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      No type distribution data yet.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Signal domains */}
              <TabsContent value="domains" className="space-y-3">
                {summary?.top_signal_domains?.length ? (
                  summary.top_signal_domains.map((d, i) => (
                    <Card key={d.domain} className="border-border/50">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                            <p className="text-sm font-medium text-foreground font-mono">{d.domain}</p>
                          </div>
                          <Badge variant="outline">{d.count} signals</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-border/50">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm">
                      No signal domain data yet.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BarChart3, Brain, Clock, FileText, Play, TrendingUp, Zap, Shield,
} from "lucide-react";

const SUMMARY_TYPE_LABELS: Record<string, string> = {
  FAILURE_PATTERN_SUMMARY: "Failure Patterns",
  STRATEGY_EFFECTIVENESS_SUMMARY: "Strategy Effectiveness",
  RECOMMENDATION_DECISION_SUMMARY: "Recommendation Decisions",
  ARTIFACT_OUTCOME_SUMMARY: "Artifact Outcomes",
  ARCHITECTURE_EVOLUTION_SUMMARY: "Architecture Evolution",
  MEMORY_RETRIEVAL_SUMMARY: "Memory Retrieval",
};

const SUMMARY_TYPE_COLORS: Record<string, string> = {
  FAILURE_PATTERN_SUMMARY: "bg-red-500/10 text-red-500 border-red-500/20",
  STRATEGY_EFFECTIVENESS_SUMMARY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  RECOMMENDATION_DECISION_SUMMARY: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  ARTIFACT_OUTCOME_SUMMARY: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  ARCHITECTURE_EVOLUTION_SUMMARY: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  MEMORY_RETRIEVAL_SUMMARY: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

export function MemorySummariesPanel() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: summaries, isLoading } = useQuery({
    queryKey: ["memory-summaries", currentOrg?.id, typeFilter],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const body: Record<string, unknown> = {
        action: "list",
        organization_id: currentOrg!.id,
        limit: 50,
      };
      if (typeFilter !== "all") body.summary_type = typeFilter;
      const { data, error } = await supabase.functions.invoke("run-memory-summaries", { body });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["memory-summary-metrics", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("run-memory-summaries", {
        body: { action: "metrics", organization_id: currentOrg!.id },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const generateMutation = useMutation({
    mutationFn: async (periodDays: number) => {
      const { data, error } = await supabase.functions.invoke("run-memory-summaries", {
        body: { action: "generate", organization_id: currentOrg!.id, period_days: periodDays },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const created = Object.values(data.results || {}).filter((r: any) => r.created).length;
      toast.success(`Summaries generated: ${created} new`);
      queryClient.invalidateQueries({ queryKey: ["memory-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["memory-summary-metrics"] });
    },
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  const items = summaries?.summaries || [];

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MetricCard icon={FileText} label="Total Summaries" value={metrics?.total_summaries ?? 0} />
        <MetricCard icon={TrendingUp} label="Avg Signal" value={`${((metrics?.avg_signal_strength ?? 0) * 100).toFixed(0)}%`} />
        <MetricCard icon={BarChart3} label="Types Active" value={Object.keys(metrics?.by_type || {}).length} />
        <MetricCard icon={Zap} label="Strongest" value={
          items.length > 0 ? `${(Math.max(...items.map((s: any) => Number(s.signal_strength || 0))) * 100).toFixed(0)}%` : "—"
        } />
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-center">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Summary Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(SUMMARY_TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={() => generateMutation.mutate(7)} disabled={generateMutation.isPending}>
            <Play className="h-3 w-3 mr-1" /> 7d
          </Button>
          <Button size="sm" variant="outline" onClick={() => generateMutation.mutate(30)} disabled={generateMutation.isPending}>
            <Play className="h-3 w-3 mr-1" /> 30d
          </Button>
        </div>
      </div>

      {/* Summary List */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Memory Summaries ({summaries?.total_count ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No summaries generated yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "7d" or "30d" to generate summaries for a time window
                </p>
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <div className="space-y-2">
                {items.map((summary: any) => (
                  <div
                    key={summary.id}
                    className="rounded-lg border border-border/30 bg-muted/10 p-3 hover:border-primary/20 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === summary.id ? null : summary.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-medium truncate">{summary.title}</h4>
                          <Badge variant="outline" className={`text-[10px] ${SUMMARY_TYPE_COLORS[summary.summary_type] || ""}`}>
                            {SUMMARY_TYPE_LABELS[summary.summary_type] || summary.summary_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(summary.period_start).toLocaleDateString("pt-BR")} — {new Date(summary.period_end).toLocaleDateString("pt-BR")}
                          </span>
                          <span>{summary.entry_count} entries</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">Signal</p>
                        <p className={`text-sm font-bold ${Number(summary.signal_strength) > 0.6 ? "text-primary" : "text-muted-foreground"}`}>
                          {(Number(summary.signal_strength) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {expandedId === summary.id && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono bg-background/50 p-2 rounded max-h-[200px] overflow-auto">
                          {JSON.stringify(summary.content, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Safety Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-start gap-3">
          <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Historical Synthesis.</span>{" "}
            Memory summaries are read-only historical context. They do not automatically change system behavior.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-2.5 p-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-base font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

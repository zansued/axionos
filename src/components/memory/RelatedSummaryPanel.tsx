import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Clock, BarChart3 } from "lucide-react";

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

interface RelatedSummaryPanelProps {
  /** Which summary types are relevant for this context */
  relevantTypes?: string[];
  /** Label override */
  label?: string;
}

export function RelatedSummaryPanel({
  relevantTypes,
  label = "Related Summaries",
}: RelatedSummaryPanelProps) {
  const { currentOrg } = useOrg();
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["related-summaries", currentOrg?.id, relevantTypes],
    enabled: !!currentOrg?.id && expanded,
    queryFn: async () => {
      // Fetch latest summaries, optionally filtered by type
      const results: any[] = [];
      const types = relevantTypes || Object.keys(SUMMARY_TYPE_LABELS);
      
      for (const t of types.slice(0, 3)) {
        const { data } = await supabase.functions.invoke("run-memory-summaries", {
          body: {
            action: "list",
            organization_id: currentOrg!.id,
            summary_type: t,
            limit: 2,
          },
        });
        if (data?.summaries) results.push(...data.summaries);
      }

      return results.sort((a, b) => Number(b.signal_strength) - Number(a.signal_strength)).slice(0, 5);
    },
    staleTime: 120000,
  });

  const entries = data || [];

  return (
    <Card className="border-primary/10 bg-primary/5">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          {label}
          {entries.length > 0 && (
            <Badge variant="outline" className="text-[10px] h-4 ml-1">{entries.length}</Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground font-normal">
            {expanded ? "▼" : "▶"}
          </span>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <p className="text-[10px] text-muted-foreground py-2">
              No related summaries found. Generate summaries from the Memory tab.
            </p>
          )}

          {!isLoading && entries.length > 0 && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {entries.map((s: any) => (
                  <div key={s.id} className="rounded border border-border/30 bg-background/50 p-2">
                    <div className="flex items-start gap-2">
                      <BarChart3 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-[11px] font-medium truncate">{s.title}</span>
                          <Badge variant="outline" className={`text-[9px] h-3.5 ${SUMMARY_TYPE_COLORS[s.summary_type] || ""}`}>
                            {SUMMARY_TYPE_LABELS[s.summary_type] || s.summary_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(s.period_end).toLocaleDateString()}
                          </span>
                          <span>Signal: {(Number(s.signal_strength) * 100).toFixed(0)}%</span>
                          <span>{s.entry_count} entries</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <p className="text-[9px] text-muted-foreground mt-2 italic">
            Summaries are historical context only and do not change system behavior.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

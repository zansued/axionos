import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Clock, Eye, Tag, BookOpen } from "lucide-react";

const MEMORY_TYPE_COLORS: Record<string, string> = {
  ExecutionMemory: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ErrorMemory: "bg-red-500/10 text-red-500 border-red-500/20",
  StrategyMemory: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  DesignMemory: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  DecisionMemory: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  OutcomeMemory: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
};

const MEMORY_TYPE_LABELS: Record<string, string> = {
  ExecutionMemory: "Execution",
  ErrorMemory: "Error",
  StrategyMemory: "Strategy",
  DesignMemory: "Design",
  DecisionMemory: "Decision",
  OutcomeMemory: "Outcome",
};

interface RelatedMemoryPanelProps {
  /** "recommendation_review" or "artifact_review" */
  reviewType: "recommendation_review" | "artifact_review";
  targetComponent?: string;
  relatedStage?: string;
  tags?: string[];
  /** If false or omitted, the panel is collapsed by default */
  defaultOpen?: boolean;
}

export function RelatedMemoryPanel({
  reviewType,
  targetComponent,
  relatedStage,
  tags,
  defaultOpen = false,
}: RelatedMemoryPanelProps) {
  const { currentOrg } = useOrg();
  const [expanded, setExpanded] = useState(defaultOpen);

  const { data, isLoading } = useQuery({
    queryKey: ["related-memory", currentOrg?.id, reviewType, targetComponent, relatedStage, tags],
    enabled: !!currentOrg?.id && expanded,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("memory-retrieval-surface", {
        body: {
          action: "retrieve_for_review",
          organization_id: currentOrg!.id,
          review_type: reviewType,
          target_component: targetComponent || undefined,
          related_stage: relatedStage || undefined,
          tags: tags || undefined,
        },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const entries = data?.entries || [];

  return (
    <Card className="border-primary/10 bg-primary/5">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-xs font-medium flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          Related Memory
          {entries.length > 0 && (
            <Badge variant="outline" className="text-[10px] h-4 ml-1">
              {entries.length}
            </Badge>
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
              No related memory found for this context.
            </p>
          )}

          {!isLoading && entries.length > 0 && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {entries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="rounded border border-border/30 bg-background/50 p-2 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Brain className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-[11px] font-medium truncate">{entry.title}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-3.5 ${MEMORY_TYPE_COLORS[entry.memory_type] || ""}`}
                          >
                            {MEMORY_TYPE_LABELS[entry.memory_type] || entry.memory_type}
                          </Badge>
                        </div>
                        {entry.summary && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {entry.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                          {entry.times_retrieved > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Eye className="h-2.5 w-2.5" />
                              {entry.times_retrieved}×
                            </span>
                          )}
                          {entry._rank_score != null && (
                            <span>Score: {(entry._rank_score * 100).toFixed(0)}%</span>
                          )}
                        </div>
                        {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-1">
                            <Tag className="h-2 w-2 text-muted-foreground" />
                            {(entry.tags as string[]).slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-[8px] h-3 px-1">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <p className="text-[9px] text-muted-foreground mt-2 italic">
            Historical memory is advisory context only and does not automatically change system behavior.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

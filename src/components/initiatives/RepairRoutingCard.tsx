import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Compass, Target, TrendingUp, ArrowRight } from "lucide-react";

interface RepairRoutingCardProps {
  initiativeId: string;
}

const SOURCE_LABELS: Record<string, { label: string; class: string }> = {
  strategy_effectiveness: { label: "Effectiveness", class: "bg-green-500/20 text-green-400" },
  pattern_library: { label: "Patterns", class: "bg-blue-500/20 text-blue-400" },
  static_map: { label: "Static", class: "bg-muted text-muted-foreground" },
  fallback: { label: "Fallback", class: "bg-yellow-500/20 text-yellow-400" },
};

export function RepairRoutingCard({ initiativeId }: RepairRoutingCardProps) {
  const { data: routingLog = [] } = useQuery({
    queryKey: ["repair-routing", initiativeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("repair_routing_log" as any)
        .select("*")
        .eq("initiative_id", initiativeId)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
  });

  if (routingLog.length === 0) return null;

  const adaptiveCount = routingLog.filter((r: any) =>
    r.decision_source === "strategy_effectiveness" || r.decision_source === "pattern_library"
  ).length;
  const avgConfidence = routingLog.reduce((s: number, r: any) => s + Number(r.confidence_score || 0), 0) / routingLog.length;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          Roteamento Adaptativo de Reparo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border/30 bg-muted/10 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Decisões</p>
            <p className="text-sm font-bold">{routingLog.length}</p>
          </div>
          <div className="rounded-md border border-border/30 bg-muted/10 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Adaptativas</p>
            <p className="text-sm font-bold text-green-400">{adaptiveCount}</p>
          </div>
          <div className="rounded-md border border-border/30 bg-muted/10 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Confiança Média</p>
            <p className="text-sm font-bold">{(avgConfidence * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Routing log */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {routingLog.map((entry: any) => {
              const source = SOURCE_LABELS[entry.decision_source] || SOURCE_LABELS.fallback;
              const rankings = (entry.strategy_rankings || []) as any[];
              return (
                <div key={entry.id} className="rounded-md border border-border/30 bg-muted/10 p-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[10px] ${source.class}`}>
                      {source.label}
                    </Badge>
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {entry.selected_strategy}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {(Number(entry.confidence_score) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{entry.error_category}</span>
                    <span>•</span>
                    <span>{entry.pipeline_stage}</span>
                  </div>
                  {rankings.length > 1 && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {rankings.slice(0, 3).map((r: any, i: number) => (
                        <span key={i} className="flex items-center gap-0.5">
                          {i > 0 && <ArrowRight className="h-2.5 w-2.5" />}
                          {r.strategy_id} ({(r.score * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

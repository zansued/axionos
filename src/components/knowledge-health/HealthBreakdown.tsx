import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  triggers: any[];
  workflows: any[];
}

const OBJECT_FAMILIES = ["canon_entry", "skill_bundle", "distilled_output", "architecture_heuristic", "learning_candidate"];

export function HealthBreakdown({ triggers, workflows }: Props) {
  const breakdown = useMemo(() => {
    return OBJECT_FAMILIES.map(family => {
      const familyTriggers = triggers.filter((t: any) => t.target_type === family);
      const familyWorkflows = workflows.filter((w: any) => w.target_type === family);
      const triggerTypes = new Map<string, number>();
      familyTriggers.forEach((t: any) => triggerTypes.set(t.trigger_type, (triggerTypes.get(t.trigger_type) || 0) + 1));

      return {
        family,
        totalTriggers: familyTriggers.length,
        pending: familyTriggers.filter((t: any) => t.status === "pending").length,
        inProgress: familyWorkflows.filter((w: any) => w.status === "in_progress").length,
        completed: familyWorkflows.filter((w: any) => w.status === "completed").length,
        failed: familyWorkflows.filter((w: any) => w.status === "failed").length,
        topTriggers: [...triggerTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
      };
    }).filter(b => b.totalTriggers > 0 || b.completed > 0);
  }, [triggers, workflows]);

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Análise de Saúde por Família de Conhecimento</CardTitle>
      </CardHeader>
      <CardContent>
        {breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados disponíveis. Execute um escaneamento de gatilhos primeiro.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {breakdown.map(b => (
              <Card key={b.family} className="border-border/20 bg-muted/10">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold capitalize">{b.family.replace(/_/g, " ")}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Gatilhos:</span> <span className="font-medium">{b.totalTriggers}</span></div>
                    <div><span className="text-muted-foreground">Pendentes:</span> <span className="font-medium text-amber-500">{b.pending}</span></div>
                    <div><span className="text-muted-foreground">Em Progresso:</span> <span className="font-medium text-primary">{b.inProgress}</span></div>
                    <div><span className="text-muted-foreground">Concluídos:</span> <span className="font-medium text-emerald-500">{b.completed}</span></div>
                    {b.failed > 0 && <div><span className="text-muted-foreground">Falhas:</span> <span className="font-medium text-destructive">{b.failed}</span></div>}
                  </div>
                  {b.topTriggers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {b.topTriggers.map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-[9px]">{type.replace(/_/g, " ")} ({count})</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

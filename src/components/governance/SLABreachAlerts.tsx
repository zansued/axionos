import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { PIPELINE_STEPS } from "@/components/initiatives/pipeline-config";
import type { SLABreach } from "@/hooks/useStageSLA";

interface SLABreachAlertsProps {
  breaches: SLABreach[];
  onNavigate?: (initiativeId: string) => void;
}

export function SLABreachAlerts({ breaches, onNavigate }: SLABreachAlertsProps) {
  if (breaches.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="flex items-center gap-3 py-6">
          <Clock className="h-5 w-5 text-success" />
          <p className="text-sm text-muted-foreground">Nenhuma violação de SLA no momento.</p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...breaches].sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (b.severity === "critical" && a.severity !== "critical") return 1;
    return b.hoursStuck - a.hoursStuck;
  });

  return (
    <Card className="border-destructive/30 bg-destructive/5 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Alertas de SLA ({breaches.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((breach) => {
          const step = PIPELINE_STEPS.find((s) => s.key === breach.stage);
          return (
            <div
              key={breach.initiativeId}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors hover:bg-muted/20 ${
                breach.severity === "critical"
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-warning/40 bg-warning/10"
              }`}
              onClick={() => onNavigate?.(breach.initiativeId)}
            >
              <AlertTriangle className={`h-4 w-4 shrink-0 ${breach.severity === "critical" ? "text-destructive" : "text-warning"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{breach.initiativeTitle}</p>
                <p className="text-xs text-muted-foreground">
                  Estágio: {step?.label ?? breach.stage} • {breach.hoursStuck}h parado (máx: {breach.maxHours}h)
                </p>
              </div>
              <Badge variant={breach.severity === "critical" ? "destructive" : "outline"} className="shrink-0 text-[10px]">
                {breach.severity === "critical" ? "Crítico" : "Atenção"}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

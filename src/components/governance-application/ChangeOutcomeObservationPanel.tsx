import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OutcomeObservation } from "@/lib/governance-change-application-types";
import { BarChart3, TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";

interface Props { observations: OutcomeObservation[] }

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  positive: { icon: <TrendingUp className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  neutral:  { icon: <Minus className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
  negative: { icon: <TrendingDown className="h-3.5 w-3.5" />, color: "text-destructive" },
  unknown:  { icon: <HelpCircle className="h-3.5 w-3.5" />, color: "text-yellow-500" },
};

export function ChangeOutcomeObservationPanel({ observations }: Props) {
  if (observations.length === 0) {
    return (
      <Card className="border-border/30 bg-card/60">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No outcome observations recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Outcome Observations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {observations.map((obs) => {
            const cfg = statusConfig[obs.status];
            return (
              <div key={obs.metricKey} className="rounded-lg border border-border/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{obs.label}</span>
                  <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>{cfg.icon} {obs.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Expected:</span> <span className="text-foreground">{obs.expectedEffect}</span></div>
                  <div><span className="text-muted-foreground">Observed:</span> <span className="text-foreground">{obs.observedEffect}</span></div>
                </div>
                <p className="text-[11px] text-muted-foreground">{obs.summary}</p>
                <div className="flex items-center gap-1">
                  <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${obs.confidence * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{Math.round(obs.confidence * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

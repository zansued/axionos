import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApplicationAlert } from "@/lib/governance-change-application-types";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

interface Props { alerts: ApplicationAlert[] }

const severityVariant: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export function ApplicationRisksAlertsPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <Card className="border-border/30 bg-card/60">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No active alerts.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" /> Risks & Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-lg border border-border/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={severityVariant[alert.severity]} className="text-[10px] capitalize">{alert.severity}</Badge>
                <span className="text-xs font-medium text-foreground">{alert.type.replace(/_/g, " ")}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{format(new Date(alert.detectedAt), "MMM d HH:mm")}</span>
            </div>
            <p className="text-xs text-foreground">{alert.summary}</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Subsystem: {alert.affectedSubsystem}</span>
            </div>
            <div className="rounded bg-muted/30 px-2 py-1.5">
              <span className="text-[10px] text-muted-foreground">Recommended: </span>
              <span className="text-[10px] text-foreground">{alert.recommendedAction}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

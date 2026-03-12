import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LearningSignalsData } from "@/hooks/useGovernanceInsightsData";
import { Activity, ArrowRight } from "lucide-react";

function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  const colors: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    medium: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    low: "bg-muted text-muted-foreground",
    info: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[severity] || colors.info}`}>
      {severity}: {count}
    </Badge>
  );
}

export function LearningSignalsSummary({ data }: { data: LearningSignalsData }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Learning Signals
        </CardTitle>
        <CardDescription className="text-xs">Operational learning signals feeding governance proposals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-foreground">{data.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Total Signals</p>
          </div>
          <div className="bg-destructive/5 rounded-lg p-3 text-center border border-destructive/10">
            <p className="text-xl font-bold text-destructive">{data.highSeverity}</p>
            <p className="text-[10px] text-muted-foreground uppercase">High Severity</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-muted-foreground">{Object.keys(data.bySignalType).length}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Signal Types</p>
          </div>
        </div>

        {Object.keys(data.bySeverity).length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-2 font-medium">By Severity</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.bySeverity).map(([sev, count]) => (
                <SeverityBadge key={sev} severity={sev} count={count} />
              ))}
            </div>
          </div>
        )}

        {Object.keys(data.bySignalType).length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-2 font-medium">By Signal Type</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.bySignalType).sort(([, a], [, b]) => b - a).slice(0, 10).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-[10px] font-mono">
                  {type.replace(/_/g, " ")}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {Object.keys(data.byRoutingTarget).length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-2 font-medium">Routing Targets</p>
            <div className="space-y-1">
              {Object.entries(data.byRoutingTarget).sort(([, a], [, b]) => b - a).map(([target, count]) => (
                <div key={target} className="flex items-center justify-between text-xs p-1.5 rounded bg-secondary/20">
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono">{target.replace(/_/g, " ")}</span>
                  </span>
                  <span className="text-muted-foreground">{count} signals</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.total === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No learning signals recorded</p>
        )}
      </CardContent>
    </Card>
  );
}

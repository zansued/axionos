import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecoveryData, ReadinessData } from "@/hooks/useGovernanceInsightsData";
import { RefreshCw, Gauge, CheckCircle2, XCircle } from "lucide-react";

export function RecoveryInsights({ data }: { data: RecoveryData }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-yellow-500" />
          Recovery & Self-Healing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-secondary/40 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{data.totalActivations}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Activations</p>
          </div>
          <div className="bg-emerald-500/5 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-500">{data.successfulRecoveries}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Successful</p>
          </div>
          <div className="bg-destructive/5 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-destructive">{data.failedRecoveries}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Failed</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-primary">{(data.successRate * 100).toFixed(0)}%</p>
            <p className="text-[9px] text-muted-foreground uppercase">Success Rate</p>
          </div>
        </div>

        {Object.keys(data.byType).length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1.5 font-medium">By Recovery Type</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.byType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-[10px] font-mono">
                  {type.replace(/_/g, " ")}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.topPatterns.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1.5 font-medium">Top Recovery Patterns</p>
            <div className="space-y-1.5">
              {data.topPatterns.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                  <span className="text-xs font-mono">{p.type.replace(/_/g, " ")} → {p.stage}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.count}x</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.totalActivations === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No recovery activations recorded</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ReadinessInsights({ data }: { data: ReadinessData }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Readiness Engine Decisions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary/40 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{data.totalChecks}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Total Checks</p>
          </div>
          <div className="bg-emerald-500/5 rounded-lg p-2.5 text-center">
            <CheckCircle2 className="h-3 w-3 mx-auto text-emerald-500 mb-0.5" />
            <p className="text-lg font-bold text-emerald-500">{data.passed}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Passed</p>
          </div>
          <div className="bg-destructive/5 rounded-lg p-2.5 text-center">
            <XCircle className="h-3 w-3 mx-auto text-destructive mb-0.5" />
            <p className="text-lg font-bold text-destructive">{data.blocked}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Blocked</p>
          </div>
        </div>

        {data.topBlockers.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1.5 font-medium">Top Readiness Blockers</p>
            <div className="space-y-1.5">
              {data.topBlockers.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                  <span className="text-xs">{b.stage} — {b.reason}</span>
                  <Badge variant="destructive" className="text-[10px]">{b.count} blocked</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(data.byStage).length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1.5 font-medium">By Stage</p>
            <div className="space-y-1">
              {Object.entries(data.byStage).map(([stage, counts]) => (
                <div key={stage} className="flex items-center justify-between text-xs p-1.5 rounded bg-secondary/20">
                  <span className="font-mono">{stage}</span>
                  <div className="flex gap-2">
                    <span className="text-emerald-500">{counts.passed} passed</span>
                    <span className="text-destructive">{counts.blocked} blocked</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.totalChecks === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No readiness data available</p>
        )}
      </CardContent>
    </Card>
  );
}

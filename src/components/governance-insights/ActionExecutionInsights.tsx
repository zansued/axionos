import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionExecutionData, ActionTypeStats } from "@/hooks/useGovernanceInsightsData";
import { Zap, AlertTriangle, RefreshCw } from "lucide-react";

function StatsTable({ stats, emptyMsg }: { stats: ActionTypeStats[]; emptyMsg: string }) {
  if (stats.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">{emptyMsg}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs text-right">Total</TableHead>
          <TableHead className="text-xs text-right">Success</TableHead>
          <TableHead className="text-xs text-right">Failed</TableHead>
          <TableHead className="text-xs text-right">Blocked</TableHead>
          <TableHead className="text-xs text-right">Recovery</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map(s => (
          <TableRow key={s.name}>
            <TableCell className="text-xs font-mono">{s.name.replace(/_/g, " ")}</TableCell>
            <TableCell className="text-xs text-right">{s.total}</TableCell>
            <TableCell className="text-xs text-right text-emerald-500">{s.completed}</TableCell>
            <TableCell className="text-xs text-right text-destructive">{s.failed}</TableCell>
            <TableCell className="text-xs text-right text-yellow-500">{s.blocked}</TableCell>
            <TableCell className="text-xs text-right text-muted-foreground">{s.recoveryCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ActionExecutionInsights({ data }: { data: ActionExecutionData }) {
  const allTriggerStats = Object.values(data.byTriggerType).sort((a, b) => b.total - a.total);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Actions by Type
          </CardTitle>
          <CardDescription className="text-xs">Execution patterns grouped by trigger type</CardDescription>
        </CardHeader>
        <CardContent>
          <StatsTable stats={allTriggerStats.slice(0, 8)} emptyMsg="No action data available" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Top Failure Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topFailures.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No failure patterns detected</p>
            ) : (
              <div className="space-y-2">
                {data.topFailures.map(f => (
                  <div key={f.name} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                    <span className="text-xs font-mono">{f.name.replace(/_/g, " ")}</span>
                    <div className="flex gap-2">
                      <Badge variant="destructive" className="text-[10px]">{f.failed} failures</Badge>
                      <Badge variant="secondary" className="text-[10px]">{(f.successRate * 100).toFixed(0)}% success</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-yellow-500" />
              Recovery Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topRecoveryTriggers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No recovery triggers</p>
            ) : (
              <div className="space-y-2">
                {data.topRecoveryTriggers.map(r => (
                  <div key={r.name} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                    <span className="text-xs font-mono">{r.name.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className="text-[10px]">{r.recoveryCount} activations</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

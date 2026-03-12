import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AgentPerformanceData } from "@/hooks/useGovernanceInsightsData";
import { Bot, TrendingUp, AlertTriangle } from "lucide-react";

export function AgentPerformanceInsights({ data }: { data: AgentPerformanceData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Agent Routing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-foreground">{data.totalDecisions}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Total Decisions</p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-primary">{(data.avgConfidence * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground uppercase">Avg Confidence</p>
            </div>
          </div>

          {data.topPerforming.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Top Performing
              </p>
              <div className="space-y-1.5">
                {data.topPerforming.slice(0, 3).map(a => (
                  <div key={a.agentId} className="flex items-center justify-between p-1.5 rounded bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-[11px] font-mono truncate max-w-[120px]">{a.capability}</span>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500">
                      {(a.successRate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.needsAttention.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Needs Attention
              </p>
              <div className="space-y-1.5">
                {data.needsAttention.slice(0, 3).map(a => (
                  <div key={a.agentId} className="flex items-center justify-between p-1.5 rounded bg-destructive/5 border border-destructive/10">
                    <span className="text-[11px] font-mono truncate max-w-[120px]">{a.capability}</span>
                    <Badge variant="destructive" className="text-[10px]">{a.failureCount} failures</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Table */}
      <Card className="border-border/40 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Agent Decision Detail</CardTitle>
          <CardDescription className="text-xs">Performance metrics per agent capability</CardDescription>
        </CardHeader>
        <CardContent>
          {data.decisions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No agent routing data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Capability</TableHead>
                  <TableHead className="text-xs text-right">Decisions</TableHead>
                  <TableHead className="text-xs text-right">Success</TableHead>
                  <TableHead className="text-xs text-right">Failures</TableHead>
                  <TableHead className="text-xs text-right">Confidence</TableHead>
                  <TableHead className="text-xs text-right">Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.decisions.slice(0, 10).map(a => (
                  <TableRow key={a.agentId}>
                    <TableCell className="text-xs font-mono">{a.capability.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs text-right">{a.totalDecisions}</TableCell>
                    <TableCell className="text-xs text-right text-emerald-500">{a.successCount}</TableCell>
                    <TableCell className="text-xs text-right text-destructive">{a.failureCount}</TableCell>
                    <TableCell className="text-xs text-right">{(a.avgConfidence * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant={a.successRate >= 0.7 ? "secondary" : "destructive"} className="text-[10px]">
                        {(a.successRate * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

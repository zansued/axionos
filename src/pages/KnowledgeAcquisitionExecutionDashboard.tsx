import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, BarChart3, ListChecks, PauseCircle, PlayCircle, RotateCcw, XCircle } from "lucide-react";
import { useKnowledgeAcquisitionExecution } from "@/hooks/useKnowledgeAcquisitionExecution";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const statusColor: Record<string, string> = {
  queued: "secondary",
  in_progress: "default",
  completed: "default",
  failed: "destructive",
  cancelled: "outline",
  blocked: "secondary",
  budget_blocked: "destructive",
  retry_scheduled: "secondary",
};

export default function KnowledgeAcquisitionExecutionDashboard() {
  const exec = useKnowledgeAcquisitionExecution();
  const ov = exec.overview as any;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <Zap className="h-6 w-6 text-primary" />
              Acquisition Execution Orchestrator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Execute, monitor, and control knowledge acquisition jobs</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exec.pauseAll.mutate()} disabled={exec.pauseAll.isPending}>
              <PauseCircle className="h-3.5 w-3.5 mr-1.5" />Pause All
            </Button>
            <Button size="sm" variant="outline" onClick={() => exec.resumeAll.mutate()} disabled={exec.resumeAll.isPending}>
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />Resume All
            </Button>
            <Button size="sm" onClick={() => exec.executeNext.mutate()} disabled={exec.executeNext.isPending}>
              <Zap className="h-3.5 w-3.5 mr-1.5" />{exec.executeNext.isPending ? "Executing…" : "Execute Next"}
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Jobs", value: ov.total || 0 },
            { label: "Queued", value: ov.queued || 0 },
            { label: "In Progress", value: ov.in_progress || 0 },
            { label: "Completed", value: ov.completed || 0 },
            { label: "Failed", value: ov.failed || 0 },
            { label: "Budget Blocked", value: ov.budget_blocked || 0 },
          ].map((m) => (
            <Card key={m.label} className="bg-card/50 border-border/30">
              <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
              <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{m.value}</span></CardContent>
            </Card>
          ))}
        </div>

        {/* Extended metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Total Candidates</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{ov.total_candidates || 0}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Total Absorbed</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{ov.total_absorbed || 0}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Retry Rate</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{((ov.retry_rate || 0) * 100).toFixed(0)}%</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Avg Cost</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-lg font-bold">{ov.avg_cost || 0}</span></CardContent>
          </Card>
        </div>

        {/* Budget progress */}
        {(ov.budgets || []).length > 0 && (
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Budget Usage</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(ov.budgets || []).map((b: any) => (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{b.budget_type} ({b.budget_window})</span>
                    <span>{b.budget_used}/{b.budget_limit}</span>
                  </div>
                  <Progress value={Math.min(100, (b.budget_used / Math.max(1, b.budget_limit)) * 100)} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="queue" className="text-xs gap-1.5"><ListChecks className="h-3.5 w-3.5" />Execution Queue</TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Throughput</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Acquisition Jobs</CardTitle></CardHeader>
              <CardContent>
                {exec.jobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No execution jobs yet. Enqueue a plan from the Acquisition Planner.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Mode</TableHead>
                      <TableHead className="text-xs">Priority</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Cost</TableHead>
                      <TableHead className="text-xs text-right">Absorbed</TableHead>
                      <TableHead className="text-xs text-right">Retries</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {exec.jobs.slice(0, 30).map((j: any) => (
                        <TableRow key={j.id}>
                          <TableCell className="text-xs font-medium max-w-[140px] truncate">{j.source_ref}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{j.execution_mode}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{j.priority}</Badge></TableCell>
                          <TableCell><Badge variant={(statusColor[j.status] || "outline") as any} className="text-[10px]">{j.status}</Badge></TableCell>
                          <TableCell className="text-xs text-right">{j.actual_cost || j.estimated_cost}</TableCell>
                          <TableCell className="text-xs text-right">{j.items_absorbed || 0}</TableCell>
                          <TableCell className="text-xs text-right">{j.retry_count || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {["failed", "budget_blocked"].includes(j.status) && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => exec.retryJob.mutate(j.id)}>
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                              {!["completed", "cancelled"].includes(j.status) && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => exec.cancelJob.mutate(j.id)}>
                                  <XCircle className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Throughput Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Avg Duration:</span> <span className="font-bold">{ov.avg_duration_ms || 0}ms</span></div>
                  <div><span className="text-muted-foreground">Total Candidates:</span> <span className="font-bold">{ov.total_candidates || 0}</span></div>
                  <div><span className="text-muted-foreground">Total Absorbed:</span> <span className="font-bold">{ov.total_absorbed || 0}</span></div>
                  <div><span className="text-muted-foreground">Retry Rate:</span> <span className="font-bold">{((ov.retry_rate || 0) * 100).toFixed(0)}%</span></div>
                  <div><span className="text-muted-foreground">Budget Block Rate:</span> <span className="font-bold">{((ov.budget_blocked_rate || 0) * 100).toFixed(0)}%</span></div>
                  <div><span className="text-muted-foreground">Avg Cost/Job:</span> <span className="font-bold">{ov.avg_cost || 0}</span></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  triggers: any[];
  workflows: any[];
  history: any[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border-border/20 bg-muted/10">
      <CardContent className="p-4 text-center">
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ThroughputMetrics({ triggers, workflows, history }: Props) {
  const stats = useMemo(() => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const recentTriggers = triggers.filter((t: any) => new Date(t.created_at).getTime() > thirtyDaysAgo);
    const recentWorkflows = workflows.filter((w: any) => new Date(w.created_at).getTime() > thirtyDaysAgo);
    const completed = recentWorkflows.filter((w: any) => w.status === "completed");
    const failed = recentWorkflows.filter((w: any) => w.status === "failed");
    const unresolved = triggers.filter((t: any) => t.status === "pending");
    const highPriority = triggers.filter((t: any) => t.status === "pending" && (t.strength || 0) > 0.7);

    // Avg cycle time for completed workflows
    let avgCycleMs = 0;
    if (completed.length > 0) {
      const totalMs = completed.reduce((s: number, w: any) => {
        const start = new Date(w.created_at).getTime();
        const end = new Date(w.updated_at || w.created_at).getTime();
        return s + (end - start);
      }, 0);
      avgCycleMs = totalMs / completed.length;
    }
    const avgCycleDays = avgCycleMs > 0 ? (avgCycleMs / (24 * 60 * 60 * 1000)).toFixed(1) : "—";

    const successRate = recentWorkflows.length > 0
      ? ((completed.length / recentWorkflows.length) * 100).toFixed(0)
      : "—";

    return {
      recentTriggers: recentTriggers.length,
      recentWorkflows: recentWorkflows.length,
      completed: completed.length,
      failed: failed.length,
      unresolved: unresolved.length,
      highPriority: highPriority.length,
      avgCycleDays,
      successRate,
    };
  }, [triggers, workflows, history]);

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Renewal Throughput (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Triggers Generated" value={stats.recentTriggers} />
          <StatCard label="Workflows Opened" value={stats.recentWorkflows} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Failed" value={stats.failed} />
          <StatCard label="Avg Cycle Time" value={`${stats.avgCycleDays}d`} />
          <StatCard label="Success Rate" value={`${stats.successRate}%`} />
          <StatCard label="Unresolved Stale" value={stats.unresolved} />
          <StatCard label="High Priority" value={stats.highPriority} />
        </div>
      </CardContent>
    </Card>
  );
}

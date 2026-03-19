import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UsageAnalyticsTabProps {
  sessions: any[];
  applications: any[];
  feedback: any[];
  analytics: {
    totalSessions: number;
    completedSessions: number;
    activeSessions: number;
    totalApplications: number;
    totalFeedback: number;
    avgRetrieved: number;
    avgConfidence: number;
  };
}

export function UsageAnalyticsTab({ sessions, applications, feedback, analytics }: UsageAnalyticsTabProps) {
  // Agent usage breakdown
  const agentUsage = new Map<string, { sessions: number; applied: number }>();
  sessions.forEach((s: any) => {
    const agent = s.agent_type || "unknown";
    const curr = agentUsage.get(agent) || { sessions: 0, applied: 0 };
    curr.sessions++;
    curr.applied += s.entries_applied || 0;
    agentUsage.set(agent, curr);
  });

  // Top patterns by application count
  const patternUsage = new Map<string, number>();
  applications.forEach((a: any) => {
    const entry = a.canon_entry_id || a.entry_id || "unknown";
    patternUsage.set(entry, (patternUsage.get(entry) || 0) + 1);
  });
  const topPatterns = [...patternUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Deprecated usage detection
  const deprecatedUsage = applications.filter((a: any) =>
    a.entry_lifecycle_status === "deprecated" || a.pattern_status === "deprecated"
  );

  return (
    <div className="space-y-5">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard value={analytics.totalSessions} label="Total Sessions" accent />
        <MetricCard value={analytics.completedSessions} label="Completed" success />
        <MetricCard value={analytics.totalApplications} label="Applications" accent />
        <MetricCard value={analytics.totalFeedback} label="Feedback" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard value={analytics.avgRetrieved} label="Avg Retrieved / Session" />
        <MetricCard value={analytics.avgConfidence} label="Avg Confidence" />
        <MetricCard value={analytics.activeSessions} label="Active Now" accent />
        <MetricCard
          value={deprecatedUsage.length}
          label="Deprecated Usage"
          warn={deprecatedUsage.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent Usage Panel */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Agent Canon Usage</CardTitle>
            <CardDescription className="text-xs">Pattern retrieval by agent type</CardDescription>
          </CardHeader>
          <CardContent>
            {agentUsage.size === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No agent usage data yet.</p>
            ) : (
              <div className="space-y-2">
                {[...agentUsage.entries()].map(([agent, stats]) => (
                  <div key={agent} className="flex items-center justify-between p-2 rounded border border-border/20 bg-muted/10">
                    <div>
                      <p className="text-xs font-medium">{agent}</p>
                      <p className="text-[10px] text-muted-foreground">{stats.sessions} sessions</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{stats.applied} applied</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Patterns */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Patterns Used</CardTitle>
            <CardDescription className="text-xs">Most frequently applied patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {topPatterns.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No pattern usage data yet.</p>
            ) : (
              <div className="space-y-2">
                {topPatterns.map(([id, count], i) => (
                  <div key={id} className="flex items-center justify-between p-2 rounded border border-border/20 bg-muted/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                      <span className="text-xs font-mono truncate max-w-[180px]">{id.slice(0, 12)}...</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{count}×</Badge>
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

function MetricCard({ value, label, accent, success, warn }: { value: number; label: string; accent?: boolean; success?: boolean; warn?: boolean }) {
  const color = warn ? "text-destructive" : success ? "text-emerald-400" : accent ? "text-primary" : "text-foreground";
  return (
    <Card className="border-border/30 bg-card/50">
      <CardContent className="pt-4 pb-3 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

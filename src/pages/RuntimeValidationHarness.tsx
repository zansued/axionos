import { useOrg } from "@/contexts/OrgContext";
import { useExecutionHarness } from "@/hooks/useExecutionHarness";
import { useColdStart } from "@/hooks/useColdStart";
import { ColdStartBanner } from "@/components/observability/ColdStartBanner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, Activity,
  Shield, RotateCcw, Wrench, Rocket,
} from "lucide-react";

function MetricCard({
  title, value, icon: Icon, color, subtitle,
}: {
  title: string; value: string; icon: any; color: string; subtitle?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-30`} />
        </div>
      </CardContent>
    </Card>
  );
}

function RunRow({ run }: { run: any }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded border border-border/30 text-xs">
      {run.validation_success ? (
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
      )}
      <span className="font-mono text-muted-foreground w-20 shrink-0">
        {run.stack_id}
      </span>
      <span className="flex-1 truncate text-muted-foreground">
        {run.execution_path}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {run.rollback_triggered && (
          <Badge variant="outline" className="text-[10px]">
            <RotateCcw className="h-3 w-3 mr-1" /> rollback
          </Badge>
        )}
        {run.guardrail_breach_attempts > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            <Shield className="h-3 w-3 mr-1" /> {run.guardrail_breach_attempts} breach
          </Badge>
        )}
        {run.publish_success && (
          <Badge variant="default" className="text-[10px]">
            <Rocket className="h-3 w-3 mr-1" /> published
          </Badge>
        )}
      </div>
      <span className="text-muted-foreground font-mono w-16 text-right shrink-0">
        {run.execution_duration_ms ? `${(run.execution_duration_ms / 1000).toFixed(1)}s` : "—"}
      </span>
    </div>
  );
}

export default function RuntimeValidationHarness() {
  const { currentOrg } = useOrg();
  const { data: metrics, isLoading } = useExecutionHarness(currentOrg?.id || null);
  const { data: coldStart } = useColdStart();

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Runtime Validation Harness
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sprint 123 — Controlled execution telemetry and aggregated metrics
            </p>
          </div>

          {coldStart?.is_cold_start && (
            <ColdStartBanner label={coldStart.label} summary={coldStart.summary} signals={coldStart.signals} />
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !metrics || metrics.total_runs === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No execution runs recorded yet. Use the harness edge function to submit runs.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard
                  title="Validation Success"
                  value={pct(metrics.system_validation_success_rate)}
                  icon={CheckCircle2}
                  color="text-primary"
                  subtitle={`${metrics.total_runs} runs`}
                />
                <MetricCard
                  title="Rollback Rate"
                  value={pct(metrics.rollback_rate)}
                  icon={RotateCcw}
                  color={metrics.rollback_rate > 0.2 ? "text-destructive" : "text-muted-foreground"}
                />
                <MetricCard
                  title="Repair Success"
                  value={pct(metrics.repair_success_rate)}
                  icon={Wrench}
                  color="text-accent-foreground"
                />
                <MetricCard
                  title="Guardrail Breaches"
                  value={pct(metrics.guardrail_breach_rate)}
                  icon={Shield}
                  color={metrics.guardrail_breach_rate > 0 ? "text-destructive" : "text-primary"}
                />
                <MetricCard
                  title="Publish Reliability"
                  value={pct(metrics.publish_reliability)}
                  icon={Rocket}
                  color="text-primary"
                />
              </div>

              {/* Progress bars */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm font-display">Metric Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Validation Success", val: metrics.system_validation_success_rate },
                    { label: "Publish Reliability", val: metrics.publish_reliability },
                    { label: "Repair Effectiveness", val: metrics.repair_success_rate },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{m.label}</span>
                        <span>{pct(m.val)}</span>
                      </div>
                      <Progress value={m.val * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent runs */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm font-display">Recent Runs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {metrics.runs.map((run: any) => (
                    <RunRow key={run.id} run={run} />
                  ))}
                </CardContent>
              </Card>
            </>
          )}
      </div>
    </AppShell>
  );
}

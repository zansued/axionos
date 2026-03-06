import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, Clock, DollarSign, CheckCircle2, XCircle, RotateCcw, Wrench, Rocket, BarChart3 } from "lucide-react";
import { useInitiativeObservability } from "@/hooks/useInitiativeObservability";

const OUTCOME_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  deployed: { label: "Deployed", variant: "default" },
  repository_ready: { label: "Repo Ready", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
  partially_completed: { label: "Partial", variant: "secondary" },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function RateBar({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

export function InitiativeObservabilityCard({ initiativeId }: { initiativeId: string }) {
  const { data: metrics, isLoading, refetch } = useInitiativeObservability(initiativeId);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" /> Product Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-2">No metrics computed yet</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <BarChart3 className="h-3 w-3 mr-1" /> Compute Metrics
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const outcome = OUTCOME_LABELS[metrics.initiative_outcome_status] || OUTCOME_LABELS.in_progress;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Product Metrics
          </CardTitle>
          <Badge variant={outcome.variant} className="text-[10px]">
            {outcome.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Rates */}
        <div className="space-y-2">
          <RateBar value={metrics.pipeline_success_rate} label="Pipeline Success" />
          <RateBar value={metrics.build_success_rate} label="Build Success" />
          <RateBar value={metrics.deploy_success_rate} label="Deploy Success" />
        </div>

        {/* Time & Cost Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            icon={Clock}
            label="Idea → Repo"
            value={formatDuration(metrics.time_idea_to_repo_seconds)}
          />
          <MetricTile
            icon={Rocket}
            label="Idea → Deploy"
            value={formatDuration(metrics.time_idea_to_deploy_seconds)}
          />
          <MetricTile
            icon={DollarSign}
            label="Total Cost"
            value={`$${metrics.cost_per_initiative_usd.toFixed(4)}`}
          />
          <MetricTile
            icon={BarChart3}
            label="Tokens"
            value={metrics.tokens_total.toLocaleString()}
          />
        </div>

        {/* Retry & Repair */}
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            icon={RotateCcw}
            label="Retries"
            value={String(metrics.average_retries_per_initiative)}
          />
          <MetricTile
            icon={Wrench}
            label="Auto-Repair"
            value={`${metrics.automatic_repair_success_rate}%`}
          />
        </div>

        {/* Stage Failures */}
        {Object.keys(metrics.stage_failure_distribution).length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Failures by Stage</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(metrics.stage_failure_distribution).map(([stage, count]) => (
                <Badge key={stage} variant="destructive" className="text-[9px]">
                  {stage}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Models Used */}
        {metrics.models_used.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Models</p>
            <div className="flex flex-wrap gap-1">
              {metrics.models_used.map((m) => (
                <Badge key={m} variant="outline" className="text-[9px]">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => refetch()}>
          <RotateCcw className="h-3 w-3 mr-1" /> Refresh Metrics
        </Button>
      </CardContent>
    </Card>
  );
}

function MetricTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
      <p className="text-xs font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

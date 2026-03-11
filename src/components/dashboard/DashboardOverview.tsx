/**
 * DashboardOverview — System status bar and KPI grid.
 * Phase 3: Now consumes metrics via the Metric Data Contract.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Activity, Cpu, CheckCircle2, Clock, GitBranch, Bot,
  TrendingUp, TrendingDown, Minus, Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { useResolvedMetrics } from "@/hooks/useResolvedMetrics";
import type { Metric } from "@/lib/metrics";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function StatusDot({ status }: { status: "healthy" | "warning" | "critical" | "idle" }) {
  const colors = {
    healthy: "bg-success",
    warning: "bg-warning",
    critical: "bg-destructive",
    idle: "bg-muted-foreground",
  };
  return (
    <span className="relative flex h-2 w-2">
      {status === "healthy" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colors[status]}`} />
    </span>
  );
}

/** Visual badge for mock/simulated metrics */
function SourceBadge({ metric }: { metric: Metric }) {
  if (metric.source === "mock") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[8px] px-1 py-0 border-warning/30 text-warning/70 font-normal ml-1">
              Simulated
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px] text-xs">
            {metric.explanation || "This metric is using placeholder data."}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (metric.source === "calculated" && metric.explanation) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-2.5 w-2.5 text-muted-foreground/50 ml-1 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            {metric.explanation}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
}

function MetricCard({
  title, value, subtitle, icon: Icon, trend, metric,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  metric?: Metric;
}) {
  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 hover:border-border/60 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div className="flex items-center">
            <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </CardTitle>
            {metric && <SourceBadge metric={metric} />}
          </div>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-display tracking-tight">{value}</span>
            {trend && (
              <span className={`flex items-center text-xs ${
                trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              }`}>
                {trend === "up" ? <TrendingUp className="h-3 w-3 mr-0.5" /> :
                 trend === "down" ? <TrendingDown className="h-3 w-3 mr-0.5" /> :
                 <Minus className="h-3 w-3 mr-0.5" />}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SystemStatusBar() {
  const { getMetric } = useResolvedMetrics();
  const uptime = getMetric("system_uptime");
  const latency = getMetric("system_latency");
  const incident = getMetric("last_incident");

  const isMock = uptime?.source === "mock";

  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <StatusDot status="healthy" />
                <span className="text-xs font-medium">System Operational</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Uptime: {uptime?.value ?? "—"}</span>
                <span>Latency: {latency?.value ?? "—"}</span>
                <span>Last incident: {incident?.value ?? "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isMock && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 border-warning/30 text-warning/70 font-normal">
                  Simulated
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                All Systems Normal
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function KPIGrid() {
  const { getMetric } = useResolvedMetrics();

  const initiatives = getMetric("total_initiatives");
  const deployed = getMetric("deployed_initiatives");
  const agents = getMetric("active_agents");
  const pipelineRate = getMetric("pipeline_success_rate");
  const deployRate = getMetric("deploy_success_rate");
  const cost = getMetric("monthly_cost");
  const review = getMetric("pending_review");

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        title="Initiatives"
        value={initiatives?.value ?? 0}
        subtitle={`${deployed?.value ?? 0} deployed`}
        icon={GitBranch}
        trend={initiatives?.trend}
        metric={initiatives}
      />
      <MetricCard
        title="Active Agents"
        value={agents?.value ?? 0}
        subtitle="with deliveries"
        icon={Bot}
        trend={agents?.trend}
        metric={agents}
      />
      <MetricCard
        title="Pipeline Rate"
        value={pipelineRate?.value !== undefined && pipelineRate?.value !== "—" ? `${pipelineRate.value}%` : "—"}
        subtitle="success rate"
        icon={Activity}
        trend={pipelineRate?.trend}
        metric={pipelineRate}
      />
      <MetricCard
        title="Validation"
        value={deployRate?.value !== undefined && deployRate?.value !== "—" ? `${deployRate.value}%` : "—"}
        subtitle="deploy success"
        icon={CheckCircle2}
        trend={deployRate?.trend}
        metric={deployRate}
      />
      <MetricCard
        title="Monthly Cost"
        value={cost?.value !== undefined && cost?.value !== "—" ? `$${Number(cost.value).toFixed(2)}` : "—"}
        subtitle="accumulated"
        icon={Cpu}
        trend={cost?.trend}
        metric={cost}
      />
      <MetricCard
        title="Pending Review"
        value={review?.value ?? 0}
        subtitle="artifacts waiting"
        icon={Clock}
        trend={review?.trend}
        metric={review}
      />
    </div>
  );
}

export { StatusDot, MetricCard, SourceBadge };

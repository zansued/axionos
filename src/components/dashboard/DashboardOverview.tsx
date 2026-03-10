/**
 * DashboardOverview — System status bar and KPI grid.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Activity, Cpu, CheckCircle2, Clock, GitBranch, Bot,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { useProductDashboard } from "@/hooks/useProductDashboard";

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

function MetricCard({
  title, value, subtitle, icon: Icon, trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 hover:border-border/60 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
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
                <span>Uptime: 99.97%</span>
                <span>Latency: 42ms</span>
                <span>Last incident: 3d ago</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-success/30 text-success">
              All Systems Normal
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function KPIGrid() {
  const { data: kpis } = useDashboardKPIs();
  const { data: product } = useProductDashboard();

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        title="Initiatives"
        value={product?.totalInitiatives ?? 0}
        subtitle={`${product?.deployedCount ?? 0} deployed`}
        icon={GitBranch}
        trend="up"
      />
      <MetricCard
        title="Active Agents"
        value={kpis?.topAgents.length ?? 0}
        subtitle="with deliveries"
        icon={Bot}
        trend="neutral"
      />
      <MetricCard
        title="Pipeline Rate"
        value={`${product?.pipelineSuccessRate ?? 0}%`}
        subtitle="success rate"
        icon={Activity}
        trend="up"
      />
      <MetricCard
        title="Validation"
        value={`${product?.deploySuccessRate ?? 0}%`}
        subtitle="deploy success"
        icon={CheckCircle2}
        trend="up"
      />
      <MetricCard
        title="Monthly Cost"
        value={`$${(product?.monthlyCost ?? 0).toFixed(2)}`}
        subtitle="accumulated"
        icon={Cpu}
        trend="neutral"
      />
      <MetricCard
        title="Pending Review"
        value={kpis?.pendingReview ?? 0}
        subtitle="artifacts waiting"
        icon={Clock}
        trend={kpis?.pendingReview && kpis.pendingReview > 5 ? "down" : "neutral"}
      />
    </div>
  );
}

export { StatusDot, MetricCard };

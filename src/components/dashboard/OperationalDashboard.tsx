/**
 * OperationalDashboard — Main AxionOS operational control view.
 * Infrastructure-grade dashboard with system overview, runtime activity,
 * governance posture, and observability metrics.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import {
  Activity, Shield, Cpu, Zap, AlertTriangle,
  CheckCircle2, Clock, ArrowUpRight, BarChart3,
  GitBranch, Eye, Settings, Plus, Bot, Search,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { useProductDashboard } from "@/hooks/useProductDashboard";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
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

function SystemStatusBar() {
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

function GovernancePanel() {
  const items_data = [
    { label: "Pending Approvals", count: 3, severity: "warning" as const },
    { label: "Blocked Actions", count: 1, severity: "critical" as const },
    { label: "Policy Violations", count: 0, severity: "healthy" as const },
    { label: "Autonomy Score", count: "87%", severity: "healthy" as const },
  ];

  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-axion-purple" />
              Governance & Autonomy
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              View All <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items_data.map((g) => (
            <div key={g.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={g.severity} />
                <span className="text-xs">{g.label}</span>
              </div>
              <span className={`text-xs font-mono font-medium ${
                g.severity === "critical" ? "text-destructive" :
                g.severity === "warning" ? "text-warning" : "text-muted-foreground"
              }`}>
                {g.count}
              </span>
            </div>
          ))}
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Doctrine Compliance</span>
              <span className="font-mono">94%</span>
            </div>
            <Progress value={94} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RuntimeActivity() {
  const events = [
    { id: 1, type: "deploy", label: "Initiative #142 deployed", time: "2m ago", status: "success" as const },
    { id: 2, type: "repair", label: "Auto-repair on pipeline #67", time: "8m ago", status: "warning" as const },
    { id: 3, type: "validation", label: "Validation passed: Story #891", time: "12m ago", status: "success" as const },
    { id: 4, type: "alert", label: "Agent latency spike detected", time: "18m ago", status: "warning" as const },
    { id: 5, type: "rollback", label: "Rollback: Initiative #139", time: "1h ago", status: "critical" as const },
    { id: 6, type: "deploy", label: "Initiative #141 deployed", time: "2h ago", status: "success" as const },
  ];

  const statusIcon = {
    success: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
    critical: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  };

  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-axion-cyan" />
              Runtime Activity
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              Live View <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors">
                {statusIcon[e.status]}
                <span className="text-xs flex-1 truncate">{e.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{e.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: "New Project", icon: Plus, action: () => navigate("/initiatives") },
    { label: "Inspect Agents", icon: Bot, action: () => navigate("/agents") },
    { label: "Observability", icon: Eye, action: () => navigate("/system-health") },
    { label: "Governance", icon: Shield, action: () => navigate("/autonomy-posture") },
    { label: "Runtime Logs", icon: Search, action: () => navigate("/observability") },
  ];

  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-axion-orange" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {actions.map((a) => (
              <Button
                key={a.label}
                variant="outline"
                size="sm"
                className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs border-border/40 hover:border-primary/30 hover:bg-primary/5"
                onClick={a.action}
              >
                <a.icon className="h-4 w-4 text-muted-foreground" />
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ObservabilityMini() {
  const bars = [65, 82, 45, 91, 73, 88, 56, 94, 77, 69, 85, 92];

  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Pipeline Throughput
            </CardTitle>
            <span className="text-xs text-muted-foreground">Last 24h</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-20">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/20 hover:bg-primary/40 transition-colors"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Avg: 78%</span>
            <span>Peak: 94%</span>
            <span>Errors: 2</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function OperationalDashboard() {
  const { data: kpis } = useDashboardKPIs();
  const { data: product } = useProductDashboard();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 max-w-[1600px]"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">System overview and operational intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Badge>
        </div>
      </div>

      {/* System Status */}
      <SystemStatusBar />

      {/* KPI Grid */}
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

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <RuntimeActivity />
          <ObservabilityMini />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <GovernancePanel />
          <QuickActions />
        </div>
      </div>
    </motion.div>
  );
}

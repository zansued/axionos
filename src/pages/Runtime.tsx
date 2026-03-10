/**
 * Runtime — Post-deploy monitoring surface.
 * Shows deployed software health, active instances, and runtime status.
 * The user's journey ends here: Idea → Deploy → Runtime.
 */

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Radio, CheckCircle2, AlertTriangle, Activity,
  ArrowUpRight, Clock, Server, Shield,
} from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function StatusDot({ status }: { status: "healthy" | "warning" | "critical" }) {
  const colors = {
    healthy: "bg-success",
    warning: "bg-warning",
    critical: "bg-destructive",
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

function DeployedInstance({ name, status, uptime, lastDeploy }: {
  name: string;
  status: "healthy" | "warning" | "critical";
  uptime: string;
  lastDeploy: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <StatusDot status={status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">Uptime: {uptime}</p>
      </div>
      <div className="text-right shrink-0">
        <Badge variant="outline" className={`text-[10px] ${
          status === "healthy" ? "border-success/30 text-success" :
          status === "warning" ? "border-warning/30 text-warning" :
          "border-destructive/30 text-destructive"
        }`}>
          {status === "healthy" ? "Running" : status === "warning" ? "Degraded" : "Down"}
        </Badge>
        <p className="text-[10px] text-muted-foreground mt-0.5">{lastDeploy}</p>
      </div>
    </div>
  );
}

export default function Runtime() {
  return (
    <AppLayout>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4 max-w-[1400px]"
      >
        {/* Header */}
        <div>
          <h1 className="text-xl font-display font-semibold tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Runtime
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your deployed software — live and monitored by AxionOS
          </p>
        </div>

        {/* Global Status */}
        <motion.div variants={item}>
          <Card className="border-border/40 bg-card/80">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <StatusDot status="healthy" />
                    <span className="text-xs font-medium">All Systems Operational</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Server className="h-3 w-3" /> 3 active</span>
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Protected</span>
                    <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> 42ms avg</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                  99.97% Uptime
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deployed Instances */}
        <motion.div variants={item}>
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  Deployed Instances
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <DeployedInstance
                name="Initiative #142 — E-commerce Platform"
                status="healthy"
                uptime="14d 6h"
                lastDeploy="2m ago"
              />
              <DeployedInstance
                name="Initiative #141 — Analytics Dashboard"
                status="healthy"
                uptime="3d 12h"
                lastDeploy="2h ago"
              />
              <DeployedInstance
                name="Initiative #139 — API Gateway"
                status="warning"
                uptime="1d 4h"
                lastDeploy="1h ago (rollback)"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Events */}
        <motion.div variants={item}>
          <Card className="border-border/40 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-axion-cyan" />
                Recent Runtime Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {[
                  { icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" />, label: "Initiative #142 deployed successfully", time: "2m ago" },
                  { icon: <Activity className="h-3.5 w-3.5 text-primary" />, label: "Auto-scaling triggered for #141", time: "15m ago" },
                  { icon: <AlertTriangle className="h-3.5 w-3.5 text-warning" />, label: "Rollback executed for Initiative #139", time: "1h ago" },
                  { icon: <CheckCircle2 className="h-3.5 w-3.5 text-success" />, label: "Health check passed: all endpoints", time: "1h ago" },
                  { icon: <Shield className="h-3.5 w-3.5 text-axion-purple" />, label: "Security scan completed — no issues", time: "2h ago" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors">
                    {e.icon}
                    <span className="text-xs flex-1 truncate">{e.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{e.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Autonomous note */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <Separator orientation="vertical" className="h-4 bg-primary/30" />
            <p className="text-[11px] text-muted-foreground">
              AxionOS continuously monitors your runtime — observability, learning, and optimization run autonomously in the background.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

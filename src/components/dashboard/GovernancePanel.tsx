/**
 * GovernancePanel — Governance posture summary.
 * Phase 3: Now consumes metrics via the Metric Data Contract.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Shield, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { StatusDot } from "./DashboardOverview";
import { useResolvedMetrics } from "@/hooks/useResolvedMetrics";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function metricSeverity(value: number | string): "healthy" | "warning" | "critical" {
  if (typeof value === "string") return "healthy";
  if (value === 0) return "healthy";
  if (value <= 2) return "warning";
  return "critical";
}

export function GovernancePanel() {
  const { getMetric } = useResolvedMetrics();

  const approvals = getMetric("pending_approvals");
  const blocked = getMetric("blocked_actions");
  const violations = getMetric("policy_violations");
  const autonomy = getMetric("autonomy_score");
  const doctrine = getMetric("doctrine_compliance");

  const items_data = [
    { label: "Pending Approvals", metric: approvals, severity: metricSeverity(approvals?.value ?? 0) },
    { label: "Blocked Actions", metric: blocked, severity: metricSeverity(blocked?.value ?? 0) },
    { label: "Policy Violations", metric: violations, severity: metricSeverity(violations?.value ?? 0) },
    { label: "Autonomy Score", metric: autonomy, severity: "healthy" as const },
  ];

  const isMock = approvals?.source === "mock";

  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-axion-purple" />
                Governance & Autonomy
              </CardTitle>
              {isMock && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 border-warning/30 text-warning/70 font-normal">
                  Simulated
                </Badge>
              )}
            </div>
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
                {g.metric?.source === "mock" && g.metric?.explanation && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[8px] text-muted-foreground/50 cursor-help">ⓘ</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px] text-xs">
                        {g.metric.explanation}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <span className={`text-xs font-mono font-medium ${
                g.severity === "critical" ? "text-destructive" :
                g.severity === "warning" ? "text-warning" : "text-muted-foreground"
              }`}>
                {g.metric?.value ?? "—"}
              </span>
            </div>
          ))}
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Doctrine Compliance</span>
                {doctrine?.source === "mock" && (
                  <Badge variant="outline" className="text-[7px] px-0.5 py-0 border-warning/30 text-warning/70 font-normal">
                    sim
                  </Badge>
                )}
              </div>
              <span className="font-mono">{doctrine?.value ?? "—"}%</span>
            </div>
            <Progress value={typeof doctrine?.value === "number" ? doctrine.value : 0} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

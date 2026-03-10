/**
 * GovernancePanel — Governance posture summary with pending approvals, policy status, and autonomy score.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Shield, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { StatusDot } from "./DashboardOverview";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export function GovernancePanel() {
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

/**
 * RuntimeActivity — Live event feed for pipeline executions, repairs, and deployments.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export function RuntimeActivity() {
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

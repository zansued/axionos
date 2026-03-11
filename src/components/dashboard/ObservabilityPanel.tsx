/**
 * ObservabilityPanel — Mini throughput chart and quick actions for the dashboard.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Zap, Plus, Bot, Eye, Radio, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export function ObservabilityMini() {
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

export function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: "New Project", icon: Plus, action: () => navigate("/builder/projects") },
    { label: "Inspect Agents", icon: Bot, action: () => navigate("/builder/agents") },
    { label: "Runtime", icon: Radio, action: () => navigate("/builder/runtime") },
    { label: "Observability", icon: Eye, action: () => navigate("/builder/execution-observability") },
    { label: "Intelligence", icon: Sparkles, action: () => navigate("/builder/system-intelligence") },
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

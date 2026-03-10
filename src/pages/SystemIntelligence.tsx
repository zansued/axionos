/**
 * SystemIntelligence — Autonomous infrastructure insights.
 * Advisory-only surface showing what AxionOS learns and optimizes automatically.
 * The user does not operate these — they observe autonomous intelligence at work.
 */

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, TrendingUp, Brain, Lightbulb, Shield,
  Activity, Gauge, GitBranch, Cpu,
} from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function InsightCard({ title, description, icon: Icon, category, confidence }: {
  title: string;
  description: string;
  icon: React.ElementType;
  category: string;
  confidence: number;
}) {
  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 hover:border-border/60 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              {category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{confidence}%</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SystemIntelligence() {
  const insights = [
    {
      title: "Architecture Optimization Available",
      description: "Based on runtime patterns, the API Gateway module in Initiative #142 could benefit from connection pooling. Estimated latency reduction: 23%.",
      icon: GitBranch,
      category: "Architecture",
      confidence: 87,
    },
    {
      title: "Pipeline Efficiency Improving",
      description: "Validation pass rate has increased from 82% to 94% over the last 30 days. The repair loop has resolved 12 issues autonomously.",
      icon: TrendingUp,
      category: "Performance",
      confidence: 95,
    },
    {
      title: "Usage Pattern Detected",
      description: "Peak usage for Initiative #141 occurs between 14:00–16:00 UTC. Auto-scaling rules have been optimized accordingly.",
      icon: Activity,
      category: "Usage",
      confidence: 91,
    },
    {
      title: "Learning Signal: Error Pattern",
      description: "A recurring timeout pattern was detected in database queries. The system has catalogued this as a known pattern and applied a preventive rule.",
      icon: Brain,
      category: "Learning",
      confidence: 83,
    },
    {
      title: "Deployment Health Score",
      description: "Overall deployment health is at 96%. All rollback mechanisms are active and tested. No governance violations detected.",
      icon: Shield,
      category: "Health",
      confidence: 96,
    },
    {
      title: "Cost Optimization Opportunity",
      description: "Agent routing analysis suggests switching to economy-tier models for classification tasks could save ~18% on monthly compute costs.",
      icon: Cpu,
      category: "Optimization",
      confidence: 78,
    },
  ];

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
            <Sparkles className="h-5 w-5 text-primary" />
            System Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Autonomous insights — AxionOS continuously learns, optimizes, and evolves your infrastructure
          </p>
        </div>

        {/* Autonomous status */}
        <motion.div variants={item}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs font-medium">Autonomous Intelligence Active</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> 6 active insights</span>
                  <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> 142 patterns learned</span>
                  <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" /> 3 optimizations applied today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Insights Grid */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight) => (
            <InsightCard key={insight.title} {...insight} />
          ))}
        </div>

        {/* Advisory note */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
            <Separator orientation="vertical" className="h-4 bg-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground">
              These insights are generated autonomously. AxionOS observes, learns, and optimizes — you focus on building.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

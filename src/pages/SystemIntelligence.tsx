/**
 * SystemIntelligence — Autonomous infrastructure insights.
 * Advisory-only surface showing what AxionOS learns and optimizes automatically.
 */

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, TrendingUp, Brain, Lightbulb, Shield,
  Activity, Gauge, GitBranch, Cpu,
} from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

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
  const { t } = useI18n();

  const insights = [
    {
      title: t("sysIntel.archOptTitle"),
      description: t("sysIntel.archOptDesc"),
      icon: GitBranch,
      category: t("sysIntel.catArchitecture"),
      confidence: 87,
    },
    {
      title: t("sysIntel.pipelineTitle"),
      description: t("sysIntel.pipelineDesc"),
      icon: TrendingUp,
      category: t("sysIntel.catPerformance"),
      confidence: 95,
    },
    {
      title: t("sysIntel.usageTitle"),
      description: t("sysIntel.usageDesc"),
      icon: Activity,
      category: t("sysIntel.catUsage"),
      confidence: 91,
    },
    {
      title: t("sysIntel.learningTitle"),
      description: t("sysIntel.learningDesc"),
      icon: Brain,
      category: t("sysIntel.catLearning"),
      confidence: 83,
    },
    {
      title: t("sysIntel.healthTitle"),
      description: t("sysIntel.healthDesc"),
      icon: Shield,
      category: t("sysIntel.catHealth"),
      confidence: 96,
    },
    {
      title: t("sysIntel.costTitle"),
      description: t("sysIntel.costDesc"),
      icon: Cpu,
      category: t("sysIntel.catOptimization"),
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
            {t("sysIntel.title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sysIntel.subtitle")}
          </p>
        </div>

        {/* Autonomous status */}
        <motion.div variants={item}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-xs font-medium">{t("sysIntel.statusActive")}</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3" /> 6 {t("sysIntel.activeInsights")}</span>
                  <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> 142 {t("sysIntel.patternsLearned")}</span>
                  <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" /> 3 {t("sysIntel.optimizationsToday")}</span>
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
              {t("sysIntel.advisoryNote")}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

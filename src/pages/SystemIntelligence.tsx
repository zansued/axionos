/**
 * SystemIntelligence — Real data-driven system insights.
 * Advisory-only surface showing derived intelligence from actual system state.
 */

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, TrendingUp, Brain, Lightbulb, Shield,
  Activity, Gauge, GitBranch, Cpu, BookOpen, Loader2, AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { useSystemIntelligenceData, type SystemInsight } from "@/hooks/useSystemIntelligenceData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const iconMap: Record<SystemInsight["iconKey"], React.ElementType> = {
  knowledge: BookOpen,
  quality: TrendingUp,
  learning: Brain,
  cost: Cpu,
  delivery: Shield,
  coverage: GitBranch,
  health: Activity,
  pattern: Lightbulb,
};

function formatInsightDescription(raw: string, locale: string): string {
  const [key, ...params] = raw.split("|");
  const ptBR: Record<string, (...args: string[]) => string> = {
    "sysIntel.insight.knowledgeDesc": (total, nodes, rate) =>
      `${total} entradas canônicas com ${nodes} nós no grafo de conhecimento. Taxa de aprovação: ${rate}%.`,
    "sysIntel.insight.qualityDesc": (approved, total, rate, pending) =>
      `${approved} de ${total} outputs aprovados (${rate}%). ${pending} aguardando revisão.`,
    "sysIntel.insight.learningDesc": (total, types, topType, topCount) =>
      `${total} sinais de aprendizado capturados em ${types} categorias. Principal: ${topType} (${topCount} ocorrências).`,
    "sysIntel.insight.costDesc": (cost, count, tokens, avg) =>
      `Custo total acumulado: $${cost} em ${count} outputs. ${tokens} tokens consumidos. Média: $${avg}/output.`,
    "sysIntel.insight.deliveryDesc": (initiatives, completed, doneStories, totalStories) =>
      `${initiatives} iniciativas (${completed} concluídas). ${doneStories} de ${totalStories} stories finalizadas.`,
    "sysIntel.insight.coverageDesc": (domains, nodes, topDomain, topCount) =>
      `${domains} domínios cobertos com ${nodes} padrões mapeados. Domínio líder: ${topDomain} (${topCount} padrões).`,
  };
  const enUS: Record<string, (...args: string[]) => string> = {
    "sysIntel.insight.knowledgeDesc": (total, nodes, rate) =>
      `${total} canon entries with ${nodes} nodes in the knowledge graph. Approval rate: ${rate}%.`,
    "sysIntel.insight.qualityDesc": (approved, total, rate, pending) =>
      `${approved} of ${total} outputs approved (${rate}%). ${pending} pending review.`,
    "sysIntel.insight.learningDesc": (total, types, topType, topCount) =>
      `${total} learning signals captured across ${types} categories. Top: ${topType} (${topCount} occurrences).`,
    "sysIntel.insight.costDesc": (cost, count, tokens, avg) =>
      `Total accumulated cost: $${cost} across ${count} outputs. ${tokens} tokens consumed. Average: $${avg}/output.`,
    "sysIntel.insight.deliveryDesc": (initiatives, completed, doneStories, totalStories) =>
      `${initiatives} initiatives (${completed} completed). ${doneStories} of ${totalStories} stories done.`,
    "sysIntel.insight.coverageDesc": (domains, nodes, topDomain, topCount) =>
      `${domains} domains covered with ${nodes} mapped patterns. Leading domain: ${topDomain} (${topCount} patterns).`,
  };
  const dict = locale === "pt-BR" ? ptBR : enUS;
  const fn = dict[key];
  return fn ? fn(...params) : raw;
}

function InsightCard({ insight, locale, categoryLabel }: {
  insight: SystemInsight;
  locale: string;
  categoryLabel: string;
}) {
  const Icon = iconMap[insight.iconKey] ?? Activity;
  const description = formatInsightDescription(insight.description, locale);

  return (
    <motion.div variants={item}>
      <Card className="border-border/40 bg-card/80 hover:border-border/60 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">{categoryLabel}</CardTitle>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">
              {categoryLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${insight.confidence}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{insight.confidence}%</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SystemIntelligence() {
  const { t, locale } = useI18n();
  const { insights, summary, loading, error } = useSystemIntelligenceData();

  // Resolve category labels from i18n keys
  const resolveCategoryLabel = (catKey: string): string => {
    try {
      return t(catKey as any);
    } catch {
      return catKey;
    }
  };

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

        {/* Status bar */}
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
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> {summary.totalInsights} {t("sysIntel.activeInsights")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" /> {summary.patternsLearned} {t("sysIntel.patternsLearned")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> {summary.dataSourcesActive} {t("sysIntel.dataSources")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading state */}
        {loading && (
          <motion.div variants={item} className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div variants={item}>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-destructive">{error}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && !error && insights.length === 0 && (
          <motion.div variants={item}>
            <Card className="border-border/40 bg-card/80">
              <CardContent className="py-8 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("sysIntel.noData")}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Insights Grid — real data */}
        {!loading && insights.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                locale={locale}
                categoryLabel={resolveCategoryLabel(insight.category)}
              />
            ))}
          </div>
        )}

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

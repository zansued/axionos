import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, DollarSign, ThumbsUp, Users, Activity } from "lucide-react";
import { motion } from "framer-motion";
import type { DashboardKPIs } from "@/hooks/useDashboardKPIs";

const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function KPICards({ kpis }: { kpis: DashboardKPIs }) {
  const cards = [
    {
      title: "Concluídas",
      value: `${kpis.storiesDone} / ${kpis.storiesTotal}`,
      subtitle: kpis.storiesTotal > 0 ? `${Math.round((kpis.storiesDone / kpis.storiesTotal) * 100)}% completo` : "Nenhuma story",
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      title: "Revisão",
      value: kpis.pendingReview,
      subtitle: "artefatos aguardando",
      icon: Clock,
      color: "text-warning",
    },
    {
      title: "Custo Mês",
      value: `$${kpis.monthlyCost.toFixed(4)}`,
      subtitle: "estimativa acumulada",
      icon: DollarSign,
      color: "text-accent",
    },
    {
      title: "Aprovação",
      value: `${kpis.approvalRate.toFixed(0)}%`,
      subtitle: `${kpis.totalReviewed} revisados`,
      icon: ThumbsUp,
      color: "text-primary",
    },
    {
      title: "Agentes",
      value: kpis.topAgents.length,
      subtitle: "ativos com entregas",
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((card, i) => (
        <motion.div key={card.title} variants={item}>
          <Card className="border-border/50 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate mr-2">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 shrink-0 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display truncate">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{card.subtitle}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

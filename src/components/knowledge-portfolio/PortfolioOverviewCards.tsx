import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Layers, AlertTriangle, Scale, Database, TrendingDown } from "lucide-react";

interface Props {
  snapshot: any;
}

export function PortfolioOverviewCards({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma análise de portfólio ainda. Execute uma análise para ver os indicadores.
      </div>
    );
  }

  const cards = [
    {
      title: "Portfolio Score",
      value: `${(snapshot.portfolio_score * 100).toFixed(0)}%`,
      icon: BarChart3,
      color: snapshot.portfolio_score > 0.7 ? "text-success" : snapshot.portfolio_score > 0.4 ? "text-warning" : "text-destructive",
    },
    {
      title: "Cobertura",
      value: `${(snapshot.coverage_score * 100).toFixed(0)}%`,
      icon: Layers,
      color: snapshot.coverage_score > 0.6 ? "text-success" : "text-warning",
    },
    {
      title: "Redundância",
      value: `${(snapshot.redundancy_score * 100).toFixed(0)}%`,
      icon: AlertTriangle,
      color: snapshot.redundancy_score < 0.3 ? "text-success" : "text-warning",
    },
    {
      title: "Equilíbrio",
      value: `${(snapshot.balance_score * 100).toFixed(0)}%`,
      icon: Scale,
      color: snapshot.balance_score > 0.6 ? "text-success" : "text-warning",
    },
    {
      title: "Diversidade",
      value: `${(snapshot.source_diversity_score * 100).toFixed(0)}%`,
      icon: Database,
      color: snapshot.source_diversity_score > 0.5 ? "text-success" : "text-warning",
    },
    {
      title: "Stale Ratio",
      value: `${(snapshot.stale_ratio * 100).toFixed(0)}%`,
      icon: TrendingDown,
      color: snapshot.stale_ratio < 0.2 ? "text-success" : snapshot.stale_ratio < 0.4 ? "text-warning" : "text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <Card key={c.title} className="bg-card/50 border-border/30">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <c.icon className="h-3 w-3" />
              {c.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className={`text-xl font-bold ${c.color}`}>{c.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

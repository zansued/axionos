import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Layers, Link2, Target, AlertTriangle, Package } from "lucide-react";

interface Props {
  summary: any;
}

export function CapabilitySummaryCards({ summary }: Props) {
  if (!summary) return null;

  const cards = [
    { title: "Capacidades", value: summary.unique_capabilities, icon: Target, color: "text-primary" },
    { title: "Soberanas", value: summary.sovereign_capabilities, icon: Shield, color: "text-success" },
    { title: "Maturidade Média", value: `${(summary.avg_maturity * 100).toFixed(0)}%`, icon: Layers, color: summary.avg_maturity > 0.6 ? "text-success" : "text-warning" },
    { title: "Skills Aprovadas", value: summary.approved_skills, icon: Link2, color: "text-primary" },
    { title: "Sem Vínculo", value: summary.unbound_approved_skills, icon: AlertTriangle, color: summary.unbound_approved_skills > 0 ? "text-warning" : "text-success" },
    { title: "Bundles Ativos", value: summary.active_bundles, icon: Package, color: "text-primary" },
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

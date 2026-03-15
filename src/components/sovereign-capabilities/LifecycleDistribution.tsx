import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  distribution: Record<string, number> | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprovadas", color: "bg-success" },
  pending_review: { label: "Em Revisão", color: "bg-warning" },
  extracted: { label: "Extraídas", color: "bg-primary" },
  rejected: { label: "Rejeitadas", color: "bg-destructive" },
};

export function LifecycleDistribution({ distribution }: Props) {
  if (!distribution) return null;

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <Card className="border-border/30 bg-card/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Ciclo de Vida das Skills</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex rounded-full h-3 overflow-hidden mb-3">
          {Object.entries(distribution).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg || count === 0) return null;
            return (
              <div
                key={status}
                className={`${cfg.color} transition-all`}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${cfg.label}: ${count}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(distribution).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg) return null;
            return (
              <div key={status} className="flex items-center gap-1.5 text-xs">
                <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                <span className="text-muted-foreground">{cfg.label}</span>
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

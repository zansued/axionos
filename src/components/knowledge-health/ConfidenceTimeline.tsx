import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
  history: any[];
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  confidence_restored: { icon: TrendingUp, color: "text-emerald-500" },
  confidence_reduced: { icon: TrendingDown, color: "text-destructive" },
  revalidated: { icon: CheckCircle2, color: "text-primary" },
  renewed: { icon: CheckCircle2, color: "text-emerald-500" },
  failed: { icon: XCircle, color: "text-destructive" },
  superseded: { icon: ArrowRight, color: "text-amber-500" },
  deprecated: { icon: XCircle, color: "text-muted-foreground" },
  needs_human_review: { icon: AlertTriangle, color: "text-amber-500" },
  proposal_generated: { icon: AlertTriangle, color: "text-primary" },
};

export function ConfidenceTimeline({ history }: Props) {
  const sorted = [...history].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Renewal & Confidence Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No renewal history yet.</p>
        ) : (
          <div className="space-y-1 max-h-[500px] overflow-auto">
            {sorted.map((h: any) => {
              const cfg = EVENT_CONFIG[h.event_type] || { icon: CheckCircle2, color: "text-muted-foreground" };
              const Icon = cfg.icon;
              const delta = h.confidence_after != null && h.confidence_before != null
                ? h.confidence_after - h.confidence_before
                : null;

              return (
                <div key={h.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={`mt-0.5 ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{h.event_type?.replace(/_/g, " ")}</Badge>
                      {delta !== null && (
                        <span className={`text-[10px] font-mono ${delta >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                          {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{h.summary || h.target_entry_id}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

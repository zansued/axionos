import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  segments: any[];
  snapshot: any;
}

const FAMILY_LABELS: Record<string, string> = {
  canon_entries: "Entradas do Cânone",
  skill_bundles: "Pacotes de Skills",
  distilled_outputs: "Saídas Destiladas",
  architecture_heuristics: "Heurísticas de Arquitetura",
};

export function KnowledgeFamilyBalance({ segments, snapshot }: Props) {
  const families = segments
    .filter((s) => s.segment_type === "knowledge_family")
    .sort((a, b) => b.object_count - a.object_count);

  const total = snapshot?.total_objects || families.reduce((s, f) => s + f.object_count, 0) || 1;

  return (
    <Card className="bg-card/50 border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Equilíbrio por Família de Conhecimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {families.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Execute a análise de portfólio primeiro.</p>
        ) : (
          families.map((f) => {
            const pct = Math.round((f.object_count / total) * 100);
            return (
              <div key={f.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{FAMILY_LABELS[f.segment_key] || f.segment_key}</span>
                  <span className="text-muted-foreground">{f.object_count} ({pct}%)</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

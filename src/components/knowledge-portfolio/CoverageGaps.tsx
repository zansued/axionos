import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  segments: any[];
}

export function CoverageGaps({ segments }: Props) {
  const weakSegments = segments
    .filter((s) => s.segment_type === "domain" && s.health_score < 0.5)
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 8);

  const strongSegments = segments
    .filter((s) => s.segment_type === "domain" && s.health_score >= 0.7)
    .sort((a, b) => b.object_count - a.object_count)
    .slice(0, 8);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-card/50 border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-warning">Domínios com Baixa Cobertura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {weakSegments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma lacuna significativa.</p>
          ) : (
            weakSegments.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                <div>
                  <span className="text-xs font-medium">{s.segment_key}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{s.object_count} objetos</span>
                </div>
                <Badge variant="destructive" className="text-[10px]">
                  {(s.health_score * 100).toFixed(0)}% saúde
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-success">Strongest Segments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {strongSegments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Execute a análise para ver os segmentos fortes.</p>
          ) : (
            strongSegments.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                <div>
                  <span className="text-xs font-medium">{s.segment_key}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{s.object_count} objetos</span>
                </div>
                <Badge variant="default" className="text-[10px]">
                  {(s.health_score * 100).toFixed(0)}% health
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

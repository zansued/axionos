import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  segments: any[];
}

export function RedundancyHotspots({ segments }: Props) {
  const domainSegments = segments
    .filter((s) => s.segment_type === "domain" && s.object_count > 3)
    .sort((a, b) => b.object_count - a.object_count)
    .slice(0, 10);

  return (
    <Card className="bg-card/50 border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Hotspots de Redundância</CardTitle>
      </CardHeader>
      <CardContent>
        {domainSegments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum hotspot de redundância detectado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Domínio</TableHead>
                <TableHead className="text-xs text-right">Objetos</TableHead>
                <TableHead className="text-xs text-right">Conf. Média</TableHead>
                <TableHead className="text-xs text-right">Stale</TableHead>
                <TableHead className="text-xs text-right">Saúde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domainSegments.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-medium">{s.segment_key}</TableCell>
                  <TableCell className="text-xs text-right">{s.object_count}</TableCell>
                  <TableCell className="text-xs text-right">{(s.avg_confidence * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-xs text-right">{s.stale_count}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={s.health_score > 0.7 ? "default" : s.health_score > 0.4 ? "secondary" : "destructive"} className="text-[10px]">
                      {(s.health_score * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

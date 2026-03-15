import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Domain {
  domain: string;
  total_skills: number;
  approved_skills: number;
  avg_confidence: number;
}

export function DomainBreakdown({ domains }: { domains: Domain[] }) {
  if (!domains?.length) return null;

  const maxSkills = Math.max(...domains.map(d => d.total_skills), 1);

  return (
    <Card className="border-border/30 bg-card/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Domínios de Conhecimento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {domains.map((d) => (
            <div key={d.domain} className="flex items-center gap-3">
              <span className="text-xs w-28 truncate font-medium">{d.domain}</span>
              <div className="flex-1 bg-muted/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full transition-all"
                  style={{ width: `${(d.total_skills / maxSkills) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[9px]">
                  {d.approved_skills}/{d.total_skills}
                </Badge>
                <span className="text-[10px] text-muted-foreground w-10 text-right">
                  {(d.avg_confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

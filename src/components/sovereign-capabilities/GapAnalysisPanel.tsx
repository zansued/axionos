import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle, Clock, Loader2 } from "lucide-react";

interface Props {
  gaps: any;
  loading: boolean;
}

export function GapAnalysisPanel({ gaps, loading }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gaps) return null;

  return (
    <div className="space-y-4">
      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="pt-3 pb-2.5 text-center">
            <p className={`text-2xl font-bold ${gaps.coverage_score > 0.7 ? "text-success" : "text-warning"}`}>
              {(gaps.coverage_score * 100).toFixed(0)}%
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Cobertura</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="pt-3 pb-2.5 text-center">
            <p className={`text-2xl font-bold ${gaps.health_score > 0.7 ? "text-success" : "text-warning"}`}>
              {(gaps.health_score * 100).toFixed(0)}%
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Saúde</p>
          </CardContent>
        </Card>
      </div>

      {/* Missing Domains */}
      {gaps.missing_domains?.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Domínios Ausentes ({gaps.missing_domains.length})
            </CardTitle>
            <CardDescription className="text-[10px]">
              Domínios de capacidade esperados sem nenhuma skill vinculada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gaps.missing_domains.map((g: any) => (
                <Badge key={g.domain} variant="destructive" className="text-[10px]">
                  {g.domain}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weak Capabilities */}
      {gaps.weak_capabilities?.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Capacidades Fracas ({gaps.weak_capabilities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {gaps.weak_capabilities.map((w: any) => (
              <div key={w.capability_key} className="text-xs flex items-center justify-between p-2 rounded bg-muted/10">
                <span className="font-medium">{w.capability_key}</span>
                <Badge variant="outline" className="text-[9px]">{(w.avg_strength * 100).toFixed(0)}% força</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stale Skills */}
      {gaps.stale_skills?.length > 0 && (
        <Card className="border-border/30 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Skills Obsoletas ({gaps.stale_skills.length})
            </CardTitle>
            <CardDescription className="text-[10px]">
              Skills aprovadas sem atualização há mais de 90 dias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {gaps.stale_skills.slice(0, 10).map((s: any) => (
                <div key={s.skill_id} className="text-[10px] flex items-center justify-between p-1.5 rounded bg-muted/10">
                  <span className="text-muted-foreground">{s.domain || "?"}</span>
                  <span className="font-mono">{s.days_since_update}d</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All green */}
      {gaps.missing_domains?.length === 0 && gaps.weak_capabilities?.length === 0 && gaps.stale_skills?.length === 0 && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="py-6 text-center text-sm text-success">
            ✓ Nenhuma lacuna ou fraqueza detectada. Portfólio saudável.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

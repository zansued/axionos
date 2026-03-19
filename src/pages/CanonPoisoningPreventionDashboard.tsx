import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  usePoisoningOverview,
  usePoisoningAssessments,
  useQuarantinedCandidates,
  usePoisoningSignals,
  useAssessBatch,
} from "@/hooks/useCanonPoisoningPrevention";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    critical: "bg-destructive text-destructive-foreground",
    high: "bg-destructive/80 text-destructive-foreground",
    medium: "bg-yellow-600 text-white",
    low: "bg-muted text-muted-foreground",
    none: "bg-secondary text-secondary-foreground",
  };
  return <Badge className={map[level] || map.none}>{level}</Badge>;
};

export default function CanonPoisoningPreventionDashboard() {
  const overview = usePoisoningOverview();
  const assessments = usePoisoningAssessments();
  const quarantined = useQuarantinedCandidates();
  const signals = usePoisoningSignals();
  const assessBatch = useAssessBatch();

  const o = overview.data as any;

  const handleAssessBatch = () => {
    assessBatch.mutate({ batch_size: 20 }, {
      onSuccess: (data: any) => {
        toast.success(`Avaliados: ${data.assessed} candidatos. Quarentena: ${data.quarantined}, Sinalizados: ${data.flagged}`);
      },
      onError: () => toast.error("Falha ao avaliar lote"),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prevenção de Envenenamento do Cânone</h1>
            <p className="text-sm text-muted-foreground">Detectar, pontuar, quarentenar e revisar conhecimento suspeito antes de entrar no cânone.</p>
          </div>
          <Button onClick={handleAssessBatch} disabled={assessBatch.isPending} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${assessBatch.isPending ? "animate-spin" : ""}`} />
            Avaliar Lote Pendente
          </Button>
        </div>

        {/* Métricas Gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Activity className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-foreground">{o?.total_assessments ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Total de Avaliações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <ShieldAlert className="w-6 h-6 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-bold text-foreground">{o?.quarantined_count ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Em Quarentena</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-warning" />
              <p className="text-2xl font-bold text-foreground">{o?.unresolved_signals ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Sinais Não Resolvidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-success" />
              <p className="text-2xl font-bold text-foreground">{o?.high_risk_count ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Risco Alto/Crítico</p>
            </CardContent>
          </Card>
        </div>

        {/* Candidatos em Quarentena */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Candidatos em Quarentena
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!(quarantined.data as any)?.quarantined?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum candidato em quarentena.</p>
            ) : (
              <div className="space-y-3">
                {((quarantined.data as any)?.quarantined || []).map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between border border-border rounded-lg p-3 bg-card">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{a.candidate_title || "Sem título"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.risk_reason_summary}</p>
                      <p className="text-xs text-muted-foreground">Fonte: {a.source_name || "desconhecida"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {riskBadge(a.poisoning_risk_level)}
                      <span className="text-xs text-muted-foreground">Score: {a.poisoning_risk_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sinais de Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Sinais de Segurança Não Resolvidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!(signals.data as any)?.signals?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum sinal não resolvido.</p>
            ) : (
              <div className="space-y-2">
                {((signals.data as any)?.signals || []).slice(0, 20).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between border border-border rounded p-2 bg-card">
                    <div>
                      <Badge variant="outline" className="mr-2">{s.signal_type}</Badge>
                      <span className="text-sm text-foreground">{s.description}</span>
                    </div>
                    {riskBadge(s.severity)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avaliações Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Avaliações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!(assessments.data as any)?.assessments?.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda. Clique em "Avaliar Lote Pendente" para iniciar.</p>
            ) : (
              <div className="space-y-2">
                {((assessments.data as any)?.assessments || []).slice(0, 15).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between border border-border rounded p-2 bg-card">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">{a.candidate_title || "Sem título"}</span>
                      <span className="text-xs text-muted-foreground ml-2">Score: {a.poisoning_risk_score}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {riskBadge(a.poisoning_risk_level)}
                      {a.quarantine_status === "quarantined" && (
                        <Badge variant="destructive">Quarentena</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuração do Portão de Promoção */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Configuração do Portão de Promoção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Piso de Confiança para Promoção</p>
                <p className="font-bold text-foreground">{o?.trust_floor ?? 25}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Score Máx. de Risco para Promoção</p>
                <p className="font-bold text-foreground">{o?.max_risk_threshold ?? 40}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlatformCalibration } from "@/hooks/usePlatformCalibration";
import { RefreshCw, CheckCircle, XCircle, RotateCcw, Settings, Activity, AlertTriangle, Shield } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  reviewed: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
  applied: "bg-emerald-500/20 text-emerald-400",
  rolled_back: "bg-orange-500/20 text-orange-400",
  pending: "bg-muted text-muted-foreground",
  helpful: "bg-green-500/20 text-green-400",
  neutral: "bg-muted text-muted-foreground",
  harmful: "bg-destructive/20 text-destructive",
  active: "bg-green-500/20 text-green-400",
  watch: "bg-yellow-500/20 text-yellow-400",
  frozen: "bg-blue-500/20 text-blue-400",
  deprecated: "bg-muted text-muted-foreground",
};

export function PlatformSelfCalibrationDashboard() {
  const {
    overview, parameters, proposals, applications, rollbacks,
    recompute, reviewProposal, rejectProposal, applyCalibration, rollbackCalibration,
  } = usePlatformCalibration();

  const ov = overview.data;
  const isLoading = overview.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Platform Self-Calibration</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          <RefreshCw className={`h-3 w-3 mr-1 ${recompute.isPending ? "animate-spin" : ""}`} />
          Recomputar
        </Button>
      </div>

      {/* Overview Stats */}
      {isLoading ? (
        <div className="text-muted-foreground text-sm">Carregando...</div>
      ) : !ov ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum dado de calibração disponível</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatMini label="Parâmetros" value={ov.total_parameters || 0} icon={Settings} />
            <StatMini label="Ativos" value={ov.active_parameters || 0} icon={Activity} />
            <StatMini label="Congelados" value={ov.frozen_parameters || 0} icon={Shield} />
            <StatMini label="Propostas Abertas" value={ov.open_proposals || 0} icon={AlertTriangle} />
            <StatMini label="Aplicados" value={ov.applied_calibrations || 0} icon={CheckCircle} />
            <StatMini label="Rollbacks" value={ov.total_rollbacks || 0} icon={RotateCcw} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Parameter Registry */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Registro de Parâmetros</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  {(parameters.data?.parameters || []).length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhum parâmetro registrado</p>
                  ) : (
                    <div className="space-y-2">
                      {(parameters.data?.parameters || []).map((p: any) => (
                        <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="p-2 rounded-md border border-border/50 bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-medium">{p.parameter_key}</span>
                            <Badge className={`text-[10px] ${STATUS_BADGE[p.status] || ""}`}>{p.status}</Badge>
                          </div>
                          <div className="flex gap-2 text-[10px] text-muted-foreground">
                            <span>Escopo: {p.parameter_scope}</span>
                            <span>Família: {p.parameter_family}</span>
                            <span>Modo: {p.calibration_mode}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Valor: {JSON.stringify(p.current_value)} | Range: {JSON.stringify(p.allowed_range)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Proposals */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Propostas de Calibração</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  {(proposals.data?.proposals || []).length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhuma proposta aberta</p>
                  ) : (
                    <div className="space-y-2">
                      {(proposals.data?.proposals || []).map((p: any) => (
                        <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="p-2 rounded-md border border-border/50 bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-medium">{p.parameter_key}</span>
                            <Badge className={`text-[10px] ${STATUS_BADGE[p.status] || ""}`}>{p.status}</Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {JSON.stringify(p.current_value)} → {JSON.stringify(p.proposed_value)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Confiança: {p.confidence_score} | Modo: {p.proposal_mode}
                          </div>
                          {(p.rationale_codes || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(p.rationale_codes as string[]).map((r: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[9px] py-0">{r}</Badge>
                              ))}
                            </div>
                          )}
                          {p.status === "open" && (
                            <div className="flex gap-1 mt-2">
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => applyCalibration.mutate(p.id)}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Aplicar
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => reviewProposal.mutate(p.id)}>
                                Revisar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => rejectProposal.mutate(p.id)}>
                                <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Applied Calibrations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Calibrações Aplicadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  {(applications.data?.applications || []).length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhuma calibração aplicada</p>
                  ) : (
                    <div className="space-y-2">
                      {(applications.data?.applications || []).map((a: any) => (
                        <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="p-2 rounded-md border border-border/50 bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-medium">{a.parameter_key}</span>
                            <Badge className={`text-[10px] ${STATUS_BADGE[a.outcome_status] || ""}`}>{a.outcome_status}</Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {JSON.stringify(a.previous_value)} → {JSON.stringify(a.applied_value)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Modo: {a.applied_mode}
                          </div>
                          {a.outcome_status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-orange-400 mt-1" onClick={() => rollbackCalibration.mutate(a.id)}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Rollbacks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Histórico de Rollbacks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  {(rollbacks.data?.rollbacks || []).length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhum rollback registrado</p>
                  ) : (
                    <div className="space-y-2">
                      {(rollbacks.data?.rollbacks || []).map((r: any) => (
                        <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="p-2 rounded-md border border-border/50 bg-muted/20">
                          <span className="text-xs font-mono font-medium">{r.parameter_key}</span>
                          <div className="text-[10px] text-muted-foreground">
                            Restaurado: {JSON.stringify(r.restored_value)} | Modo: {r.rollback_mode}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Razão: {JSON.stringify(r.rollback_reason)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatMini({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-2 p-3">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-base font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

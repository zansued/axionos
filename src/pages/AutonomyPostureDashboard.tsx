import { AppShell } from "@/components/AppShell";
import { useOutcomeAutonomy } from "@/hooks/useOutcomeAutonomy";
import { useColdStart } from "@/hooks/useColdStart";
import { ColdStartBanner } from "@/components/observability/ColdStartBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Shield, TrendingDown, AlertTriangle, Activity, Clock, CheckCircle2, XCircle, Gauge } from "lucide-react";

const levelColors: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-primary/20 text-primary",
  2: "bg-accent/20 text-accent-foreground",
  3: "bg-secondary/50 text-secondary-foreground",
  4: "bg-primary/40 text-primary",
  5: "bg-destructive/20 text-destructive",
};

const levelNames: Record<number, string> = {
  0: "Somente Manual",
  1: "Assistido",
  2: "Supervisionado",
  3: "Auto Limitado",
  4: "Auto Confiável",
  5: "Totalmente Limitado",
};

export default function AutonomyPostureDashboard() {
  const { domains, adjustments, breaches, regressions, transitionMetrics, regressionProfile, loadingDomains, setRegressionProfile } = useOutcomeAutonomy();
  const { data: coldStart } = useColdStart();

  return (
    <AppShell>
      <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Postura de Autonomia</h1>
            <p className="text-muted-foreground text-sm">Níveis de autonomia baseados em evidências com reversibilidade limitada.</p>
          </div>

          {coldStart?.is_cold_start && (
            <ColdStartBanner label={coldStart.label} summary={coldStart.summary} signals={coldStart.signals} />
          )}

          {/* Cards resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Domínios</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{domains.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ajustes</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{adjustments.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Violações</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{breaches.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Regressões</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{regressions.length}</div></CardContent>
            </Card>
          </div>

          <Tabs defaultValue="domains">
            <TabsList>
              <TabsTrigger value="domains">Domínios</TabsTrigger>
              <TabsTrigger value="risk-profile">Perfil de Risco</TabsTrigger>
              <TabsTrigger value="transitions">Transições</TabsTrigger>
              <TabsTrigger value="adjustments">Ajustes</TabsTrigger>
              <TabsTrigger value="breaches">Violações</TabsTrigger>
              <TabsTrigger value="regressions">Regressões</TabsTrigger>
            </TabsList>

            <TabsContent value="domains">
              <Card>
                <CardContent className="pt-6">
                  {loadingDomains ? (
                    <p className="text-muted-foreground text-sm">Carregando…</p>
                  ) : domains.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum domínio de autonomia configurado ainda.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domínio</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Evidência</TableHead>
                          <TableHead>Validação</TableHead>
                          <TableHead>Dep. Rollback</TableHead>
                          <TableHead>Pen. Incidente</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {domains.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.domain_name}</TableCell>
                            <TableCell>
                              <Badge className={levelColors[d.current_autonomy_level] || ""}>
                                N{d.current_autonomy_level} — {levelNames[d.current_autonomy_level] || "Desconhecido"}
                              </Badge>
                            </TableCell>
                            <TableCell>{(Number(d.evidence_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(d.validation_success_rate) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(d.rollback_dependence_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(Number(d.incident_penalty_score) * 100).toFixed(0)}%</TableCell>
                            <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Observabilidade de Estabilização de Transições */}
            <TabsContent value="transitions">
              <div className="space-y-4">
                {/* KPIs de Transição */}
                {transitionMetrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground">Tentativas de Upgrade</p>
                        <p className="text-2xl font-bold">{transitionMetrics.upgrade_attempts ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground">Aprovadas</p>
                        <p className="text-2xl font-bold text-primary">{transitionMetrics.upgrades_approved ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground">Rejeitadas (Estabilizadas)</p>
                        <p className="text-2xl font-bold text-destructive">{transitionMetrics.upgrades_rejected ?? 0}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
                        <p className="text-2xl font-bold">
                          {((transitionMetrics.upgrade_approval_rate ?? 0) * 100).toFixed(0)}%
                        </p>
                        <Progress value={(transitionMetrics.upgrade_approval_rate ?? 0) * 100} className="h-1.5 mt-2" />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Tentativas de transição recentes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Tentativas de Transição Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!transitionMetrics?.recent_attempts?.length ? (
                      <p className="text-muted-foreground text-sm">Nenhuma tentativa de transição registrada ainda.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Direção</TableHead>
                            <TableHead>De</TableHead>
                            <TableHead>Para</TableHead>
                            <TableHead>Tempo no Nível</TableHead>
                            <TableHead>Execuções</TableHead>
                            <TableHead>Confiança</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transitionMetrics.recent_attempts.map((a: any) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                {a.approved ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={a.direction === "upgrade" ? "default" : "destructive"}>
                                  {a.direction === "upgrade" ? "Promoção" : "Rebaixamento"}
                                </Badge>
                              </TableCell>
                              <TableCell>N{a.level_from}</TableCell>
                              <TableCell>N{a.level_to}</TableCell>
                              <TableCell className="text-xs">{a.time_at_current_level_hours ? `${Number(a.time_at_current_level_hours).toFixed(1)}h` : "—"}</TableCell>
                              <TableCell>{a.execution_count_at_level ?? "—"}</TableCell>
                              <TableCell>{a.confidence_score ? `${(Number(a.confidence_score) * 100).toFixed(0)}%` : "—"}</TableCell>
                              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{a.rejection_reason || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(a.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="adjustments">
              <Card>
                <CardContent className="pt-6">
                  {adjustments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum evento de ajuste ainda.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>De</TableHead>
                          <TableHead>Para</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Por</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adjustments.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Badge variant={a.adjustment_type === "upgrade" ? "default" : "destructive"}>
                                {a.adjustment_type === "upgrade" ? "Promoção" : "Rebaixamento"}
                              </Badge>
                            </TableCell>
                            <TableCell>N{a.previous_level}</TableCell>
                            <TableCell>N{a.new_level}</TableCell>
                            <TableCell className="max-w-xs truncate">{a.adjustment_reason}</TableCell>
                            <TableCell>{a.adjusted_by}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breaches">
              <Card>
                <CardContent className="pt-6">
                  {breaches.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma violação de guardrail registrada.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Severidade</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Bloqueada</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breaches.map((b: any) => (
                          <TableRow key={b.id}>
                            <TableCell>{b.breach_type}</TableCell>
                            <TableCell>
                              <Badge variant={b.severity === "critical" ? "destructive" : "outline"}>
                                {b.severity === "critical" ? "Crítica" : b.severity === "high" ? "Alta" : b.severity === "medium" ? "Média" : "Baixa"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{b.action_attempted}</TableCell>
                            <TableCell>{b.blocked ? "Sim" : "Não"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="regressions">
              <Card>
                <CardContent className="pt-6">
                  {regressions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum caso de regressão detectado.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Severidade</TableHead>
                          <TableHead>Gatilho</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {regressions.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.regression_type}</TableCell>
                            <TableCell>
                              <Badge variant={r.severity === "critical" ? "destructive" : "outline"}>
                                {r.severity === "critical" ? "Crítica" : r.severity === "high" ? "Alta" : r.severity === "medium" ? "Média" : "Baixa"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{r.trigger_event}</TableCell>
                            <TableCell><Badge variant="outline">{r.resolution_status}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Perfil de Risco */}
            <TabsContent value="risk-profile">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-primary" />
                      Perfil de Risco do Tenant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Perfil Ativo:</span>
                      <Badge variant="default" className="text-sm">
                        {regressionProfile?.active_type === "conservative" ? "Conservador" :
                         regressionProfile?.active_type === "balanced" ? "Equilibrado" :
                         regressionProfile?.active_type === "aggressive" ? "Agressivo" : "Equilibrado"}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      {([
                        { key: "conservative", label: "Conservador" },
                        { key: "balanced", label: "Equilibrado" },
                        { key: "aggressive", label: "Agressivo" },
                      ] as const).map((pt) => (
                        <Button
                          key={pt.key}
                          size="sm"
                          variant={regressionProfile?.active_type === pt.key ? "default" : "outline"}
                          onClick={() => setRegressionProfile.mutate({ profile_type: pt.key })}
                          disabled={setRegressionProfile.isPending}
                        >
                          {pt.label}
                        </Button>
                      ))}
                    </div>

                    {regressionProfile?.profile && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                        {[
                          { label: "Limiar de Falha de Validação", value: `${(Number(regressionProfile.profile.validation_failure_threshold) * 100).toFixed(0)}%` },
                          { label: "Limiar de Rollback", value: `${regressionProfile.profile.rollback_rate_threshold} por janela` },
                          { label: "Tolerância a Violações", value: `${regressionProfile.profile.guardrail_breach_threshold}` },
                          { label: "Limiar de Incidentes", value: `${regressionProfile.profile.incident_threshold}` },
                          { label: "Tendência de Evidência", value: `${Number(regressionProfile.profile.evidence_trend_threshold).toFixed(2)}` },
                          { label: "Velocidade de Promoção", value: `${Number(regressionProfile.profile.autonomy_upgrade_modifier).toFixed(1)}×` },
                        ].map((item) => (
                          <Card key={item.label} className="border-border/30">
                            <CardContent className="pt-4">
                              <p className="text-[10px] text-muted-foreground">{item.label}</p>
                              <p className="text-lg font-bold">{item.value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {!regressionProfile?.profile && (
                      <p className="text-sm text-muted-foreground">
                        Nenhum perfil personalizado definido. Usando o padrão do sistema (equilibrado). Selecione um perfil acima para personalizar.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Comparação de perfis */}
                {regressionProfile?.defaults && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Comparação de Perfis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parâmetro</TableHead>
                            <TableHead>Conservador</TableHead>
                            <TableHead>Equilibrado</TableHead>
                            <TableHead>Agressivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { key: "validation_failure_threshold", label: "Falha de Validação", fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
                            { key: "rollback_rate_threshold", label: "Limite de Rollback", fmt: (v: number) => `${v}` },
                            { key: "incident_threshold", label: "Limite de Incidentes", fmt: (v: number) => `${v}` },
                            { key: "guardrail_breach_threshold", label: "Tolerância a Violações", fmt: (v: number) => `${v}` },
                            { key: "autonomy_upgrade_modifier", label: "Velocidade de Promoção", fmt: (v: number) => `${v}×` },
                          ].map(({ key, label, fmt }) => (
                            <TableRow key={key}>
                              <TableCell className="font-medium text-xs">{label}</TableCell>
                              {["conservative", "balanced", "aggressive"].map((pt) => (
                                <TableCell key={pt} className={`text-xs ${regressionProfile?.active_type === pt ? "font-bold text-primary" : ""}`}>
                                  {fmt((regressionProfile.defaults as any)[pt]?.[key] ?? 0)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
      </div>
    </AppShell>
  );
}

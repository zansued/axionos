import { AppLayout } from "@/components/AppLayout";
import { useDeliveryGovernance } from "@/hooks/useDeliveryGovernance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle2, AlertTriangle, Clock, Activity, Gauge, FileText, ScrollText, Loader2 } from "lucide-react";
import { format } from "date-fns";

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-destructive/20 text-destructive",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-destructive/20 text-destructive",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-destructive/20 text-destructive",
  blocked: "bg-orange-500/20 text-orange-400",
};

export default function Governance() {
  const { data, isLoading } = useDeliveryGovernance();

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Governança de Entrega</h1>
            <p className="text-sm text-muted-foreground">
              Conformidade de políticas, fila de aprovações, trilha de auditoria e postura de autonomia.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <Card className="border-border/30">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum dado de governança disponível ainda.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <KpiCard
                label="Score de Conformidade"
                value={`${data.compliance.score}%`}
                icon={CheckCircle2}
                variant={data.compliance.score >= 80 ? "success" : data.compliance.score >= 50 ? "warning" : "destructive"}
              />
              <KpiCard label="Total de Ações" value={data.compliance.totalActions} icon={Activity} />
              <KpiCard label="Políticas Aplicadas" value={data.compliance.policyEnforced} icon={FileText} />
              <KpiCard
                label="Bloqueadas por Política"
                value={data.compliance.blockedByPolicy}
                icon={AlertTriangle}
                variant={data.compliance.blockedByPolicy > 0 ? "warning" : "default"}
              />
              <KpiCard
                label="Aprovações Pendentes"
                value={data.approvalQueue.filter(a => a.status === "pending").length}
                icon={Clock}
                variant={data.approvalQueue.filter(a => a.status === "pending").length > 0 ? "warning" : "default"}
              />
              <KpiCard
                label="Nível Médio Autonomia"
                value={data.autonomy.avgLevel.toFixed(1)}
                icon={Gauge}
                variant="accent"
              />
            </div>

            {/* Compliance Bar */}
            <Card className="border-border/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Conformidade Geral</span>
                  <span className="text-sm text-muted-foreground">{data.compliance.score}%</span>
                </div>
                <Progress value={data.compliance.score} className="h-2" />
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Conformes: <strong className="text-foreground">{data.compliance.compliantActions}</strong></span>
                  <span>Aplicadas: <strong className="text-foreground">{data.compliance.policyEnforced}</strong></span>
                  <span>Taxa Aprovação: <strong className="text-foreground">{Math.round(data.compliance.approvalRate * 100)}%</strong></span>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="approvals" className="space-y-4">
              <TabsList>
                <TabsTrigger value="approvals" className="text-xs">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Fila de Aprovações ({data.approvalQueue.length})
                </TabsTrigger>
                <TabsTrigger value="policies" className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Políticas por Estágio ({data.policies.length})
                </TabsTrigger>
                <TabsTrigger value="autonomy" className="text-xs">
                  <Gauge className="h-3.5 w-3.5 mr-1" />
                  Postura de Autonomia ({data.autonomy.domains.length})
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-xs">
                  <ScrollText className="h-3.5 w-3.5 mr-1" />
                  Trilha de Auditoria ({data.auditTrail.length})
                </TabsTrigger>
              </TabsList>

              {/* Approval Queue */}
              <TabsContent value="approvals">
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fila de Aprovações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.approvalQueue.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma aprovação pendente.</p>
                    ) : (
                      <div className="overflow-auto max-h-[450px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Ação</TableHead>
                              <TableHead className="text-xs">Motivo</TableHead>
                              <TableHead className="text-xs">Risco</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Modo</TableHead>
                              <TableHead className="text-xs">Trigger</TableHead>
                              <TableHead className="text-xs">Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.approvalQueue.map(a => (
                              <TableRow key={a.id}>
                                <TableCell className="text-xs font-mono truncate max-w-[100px]" title={a.actionId}>
                                  {a.actionId.substring(0, 8)}…
                                </TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate" title={a.reason}>{a.reason}</TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] ${RISK_COLORS[a.riskLevel] || ""}`}>
                                    {a.riskLevel}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] ${STATUS_COLORS[a.status] || ""}`}>
                                    {a.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{a.executionMode}</TableCell>
                                <TableCell className="text-xs">{a.triggerType}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(a.createdAt), "dd/MM HH:mm")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Policies by Stage */}
              <TabsContent value="policies">
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Políticas por Estágio do Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.policies.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma política registrada.</p>
                    ) : (
                      <div className="overflow-auto max-h-[450px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Estágio</TableHead>
                              <TableHead className="text-xs text-right">Total</TableHead>
                              <TableHead className="text-xs text-right">Aplicadas</TableHead>
                              <TableHead className="text-xs text-right">Bloqueadas</TableHead>
                              <TableHead className="text-xs text-right">Aprovação Req.</TableHead>
                              <TableHead className="text-xs text-right">Taxa Sucesso</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.policies.map(p => (
                              <TableRow key={p.stage}>
                                <TableCell className="text-xs font-medium capitalize">{p.stage.replace(/_/g, " ")}</TableCell>
                                <TableCell className="text-xs text-right">{p.totalActions}</TableCell>
                                <TableCell className="text-xs text-right">{p.enforced}</TableCell>
                                <TableCell className="text-xs text-right">{p.blocked}</TableCell>
                                <TableCell className="text-xs text-right">{p.approvalRequired}</TableCell>
                                <TableCell className="text-xs text-right">
                                  <span className={p.successRate >= 0.7 ? "text-emerald-400" : p.successRate >= 0.4 ? "text-amber-400" : "text-destructive"}>
                                    {Math.round(p.successRate * 100)}%
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Autonomy */}
              <TabsContent value="autonomy">
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Postura de Autonomia por Domínio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.autonomy.domains.length === 0 ? (
                      <div className="text-center py-8">
                        <Gauge className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum domínio de autonomia configurado.</p>
                        <p className="text-xs text-muted-foreground mt-1">Domínios serão criados automaticamente conforme o sistema opera.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.autonomy.domains.map(d => (
                          <div key={d.id} className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium capitalize">{d.domainName.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">
                                Nível {d.currentLevel} / {d.maxLevel} · {d.status}
                              </p>
                            </div>
                            <div className="w-32">
                              <Progress value={(d.currentLevel / d.maxLevel) * 100} className="h-2" />
                            </div>
                            <span className="text-sm font-mono w-12 text-right">
                              {d.currentLevel}/{d.maxLevel}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Audit Trail */}
              <TabsContent value="audit">
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Trilha de Auditoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.auditTrail.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento de auditoria registrado.</p>
                    ) : (
                      <div className="overflow-auto max-h-[450px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Data</TableHead>
                              <TableHead className="text-xs">Evento</TableHead>
                              <TableHead className="text-xs">Ação</TableHead>
                              <TableHead className="text-xs">Transição</TableHead>
                              <TableHead className="text-xs">Ator</TableHead>
                              <TableHead className="text-xs">Motivo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.auditTrail.map(a => (
                              <TableRow key={a.id}>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(a.createdAt), "dd/MM HH:mm")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">{a.eventType.replace(/_/g, " ")}</Badge>
                                </TableCell>
                                <TableCell className="text-xs font-mono truncate max-w-[80px]" title={a.actionId}>
                                  {a.actionId.substring(0, 8)}…
                                </TableCell>
                                <TableCell className="text-xs">
                                  {a.previousStatus && a.newStatus ? (
                                    <span className="text-muted-foreground">
                                      {a.previousStatus} → <span className="text-foreground">{a.newStatus}</span>
                                    </span>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="text-xs">{a.actorType || "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={a.reason || ""}>
                                  {a.reason || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function KpiCard({ label, value, icon: Icon, variant = "default" }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "destructive" | "accent";
}) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    destructive: "text-destructive",
    accent: "text-primary",
  };
  return (
    <Card className="border-border/30 bg-card/60">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${colors[variant]}`} />
          <p className={`text-xl font-bold ${colors[variant]}`}>{value}</p>
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

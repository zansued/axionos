import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldAlert, Activity, AlertTriangle, CheckCircle2, Eye,
  RefreshCw, Shield, Bell, Search, XCircle, Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useOrg } from "@/contexts/OrgContext";
import {
  useSecurityMonitoringOverview,
  useSecurityMonitoringAlerts,
  useSecurityMonitoringSignals,
  useRunSecurityScan,
  useAlertAction,
  useCorrelateAlerts,
} from "@/hooks/useSecurityMonitoring";
import { toast } from "sonner";

// ─── Severity Badge ───

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-warning/20 text-warning border-warning/30",
    low: "bg-muted/30 text-muted-foreground border-border/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[severity] || styles.low}`}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-destructive/15 text-destructive border-destructive/25",
    acknowledged: "bg-warning/15 text-warning border-warning/25",
    investigating: "bg-primary/15 text-primary border-primary/25",
    contained: "bg-primary/20 text-primary border-primary/30",
    resolved: "bg-muted/20 text-muted-foreground border-border/20",
    dismissed: "bg-muted/15 text-muted-foreground border-border/15",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[status] || ""}`}>{status}</Badge>;
}

// ─── KPI Cards ───

function KpiCard({ value, label, icon: Icon, warn }: {
  value: number | string; label: string; icon: React.ElementType; warn?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className={`border ${warn ? "border-destructive/40 bg-destructive/5" : "border-border/30 bg-card/60"} backdrop-blur-sm`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${warn ? "bg-destructive/20" : "bg-muted/40"}`}>
            <Icon className={`h-5 w-5 ${warn ? "text-destructive" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold font-['Space_Grotesk'] ${warn ? "text-destructive" : ""}`}>{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Dashboard ───

export default function SecurityMonitoringDashboard() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const { data: overview, isLoading: overviewLoading } = useSecurityMonitoringOverview(orgId);
  const { data: alertsData, isLoading: alertsLoading } = useSecurityMonitoringAlerts(orgId);
  const { data: signalsData, isLoading: signalsLoading } = useSecurityMonitoringSignals(orgId);
  const scanMutation = useRunSecurityScan(orgId);
  const alertAction = useAlertAction();
  const correlateMutation = useCorrelateAlerts(orgId);

  const alerts = alertsData?.alerts ?? [];
  const signals = signalsData?.signals ?? [];

  const handleScan = () => {
    scanMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        toast.success(`Scan concluído: ${data.anomalies?.length ?? 0} anomalias encontradas, ${data.alerts_created ?? 0} alertas criados`);
      },
      onError: () => toast.error("Falha no scan"),
    });
  };

  const handleAlertAction = (action: string, alertId: string) => {
    alertAction.mutate({ action, alertId, orgId }, {
      onSuccess: () => toast.success(`Alerta ${action.replace("_alert", "").replace("_", " ")}`),
      onError: () => toast.error("Ação falhou"),
    });
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
              Monitoramento e Alertas de Segurança
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Detecção ativa de anomalias, ingestão de sinais de segurança e gestão de alertas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => correlateMutation.mutate(undefined, {
                onSuccess: (data: any) => toast.info(`${data.incident_candidates?.length ?? 0} candidatos a incidente encontrados`),
              })}
              disabled={correlateMutation.isPending}
            >
              <Search className="h-4 w-4 mr-1" />
              Correlacionar
            </Button>
            <Button
              size="sm"
              onClick={handleScan}
              disabled={scanMutation.isPending}
              className="bg-destructive/90 hover:bg-destructive text-destructive-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${scanMutation.isPending ? "animate-spin" : ""}`} />
              Executar Scan
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            value={overview?.active_alerts ?? 0}
            label="Alertas Ativos"
            icon={Bell}
            warn={(overview?.active_alerts ?? 0) > 0}
          />
          <KpiCard
            value={overview?.critical_alerts ?? 0}
            label="Críticos"
            icon={AlertTriangle}
            warn={(overview?.critical_alerts ?? 0) > 0}
          />
          <KpiCard
            value={overview?.signals_24h ?? 0}
            label="Sinais (24h)"
            icon={Activity}
          />
          <KpiCard
            value={alerts.filter((a: any) => a.status === "resolved").length}
            label="Resolvidos"
            icon={CheckCircle2}
          />
        </div>

        {/* Severity Distribution */}
        {overview?.severity_distribution && Object.keys(overview.severity_distribution).length > 0 && (
          <Card className="border border-border/30 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Distribuição de Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(overview.severity_distribution).map(([sev, count]) => (
                  <div key={sev} className="flex items-center gap-2">
                    <SeverityBadge severity={sev} />
                    <span className="text-sm font-bold">{count as number}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList className="bg-muted/30 border border-border/20">
            <TabsTrigger value="alerts">Alertas ({alerts.length})</TabsTrigger>
            <TabsTrigger value="signals">Sinais ({signals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card className="border border-border/30 bg-card/60">
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {alertsLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando alertas...</div>
                  ) : alerts.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      Nenhum alerta. Execute um scan para verificar anomalias.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {alerts.map((alert: any) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-4 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <SeverityBadge severity={alert.severity} />
                                <StatusBadge status={alert.status} />
                                <Badge variant="outline" className="text-[10px] bg-muted/20">{alert.alert_type}</Badge>
                              </div>
                              <h4 className="text-sm font-medium">{alert.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.summary}</p>
                              {alert.recommended_action && (
                                <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {alert.recommended_action}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(alert.created_at).toLocaleString()}
                                {alert.source_category && (
                                  <span className="ml-2">Fonte: {alert.source_category}</span>
                                )}
                              </div>
                            </div>
                            {alert.status === "open" && (
                              <div className="flex flex-col gap-1 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-6"
                                  onClick={() => handleAlertAction("acknowledge_alert", alert.id)}
                                >
                                  Reconhecer
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-6"
                                  onClick={() => handleAlertAction("resolve_alert", alert.id)}
                                >
                                  Resolver
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[10px] h-6 text-muted-foreground"
                                  onClick={() => handleAlertAction("dismiss_alert", alert.id)}
                                >
                                  Dispensar
                                </Button>
                              </div>
                            )}
                            {alert.status === "acknowledged" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[10px] h-6"
                                onClick={() => handleAlertAction("resolve_alert", alert.id)}
                              >
                                Resolver
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals">
            <Card className="border border-border/30 bg-card/60">
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {signalsLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando sinais...</div>
                  ) : signals.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      Nenhum sinal registrado ainda.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {signals.map((signal: any) => (
                        <div key={signal.id} className="p-4 hover:bg-muted/10 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <SeverityBadge severity={signal.severity} />
                            <Badge variant="outline" className="text-[10px] bg-muted/20">{signal.signal_category}</Badge>
                            <Badge variant="outline" className="text-[10px]">{signal.signal_type}</Badge>
                          </div>
                          <p className="text-sm">{signal.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(signal.created_at).toLocaleString()}
                            {signal.source_function && <span>· {signal.source_function}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

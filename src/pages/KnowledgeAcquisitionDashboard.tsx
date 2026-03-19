import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target, TrendingUp, Zap, BarChart3, ListChecks, DollarSign, Sparkles,
  AlertTriangle, Send, Layers, PauseCircle, PlayCircle, RotateCcw, XCircle,
  Check, X,
} from "lucide-react";
import { useKnowledgeAcquisition } from "@/hooks/useKnowledgeAcquisition";
import { useKnowledgeAcquisitionExecution } from "@/hooks/useKnowledgeAcquisitionExecution";
import { useKnowledgeAcquisitionRoi } from "@/hooks/useKnowledgeAcquisitionRoi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const statusColor: Record<string, string> = {
  queued: "secondary",
  in_progress: "default",
  completed: "default",
  failed: "destructive",
  cancelled: "outline",
  blocked: "secondary",
  budget_blocked: "destructive",
  retry_scheduled: "secondary",
};

export default function KnowledgeAcquisitionDashboard() {
  const acq = useKnowledgeAcquisition();
  const exec = useKnowledgeAcquisitionExecution();
  const roi = useKnowledgeAcquisitionRoi();

  const proposedPlans = acq.plans.filter((p: any) => p.status === "proposed");
  const execOv = exec.overview as any;
  const roiOv = roi.overview as any;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <Target className="h-6 w-6 text-primary" />
              Aquisição de Conhecimento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Planejamento estratégico, execução e retorno sobre investimento em conhecimento
            </p>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Oportunidades</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{acq.opportunities.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Planos</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{acq.plans.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Propostos</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-warning">{proposedPlans.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Jobs em Execução</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{execOv.in_progress || 0}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">ROI Médio</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{((roiOv.avg_roi || 0) * 100).toFixed(0)}%</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Orçamentos</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{acq.budgets.length}</span></CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="opportunities" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="opportunities" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Oportunidades</TabsTrigger>
            <TabsTrigger value="plans" className="text-xs gap-1.5"><ListChecks className="h-3.5 w-3.5" />Planos</TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" />Orçamento</TabsTrigger>
            <TabsTrigger value="execution" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" />Execução</TabsTrigger>
            <TabsTrigger value="roi-snapshots" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" />ROI</TabsTrigger>
            <TabsTrigger value="roi-sources" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5" />Por Fonte</TabsTrigger>
            <TabsTrigger value="low-value" className="text-xs gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Baixo Valor</TabsTrigger>
          </TabsList>

          {/* ── Oportunidades ── */}
          <TabsContent value="opportunities">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => acq.rankOpportunities.mutate()} disabled={acq.rankOpportunities.isPending}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />{acq.rankOpportunities.isPending ? "Classificando…" : "Classificar Oportunidades"}
              </Button>
            </div>
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Oportunidades Classificadas</CardTitle></CardHeader>
              <CardContent>
                {acq.opportunities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Execute "Classificar Oportunidades" para começar.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Domínio</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs text-right">Score</TableHead>
                      <TableHead className="text-xs text-right">Ganho</TableHead>
                      <TableHead className="text-xs text-right">Custo</TableHead>
                      <TableHead className="text-xs text-right">Urgência</TableHead>
                      <TableHead className="text-xs text-right">Novidade</TableHead>
                      <TableHead className="text-xs text-right">Risco Redundância</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {acq.opportunities.slice(0, 20).map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell className="text-xs font-medium">{o.target_domain || o.source_ref}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{o.source_type}</Badge></TableCell>
                          <TableCell className="text-xs text-right font-bold">{(o.opportunity_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right text-success">{(o.expected_knowledge_gain * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(o.expected_cost * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(o.urgency_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(o.novelty_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(o.redundancy_risk * 100).toFixed(0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Planos ── */}
          <TabsContent value="plans">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Planos de Aquisição</CardTitle></CardHeader>
              <CardContent>
                {acq.plans.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum plano criado.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Modo</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Custo</TableHead>
                      <TableHead className="text-xs text-right">Benefício</TableHead>
                      <TableHead className="text-xs text-right">Confiança</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {acq.plans.slice(0, 15).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium max-w-[150px] truncate">{p.plan_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{p.strategy_mode}</Badge></TableCell>
                          <TableCell><Badge variant={p.status === "proposed" ? "secondary" : p.status === "approved_for_acquisition" ? "default" : "outline"} className="text-[10px]">{p.status}</Badge></TableCell>
                          <TableCell className="text-xs text-right">{(p.expected_cost * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right text-success">{(p.expected_benefit * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(p.confidence * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-right">
                            {p.status === "proposed" && (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => acq.decidePlan.mutate({ planId: p.id, decision: "approved_for_acquisition" })}><Check className="h-3 w-3 text-success" /></Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => acq.decidePlan.mutate({ planId: p.id, decision: "cancelled" })}><X className="h-3 w-3 text-destructive" /></Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Orçamento ── */}
          <TabsContent value="budgets">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Orçamentos de Aquisição</CardTitle></CardHeader>
              <CardContent>
                {acq.budgets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum orçamento configurado.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Janela</TableHead>
                      <TableHead className="text-xs text-right">Limite</TableHead>
                      <TableHead className="text-xs text-right">Usado</TableHead>
                      <TableHead className="text-xs text-right">Restante</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {acq.budgets.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-medium">{b.budget_type}</TableCell>
                          <TableCell className="text-xs">{b.budget_window}</TableCell>
                          <TableCell className="text-xs text-right">{b.budget_limit}</TableCell>
                          <TableCell className="text-xs text-right">{b.budget_used}</TableCell>
                          <TableCell className="text-xs text-right font-bold">{b.budget_limit - b.budget_used}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Execução ── */}
          <TabsContent value="execution" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => exec.pauseAll.mutate()} disabled={exec.pauseAll.isPending}>
                <PauseCircle className="h-3.5 w-3.5 mr-1.5" />Pausar Todos
              </Button>
              <Button size="sm" variant="outline" onClick={() => exec.resumeAll.mutate()} disabled={exec.resumeAll.isPending}>
                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />Retomar Todos
              </Button>
              <Button size="sm" onClick={() => exec.executeNext.mutate()} disabled={exec.executeNext.isPending}>
                <Zap className="h-3.5 w-3.5 mr-1.5" />{exec.executeNext.isPending ? "Executando…" : "Executar Próximo"}
              </Button>
            </div>

            {/* Exec metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Total de Jobs", value: execOv.total || 0 },
                { label: "Na Fila", value: execOv.queued || 0 },
                { label: "Em Progresso", value: execOv.in_progress || 0 },
                { label: "Concluídos", value: execOv.completed || 0 },
                { label: "Falhos", value: execOv.failed || 0 },
                { label: "Bloq. Orçamento", value: execOv.budget_blocked || 0 },
              ].map((m) => (
                <Card key={m.label} className="bg-card/50 border-border/30">
                  <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
                  <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{m.value}</span></CardContent>
                </Card>
              ))}
            </div>

            {/* Budget progress */}
            {(execOv.budgets || []).length > 0 && (
              <Card className="bg-card/50 border-border/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Uso de Orçamento</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(execOv.budgets || []).map((b: any) => (
                    <div key={b.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{b.budget_type} ({b.budget_window})</span>
                        <span>{b.budget_used}/{b.budget_limit}</span>
                      </div>
                      <Progress value={Math.min(100, (b.budget_used / Math.max(1, b.budget_limit)) * 100)} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Jobs table */}
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fila de Execução</CardTitle></CardHeader>
              <CardContent>
                {exec.jobs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum job de execução ainda. Aprove um plano para enfileirar.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead className="text-xs">Modo</TableHead>
                      <TableHead className="text-xs">Prioridade</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Custo</TableHead>
                      <TableHead className="text-xs text-right">Absorvidos</TableHead>
                      <TableHead className="text-xs text-right">Retentativas</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {exec.jobs.slice(0, 30).map((j: any) => (
                        <TableRow key={j.id}>
                          <TableCell className="text-xs font-medium max-w-[140px] truncate">{j.source_ref}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{j.execution_mode}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{j.priority}</Badge></TableCell>
                          <TableCell><Badge variant={(statusColor[j.status] || "outline") as any} className="text-[10px]">{j.status}</Badge></TableCell>
                          <TableCell className="text-xs text-right">{j.actual_cost || j.estimated_cost}</TableCell>
                          <TableCell className="text-xs text-right">{j.items_absorbed || 0}</TableCell>
                          <TableCell className="text-xs text-right">{j.retry_count || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {["failed", "budget_blocked"].includes(j.status) && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => exec.retryJob.mutate(j.id)}>
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                              {!["completed", "cancelled"].includes(j.status) && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => exec.cancelJob.mutate(j.id)}>
                                  <XCircle className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ROI Snapshots ── */}
          <TabsContent value="roi-snapshots" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => roi.feedbackToPlanner.mutate()} disabled={roi.feedbackToPlanner.isPending}>
                <Send className="h-3.5 w-3.5 mr-1.5" />Alimentar Planejador
              </Button>
              <Button size="sm" onClick={() => roi.computeRoi.mutate()} disabled={roi.computeRoi.isPending}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />{roi.computeRoi.isPending ? "Calculando…" : "Calcular ROI"}
              </Button>
            </div>

            {/* ROI metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: "Snapshots", value: roiOv.total || 0 },
                { label: "ROI Médio", value: `${((roiOv.avg_roi || 0) * 100).toFixed(0)}%` },
                { label: "Eficiência Média", value: `${((roiOv.avg_cost_efficiency || 0) * 100).toFixed(0)}%` },
                { label: "Ruído Médio", value: `${((roiOv.avg_noise_ratio || 0) * 100).toFixed(0)}%` },
                { label: "Canon Promovido", value: roiOv.total_canon_promoted || 0 },
                { label: "Baixo Valor", value: roiOv.low_value_count || 0 },
              ].map((m) => (
                <Card key={m.label} className="bg-card/50 border-border/30">
                  <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle></CardHeader>
                  <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{m.value}</span></CardContent>
                </Card>
              ))}
            </div>

            {/* Top ROI */}
            {(roiOv.top_roi || []).length > 0 && (
              <Card className="bg-card/50 border-border/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Melhores ROI</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(roiOv.top_roi || []).map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 truncate">{t.source_ref}</span>
                      <Progress value={t.roi_score * 100} className="h-2 flex-1" />
                      <span className="text-xs font-bold w-12 text-right">{(t.roi_score * 100).toFixed(0)}%</span>
                      <Badge variant="outline" className="text-[10px]">{t.mode}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Snapshots table */}
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Snapshots de ROI</CardTitle></CardHeader>
              <CardContent>
                {roi.snapshots.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem dados de ROI. Clique em "Calcular ROI" para analisar aquisições concluídas.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead className="text-xs">Modo</TableHead>
                      <TableHead className="text-xs text-right">ROI</TableHead>
                      <TableHead className="text-xs text-right">Custo</TableHead>
                      <TableHead className="text-xs text-right">Canon</TableHead>
                      <TableHead className="text-xs text-right">Yield</TableHead>
                      <TableHead className="text-xs text-right">Ruído</TableHead>
                      <TableHead className="text-xs text-right">Downstream</TableHead>
                      <TableHead className="text-xs">Flag</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.snapshots.slice(0, 25).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs font-medium max-w-[120px] truncate">{s.source_ref}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{s.acquisition_mode}</Badge></TableCell>
                          <TableCell className="text-xs text-right font-bold">{(s.roi_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{s.total_cost}</TableCell>
                          <TableCell className="text-xs text-right">{s.canon_promoted}</TableCell>
                          <TableCell className="text-xs text-right">{(s.promotion_yield * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(s.noise_ratio * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(s.downstream_value_score * 100).toFixed(0)}%</TableCell>
                          <TableCell>{s.low_value_flag && <Badge variant="destructive" className="text-[10px]">Baixo</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Por Fonte ── */}
          <TabsContent value="roi-sources" className="space-y-4">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Comparação de ROI por Fonte</CardTitle></CardHeader>
              <CardContent>
                {roi.sources.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem dados de análise por fonte.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead className="text-xs text-right">Qtd</TableHead>
                      <TableHead className="text-xs text-right">ROI Médio</TableHead>
                      <TableHead className="text-xs text-right">Custo Médio</TableHead>
                      <TableHead className="text-xs text-right">Canon</TableHead>
                      <TableHead className="text-xs text-right">Ruído</TableHead>
                      <TableHead className="text-xs">Classificação</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.sources.map((s: any) => (
                        <TableRow key={s.source}>
                          <TableCell className="text-xs font-medium max-w-[140px] truncate">{s.source}</TableCell>
                          <TableCell className="text-xs text-right">{s.count}</TableCell>
                          <TableCell className="text-xs text-right font-bold">{(s.avg_roi * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{s.avg_cost}</TableCell>
                          <TableCell className="text-xs text-right">{s.total_canon}</TableCell>
                          <TableCell className="text-xs text-right">{(s.avg_noise * 100).toFixed(0)}%</TableCell>
                          <TableCell>
                            <Badge variant={s.classification === "high_roi" ? "default" : s.classification === "low_roi" ? "destructive" : "secondary"} className="text-[10px]">
                              {s.classification === "high_roi" ? "Alto ROI" : s.classification === "low_roi" ? "Baixo ROI" : s.classification}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* By Mode */}
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Comparação por Modo</CardTitle></CardHeader>
              <CardContent>
                {roi.modes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem dados de análise por modo.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Modo</TableHead>
                      <TableHead className="text-xs text-right">Qtd</TableHead>
                      <TableHead className="text-xs text-right">ROI Médio</TableHead>
                      <TableHead className="text-xs text-right">Eficiência</TableHead>
                      <TableHead className="text-xs text-right">Yield</TableHead>
                      <TableHead className="text-xs text-right">Downstream</TableHead>
                      <TableHead className="text-xs text-right">Ruído</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.modes.map((m: any) => (
                        <TableRow key={m.mode}>
                          <TableCell className="text-xs font-medium">{m.mode}</TableCell>
                          <TableCell className="text-xs text-right">{m.count}</TableCell>
                          <TableCell className="text-xs text-right font-bold">{(m.avg_roi * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_cost_efficiency * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_promotion_yield * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_downstream_value * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(m.avg_noise * 100).toFixed(0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Baixo Valor ── */}
          <TabsContent value="low-value">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Aquisições de Baixo Valor</CardTitle></CardHeader>
              <CardContent>
                {roi.lowValue.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma aquisição de baixo valor detectada.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead className="text-xs text-right">ROI</TableHead>
                      <TableHead className="text-xs text-right">Custo</TableHead>
                      <TableHead className="text-xs text-right">Ruído</TableHead>
                      <TableHead className="text-xs">Razões</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {roi.lowValue.map((lv: any) => (
                        <TableRow key={lv.id}>
                          <TableCell className="text-xs font-medium max-w-[140px] truncate">{lv.source_ref}</TableCell>
                          <TableCell className="text-xs text-right">{(lv.roi_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{lv.total_cost}</TableCell>
                          <TableCell className="text-xs text-right">{(lv.noise_ratio * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            {(lv.low_value_reasons || []).map((r: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] mr-1 mb-0.5">{r}</Badge>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

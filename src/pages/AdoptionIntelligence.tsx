import { AppShell } from "@/components/AppShell";
import { useAdoptionIntelligence } from "@/hooks/useAdoptionIntelligence";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, AlertTriangle, CheckCircle2, Users, BarChart3, Target, Loader2, TrendingDown, Lightbulb } from "lucide-react";

const SIGNAL_LABELS: Record<string, string> = {
  "Strong Success": "Sucesso Forte",
  "Partial Success": "Sucesso Parcial",
  "At Risk": "Em Risco",
  "No Signal": "Sem Sinal",
};

const SIGNAL_VARIANT: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  "Strong Success": "default",
  "Partial Success": "secondary",
  "At Risk": "destructive",
  "No Signal": "outline",
};

const STAGE_MAP = [
  { key: "idea", label: "Ideia", statuses: ["idea", "draft"] },
  { key: "discovery", label: "Descoberta", statuses: ["discovering", "discovered"] },
  { key: "architecture", label: "Arquitetura", statuses: ["architecting", "architected"] },
  { key: "engineering", label: "Engenharia", statuses: ["engineering", "engineered"] },
  { key: "validation", label: "Validação", statuses: ["validating", "validated"] },
  { key: "deploy", label: "Deploy", statuses: ["deploying", "deployed"] },
  { key: "handoff", label: "Entrega", statuses: ["completed", "published", "delivered"] },
];

function stageIndex(status: string): number {
  for (let i = 0; i < STAGE_MAP.length; i++) {
    if (STAGE_MAP[i].statuses.includes(status)) return i;
  }
  // "completed" or "published" count as final
  if (["completed", "published", "delivered"].includes(status)) return STAGE_MAP.length - 1;
  return 0;
}

export default function AdoptionIntelligence() {
  const { overview } = useAdoptionIntelligence();
  const items = overview.data ?? [];
  const isLoading = overview.isLoading;

  const avgAdoption = items.length > 0 ? items.reduce((s: number, i: any) => s + (i.adoption_score ?? 0), 0) / items.length : 0;
  const strongCount = items.filter((i: any) => i.signal_label === "Strong Success").length;
  const atRiskCount = items.filter((i: any) => i.signal_label === "At Risk").length;
  const partialCount = items.filter((i: any) => i.signal_label === "Partial Success").length;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inteligência de Adoção</h1>
          <p className="text-muted-foreground">Sinais de sucesso, jornada de adoção e análise de fricção.</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="funnel">Funil de Jornada</TabsTrigger>
            <TabsTrigger value="signals">Sinais de Sucesso</TabsTrigger>
            <TabsTrigger value="friction">Fricção & Intervenção</TabsTrigger>
          </TabsList>

          {/* ───── OVERVIEW ───── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Adoção Média</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{(avgAdoption * 100).toFixed(0)}%</div>
                  <Progress value={avgAdoption * 100} className="mt-2 h-2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1"><Users className="h-3 w-3" /> Iniciativas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{items.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Sucesso Forte</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{strongCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Em Risco</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{atRiskCount}</div>
                </CardContent>
              </Card>
            </div>

            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {items.length === 0 && !isLoading && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum dado de adoção ainda. Crie iniciativas para começar o rastreamento.</CardContent></Card>
            )}

            {items.map((item: any) => (
              <Card key={item.initiative_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{item.initiative_title || `${item.initiative_id?.slice(0, 8)}...`}</CardTitle>
                    <Badge variant={SIGNAL_VARIANT[item.signal_label] || "secondary"}>
                      {SIGNAL_LABELS[item.signal_label] || item.signal_label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Milestone</span>
                      <div className="font-medium text-foreground">{((item.milestone_completion_score ?? 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Adoção</span>
                      <div className="font-medium text-foreground">{((item.adoption_score ?? 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estágio</span>
                      <div className="font-medium text-foreground">{item.stage_status}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ───── JOURNEY FUNNEL ───── */}
          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Funil de Adoção da Jornada</CardTitle>
                <CardDescription>Progressão estágio a estágio de todas as iniciativas</CardDescription>
              </CardHeader>
              <CardContent>
                {STAGE_MAP.map((stage, idx) => {
                  const count = items.filter((i: any) => stageIndex(i.stage_status) >= idx).length;
                  const pct = items.length > 0 ? (count / items.length) * 100 : 0;
                  return (
                    <div key={stage.key} className="flex items-center gap-3 py-2">
                      <div className="w-28 text-sm font-medium text-foreground">{stage.label}</div>
                      <Progress value={pct} className="flex-1 h-3" />
                      <div className="w-20 text-right text-sm text-muted-foreground">{count} ({pct.toFixed(0)}%)</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───── SUCCESS SIGNALS ───── */}
          <TabsContent value="signals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Sinais de Sucesso</CardTitle>
                <CardDescription>Sinais significativos de sucesso ao longo da jornada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum sinal ainda.</p>
                ) : (
                  <>
                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <p className="text-[10px] text-muted-foreground uppercase">Sucesso Forte</p>
                        <p className="text-lg font-bold text-primary">{strongCount}</p>
                      </div>
                      <div className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <p className="text-[10px] text-muted-foreground uppercase">Sucesso Parcial</p>
                        <p className="text-lg font-bold text-foreground">{partialCount}</p>
                      </div>
                      <div className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <p className="text-[10px] text-muted-foreground uppercase">Em Risco</p>
                        <p className="text-lg font-bold text-destructive">{atRiskCount}</p>
                      </div>
                      <div className="rounded-md border border-border/30 bg-muted/10 p-3">
                        <p className="text-[10px] text-muted-foreground uppercase">Adoção Média</p>
                        <p className="text-lg font-bold text-foreground">{(avgAdoption * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Per-initiative signals */}
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-2">
                        {items.map((item: any) => (
                          <div key={item.initiative_id} className="flex items-center gap-3 rounded-md border border-border/30 bg-muted/10 p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.initiative_title || `${item.initiative_id?.slice(0, 8)}...`}</p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                <span>Sinal: {((item.success_signal_score ?? 0) * 100).toFixed(0)}%</span>
                                <span>Adoção: {((item.adoption_score ?? 0) * 100).toFixed(0)}%</span>
                                <span>Milestone: {((item.milestone_completion_score ?? 0) * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                            <Badge variant={SIGNAL_VARIANT[item.signal_label] || "secondary"} className="text-[10px]">
                              {SIGNAL_LABELS[item.signal_label] || item.signal_label}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───── FRICTION & INTERVENTION ───── */}
          <TabsContent value="friction" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Fricção & Intervenção</CardTitle>
                <CardDescription>Clusters de fricção e intervenções recomendadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {atRiskCount === 0 && partialCount === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma fricção significativa detectada.</p>
                ) : (
                  <>
                    {/* Friction summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <p className="text-sm font-medium">Iniciativas em Risco</p>
                        </div>
                        <p className="text-2xl font-bold text-destructive mt-1">{atRiskCount}</p>
                      </div>
                      <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-yellow-400" />
                          <p className="text-sm font-medium">Baixa Adoção</p>
                        </div>
                        <p className="text-2xl font-bold text-yellow-400 mt-1">
                          {items.filter((i: any) => (i.adoption_score ?? 0) < 0.2).length}
                        </p>
                      </div>
                    </div>

                    {/* At-risk initiatives detail */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" /> Intervenções Recomendadas
                      </h4>
                      <ScrollArea className="max-h-[300px]">
                        <div className="space-y-2">
                          {items
                            .filter((i: any) => i.signal_label === "At Risk" || (i.adoption_score ?? 0) < 0.2)
                            .map((item: any) => {
                              const issues: string[] = [];
                              if (item.stage_status === "idea" || item.stage_status === "draft") issues.push("Estagnado na fase de ideia");
                              if ((item.adoption_score ?? 0) < 0.1) issues.push("Adoção muito baixa (<10%)");
                              if ((item.milestone_completion_score ?? 0) < 0.1) issues.push("Nenhum milestone alcançado");
                              if (issues.length === 0) issues.push("Progresso insuficiente na jornada");

                              return (
                                <div key={item.initiative_id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{item.initiative_title || `${item.initiative_id?.slice(0, 8)}...`}</p>
                                    <Badge variant="destructive" className="text-[10px]">
                                      {SIGNAL_LABELS[item.signal_label] || item.signal_label}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    {issues.map((issue, idx) => (
                                      <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <span className="h-1 w-1 rounded-full bg-destructive shrink-0" />
                                        {issue}
                                      </p>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-primary mt-2">
                                    → Recomendação: Avançar para a fase de descoberta ou revisar escopo da iniciativa.
                                  </p>
                                </div>
                              );
                            })}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

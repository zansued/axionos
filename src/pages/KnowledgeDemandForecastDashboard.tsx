import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, ListChecks, AlertTriangle, Sparkles, Activity } from "lucide-react";
import { useKnowledgeDemandForecast } from "@/hooks/useKnowledgeDemandForecast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

export default function KnowledgeDemandForecastDashboard() {
  const forecast = useKnowledgeDemandForecast();
  const rising = forecast.forecasts.filter((f: any) => f.demand_direction === "rising");
  const highPressure = forecast.forecasts.filter((f: any) => f.pressure_score > 0.5);
  const pending = forecast.proposals.filter((p: any) => p.status === "pending");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <TrendingUp className="h-6 w-6 text-primary" />
              Knowledge Demand Forecast
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Anticipate future knowledge needs and coverage pressure</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => forecast.generateProposals.mutate()} disabled={forecast.generateProposals.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />{forecast.generateProposals.isPending ? "Gerando…" : "Generate Proposals"}
            </Button>
            <Button size="sm" onClick={() => forecast.generateForecasts.mutate()} disabled={forecast.generateForecasts.isPending}>
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />{forecast.generateForecasts.isPending ? "Analisando…" : "Generate Forecasts"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Total Forecasts</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{forecast.forecasts.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Rising</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-warning">{rising.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" />High Pressure</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-destructive">{highPressure.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><ListChecks className="h-3 w-3" />Pending Proposals</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{pending.length}</span></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="forecasts" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="forecasts" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Forecasts</TabsTrigger>
            <TabsTrigger value="pressure" className="text-xs gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Coverage Pressure</TabsTrigger>
            <TabsTrigger value="signals" className="text-xs gap-1.5"><Activity className="h-3.5 w-3.5" />Signals</TabsTrigger>
            <TabsTrigger value="proposals" className="text-xs gap-1.5"><ListChecks className="h-3.5 w-3.5" />Proposals</TabsTrigger>
          </TabsList>

          <TabsContent value="forecasts">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Demand Forecasts by Domain</CardTitle></CardHeader>
              <CardContent>
                {forecast.forecasts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Execute Generate Forecasts para começar.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Domínio</TableHead>
                      <TableHead className="text-xs">Direção</TableHead>
                      <TableHead className="text-xs text-right">Score</TableHead>
                      <TableHead className="text-xs text-right">Confiança</TableHead>
                      <TableHead className="text-xs text-right">Pressão</TableHead>
                      <TableHead className="text-xs text-right">Gap</TableHead>
                      <TableHead className="text-xs">Driver</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {forecast.forecasts.slice(0, 20).map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="text-xs font-medium">{f.forecast_scope_key}</TableCell>
                          <TableCell><Badge variant={f.demand_direction === "rising" ? "destructive" : f.demand_direction === "stable" ? "secondary" : "default"} className="text-[10px]">{f.demand_direction}</Badge></TableCell>
                          <TableCell className="text-xs text-right">{(f.forecast_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(f.forecast_confidence * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(f.pressure_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-right">{(f.coverage_gap_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.primary_driver}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pressure">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">High Coverage Pressure Domains</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {highPressure.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum domínio com alta pressão detectado.</p>
                ) : (
                  highPressure.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                      <div>
                        <span className="text-xs font-medium">{f.forecast_scope_key}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">Gap: {(f.coverage_gap_score * 100).toFixed(0)}%</span>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">Pressure {(f.pressure_score * 100).toFixed(0)}%</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Forecast Signals</CardTitle></CardHeader>
              <CardContent>
                {forecast.signals.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum sinal registrado.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Escopo</TableHead>
                      <TableHead className="text-xs text-right">Força</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {forecast.signals.slice(0, 20).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{s.signal_type}</Badge></TableCell>
                          <TableCell className="text-xs">{s.scope_key}</TableCell>
                          <TableCell className="text-xs text-right">{(s.signal_strength * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proposals">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Demand-Driven Proposals ({pending.length} pendentes)</CardTitle></CardHeader>
              <CardContent>
                {pending.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma proposta pendente.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Escopo</TableHead>
                      <TableHead className="text-xs">Razão</TableHead>
                      <TableHead className="text-xs">Prioridade</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {pending.slice(0, 15).map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{p.proposal_type}</Badge></TableCell>
                          <TableCell className="text-xs font-medium">{p.target_scope_key}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.reason}</TableCell>
                          <TableCell><Badge variant={p.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{p.priority}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => forecast.decideProposal.mutate({ proposalId: p.id, decision: "approved" })}><Check className="h-3 w-3 text-success" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => forecast.decideProposal.mutate({ proposalId: p.id, decision: "rejected" })}><X className="h-3 w-3 text-destructive" /></Button>
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
        </Tabs>
      </div>
    </AppShell>
  );
}

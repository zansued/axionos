import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, BarChart3, ListChecks, DollarSign, Sparkles, TrendingUp } from "lucide-react";
import { useKnowledgeAcquisition } from "@/hooks/useKnowledgeAcquisition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

export default function KnowledgeAcquisitionDashboard() {
  const acq = useKnowledgeAcquisition();
  const proposedPlans = acq.plans.filter((p: any) => p.status === "proposed");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <Target className="h-6 w-6 text-primary" />
              Strategic Acquisition Planner
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Prioritize knowledge acquisition by opportunity, cost, and impact</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => acq.rankOpportunities.mutate()} disabled={acq.rankOpportunities.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />{acq.rankOpportunities.isPending ? "Ranking…" : "Rank Opportunities"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Opportunities</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{acq.opportunities.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Plans</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{acq.plans.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Proposed</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold text-warning">{proposedPlans.length}</span></CardContent>
          </Card>
          <Card className="bg-card/50 border-border/30">
            <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Budgets</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3"><span className="text-xl font-bold">{acq.budgets.length}</span></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="opportunities" className="space-y-4">
          <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
            <TabsTrigger value="opportunities" className="text-xs gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Opportunities</TabsTrigger>
            <TabsTrigger value="plans" className="text-xs gap-1.5"><ListChecks className="h-3.5 w-3.5" />Acquisition Plans</TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" />Budget</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ranked Acquisition Opportunities</CardTitle></CardHeader>
              <CardContent>
                {acq.opportunities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Execute Rank Opportunities para começar.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Domínio</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs text-right">Score</TableHead>
                      <TableHead className="text-xs text-right">Gain</TableHead>
                      <TableHead className="text-xs text-right">Cost</TableHead>
                      <TableHead className="text-xs text-right">Urgency</TableHead>
                      <TableHead className="text-xs text-right">Novelty</TableHead>
                      <TableHead className="text-xs text-right">Redundancy Risk</TableHead>
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

          <TabsContent value="plans">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Acquisition Plans</CardTitle></CardHeader>
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

          <TabsContent value="budgets">
            <Card className="bg-card/50 border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Acquisition Budgets</CardTitle></CardHeader>
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
        </Tabs>
      </div>
    </AppShell>
  );
}

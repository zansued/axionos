import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrg } from "@/contexts/OrgContext";
import { useCanonPatterns, useCanonUsageEvents, useCanonPatternApplications, useRetrievePatterns, useExplainRetrieval } from "@/hooks/useCanonRetrieval";
import { Search, Library, BarChart3, AlertTriangle, CheckCircle, FileText, Zap } from "lucide-react";

export default function PatternLibraryDashboard() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const [stackFilter, setStackFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [problemFilter, setProblemFilter] = useState("");

  const { data: patternsData, isLoading: patternsLoading } = useCanonPatterns(orgId, {
    stack: stackFilter || undefined,
    language: languageFilter || undefined,
    problem_type: problemFilter || undefined,
    max_results: 20,
  });
  const { data: usageEvents } = useCanonUsageEvents(orgId);
  const { data: applications } = useCanonPatternApplications(orgId);
  const retrieveMutation = useRetrievePatterns();
  const explainMutation = useExplainRetrieval();

  const patterns = patternsData?.patterns || [];
  const totalAvailable = patternsData?.totalAvailable || 0;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Library className="h-6 w-6 text-primary" />
            Biblioteca de Padrões & Recuperação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inteligência de implementação conectada ao runtime — recupere padrões aprovados, templates e convenções.
          </p>
        </div>

        {/* Cartões Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Padrões Disponíveis</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalAvailable}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Eventos de Uso</span>
              </div>
              <p className="text-2xl font-bold mt-1">{usageEvents?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Aplicações</span>
              </div>
              <p className="text-2xl font-bold mt-1">{applications?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Recuperados Agora</span>
              </div>
              <p className="text-2xl font-bold mt-1">{patterns.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="patterns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="patterns">Padrões</TabsTrigger>
            <TabsTrigger value="query">Console de Consulta</TabsTrigger>
            <TabsTrigger value="usage">Análise de Uso</TabsTrigger>
            <TabsTrigger value="applications">Aplicações</TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-3 flex-wrap">
                  <Input placeholder="Stack (ex: react)" value={stackFilter} onChange={e => setStackFilter(e.target.value)} className="w-40" />
                  <Input placeholder="Linguagem (ex: typescript)" value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} className="w-40" />
                  <Input placeholder="Tipo de problema" value={problemFilter} onChange={e => setProblemFilter(e.target.value)} className="w-40" />
                  <Button size="sm" variant="outline" onClick={() => { setStackFilter(""); setLanguageFilter(""); setProblemFilter(""); }}>Limpar</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Padrões Recuperados</CardTitle></CardHeader>
              <CardContent>
                {patternsLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : patterns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum padrão corresponde aos filtros atuais.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Stack</TableHead>
                        <TableHead>Confiança</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Qualidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patterns.map((p: any) => (
                        <TableRow key={p.canonEntryId}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.canonType}</Badge></TableCell>
                          <TableCell className="text-xs">{p.stackTags?.join(", ") || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={p.confidenceScore >= 0.7 ? "default" : "secondary"} className="text-xs">
                              {(p.confidenceScore * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.approvalStatus === "approved" ? "default" : "outline"} className="text-xs">
                              {p.approvalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{p.qualityLevel}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Console de Consulta de Recuperação
                </CardTitle>
                <CardDescription>Teste consultas de recuperação e veja a explicação da seleção de padrões.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => orgId && explainMutation.mutate({
                      organization_id: orgId,
                      stack: stackFilter || undefined,
                      language: languageFilter || undefined,
                      problem_type: problemFilter || undefined,
                      query_description: `Stack: ${stackFilter || "qualquer"}, Linguagem: ${languageFilter || "qualquer"}, Problema: ${problemFilter || "qualquer"}`,
                    })}
                    disabled={!orgId || explainMutation.isPending}
                  >
                    Explicar Recuperação
                  </Button>
                </div>
                {explainMutation.data && (
                  <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium">{explainMutation.data.summary}</p>
                    <p className="text-sm text-muted-foreground">{explainMutation.data.topPatternExplanation}</p>
                    {explainMutation.data.selectionCriteria?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Critérios de Seleção:</p>
                        {explainMutation.data.selectionCriteria.map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs mr-1 mb-1">{c}</Badge>
                        ))}
                      </div>
                    )}
                    {explainMutation.data.antiPatternWarnings?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Cautelas:</p>
                        {explainMutation.data.antiPatternWarnings.map((w: string, i: number) => (
                          <p key={i} className="text-xs text-destructive">{w}</p>
                        ))}
                      </div>
                    )}
                    {explainMutation.data.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Recomendações:</p>
                        {explainMutation.data.recommendations.map((r: string, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">{r}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Eventos de Uso</CardTitle></CardHeader>
              <CardContent>
                {!usageEvents?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento de uso registrado ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contexto</TableHead>
                        <TableHead>Estágio</TableHead>
                        <TableHead>Agente</TableHead>
                        <TableHead>Pontuação</TableHead>
                        <TableHead>Aplicado</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageEvents.map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{e.usage_context}</TableCell>
                          <TableCell className="text-xs">{e.pipeline_stage || "—"}</TableCell>
                          <TableCell className="text-xs">{e.agent_type || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{(e.retrieval_score * 100).toFixed(0)}%</Badge></TableCell>
                          <TableCell>{e.was_applied ? <CheckCircle className="h-4 w-4 text-primary" /> : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Aplicações de Padrões</CardTitle></CardHeader>
              <CardContent>
                {!applications?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma aplicação de padrão registrada ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estágio</TableHead>
                        <TableHead>Aplicado Por</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Impacto na Qualidade</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">{a.pipeline_stage || "—"}</TableCell>
                          <TableCell className="text-xs">{a.applied_by}</TableCell>
                          <TableCell><Badge variant={a.outcome_status === "success" ? "default" : "outline"} className="text-xs">{a.outcome_status}</Badge></TableCell>
                          <TableCell className="text-xs">{a.quality_impact_score != null ? `${(a.quality_impact_score * 100).toFixed(0)}%` : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
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
    </AppLayout>
  );
}

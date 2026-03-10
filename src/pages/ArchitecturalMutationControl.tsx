import { useState } from "react";
import { useMutationControl } from "@/hooks/useMutationControl";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Plus, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Eye, Sparkles, Ban, Activity } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending_analysis: { label: "Pendente", variant: "outline", icon: Clock },
  analyzed: { label: "Analisado", variant: "secondary", icon: Activity },
  under_review: { label: "Em Revisão", variant: "default", icon: Eye },
  approved: { label: "Aprovado", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejeitado", variant: "destructive", icon: XCircle },
  blocked: { label: "Bloqueado", variant: "destructive", icon: Ban },
  archived: { label: "Arquivado", variant: "outline", icon: Clock },
};

const TYPE_LABELS: Record<string, string> = {
  parameter_level: "Parâmetro",
  workflow_level: "Workflow",
  component_level: "Componente",
  boundary_level: "Fronteira",
  architecture_level: "Arquitetura",
};

function ScoreBar({ label, score, max = 100 }: { label: string; score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "text-destructive" : pct >= 40 ? "text-warning" : "text-primary";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${color}`}>{score}/{max}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_analysis;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function CreateMutationDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", affected_layers: [] as string[],
    changes_topology: false, changes_governance: false, changes_contracts: false,
    changes_boundaries: false, changes_billing: false, changes_safety: false,
    estimated_components_affected: 0, estimated_tables_changed: 0,
    evolution_proposal_id: "",
  });

  const layers = ["execution", "coordination", "governance", "strategic", "reflexive", "canonical_knowledge"];

  const toggleLayer = (l: string) => {
    setForm(f => ({
      ...f,
      affected_layers: f.affected_layers.includes(l)
        ? f.affected_layers.filter(x => x !== l)
        : [...f.affected_layers, l],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Novo Caso</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Caso de Mutação Arquitetural</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="ex: Refatorar motor de reparo" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>ID da Proposta de Evolução (opcional)</Label>
            <Input value={form.evolution_proposal_id} onChange={e => setForm({ ...form, evolution_proposal_id: e.target.value })} placeholder="UUID" />
          </div>
          <div className="space-y-2">
            <Label>Camadas Afetadas</Label>
            <div className="flex flex-wrap gap-2">
              {layers.map(l => (
                <Badge key={l} variant={form.affected_layers.includes(l) ? "default" : "outline"}
                  className="cursor-pointer" onClick={() => toggleLayer(l)}>{l}</Badge>
              ))}
            </div>
          </div>
          <Separator />
          <p className="text-sm font-medium">Flags de Mudança Estrutural</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "changes_topology", label: "Altera Topologia" },
              { key: "changes_governance", label: "Altera Governança" },
              { key: "changes_contracts", label: "Altera Contratos" },
              { key: "changes_boundaries", label: "Altera Fronteiras" },
              { key: "changes_billing", label: "Altera Billing" },
              { key: "changes_safety", label: "Altera Segurança" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between rounded-md border p-2">
                <Label className="text-xs">{label}</Label>
                <Switch checked={(form as any)[key]} onCheckedChange={v => setForm({ ...form, [key]: v })} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Componentes Afetados (est.)</Label>
              <Input type="number" min={0} value={form.estimated_components_affected}
                onChange={e => setForm({ ...form, estimated_components_affected: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Tabelas Alteradas (est.)</Label>
              <Input type="number" min={0} value={form.estimated_tables_changed}
                onChange={e => setForm({ ...form, estimated_tables_changed: Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={() => { onCreate(form); setOpen(false); }} className="w-full">Criar Caso de Mutação</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CaseDetailSheet({ mc, onTransition, onScoreLegitimacy, onExplain }: {
  mc: any;
  onTransition: (caseId: string, status: string, notes?: string) => void;
  onScoreLegitimacy: (caseId: string) => void;
  onExplain: (caseId: string) => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1"><Eye className="h-3.5 w-3.5" />Detalhes</Button>
      </SheetTrigger>
      <SheetContent className="w-[540px] sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {mc.title || "Caso de Mutação"}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={mc.approval_status} />
              <Badge variant="outline">{TYPE_LABELS[mc.mutation_type] || mc.mutation_type}</Badge>
              {mc.forbidden_family_flag && (
                <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" />Família Proibida</Badge>
              )}
              {mc.topology_change_flag && (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Topologia</Badge>
              )}
            </div>

            {mc.description && (
              <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">{mc.description}</p></CardContent></Card>
            )}

            {mc.forbidden_family_flag && mc.forbidden_families_detected?.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Famílias Proibidas Detectadas</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {mc.forbidden_families_detected.map((f: string) => (
                      <Badge key={f} variant="destructive" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                  {mc.execution_block_reason && <p className="text-xs text-destructive mt-2">{mc.execution_block_reason}</p>}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <ScoreBar label="Raio de Explosão" score={Number(mc.blast_radius_score)} />
              <ScoreBar label="Expansão de Acoplamento" score={Number(mc.coupling_expansion_score)} />
              <ScoreBar label="Viabilidade de Rollback" score={Number(mc.rollback_viability_score)} />
              <ScoreBar label="Legitimidade" score={Number(mc.legitimacy_score)} />
              <ScoreBar label="Risco de Drift" score={Number(mc.drift_risk_score)} />
            </div>

            {mc.affected_layers?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Camadas Afetadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {mc.affected_layers.map((l: string) => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Ações de Análise</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onScoreLegitimacy(mc.id)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />Pontuar Legitimidade
                </Button>
                <Button size="sm" variant="outline" onClick={() => onExplain(mc.id)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />Explicar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Transição de Status</p>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." rows={2} />
              <div className="flex flex-wrap gap-2">
                {mc.approval_status === "pending_analysis" && (
                  <Button size="sm" onClick={() => onTransition(mc.id, "analyzed", notes)}>Marcar Analisado</Button>
                )}
                {mc.approval_status === "analyzed" && (
                  <Button size="sm" onClick={() => onTransition(mc.id, "under_review", notes)}>Iniciar Revisão</Button>
                )}
                {mc.approval_status === "under_review" && (
                  <>
                    <Button size="sm" onClick={() => onTransition(mc.id, "approved", notes)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onTransition(mc.id, "rejected", notes)}>
                      <XCircle className="h-3.5 w-3.5 mr-1" />Rejeitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onTransition(mc.id, "blocked", notes)}>Bloquear</Button>
                  </>
                )}
                {mc.approval_status === "blocked" && (
                  <Button size="sm" variant="outline" onClick={() => onTransition(mc.id, "under_review", notes)}>Reabrir Revisão</Button>
                )}
                {!["archived"].includes(mc.approval_status) && (
                  <Button size="sm" variant="ghost" onClick={() => onTransition(mc.id, "archived", notes)}>Arquivar</Button>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2">
              <p>Proposto por: {mc.proposed_by}</p>
              <p>Criado: {new Date(mc.created_at).toLocaleString("pt-BR")}</p>
              {mc.reviewed_by && <p>Revisado: {mc.reviewed_by}</p>}
              {mc.approved_by && <p>Aprovado: {mc.approved_by}</p>}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function ArchitecturalMutationControl() {
  const { cases, loading, createCase, transitionStatus, scoreLegitimacy, explainCase } = useMutationControl();
  const [activeTab, setActiveTab] = useState("all");
  const [explanationDialog, setExplanationDialog] = useState<any>(null);

  const filtered = activeTab === "all" ? cases : cases.filter((c: any) => c.approval_status === activeTab);

  const blocked = cases.filter((c: any) => c.forbidden_family_flag).length;
  const underReview = cases.filter((c: any) => c.approval_status === "under_review").length;
  const approved = cases.filter((c: any) => c.approval_status === "approved").length;

  const handleExplain = async (caseId: string) => {
    const result = await explainCase.mutateAsync(caseId);
    setExplanationDialog(result);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Controle de Mutação Arquitetural</h1>
            <p className="text-sm text-muted-foreground">
              Avaliação estrutural de mutações propostas — Block X / Sprint 112
            </p>
          </div>
          <CreateMutationDialog onCreate={(data) => createCase.mutate(data)} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{cases.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-destructive">{blocked}</p><p className="text-xs text-muted-foreground">Bloqueados</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-warning">{underReview}</p><p className="text-xs text-muted-foreground">Em Revisão</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-primary">{approved}</p><p className="text-xs text-muted-foreground">Aprovados</p></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pending_analysis">Pendentes</TabsTrigger>
            <TabsTrigger value="analyzed">Analisados</TabsTrigger>
            <TabsTrigger value="under_review">Em Revisão</TabsTrigger>
            <TabsTrigger value="blocked">Bloqueados</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">Nenhum caso de mutação encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((mc: any) => (
                  <Card key={mc.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={mc.approval_status} />
                            <Badge variant="outline" className="text-xs">{TYPE_LABELS[mc.mutation_type] || mc.mutation_type}</Badge>
                            {mc.forbidden_family_flag && <Badge variant="destructive" className="text-xs gap-1"><Ban className="h-3 w-3" />Proibida</Badge>}
                            {mc.topology_change_flag && <Badge variant="destructive" className="text-xs">Topologia</Badge>}
                          </div>
                          <p className="text-sm font-medium">{mc.title || "Sem título"}</p>
                          <div className="grid grid-cols-5 gap-2">
                            <div className="text-xs"><span className="text-muted-foreground">Blast: </span><span className="font-medium">{Number(mc.blast_radius_score).toFixed(0)}</span></div>
                            <div className="text-xs"><span className="text-muted-foreground">Coupling: </span><span className="font-medium">{Number(mc.coupling_expansion_score).toFixed(0)}</span></div>
                            <div className="text-xs"><span className="text-muted-foreground">Rollback: </span><span className="font-medium">{Number(mc.rollback_viability_score).toFixed(0)}</span></div>
                            <div className="text-xs"><span className="text-muted-foreground">Legit: </span><span className="font-medium">{Number(mc.legitimacy_score).toFixed(0)}</span></div>
                            <div className="text-xs"><span className="text-muted-foreground">Drift: </span><span className="font-medium">{Number(mc.drift_risk_score).toFixed(0)}</span></div>
                          </div>
                        </div>
                        <CaseDetailSheet
                          mc={mc}
                          onTransition={(id, status, notes) => transitionStatus.mutate({ caseId: id, target_status: status, notes })}
                          onScoreLegitimacy={(id) => scoreLegitimacy.mutate({ caseId: id })}
                          onExplain={handleExplain}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {explanationDialog && (
          <Dialog open={!!explanationDialog} onOpenChange={() => setExplanationDialog(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{explanationDialog.explanation?.title || "Explicação"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm">{explanationDialog.explanation?.summary}</p>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Veredicto de Governança</p>
                  <p className="text-sm font-medium">{explanationDialog.explanation?.governance_verdict}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Avaliação Estrutural</p>
                  <p className="text-sm">{explanationDialog.explanation?.structural_assessment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Reversibilidade</p>
                  <p className="text-sm">{explanationDialog.explanation?.reversibility_assessment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Risco de Drift</p>
                  <p className="text-sm">{explanationDialog.explanation?.drift_assessment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recomendação</p>
                  <p className="text-sm">{explanationDialog.explanation?.recommendation}</p>
                </div>
                {explanationDialog.explanation?.blocked && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                    <p className="text-xs font-medium text-destructive">BLOQUEADO</p>
                    {explanationDialog.explanation.block_reasons?.map((r: string, i: number) => (
                      <p key={i} className="text-xs text-destructive mt-1">{r}</p>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}

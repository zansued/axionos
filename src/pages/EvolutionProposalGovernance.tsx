import { useState } from "react";
import { useEvolutionProposals } from "@/hooks/useEvolutionProposals";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Eye, Sparkles } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  draft: { label: "Rascunho", variant: "outline", icon: Clock },
  submitted: { label: "Submetida", variant: "secondary", icon: Clock },
  under_review: { label: "Em Revisão", variant: "default", icon: Eye },
  approved: { label: "Aprovada", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejeitada", variant: "destructive", icon: XCircle },
  deferred: { label: "Adiada", variant: "outline", icon: Clock },
  archived: { label: "Arquivada", variant: "outline", icon: Clock },
};

const TYPE_LABELS: Record<string, string> = {
  operational_fix: "Correção Operacional",
  tactical_improvement: "Melhoria Tática",
  architectural_evolution: "Evolução Arquitetural",
  existential_change: "Mudança Existencial",
};

const LAYER_LABELS: Record<string, string> = {
  execution: "Execução",
  coordination: "Coordenação",
  governance: "Governança",
  strategic: "Estratégica",
  reflexive: "Reflexiva",
  canonical_knowledge: "Conhecimento Canônico",
  cross_layer: "Cross-Layer",
};

function ProposalStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function KernelRiskIndicator({ risk }: { risk: number }) {
  const color = risk > 60 ? "text-destructive" : risk > 30 ? "text-yellow-500" : "text-green-500";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {risk > 60 ? "⚠ Alto" : risk > 30 ? "◐ Moderado" : "● Baixo"} ({risk})
    </span>
  );
}

function CreateProposalDialog({ onCreate }: { onCreate: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    proposal_type: "operational_fix",
    target_layer: "execution",
    target_scope: "",
    problem_statement: "",
    justification_summary: "",
    expected_benefit: "",
    complexity_cost: 10,
    reversibility_posture: "fully_reversible",
    boundedness_posture: "strictly_bounded",
    triggering_signals: [] as any[],
  });

  const handleSubmit = () => {
    onCreate(form);
    setOpen(false);
    setForm({ ...form, target_scope: "", problem_statement: "", justification_summary: "", expected_benefit: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Proposta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Proposta de Evolução</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Proposta</Label>
              <Select value={form.proposal_type} onValueChange={v => setForm({ ...form, proposal_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Camada Alvo</Label>
              <Select value={form.target_layer} onValueChange={v => setForm({ ...form, target_layer: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LAYER_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Escopo Alvo</Label>
            <Input value={form.target_scope} onChange={e => setForm({ ...form, target_scope: e.target.value })} placeholder="ex: pipeline-validation, repair-loop" />
          </div>
          <div className="space-y-2">
            <Label>Declaração do Problema</Label>
            <Textarea value={form.problem_statement} onChange={e => setForm({ ...form, problem_statement: e.target.value })} placeholder="Descreva o problema detectado..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Justificativa</Label>
            <Textarea value={form.justification_summary} onChange={e => setForm({ ...form, justification_summary: e.target.value })} placeholder="Por que essa mudança é necessária..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Benefício Esperado</Label>
            <Textarea value={form.expected_benefit} onChange={e => setForm({ ...form, expected_benefit: e.target.value })} placeholder="Qual o resultado esperado..." rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Custo de Complexidade (0-100)</Label>
              <Input type="number" min={0} max={100} value={form.complexity_cost} onChange={e => setForm({ ...form, complexity_cost: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Reversibilidade</Label>
              <Select value={form.reversibility_posture} onValueChange={v => setForm({ ...form, reversibility_posture: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fully_reversible">Totalmente Reversível</SelectItem>
                  <SelectItem value="partially_reversible">Parcialmente Reversível</SelectItem>
                  <SelectItem value="irreversible">Irreversível</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Limitação de Escopo</Label>
              <Select value={form.boundedness_posture} onValueChange={v => setForm({ ...form, boundedness_posture: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strictly_bounded">Estritamente Limitado</SelectItem>
                  <SelectItem value="loosely_bounded">Parcialmente Limitado</SelectItem>
                  <SelectItem value="unbounded">Sem Limite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full">Criar Proposta</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProposalDetailSheet({ proposal, onTransition, onEvaluateLegitimacy, onExplain }: {
  proposal: any;
  onTransition: (proposalId: string, target_status: string, notes?: string) => void;
  onEvaluateLegitimacy: (proposalId: string) => void;
  onExplain: (proposalId: string) => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Eye className="h-3.5 w-3.5" />
          Detalhes
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[520px] sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Proposta de Evolução
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <ProposalStatusBadge status={proposal.status} />
              <Badge variant="outline">{TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type}</Badge>
              <Badge variant="outline">{LAYER_LABELS[proposal.target_layer] || proposal.target_layer}</Badge>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Problema</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{proposal.problem_statement}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Justificativa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{proposal.justification_summary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Benefício Esperado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{proposal.expected_benefit}</p>
              </CardContent>
            </Card>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Legitimidade</p>
                <p className="text-lg font-semibold">{Number(proposal.legitimacy_score).toFixed(0)}/100</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Risco Kernel</p>
                <KernelRiskIndicator risk={Number(proposal.kernel_touch_risk)} />
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Complexidade</p>
                <p className="text-sm font-medium">{Number(proposal.complexity_cost)}/100</p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Alinhamento Missão</p>
                <p className="text-sm font-medium">{Number(proposal.mission_alignment_score).toFixed(0)}/100</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Ações de Governança</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onEvaluateLegitimacy(proposal.id)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Avaliar Legitimidade
                </Button>
                <Button size="sm" variant="outline" onClick={() => onExplain(proposal.id)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Explicar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Transição de Status</p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas da decisão..."
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {proposal.status === "draft" && (
                  <Button size="sm" onClick={() => onTransition(proposal.id, "submitted", notes)}>Submeter</Button>
                )}
                {proposal.status === "submitted" && (
                  <Button size="sm" onClick={() => onTransition(proposal.id, "under_review", notes)}>Iniciar Revisão</Button>
                )}
                {proposal.status === "under_review" && (
                  <>
                    <Button size="sm" onClick={() => onTransition(proposal.id, "approved", notes)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onTransition(proposal.id, "rejected", notes)}>
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Rejeitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onTransition(proposal.id, "deferred", notes)}>Adiar</Button>
                  </>
                )}
                {proposal.status !== "archived" && (
                  <Button size="sm" variant="ghost" onClick={() => onTransition(proposal.id, "archived", notes)}>Arquivar</Button>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2">
              <p>Proposto por: {proposal.proposed_by}</p>
              <p>Criado: {new Date(proposal.created_at).toLocaleString("pt-BR")}</p>
              {proposal.reviewed_by && <p>Revisado por: {proposal.reviewed_by}</p>}
              {proposal.approved_by && <p>Aprovado por: {proposal.approved_by}</p>}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function EvolutionProposalGovernance() {
  const { proposals, loading, createProposal, transitionStatus, evaluateLegitimacy, explainProposal } = useEvolutionProposals();
  const [activeTab, setActiveTab] = useState("all");
  const [explanationDialog, setExplanationDialog] = useState<any>(null);

  const filteredProposals = activeTab === "all"
    ? proposals
    : proposals.filter((p: any) => p.status === activeTab);

  const handleExplain = async (proposalId: string) => {
    const result = await explainProposal.mutateAsync(proposalId);
    setExplanationDialog(result);
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Governança de Evolução</h1>
            <p className="text-sm text-muted-foreground">
              Propostas governadas para evolução do sistema — Block X / Sprint 111
            </p>
          </div>
          <CreateProposalDialog onCreate={(data) => createProposal.mutate(data)} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{proposals.length}</p>
              <p className="text-xs text-muted-foreground">Total de Propostas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-yellow-500">{proposals.filter((p: any) => p.status === "under_review").length}</p>
              <p className="text-xs text-muted-foreground">Em Revisão</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-500">{proposals.filter((p: any) => p.status === "approved").length}</p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-destructive">{proposals.filter((p: any) => p.status === "rejected").length}</p>
              <p className="text-xs text-muted-foreground">Rejeitadas</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="draft">Rascunho</TabsTrigger>
            <TabsTrigger value="submitted">Submetidas</TabsTrigger>
            <TabsTrigger value="under_review">Em Revisão</TabsTrigger>
            <TabsTrigger value="approved">Aprovadas</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredProposals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">Nenhuma proposta de evolução encontrada</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Crie uma proposta para governar mudanças estruturais no sistema
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredProposals.map((proposal: any) => (
                  <Card key={proposal.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ProposalStatusBadge status={proposal.status} />
                            <Badge variant="outline" className="text-xs">{TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type}</Badge>
                            <Badge variant="outline" className="text-xs">{LAYER_LABELS[proposal.target_layer] || proposal.target_layer}</Badge>
                            {proposal.target_scope && (
                              <span className="text-xs text-muted-foreground">→ {proposal.target_scope}</span>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{proposal.problem_statement}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Legitimidade: {Number(proposal.legitimacy_score).toFixed(0)}</span>
                            <KernelRiskIndicator risk={Number(proposal.kernel_touch_risk)} />
                            <span>{new Date(proposal.created_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                        <ProposalDetailSheet
                          proposal={proposal}
                          onTransition={(id, status, notes) => transitionStatus.mutate({ proposalId: id, target_status: status, notes })}
                          onEvaluateLegitimacy={(id) => evaluateLegitimacy.mutate(id)}
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

        {/* Explanation Dialog */}
        {explanationDialog && (
          <Dialog open={!!explanationDialog} onOpenChange={() => setExplanationDialog(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{explanationDialog.explanation?.title || "Explicação"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm">{explanationDialog.explanation?.summary}</p>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Veredicto de Governança</p>
                  <p className="text-sm">{explanationDialog.explanation?.governance_verdict}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Avaliação de Risco</p>
                  <p className="text-sm">{explanationDialog.explanation?.risk_assessment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Recomendação</p>
                  <p className="text-sm">{explanationDialog.explanation?.recommendation}</p>
                </div>
                {explanationDialog.legitimacy?.warnings?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-yellow-500">Avisos</p>
                    <ul className="text-sm space-y-0.5">
                      {explanationDialog.legitimacy.warnings.map((w: string, i: number) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          {w}
                        </li>
                      ))}
                    </ul>
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

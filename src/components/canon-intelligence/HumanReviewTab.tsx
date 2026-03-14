import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useHumanReview, type HumanReviewCandidate } from "@/hooks/useHumanReview";
import {
  CheckCircle2, XCircle, RotateCcw, Loader2, Eye, Shield,
  AlertTriangle, Clock, CheckCheck, Inbox,
} from "lucide-react";

type ReviewAction = "approve" | "reject" | "revision" | null;

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "text-primary" : value >= 50 ? "text-accent-foreground" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-[9px] text-muted-foreground uppercase">{label}</span>
    </div>
  );
}

function parseScores(reason: string | null | undefined): { quality: number; novelty: number; relevance: number; clarity: number } | null {
  if (!reason) return null;
  const match = reason.match(/Q=(\d+)\s+N=(\d+)\s+R=(\d+)\s+C=(\d+)/);
  if (!match) return null;
  return { quality: +match[1], novelty: +match[2], relevance: +match[3], clarity: +match[4] };
}

export function HumanReviewTab() {
  const {
    pendingCandidates, reviewHistory, loading, loadingHistory,
    approveCandidate, rejectCandidate, requestRevision, bulkApprove, isActing,
  } = useHumanReview();

  const [selectedCandidate, setSelectedCandidate] = useState<HumanReviewCandidate | null>(null);
  const [action, setAction] = useState<ReviewAction>(null);
  const [notes, setNotes] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const openAction = (c: HumanReviewCandidate, a: ReviewAction) => {
    setSelectedCandidate(c);
    setAction(a);
    setNotes("");
  };

  const handleConfirm = () => {
    if (!selectedCandidate || !action) return;
    const id = selectedCandidate.id;
    if (action === "approve") approveCandidate.mutate({ candidateId: id, notes });
    else if (action === "reject") rejectCandidate.mutate({ candidateId: id, notes });
    else if (action === "revision") requestRevision.mutate({ candidateId: id, notes });
    setAction(null);
    setSelectedCandidate(null);
  };

  const openDetail = (c: HumanReviewCandidate) => {
    setSelectedCandidate(c);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{pendingCandidates.length} aguardando revisão</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{reviewHistory.length} revisados recentemente</span>
          </div>
        </div>
        {pendingCandidates.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkApprove.mutate()}
            disabled={isActing}
            className="gap-1.5"
          >
            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Aprovar Todos ({pendingCandidates.length})
          </Button>
        )}
      </div>

      <Tabs defaultValue="pending" className="space-y-3">
        <TabsList className="bg-muted/20 border border-border/20">
          <TabsTrigger value="pending" className="text-xs gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Pendentes ({pendingCandidates.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <Shield className="h-3 w-3" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingCandidates.length === 0 ? (
            <Card className="border-border/20 bg-card/30">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhum candidato aguardando revisão humana.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Candidatos borderline aparecerão aqui após a revisão por IA.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingCandidates.map((c) => {
                const scores = parseScores(c.promotion_decision_reason);
                return (
                  <Card key={c.id} className="border-border/30 bg-card/40 hover:bg-card/60 transition-colors">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-foreground truncate">{c.title}</h4>
                            <Badge variant="outline" className="text-[9px] shrink-0">{c.knowledge_type}</Badge>
                            {c.domain_scope && (
                              <Badge variant="secondary" className="text-[9px] shrink-0">{c.domain_scope}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.summary}</p>

                          {c.promotion_decision_reason && (
                            <p className="text-[10px] text-muted-foreground/70 italic line-clamp-1">
                              IA: {c.promotion_decision_reason.replace("[AI Review] ", "")}
                            </p>
                          )}
                        </div>

                        {/* Center: Scores */}
                        {scores && (
                          <div className="flex items-center gap-3 border border-border/20 rounded-lg px-3 py-1.5 bg-muted/10 shrink-0">
                            <ScoreBadge label="Quality" value={scores.quality} />
                            <ScoreBadge label="Novelty" value={scores.novelty} />
                            <ScoreBadge label="Relevance" value={scores.relevance} />
                            <ScoreBadge label="Clarity" value={scores.clarity} />
                          </div>
                        )}

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetail(c)} title="Ver detalhes">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => openAction(c, "approve")} disabled={isActing}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Aprovar</span>
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openAction(c, "reject")} disabled={isActing}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Rejeitar</span>
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 px-2 text-accent-foreground hover:bg-accent/10"
                            onClick={() => openAction(c, "revision")} disabled={isActing}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Revisar</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviewHistory.length === 0 ? (
            <Card className="border-border/20 bg-card/30">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma revisão humana registrada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Título</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Decisão</TableHead>
                  <TableHead className="text-xs">Razão</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewHistory.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{c.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px]">{c.knowledge_type}</Badge></TableCell>
                    <TableCell>
                      <Badge
                        variant={c.internal_validation_status === "approved" ? "default" : "destructive"}
                        className="text-[9px]"
                      >
                        {c.internal_validation_status === "approved" ? "Aprovado" : "Rejeitado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground max-w-[300px] truncate">
                      {c.promotion_decision_reason?.replace("[Human Review] ", "")}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {new Date(c.updated_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!action} onOpenChange={(open) => { if (!open) { setAction(null); setSelectedCandidate(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {action === "approve" && "Aprovar Candidato"}
              {action === "reject" && "Rejeitar Candidato"}
              {action === "revision" && "Solicitar Re-Revisão"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              <span className="font-medium text-foreground">{selectedCandidate?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder={
                action === "revision"
                  ? "Descreva o que a IA deve reconsiderar..."
                  : "Notas opcionais sobre a decisão..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[80px]"
              required={action === "revision"}
            />
            {action === "approve" && (
              <p className="text-[10px] text-muted-foreground">
                O candidato será marcado como aprovado e ficará disponível para promoção ao cânone.
              </p>
            )}
            {action === "reject" && (
              <p className="text-[10px] text-muted-foreground">
                O candidato será permanentemente rejeitado e não poderá ser promovido.
              </p>
            )}
            {action === "revision" && (
              <p className="text-[10px] text-muted-foreground">
                O candidato voltará para a fila de revisão por IA com suas notas como contexto.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => { setAction(null); setSelectedCandidate(null); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant={action === "reject" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isActing || (action === "revision" && !notes.trim())}
            >
              {isActing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedCandidate && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{selectedCandidate.title}</DialogTitle>
                <DialogDescription className="text-xs flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[9px]">{selectedCandidate.knowledge_type}</Badge>
                  {selectedCandidate.domain_scope && <Badge variant="secondary" className="text-[9px]">{selectedCandidate.domain_scope}</Badge>}
                  {selectedCandidate.domain_classification && <Badge variant="secondary" className="text-[9px]">{selectedCandidate.domain_classification}</Badge>}
                  {selectedCandidate.source_type && <Badge variant="outline" className="text-[9px]">{selectedCandidate.source_type}</Badge>}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Resumo</h5>
                  <p className="text-xs text-foreground leading-relaxed">{selectedCandidate.summary}</p>
                </div>

                {selectedCandidate.body && (
                  <div>
                    <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Corpo</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {selectedCandidate.body}
                    </p>
                  </div>
                )}

                {selectedCandidate.source_reference && (
                  <div>
                    <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Fonte</h5>
                    <p className="text-xs text-primary break-all">{selectedCandidate.source_reference}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Novelty</h5>
                    <span className="text-sm font-bold">{(selectedCandidate.novelty_score * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Confiabilidade Fonte</h5>
                    <span className="text-sm font-bold">{(selectedCandidate.source_reliability_score * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Score Avaliação</h5>
                    <span className="text-sm font-bold">{selectedCandidate.evaluation_score ?? "—"}</span>
                  </div>
                </div>

                {selectedCandidate.promotion_decision_reason && (
                  <div>
                    <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Avaliação da IA</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedCandidate.promotion_decision_reason}
                    </p>
                  </div>
                )}

                {(() => {
                  const scores = parseScores(selectedCandidate.promotion_decision_reason);
                  if (!scores) return null;
                  return (
                    <div>
                      <h5 className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">Scores da IA</h5>
                      <div className="grid grid-cols-4 gap-3">
                        <ScoreBadge label="Quality" value={scores.quality} />
                        <ScoreBadge label="Novelty" value={scores.novelty} />
                        <ScoreBadge label="Relevance" value={scores.relevance} />
                        <ScoreBadge label="Clarity" value={scores.clarity} />
                      </div>
                    </div>
                  );
                })()}

                <div className="text-[10px] text-muted-foreground/60">
                  Criado em: {new Date(selectedCandidate.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <DialogFooter className="gap-1.5">
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => { setDetailOpen(false); openAction(selectedCandidate, "approve"); }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={() => { setDetailOpen(false); openAction(selectedCandidate, "reject"); }}
                >
                  <XCircle className="h-3.5 w-3.5" /> Rejeitar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => { setDetailOpen(false); openAction(selectedCandidate, "revision"); }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Re-Revisar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

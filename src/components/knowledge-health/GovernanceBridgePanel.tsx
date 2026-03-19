import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ArrowRight, CheckCircle2, XCircle, Clock, GitBranch, ArrowDown } from "lucide-react";

const BRIDGE_STATUS_COLORS: Record<string, string> = {
  no_bridge_needed: "bg-muted text-muted-foreground",
  bridge_eligible: "bg-amber-500/20 text-amber-400",
  proposal_created: "bg-blue-500/20 text-blue-400",
  awaiting_governance_review: "bg-primary/20 text-primary",
  governance_decided: "bg-muted text-foreground",
  governance_rejected: "bg-destructive/20 text-destructive",
  governance_approved: "bg-emerald-500/20 text-emerald-400",
};

const BP_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  applied: "bg-emerald-500/20 text-emerald-400",
  skipped: "bg-muted text-muted-foreground",
  failed: "bg-destructive/20 text-destructive",
};

interface Props {
  bridges: any[];
  onDecide: (bridgeId: string, decision: string, notes?: string) => void;
  onBackPropagate: (bridgeId: string) => void;
  deciding?: boolean;
  propagating?: boolean;
}

export function GovernanceBridgePanel({ bridges, onDecide, onBackPropagate, deciding, propagating }: Props) {
  const eligible = bridges.filter((b: any) => b.bridge_status === "bridge_eligible").length;
  const awaitingReview = bridges.filter((b: any) => b.bridge_status === "awaiting_governance_review").length;
  const approved = bridges.filter((b: any) => b.bridge_status === "governance_approved").length;
  const rejected = bridges.filter((b: any) => b.bridge_status === "governance_rejected").length;
  const pendingPropagation = bridges.filter((b: any) => b.bridge_status === "governance_approved" && b.back_propagation_status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <MiniCard label="Elegíveis p/ Bridge" value={eligible} variant={eligible > 0 ? "warning" : "default"} />
        <MiniCard label="Aguardando Revisão" value={awaitingReview} variant={awaitingReview > 0 ? "accent" : "default"} />
        <MiniCard label="Aprovados" value={approved} variant="success" />
        <MiniCard label="Rejeitados" value={rejected} variant={rejected > 0 ? "destructive" : "default"} />
        <MiniCard label="Propagação Pendente" value={pendingPropagation} variant={pendingPropagation > 0 ? "warning" : "default"} />
      </div>

      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Renovação → Ponte de Governança
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bridges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de ponte de governança ainda.</p>
          ) : (
            <div className="overflow-auto max-h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Alvo</TableHead>
                    <TableHead className="text-xs">Resultado</TableHead>
                    <TableHead className="text-xs">Ação Gov.</TableHead>
                    <TableHead className="text-xs">Status Bridge</TableHead>
                    <TableHead className="text-xs">Confiança</TableHead>
                    <TableHead className="text-xs">Propagação</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bridges.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs font-mono truncate max-w-[100px]" title={b.target_entry_id}>
                        {b.target_type}/{b.target_entry_id?.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{b.renewal_outcome?.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{b.governance_action_type?.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${BRIDGE_STATUS_COLORS[b.bridge_status] || ""}`}>
                          {b.bridge_status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.confidence_before != null && b.confidence_after != null ? (
                          <span className="font-mono">
                            {(b.confidence_before * 100).toFixed(0)}%
                            <ArrowRight className="h-3 w-3 inline mx-0.5" />
                            {(b.confidence_after * 100).toFixed(0)}%
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${BP_STATUS_COLORS[b.back_propagation_status] || ""}`}>
                          {b.back_propagation_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {b.bridge_status === "bridge_eligible" && (
                            <>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={deciding}
                                onClick={() => onDecide(b.id, "approve")}>
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />Aprovar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={deciding}
                                onClick={() => onDecide(b.id, "reject")}>
                                <XCircle className="h-3 w-3 mr-0.5" />Rejeitar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={deciding}
                                onClick={() => onDecide(b.id, "defer")}>
                                <Clock className="h-3 w-3 mr-0.5" />Adiar
                              </Button>
                            </>
                          )}
                          {b.bridge_status === "governance_approved" && b.back_propagation_status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" disabled={propagating}
                              onClick={() => onBackPropagate(b.id)}>
                              <ArrowDown className="h-3 w-3 mr-0.5" />Propagar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniCard({ label, value, variant = "default" }: {
  label: string; value: number; variant?: "default" | "success" | "warning" | "destructive" | "accent";
}) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    destructive: "text-destructive",
    accent: "text-primary",
  };
  return (
    <Card className="border-border/30 bg-card/40">
      <CardContent className="pt-3 pb-2 text-center">
        <p className={`text-lg font-bold ${colors[variant]}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

interface Props {
  proposals: any[];
  onDecide: (proposalId: string, decision: string, notes?: string) => void;
  deciding: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  merge_cluster: "Fundir Cluster",
  archive_duplicate: "Arquivar Duplicata",
  expand_domain: "Expandir Domínio",
  split_cluster: "Dividir Cluster",
  prioritize_learning_area: "Priorizar Aprendizado",
  re_balance_skill_distribution: "Rebalancear Skills",
};

const PRIORITY_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  high: "destructive",
  medium: "secondary",
  low: "default",
};

export function OptimizationQueue({ proposals, onDecide, deciding }: Props) {
  const pending = proposals.filter((p) => p.status === "pending");

  return (
    <Card className="bg-card/50 border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Fila de Otimização ({pending.length} pendentes)</CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma proposta pendente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Escopo</TableHead>
                <TableHead className="text-xs">Razão</TableHead>
                <TableHead className="text-xs">Prioridade</TableHead>
                <TableHead className="text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.slice(0, 20).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[p.proposal_type] || p.proposal_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium max-w-[120px] truncate">{p.target_scope}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.reason}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_COLORS[p.priority] || "default"} className="text-[10px]">
                      {p.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        disabled={deciding}
                        onClick={() => onDecide(p.id, "approved")}
                      >
                        <Check className="h-3 w-3 text-success" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        disabled={deciding}
                        onClick={() => onDecide(p.id, "rejected")}
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

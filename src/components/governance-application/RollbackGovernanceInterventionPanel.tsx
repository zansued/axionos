import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ChangeApplication } from "@/lib/governance-change-application-types";
import { Undo2, Flag, AlertTriangle, Eye, FileText, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { application: ChangeApplication }

export function RollbackGovernanceInterventionPanel({ application: a }: Props) {
  const { toast } = useToast();

  const isRolledBack = a.applicationStatus === "rolled_back" || a.applicationStatus === "rollback_in_progress";

  const handleAction = (action: string) => {
    toast({ title: "Ação Registrada", description: `${action} — ${a.applicationId}` });
  };

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Undo2 className="h-4 w-4 text-primary" /> Rollback e Intervenção de Governança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status de rollback */}
        <div className="rounded-lg border border-border/30 p-3 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Status de Rollback</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Elegibilidade:</span> <span className="text-foreground">{a.rollbackExpectations ? "Elegível" : "Desconhecido"}</span></div>
            <div><span className="text-muted-foreground">Ativo atualmente:</span> <span className={isRolledBack ? "text-red-400" : "text-muted-foreground"}>{isRolledBack ? "Sim" : "Não"}</span></div>
          </div>
          <div className="text-xs"><span className="text-muted-foreground">Plano de rollback:</span> <span className="text-foreground">{a.rollbackExpectations}</span></div>
          {a.linkedEscalations.length > 0 && (
            <div className="text-xs"><span className="text-muted-foreground">Escalações vinculadas:</span> <span className="text-foreground">{a.linkedEscalations.join(", ")}</span></div>
          )}
        </div>

        {/* Ações de intervenção */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Ações de Intervenção de Governança</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Sinalizar para Revisão de Governança")}>
              <Flag className="h-3 w-3" /> Sinalizar para Revisão
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Escalar Preocupação")}>
              <AlertTriangle className="h-3 w-3" /> Escalar Preocupação
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Marcar Monitoramento Necessário")}>
              <Eye className="h-3 w-3" /> Marcar Monitoramento
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Abrir Proposta de Acompanhamento")}>
              <FileText className="h-3 w-3" /> Proposta de Acompanhamento
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Registrar Nota de Intervenção")}>
              <PenLine className="h-3 w-3" /> Registrar Nota
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

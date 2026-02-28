import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Send, Rocket, Eye } from "lucide-react";

interface ArtifactReviewActionsProps {
  status: string;
  onSubmitForReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDeploy: () => void;
  deployBlocked?: boolean;
}

export function ArtifactReviewActions({
  status,
  onSubmitForReview,
  onApprove,
  onReject,
  onDeploy,
  deployBlocked,
}: ArtifactReviewActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {status === "draft" && (
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onSubmitForReview}>
          <Eye className="h-3 w-3" /> Enviar p/ Revisão
        </Button>
      )}
      {status === "pending_review" && (
        <>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={onApprove}>
            <CheckCircle2 className="h-3 w-3" /> Aprovar
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onReject}>
            <XCircle className="h-3 w-3" /> Rejeitar
          </Button>
        </>
      )}
      {status === "approved" && (
        <Button
          variant="outline"
          size="sm"
          className={`h-7 text-xs gap-1 ${deployBlocked ? "opacity-50 cursor-not-allowed" : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"}`}
          onClick={onDeploy}
          disabled={deployBlocked}
          title={deployBlocked ? "Necessária validação aprovada (pass) para deploy" : "Fazer deploy"}
        >
          <Rocket className="h-3 w-3" /> Deploy
        </Button>
      )}
      {status === "rejected" && (
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onSubmitForReview}>
          <Send className="h-3 w-3" /> Reenviar
        </Button>
      )}
    </div>
  );
}

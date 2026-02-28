import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, XCircle, Send, Rocket, Eye, MessageSquare, RotateCcw } from "lucide-react";

interface ArtifactReviewActionsProps {
  status: string;
  onSubmitForReview: (comment?: string) => void;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
  onRequestChanges?: (comment?: string) => void;
  onDeploy: (comment?: string) => void;
  onComment?: (comment: string) => void;
  deployBlocked?: boolean;
}

function ActionWithComment({ 
  trigger, 
  onConfirm, 
  placeholder,
  requireComment = false,
}: { 
  trigger: React.ReactNode; 
  onConfirm: (comment?: string) => void; 
  placeholder: string;
  requireComment?: boolean;
}) {
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <Textarea
          placeholder={placeholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="text-xs min-h-[60px] mb-2"
        />
        <Button
          size="sm"
          className="w-full text-xs"
          disabled={requireComment && !comment.trim()}
          onClick={() => {
            onConfirm(comment.trim() || undefined);
            setComment("");
            setOpen(false);
          }}
        >
          Confirmar
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function ArtifactReviewActions({
  status,
  onSubmitForReview,
  onApprove,
  onReject,
  onRequestChanges,
  onDeploy,
  onComment,
  deployBlocked,
}: ArtifactReviewActionsProps) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {status === "draft" && (
        <ActionWithComment
          trigger={
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Eye className="h-3 w-3" /> Enviar p/ Revisão
            </Button>
          }
          onConfirm={onSubmitForReview}
          placeholder="Comentário opcional..."
        />
      )}

      {status === "pending_review" && (
        <>
          <ActionWithComment
            trigger={
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10">
                <CheckCircle2 className="h-3 w-3" /> Aprovar
              </Button>
            }
            onConfirm={onApprove}
            placeholder="Motivo da aprovação (opcional)..."
          />
          <ActionWithComment
            trigger={
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                <XCircle className="h-3 w-3" /> Rejeitar
              </Button>
            }
            onConfirm={onReject}
            placeholder="Motivo da rejeição..."
            requireComment
          />
          {onRequestChanges && (
            <ActionWithComment
              trigger={
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <RotateCcw className="h-3 w-3" /> Alterações
                </Button>
              }
              onConfirm={onRequestChanges}
              placeholder="Quais alterações são necessárias?"
              requireComment
            />
          )}
        </>
      )}

      {status === "approved" && (
        <ActionWithComment
          trigger={
            <Button
              variant="outline"
              size="sm"
              className={`h-7 text-xs gap-1 ${deployBlocked ? "opacity-50" : "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"}`}
              disabled={deployBlocked}
              title={deployBlocked ? "Necessária validação aprovada" : "Fazer deploy"}
            >
              <Rocket className="h-3 w-3" /> Deploy
            </Button>
          }
          onConfirm={onDeploy}
          placeholder="Notas de deploy (opcional)..."
        />
      )}

      {status === "rejected" && (
        <ActionWithComment
          trigger={
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Send className="h-3 w-3" /> Reenviar
            </Button>
          }
          onConfirm={onSubmitForReview}
          placeholder="O que foi corrigido?"
        />
      )}

      {onComment && (
        <ActionWithComment
          trigger={
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MessageSquare className="h-3 w-3" />
            </Button>
          }
          onConfirm={(c) => c && onComment(c)}
          placeholder="Adicionar comentário..."
          requireComment
        />
      )}
    </div>
  );
}

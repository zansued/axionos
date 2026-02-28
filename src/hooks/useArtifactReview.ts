import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type OutputStatus = "draft" | "pending_review" | "approved" | "rejected" | "deployed";
type ReviewAction = "submit_review" | "approve" | "reject" | "request_changes" | "deploy" | "comment";

export function useArtifactReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workspace-outputs"] });
    queryClient.invalidateQueries({ queryKey: ["agent-outputs"] });
    queryClient.invalidateQueries({ queryKey: ["workspace-validations"] });
    queryClient.invalidateQueries({ queryKey: ["artifact-reviews"] });
  }, [queryClient]);

  const recordReview = useCallback(async (
    outputId: string,
    action: ReviewAction,
    previousStatus: string,
    newStatus: string,
    comment?: string
  ) => {
    if (!user) return;
    await supabase.from("artifact_reviews").insert({
      output_id: outputId,
      reviewer_id: user.id,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      comment: comment || null,
    });
  }, [user]);

  const updateStatus = useCallback(async (outputId: string, status: OutputStatus) => {
    const { error } = await supabase
      .from("agent_outputs")
      .update({ status })
      .eq("id", outputId);
    if (error) throw error;
    invalidate();
  }, [invalidate]);

  const submitForReview = useCallback(async (outputId: string, comment?: string) => {
    try {
      await updateStatus(outputId, "pending_review");
      await recordReview(outputId, "submit_review", "draft", "pending_review", comment);
      toast({ title: "Enviado para revisão" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao enviar para revisão" });
    }
  }, [updateStatus, recordReview, toast]);

  const approve = useCallback(async (outputId: string, comment?: string) => {
    try {
      await updateStatus(outputId, "approved");
      await recordReview(outputId, "approve", "pending_review", "approved", comment);
      toast({ title: "Artefato aprovado ✓" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao aprovar" });
    }
  }, [updateStatus, recordReview, toast]);

  const reject = useCallback(async (outputId: string, comment?: string) => {
    try {
      await updateStatus(outputId, "rejected");
      await recordReview(outputId, "reject", "pending_review", "rejected", comment);
      toast({ title: "Artefato rejeitado" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao rejeitar" });
    }
  }, [updateStatus, recordReview, toast]);

  const requestChanges = useCallback(async (outputId: string, comment?: string) => {
    try {
      await updateStatus(outputId, "draft");
      await recordReview(outputId, "request_changes", "pending_review", "draft", comment);
      toast({ title: "Alterações solicitadas" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao solicitar alterações" });
    }
  }, [updateStatus, recordReview, toast]);

  const deploy = useCallback(async (outputId: string, validations: any[], comment?: string) => {
    const hasPassingValidation = validations.some((v: any) => v.artifact_id === outputId && v.result === "pass");
    if (!hasPassingValidation) {
      toast({
        variant: "destructive",
        title: "Deploy bloqueado",
        description: "O artefato precisa ter pelo menos uma validação aprovada (pass).",
      });
      return;
    }
    try {
      await updateStatus(outputId, "deployed");
      await recordReview(outputId, "deploy", "approved", "deployed", comment);
      toast({ title: "Artefato deployed 🚀" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao fazer deploy" });
    }
  }, [updateStatus, recordReview, toast]);

  const addComment = useCallback(async (outputId: string, currentStatus: string, comment: string) => {
    try {
      if (!user) return;
      await supabase.from("artifact_reviews").insert({
        output_id: outputId,
        reviewer_id: user.id,
        action: "comment",
        previous_status: currentStatus,
        new_status: currentStatus,
        comment,
      });
      invalidate();
      toast({ title: "Comentário adicionado" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao comentar" });
    }
  }, [user, invalidate, toast]);

  return { submitForReview, approve, reject, requestChanges, deploy, addComment };
}

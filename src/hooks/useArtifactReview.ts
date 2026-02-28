import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type OutputStatus = "draft" | "pending_review" | "approved" | "rejected" | "deployed";

export function useArtifactReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workspace-outputs"] });
    queryClient.invalidateQueries({ queryKey: ["agent-outputs"] });
    queryClient.invalidateQueries({ queryKey: ["workspace-validations"] });
  }, [queryClient]);

  const updateStatus = useCallback(async (outputId: string, status: OutputStatus) => {
    const { error } = await supabase
      .from("agent_outputs")
      .update({ status })
      .eq("id", outputId);
    if (error) throw error;
    invalidate();
  }, [invalidate]);

  const submitForReview = useCallback(async (outputId: string) => {
    try {
      await updateStatus(outputId, "pending_review");
      toast({ title: "Enviado para revisão" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao enviar para revisão" });
    }
  }, [updateStatus, toast]);

  const approve = useCallback(async (outputId: string) => {
    try {
      await updateStatus(outputId, "approved");
      toast({ title: "Artefato aprovado ✓" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao aprovar" });
    }
  }, [updateStatus, toast]);

  const reject = useCallback(async (outputId: string) => {
    try {
      await updateStatus(outputId, "rejected");
      toast({ title: "Artefato rejeitado" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao rejeitar" });
    }
  }, [updateStatus, toast]);

  const deploy = useCallback(async (outputId: string, validations: any[]) => {
    // Check if there are passing validations
    const artifactValidations = validations.filter((v: any) => v.artifact_id === outputId);
    const hasPassingValidation = artifactValidations.some((v: any) => v.result === "pass");
    
    if (!hasPassingValidation) {
      toast({
        variant: "destructive",
        title: "Deploy bloqueado",
        description: "O artefato precisa ter pelo menos uma validação aprovada (pass) antes do deploy.",
      });
      return;
    }

    try {
      await updateStatus(outputId, "deployed");
      toast({ title: "Artefato deployed 🚀" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao fazer deploy" });
    }
  }, [updateStatus, toast]);

  return { submitForReview, approve, reject, deploy };
}

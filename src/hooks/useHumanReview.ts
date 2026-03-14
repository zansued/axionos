import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type CandidateRow = Database["public"]["Tables"]["canon_candidate_entries"]["Row"];

export type HumanReviewCandidate = CandidateRow;

export function useHumanReview() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const KEYS = {
    pending: ["human-review-candidates", orgId],
    history: ["human-review-history", orgId],
  };

  const pendingQuery = useQuery({
    queryKey: KEYS.pending,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_candidate_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .in("internal_validation_status", ["needs_review", "needs_human_review"])
        .eq("promotion_status", "pending")
        .order("novelty_score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const historyQuery = useQuery({
    queryKey: KEYS.history,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_candidate_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .in("internal_validation_status", ["approved", "rejected"])
        .ilike("promotion_decision_reason", "%[Human Review]%")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: KEYS.pending });
    qc.invalidateQueries({ queryKey: KEYS.history });
    qc.invalidateQueries({ queryKey: ["canon-candidates"] });
    qc.invalidateQueries({ queryKey: ["canon-intelligence"] });
  };

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || "unknown";
  };

  const logAudit = async (action: string, entityId: string, details: Record<string, unknown>) => {
    const userId = await getUserId();
    await supabase.from("audit_logs").insert({
      organization_id: orgId!,
      user_id: userId,
      action,
      message: `${action}: ${entityId}`,
      entity_type: "canon_candidate",
      entity_id: entityId,
      metadata: details as any,
    });
  };

  const approveCandidate = useMutation({
    mutationFn: async ({ candidateId, notes }: { candidateId: string; notes?: string }) => {
      const reason = `[Human Review] Aprovado manualmente. ${notes || ""}`.trim();
      const { error } = await supabase
        .from("canon_candidate_entries")
        .update({
          internal_validation_status: "approved",
          promotion_decision_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId)
        .eq("organization_id", orgId!);
      if (error) throw error;
      await logAudit("human_review_approve", candidateId, { notes, reason });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Candidato aprovado", description: "Pronto para promoção ao cânone." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const rejectCandidate = useMutation({
    mutationFn: async ({ candidateId, notes }: { candidateId: string; notes?: string }) => {
      const reason = `[Human Review] Rejeitado. ${notes || ""}`.trim();
      const { error } = await supabase
        .from("canon_candidate_entries")
        .update({
          internal_validation_status: "rejected",
          promotion_status: "not_promoted",
          promotion_decision_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId)
        .eq("organization_id", orgId!);
      if (error) throw error;
      await logAudit("human_review_reject", candidateId, { notes, reason });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Candidato rejeitado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const requestRevision = useMutation({
    mutationFn: async ({ candidateId, notes }: { candidateId: string; notes: string }) => {
      const reason = `[Human Review] Revisão solicitada: ${notes}`;
      const { error } = await supabase
        .from("canon_candidate_entries")
        .update({
          internal_validation_status: "pending",
          promotion_decision_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId)
        .eq("organization_id", orgId!);
      if (error) throw error;
      await logAudit("human_review_request_revision", candidateId, { notes, reason });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Enviado para re-revisão pela IA" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const bulkApprove = useMutation({
    mutationFn: async () => {
      const candidates = pendingQuery.data || [];
      if (!candidates.length) throw new Error("Nenhum candidato pendente");
      
      const { error } = await supabase
        .from("canon_candidate_entries")
        .update({
          internal_validation_status: "approved",
          promotion_decision_reason: "[Human Review] Aprovação em lote.",
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId!)
        .in("internal_validation_status", ["needs_review", "needs_human_review"])
        .eq("promotion_status", "pending");
      if (error) throw error;
      await logAudit("human_review_bulk_approve", "bulk", { count: candidates.length });
      return candidates.length;
    },
    onSuccess: (count) => {
      invalidateAll();
      toast({ title: `${count} candidato(s) aprovado(s) em lote` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    pendingCandidates: pendingQuery.data || [],
    reviewHistory: historyQuery.data || [],
    loading: pendingQuery.isLoading,
    loadingHistory: historyQuery.isLoading,
    approveCandidate,
    rejectCandidate,
    requestRevision,
    bulkApprove,
    isActing: approveCandidate.isPending || rejectCandidate.isPending || requestRevision.isPending || bulkApprove.isPending,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export interface HumanReviewCandidate {
  id: string;
  title: string;
  summary: string;
  practice_type: string;
  stack_scope: string;
  topic: string;
  confidence_score: number;
  source_url: string | null;
  internal_validation_status: string;
  promotion_status: string;
  promotion_decision_reason: string | null;
  created_at: string;
}

export function useHumanReview() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const KEYS = {
    pending: ["human-review-candidates", orgId],
    history: ["human-review-history", orgId],
  };

  // Candidates needing human review
  const pendingQuery = useQuery({
    queryKey: KEYS.pending,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_candidate_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("internal_validation_status", "needs_review")
        .eq("promotion_status", "pending")
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return data as HumanReviewCandidate[];
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // Recently reviewed by humans (last 50)
  const historyQuery = useQuery({
    queryKey: KEYS.history,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_candidate_entries")
        .select("*")
        .eq("organization_id", orgId!)
        .in("internal_validation_status", ["approved", "rejected"])
        .not("promotion_decision_reason", "is", null)
        .ilike("promotion_decision_reason", "%[Human Review]%")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HumanReviewCandidate[];
    },
    enabled: !!orgId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: KEYS.pending });
    qc.invalidateQueries({ queryKey: KEYS.history });
    qc.invalidateQueries({ queryKey: ["canon-candidates"] });
    qc.invalidateQueries({ queryKey: ["canon-intelligence"] });
  };

  // Approve a candidate (mark as approved, ready for promotion)
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

      // Audit log
      await supabase.from("audit_logs").insert({
        organization_id: orgId!,
        action: "human_review_approve",
        entity_type: "canon_candidate",
        entity_id: candidateId,
        details: { notes, reason },
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Candidato aprovado", description: "Pronto para promoção ao cânone." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Reject a candidate
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

      await supabase.from("audit_logs").insert({
        organization_id: orgId!,
        action: "human_review_reject",
        entity_type: "canon_candidate",
        entity_id: candidateId,
        details: { notes, reason },
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Candidato rejeitado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Request revision (send back to pending for re-review by AI with notes)
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

      await supabase.from("audit_logs").insert({
        organization_id: orgId!,
        action: "human_review_request_revision",
        entity_type: "canon_candidate",
        entity_id: candidateId,
        details: { notes, reason },
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Enviado para re-revisão pela IA" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Bulk approve all
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
        .eq("internal_validation_status", "needs_review")
        .eq("promotion_status", "pending");
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        organization_id: orgId!,
        action: "human_review_bulk_approve",
        entity_type: "canon_candidate",
        entity_id: "bulk",
        details: { count: candidates.length },
      });

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

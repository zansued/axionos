import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePolicyTuningProposals(organizationId: string | undefined, filters?: {
  review_status?: string;
  proposal_type?: string;
  severity?: string;
}) {
  return useQuery({
    queryKey: ["policy-tuning-proposals", organizationId, filters],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("policy-tuning-hooks", {
        body: { action: "list", organization_id: organizationId, ...filters },
      });
      if (error) throw error;
      return data?.proposals || [];
    },
  });
}

export function usePolicyTuningSummary(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["policy-tuning-summary", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("policy-tuning-hooks", {
        body: { action: "summary", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useGeneratePolicyTuningProposals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ organizationId, lookbackHours }: { organizationId: string; lookbackHours?: number }) => {
      const { data, error } = await supabase.functions.invoke("policy-tuning-hooks", {
        body: { action: "generate", organization_id: organizationId, lookback_hours: lookbackHours },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-tuning-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["policy-tuning-summary"] });
    },
  });
}

export function useTransitionPolicyTuningProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, newStatus, organizationId }: {
      proposalId: string; newStatus: string; organizationId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("policy-tuning-hooks", {
        body: { action: "transition", organization_id: organizationId, proposal_id: proposalId, new_status: newStatus },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-tuning-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["policy-tuning-summary"] });
    },
  });
}

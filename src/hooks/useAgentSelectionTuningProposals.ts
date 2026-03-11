import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AgentSelectionTuningProposalSummary {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  by_agent: Record<string, number>;
}

export function useAgentSelectionTuningGenerate(organizationId: string) {
  return useMutation({
    mutationFn: async (lookbackHours: number = 24) => {
      const { data, error } = await supabase.functions.invoke("agent-selection-tuning-hooks", {
        body: { action: "generate", organization_id: organizationId, lookback_hours: lookbackHours },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useAgentSelectionTuningProposals(organizationId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ["agent-selection-tuning-proposals", organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-selection-tuning-hooks", {
        body: { action: "list", organization_id: organizationId, ...filters },
      });
      if (error) throw error;
      return data?.proposals || [];
    },
    enabled: !!organizationId,
  });
}

export function useAgentSelectionTuningSummary(organizationId: string) {
  return useQuery<AgentSelectionTuningProposalSummary>({
    queryKey: ["agent-selection-tuning-summary", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-selection-tuning-hooks", {
        body: { action: "summary", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useAgentSelectionTuningTransition(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, newStatus }: { proposalId: string; newStatus: string }) => {
      const { data, error } = await supabase.functions.invoke("agent-selection-tuning-hooks", {
        body: { action: "transition", organization_id: organizationId, proposal_id: proposalId, new_status: newStatus },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-selection-tuning-proposals", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["agent-selection-tuning-summary", organizationId] });
    },
  });
}

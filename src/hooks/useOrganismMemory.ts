import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganismMemory(organizationId: string | null) {
  const qc = useQueryClient();

  const metrics = useQuery({
    queryKey: ["organism-memory-metrics", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("organism-memory-engine", {
        body: { action: "memory_metrics", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const storeMemory = useMutation({
    mutationFn: async (params: {
      memory_type: string;
      memory_scope?: string;
      memory_payload: Record<string, unknown>;
      source_refs?: unknown[];
      confidence_score?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("organism-memory-engine", {
        body: { action: "store_memory", organization_id: organizationId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organism-memory-metrics"] }),
  });

  const retrieveMemory = useMutation({
    mutationFn: async (params: { memory_type?: string; memory_scope?: string; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("organism-memory-engine", {
        body: { action: "retrieve_memory", organization_id: organizationId, ...params },
      });
      if (error) throw error;
      return data;
    },
  });

  return { metrics, storeMemory, retrieveMemory };
}

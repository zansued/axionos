import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invoke(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-fitness", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useArchitectureFitness() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const keys = ["arch-fitness-overview", "arch-fitness-dims", "arch-fitness-evals", "arch-fitness-recs"];

  const overview = useQuery({
    queryKey: ["arch-fitness-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "overview"); if (error) throw error; return data; },
    refetchInterval: 30000,
  });

  const dimensions = useQuery({
    queryKey: ["arch-fitness-dims", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "dimensions"); if (error) throw error; return data; },
  });

  const evaluations = useQuery({
    queryKey: ["arch-fitness-evals", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "evaluations"); if (error) throw error; return data; },
  });

  const recommendations = useQuery({
    queryKey: ["arch-fitness-recs", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "recommendations"); if (error) throw error; return data; },
  });

  const invalidateAll = () => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const recompute = useMutation({
    mutationFn: async () => { const { data, error } = await invoke(orgId!, "recompute"); if (error) throw error; return data; },
    onSuccess: () => { toast.success("Fitness recomputed"); invalidateAll(); },
    onError: () => toast.error("Failed to recompute"),
  });

  const reviewRecommendation = useMutation({
    mutationFn: async (p: { recommendation_id: string; status: string }) => {
      const { data, error } = await invoke(orgId!, "review_recommendation", p);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Recommendation updated"); invalidateAll(); },
    onError: () => toast.error("Failed to update"),
  });

  return { overview, dimensions, evaluations, recommendations, recompute, reviewRecommendation };
}

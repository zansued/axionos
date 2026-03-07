import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

function invoke(action: string, orgId: string, extra: Record<string, unknown> = {}) {
  return supabase.functions.invoke("engineering-advisor", {
    body: { action, organization_id: orgId, ...extra },
  });
}

export function useEngineeringAdvisor() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["engineering-advisor-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("overview", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const recommendations = useQuery({
    queryKey: ["engineering-advisor-recommendations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_recommendations", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["engineering-advisor-overview"] });
    qc.invalidateQueries({ queryKey: ["engineering-advisor-recommendations"] });
  };

  const recompute = useMutation({
    mutationFn: async (layers: Record<string, unknown> = {}) => {
      const { data, error } = await invoke("recompute", orgId!, { layers });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const reviewRecommendation = useMutation({
    mutationFn: async (params: { recommendation_id: string; notes?: string }) => {
      const { data, error } = await invoke("review_recommendation", orgId!, params);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const acceptRecommendation = useMutation({
    mutationFn: async (params: { recommendation_id: string; notes?: string }) => {
      const { data, error } = await invoke("accept_recommendation", orgId!, params);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const rejectRecommendation = useMutation({
    mutationFn: async (params: { recommendation_id: string; notes?: string; reason_codes?: string[] }) => {
      const { data, error } = await invoke("reject_recommendation", orgId!, params);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const dismissRecommendation = useMutation({
    mutationFn: async (params: { recommendation_id: string; notes?: string }) => {
      const { data, error } = await invoke("dismiss_recommendation", orgId!, params);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const markImplemented = useMutation({
    mutationFn: async (params: { recommendation_id: string; notes?: string; linked_changes?: Record<string, unknown> }) => {
      const { data, error } = await invoke("mark_implemented", orgId!, params);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  return {
    overview, recommendations,
    recompute, reviewRecommendation, acceptRecommendation, rejectRecommendation, dismissRecommendation, markImplemented,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

function invoke(action: string, orgId: string, extra: Record<string, unknown> = {}) {
  return supabase.functions.invoke("platform-intelligence-engine", {
    body: { action, organization_id: orgId, ...extra },
  });
}

export function usePlatformIntelligence() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["platform-intelligence-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("overview", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const healthMetrics = useQuery({
    queryKey: ["platform-intelligence-health", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("health_metrics", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const bottlenecks = useQuery({
    queryKey: ["platform-intelligence-bottlenecks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("bottlenecks", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const patterns = useQuery({
    queryKey: ["platform-intelligence-patterns", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("pattern_analysis", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("recompute", orgId!);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-intelligence-overview"] });
      qc.invalidateQueries({ queryKey: ["platform-intelligence-health"] });
      qc.invalidateQueries({ queryKey: ["platform-intelligence-bottlenecks"] });
      qc.invalidateQueries({ queryKey: ["platform-intelligence-patterns"] });
    },
  });

  const markInsightReviewed = useMutation({
    mutationFn: async (insightId: string) => {
      const { data, error } = await invoke("mark_insight_reviewed", orgId!, { insight_id: insightId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-intelligence-overview"] }),
  });

  const acceptRecommendation = useMutation({
    mutationFn: async (recId: string) => {
      const { data, error } = await invoke("accept_recommendation", orgId!, { recommendation_id: recId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-intelligence-overview"] }),
  });

  const rejectRecommendation = useMutation({
    mutationFn: async (recId: string) => {
      const { data, error } = await invoke("reject_recommendation", orgId!, { recommendation_id: recId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-intelligence-overview"] }),
  });

  return {
    overview, healthMetrics, bottlenecks, patterns,
    recompute, markInsightReviewed, acceptRecommendation, rejectRecommendation,
  };
}

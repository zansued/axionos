import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invokeDiscoveryArchitecture(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("discovery-architecture", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useDiscoveryArchitecture() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["discovery-architecture-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeDiscoveryArchitecture(orgId!, "overview");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const signals = useQuery({
    queryKey: ["discovery-architecture-signals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeDiscoveryArchitecture(orgId!, "signals");
      if (error) throw error;
      return data;
    },
  });

  const recommendations = useQuery({
    queryKey: ["discovery-architecture-recommendations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeDiscoveryArchitecture(orgId!, "recommendations");
      if (error) throw error;
      return data;
    },
  });

  const stressMap = useQuery({
    queryKey: ["discovery-architecture-stress-map", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeDiscoveryArchitecture(orgId!, "stress_map");
      if (error) throw error;
      return data;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeDiscoveryArchitecture(orgId!, "recompute");
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success(`Discovery recomputed: ${d.recommendations_created} recommendations created`);
      qc.invalidateQueries({ queryKey: ["discovery-architecture-overview"] });
      qc.invalidateQueries({ queryKey: ["discovery-architecture-recommendations"] });
      qc.invalidateQueries({ queryKey: ["discovery-architecture-stress-map"] });
    },
    onError: () => toast.error("Failed to recompute discovery architecture"),
  });

  const reviewAction = useMutation({
    mutationFn: async (params: { recommendation_id: string; action: string; review_notes?: string; review_reason_codes?: string[] }) => {
      const { data, error } = await invokeDiscoveryArchitecture(orgId!, params.action, {
        recommendation_id: params.recommendation_id,
        review_notes: params.review_notes,
        review_reason_codes: params.review_reason_codes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Review action applied");
      qc.invalidateQueries({ queryKey: ["discovery-architecture-recommendations"] });
      qc.invalidateQueries({ queryKey: ["discovery-architecture-overview"] });
    },
    onError: () => toast.error("Failed to apply review action"),
  });

  return { overview, signals, recommendations, stressMap, recompute, reviewAction };
}

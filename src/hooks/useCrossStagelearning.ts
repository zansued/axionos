import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function fetchCrossStage(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("cross-stage-learning-engine", {
    body: { organization_id: orgId, action },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  return data;
}

export function useCrossStageOverview() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["cross-stage-overview", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: () => fetchCrossStage(currentOrg!.id, "learning_v2_overview"),
    staleTime: 30_000,
  });
}

export function useCrossStageEdges() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["cross-stage-edges", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: () => fetchCrossStage(currentOrg!.id, "cross_stage_learning_edges"),
    staleTime: 30_000,
  });
}

export function useCrossStagePolicies() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["cross-stage-policies", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: () => fetchCrossStage(currentOrg!.id, "cross_stage_policy_profiles"),
    staleTime: 30_000,
  });
}

export function useCrossStageOutcomes() {
  const { currentOrg } = useOrg();
  return useQuery({
    queryKey: ["cross-stage-outcomes", currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: () => fetchCrossStage(currentOrg!.id, "cross_stage_policy_outcomes"),
    staleTime: 30_000,
  });
}

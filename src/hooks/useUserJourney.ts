import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useUserJourney() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["user-journey-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("user-journey-orchestration-engine", {
        body: { action: "overview", organization_id: orgId },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const syncJourneyInstances = async () => {
    if (!orgId) return;
    const { data, error } = await supabase.functions.invoke("user-journey-orchestration-engine", {
      body: { action: "sync_journey_instances", organization_id: orgId },
    });
    if (error) throw error;
    return data;
  };

  const explainInitiative = async (initiativeId: string) => {
    if (!orgId) return;
    const { data, error } = await supabase.functions.invoke("user-journey-orchestration-engine", {
      body: { action: "explain", organization_id: orgId, initiative_id: initiativeId },
    });
    if (error) throw error;
    return data;
  };

  const evaluateTransitions = async (initiativeId: string) => {
    if (!orgId) return;
    const { data, error } = await supabase.functions.invoke("user-journey-orchestration-engine", {
      body: { action: "evaluate_transitions", organization_id: orgId, initiative_id: initiativeId },
    });
    if (error) throw error;
    return data;
  };

  const evaluateArtifactVisibility = async (initiativeId: string) => {
    if (!orgId) return;
    const { data, error } = await supabase.functions.invoke("user-journey-orchestration-engine", {
      body: { action: "evaluate_artifact_visibility", organization_id: orgId, initiative_id: initiativeId },
    });
    if (error) throw error;
    return data;
  };

  return {
    overview,
    syncJourneyInstances,
    explainInitiative,
    evaluateTransitions,
    evaluateArtifactVisibility,
  };
}

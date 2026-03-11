import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("security-intelligence", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useSecurityIntelligence() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["security-intelligence-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const canonicalSurfaces = useQuery({
    queryKey: ["security-intelligence-surfaces", orgId],
    queryFn: () => invokeEngine(orgId!, "map_surfaces"),
    enabled: !!orgId,
  });

  const threatClassification = useQuery({
    queryKey: ["security-intelligence-threats", orgId],
    queryFn: () => invokeEngine(orgId!, "classify_threats"),
    enabled: !!orgId,
  });

  const exposureScores = useQuery({
    queryKey: ["security-intelligence-exposure", orgId],
    queryFn: () => invokeEngine(orgId!, "compute_exposure"),
    enabled: !!orgId,
  });

  return {
    overview: overview.data || {
      surfaces: [], threats: [], exposures: [], contracts: [],
      tenantBoundaries: [], runtimeBoundaries: [], reviews: [],
      totalSurfaces: 0, totalThreats: 0, criticalExposures: 0, pendingReviews: 0,
    },
    canonicalSurfaces: canonicalSurfaces.data || [],
    threatClassification: threatClassification.data || [],
    exposureScores: exposureScores.data || [],
    loading: overview.isLoading || canonicalSurfaces.isLoading,
  };
}

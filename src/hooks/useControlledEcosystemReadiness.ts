import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string, params?: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("controlled-ecosystem-readiness-engine", {
    body: { action, organization_id: orgId, params },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useControlledEcosystemReadiness() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["ecosystem-readiness-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const inventory = useQuery({
    queryKey: ["ecosystem-readiness-inventory", orgId],
    queryFn: () => invokeEngine(orgId!, "build_inventory"),
    enabled: !!orgId,
  });

  const classifications = useQuery({
    queryKey: ["ecosystem-readiness-classifications", orgId],
    queryFn: () => invokeEngine(orgId!, "classify_capabilities"),
    enabled: !!orgId,
  });

  const assessments = useQuery({
    queryKey: ["ecosystem-readiness-assessments", orgId],
    queryFn: () => invokeEngine(orgId!, "assess_readiness"),
    enabled: !!orgId,
  });

  const prerequisites = useQuery({
    queryKey: ["ecosystem-readiness-prerequisites", orgId],
    queryFn: () => invokeEngine(orgId!, "evaluate_safety_prerequisites"),
    enabled: !!orgId,
  });

  const trustModels = useQuery({
    queryKey: ["ecosystem-readiness-trust", orgId],
    queryFn: () => invokeEngine(orgId!, "design_trust_models"),
    enabled: !!orgId,
  });

  const recommendations = useQuery({
    queryKey: ["ecosystem-readiness-recommendations", orgId],
    queryFn: () => invokeEngine(orgId!, "recommend_readiness_actions"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["ecosystem-readiness-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "outcomes"),
    enabled: !!orgId,
  });

  return { overview, inventory, classifications, assessments, prerequisites, trustModels, recommendations, outcomes };
}

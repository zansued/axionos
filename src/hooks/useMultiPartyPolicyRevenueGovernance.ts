import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("multi-party-policy-revenue-governance-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useMultiPartyPolicyRevenueGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["mp-gov-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const frames = useQuery({
    queryKey: ["mp-gov-frames", orgId],
    queryFn: () => invokeEngine(orgId!, "define_policy_frames"),
    enabled: !!orgId,
  });

  const entitlements = useQuery({
    queryKey: ["mp-gov-entitlements", orgId],
    queryFn: () => invokeEngine(orgId!, "evaluate_entitlements"),
    enabled: !!orgId,
  });

  const valueFlows = useQuery({
    queryKey: ["mp-gov-value-flows", orgId],
    queryFn: () => invokeEngine(orgId!, "govern_value_flows"),
    enabled: !!orgId,
  });

  const conflicts = useQuery({
    queryKey: ["mp-gov-conflicts", orgId],
    queryFn: () => invokeEngine(orgId!, "detect_policy_conflicts"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["mp-gov-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "governance_outcomes"),
    enabled: !!orgId,
  });

  return { overview, frames, entitlements, valueFlows, conflicts, outcomes };
}

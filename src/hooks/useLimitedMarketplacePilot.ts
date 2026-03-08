import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("limited-marketplace-pilot-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useLimitedMarketplacePilot() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["marketplace-pilot-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const capabilities = useQuery({
    queryKey: ["marketplace-pilot-capabilities", orgId],
    queryFn: () => invokeEngine(orgId!, "select_capabilities"),
    enabled: !!orgId,
  });

  const participants = useQuery({
    queryKey: ["marketplace-pilot-participants", orgId],
    queryFn: () => invokeEngine(orgId!, "gate_participants"),
    enabled: !!orgId,
  });

  const interactions = useQuery({
    queryKey: ["marketplace-pilot-interactions", orgId],
    queryFn: () => invokeEngine(orgId!, "monitor_interactions"),
    enabled: !!orgId,
  });

  const policyEvents = useQuery({
    queryKey: ["marketplace-pilot-policy", orgId],
    queryFn: () => invokeEngine(orgId!, "evaluate_policy_events"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["marketplace-pilot-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "pilot_outcomes"),
    enabled: !!orgId,
  });

  return { overview, capabilities, participants, interactions, policyEvents, outcomes };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("capability-exposure-governance-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useCapabilityExposureGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["exposure-governance-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const classifications = useQuery({
    queryKey: ["exposure-governance-classifications", orgId],
    queryFn: () => invokeEngine(orgId!, "classify_exposure"),
    enabled: !!orgId,
  });

  const gates = useQuery({
    queryKey: ["exposure-governance-gates", orgId],
    queryFn: () => invokeEngine(orgId!, "evaluate_gates"),
    enabled: !!orgId,
  });

  const restrictions = useQuery({
    queryKey: ["exposure-governance-restrictions", orgId],
    queryFn: () => invokeEngine(orgId!, "analyze_restrictions"),
    enabled: !!orgId,
  });

  const reviewQueue = useQuery({
    queryKey: ["exposure-governance-review-queue", orgId],
    queryFn: () => invokeEngine(orgId!, "review_queue"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["exposure-governance-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "governance_outcomes"),
    enabled: !!orgId,
  });

  return { overview, classifications, gates, restrictions, reviewQueue, outcomes };
}

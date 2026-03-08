import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("capability-registry-governance-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useCapabilityRegistryGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["cap-registry-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const entries = useQuery({
    queryKey: ["cap-registry-entries", orgId],
    queryFn: () => invokeEngine(orgId!, "register_capabilities"),
    enabled: !!orgId,
  });

  const versions = useQuery({
    queryKey: ["cap-registry-versions", orgId],
    queryFn: () => invokeEngine(orgId!, "govern_versions"),
    enabled: !!orgId,
  });

  const visibility = useQuery({
    queryKey: ["cap-registry-visibility", orgId],
    queryFn: () => invokeEngine(orgId!, "evaluate_visibility"),
    enabled: !!orgId,
  });

  const policyBindings = useQuery({
    queryKey: ["cap-registry-policies", orgId],
    queryFn: () => invokeEngine(orgId!, "bind_policies"),
    enabled: !!orgId,
  });

  const compatibility = useQuery({
    queryKey: ["cap-registry-compat", orgId],
    queryFn: () => invokeEngine(orgId!, "analyze_compatibility"),
    enabled: !!orgId,
  });

  const reviewQueue = useQuery({
    queryKey: ["cap-registry-review", orgId],
    queryFn: () => invokeEngine(orgId!, "review_queue"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["cap-registry-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "registry_outcomes"),
    enabled: !!orgId,
  });

  return { overview, entries, versions, visibility, policyBindings, compatibility, reviewQueue, outcomes };
}

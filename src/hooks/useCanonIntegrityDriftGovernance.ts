import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("canon-integrity-drift-governance-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useCanonIntegrityDriftGovernance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({ queryKey: ["canon-gov-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const models = useQuery({ queryKey: ["canon-gov-models", orgId], queryFn: () => invokeEngine(orgId!, "define_integrity_models"), enabled: !!orgId });
  const assessments = useQuery({ queryKey: ["canon-gov-assessments", orgId], queryFn: () => invokeEngine(orgId!, "assess_conformance"), enabled: !!orgId });
  const drift = useQuery({ queryKey: ["canon-gov-drift", orgId], queryFn: () => invokeEngine(orgId!, "detect_drift"), enabled: !!orgId });
  const signals = useQuery({ queryKey: ["canon-gov-signals", orgId], queryFn: () => invokeEngine(orgId!, "aggregate_conformance"), enabled: !!orgId });
  const reviews = useQuery({ queryKey: ["canon-gov-reviews", orgId], queryFn: () => invokeEngine(orgId!, "recommend_alignment_actions"), enabled: !!orgId });
  const outcomes = useQuery({ queryKey: ["canon-gov-outcomes", orgId], queryFn: () => invokeEngine(orgId!, "integrity_outcomes"), enabled: !!orgId });

  return { overview, models, assessments, drift, signals, reviews, outcomes };
}

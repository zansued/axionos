import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("operating-completion-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useOperatingCompletion() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({ queryKey: ["op-completion-overview", orgId], queryFn: () => invokeEngine(orgId!, "overview"), enabled: !!orgId, refetchInterval: 30000 });
  const models = useQuery({ queryKey: ["op-completion-models", orgId], queryFn: () => invokeEngine(orgId!, "define_completion_models"), enabled: !!orgId });
  const assessments = useQuery({ queryKey: ["op-completion-assessments", orgId], queryFn: () => invokeEngine(orgId!, "assess_completion"), enabled: !!orgId });
  const gaps = useQuery({ queryKey: ["op-completion-gaps", orgId], queryFn: () => invokeEngine(orgId!, "detect_gaps"), enabled: !!orgId });
  const certifications = useQuery({ queryKey: ["op-completion-certs", orgId], queryFn: () => invokeEngine(orgId!, "certify_baseline_candidates"), enabled: !!orgId });
  const aggregation = useQuery({ queryKey: ["op-completion-agg", orgId], queryFn: () => invokeEngine(orgId!, "aggregate_completion"), enabled: !!orgId });
  const outcomes = useQuery({ queryKey: ["op-completion-outcomes", orgId], queryFn: () => invokeEngine(orgId!, "completion_outcomes"), enabled: !!orgId });

  return { overview, models, assessments, gaps, certifications, aggregation, outcomes };
}

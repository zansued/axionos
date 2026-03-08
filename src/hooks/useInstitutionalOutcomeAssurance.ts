import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("institutional-outcome-assurance-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useInstitutionalOutcomeAssurance() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["ioa-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const models = useQuery({
    queryKey: ["ioa-models", orgId],
    queryFn: () => invokeEngine(orgId!, "define_outcome_models"),
    enabled: !!orgId,
  });

  const assessments = useQuery({
    queryKey: ["ioa-assessments", orgId],
    queryFn: () => invokeEngine(orgId!, "assess_outcomes"),
    enabled: !!orgId,
  });

  const drift = useQuery({
    queryKey: ["ioa-drift", orgId],
    queryFn: () => invokeEngine(orgId!, "detect_drift"),
    enabled: !!orgId,
  });

  const signals = useQuery({
    queryKey: ["ioa-signals", orgId],
    queryFn: () => invokeEngine(orgId!, "aggregate_assurance"),
    enabled: !!orgId,
  });

  const reviews = useQuery({
    queryKey: ["ioa-reviews", orgId],
    queryFn: () => invokeEngine(orgId!, "recommend_remediation"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["ioa-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "assurance_outcomes"),
    enabled: !!orgId,
  });

  return { overview, models, assessments, drift, signals, reviews, outcomes };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("external-trust-admission-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useExternalTrustAdmission() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["trust-admission-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const actors = useQuery({
    queryKey: ["trust-admission-actors", orgId],
    queryFn: () => invokeEngine(orgId!, "register_actors"),
    enabled: !!orgId,
  });

  const trustClassification = useQuery({
    queryKey: ["trust-admission-classify", orgId],
    queryFn: () => invokeEngine(orgId!, "classify_trust"),
    enabled: !!orgId,
  });

  const admissionCases = useQuery({
    queryKey: ["trust-admission-cases", orgId],
    queryFn: () => invokeEngine(orgId!, "build_admission_cases"),
    enabled: !!orgId,
  });

  const requirements = useQuery({
    queryKey: ["trust-admission-requirements", orgId],
    queryFn: () => invokeEngine(orgId!, "evaluate_requirements"),
    enabled: !!orgId,
  });

  const reviewQueue = useQuery({
    queryKey: ["trust-admission-review-queue", orgId],
    queryFn: () => invokeEngine(orgId!, "review_queue"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["trust-admission-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "trust_outcomes"),
    enabled: !!orgId,
  });

  return { overview, actors, trustClassification, admissionCases, requirements, reviewQueue, outcomes };
}
